import { APIGatewayProxyHandler } from 'aws-lambda';
import { document } from '../utils/dynamodbClient';

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters

  const response = await document.query({
    TableName: "users_certificate",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  const userCertificate = response.Items[0]

  if (userCertificate) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Certificado válido",
        name: userCertificate.name,
        url: `https://certificates-rafael-manfrim-ignite.s3.sa-east-1.amazonaws.com/${id}.pdf`
      })
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Certificado inválido"
    })
  }
}