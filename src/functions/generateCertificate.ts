import { APIGatewayProxyHandler } from "aws-lambda"
import * as handlebars from "handlebars"
import { join } from "path"
import { readFileSync } from "fs"
import dayjs from "dayjs"
import chromium from "chrome-aws-lambda"
import { S3 } from "aws-sdk"

import { document } from "../utils/dynamodbClient"

interface ICreateCertificate {
  name: string
  id: string
  grade: string
}

interface ITemplate {
  name: string
  id: string
  grade: string
  medal: string
  date: string
}

const compile = async (data: ITemplate) => {
  const filePath = join(process.cwd(), "src", "template", "certificate.hbs")

  const html = readFileSync(filePath, "utf-8")

  return handlebars.compile(html)(data)
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate

  const response = await document.query({
    TableName: "users_certificate",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  const userAlreadyHasCertificate = response.Items[0]

  if (!userAlreadyHasCertificate) {
    await document.put({
      TableName: "users_certificate",
      Item: { id, name, grade, created_at: new Date().getTime() }
    }).promise()
  }

  const medalPath = join(process.cwd(), "src", "template", "selo.png")
  const medal = readFileSync(medalPath, "base64")

  const data: ITemplate = {
    name,
    id,
    grade,
    medal,
    date: dayjs().format("DD/MM/YYYY")
  }

  const content = await compile(data)

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  })

  const page = await browser.newPage()

  await page.setContent(content)

  const pdf = await page.pdf({
    format: "a4",
    printBackground: true,
    landscape: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null
  })

  await browser.close()

  const s3 = new S3()

  await s3.putObject({
    Bucket: "certificates-rafael-manfrim-ignite",
    ContentType: "application/pdf",
    Key: `${id}.pdf`,
    ACL: "public-read",
    Body: pdf
  }).promise()

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Certificado criado com sucesso",
      url: `https://certificates-rafael-manfrim-ignite.s3.sa-east-1.amazonaws.com/${id}.pdf`
    })
  }
}