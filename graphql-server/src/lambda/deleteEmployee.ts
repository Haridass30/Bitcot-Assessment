import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getEmployeeService, success, failure } from './shared.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return success({ error: 'BAD_REQUEST', message: 'Employee ID is required.' }, 400);
    }

    const deletedId = await getEmployeeService().deleteEmployee(id);

    return success({ id: deletedId, deleted: true });
  } catch (error) {
    return failure(error);
  }
};
