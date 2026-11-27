import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { UpdateEmployeeInput } from '../models/employee.js';
import { getEmployeeService, success, failure } from './shared.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return success({ error: 'BAD_REQUEST', message: 'Employee ID is required.' }, 400);
    }

    const input = JSON.parse(event.body ?? '{}') as UpdateEmployeeInput;
    const employee = await getEmployeeService().updateEmployee(id, input);

    return success(employee);
  } catch (error) {
    return failure(error);
  }
};
