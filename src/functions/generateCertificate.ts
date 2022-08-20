import { APIGatewayProxyHandler } from "aws-lambda"
import * as handlebars from "handlebars"
import { join } from "path"
import { readFileSync } from "fs"
import * as dayjs from "dayjs"

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

  await document.put({
    TableName: "users_certificate",
    Item: { id, name, grade, created_at: new Date().getTime() }
  }).promise()

  const response = await document.query({
    TableName: "users_certificate",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

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

  return {
    statusCode: 201,
    body: JSON.stringify(response.Items[0])
  }
}