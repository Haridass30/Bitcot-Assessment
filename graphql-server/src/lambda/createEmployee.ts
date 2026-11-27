import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { CreateEmployeeInput } from '../models/employee.js';
import { getEmployeeService, success, failure } from './shared.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const input = JSON.parse(event.body ?? '{}') as CreateEmployeeInput;
    const employee = await getEmployeeService().createEmployee(input);

    return success(employee, 201);
  } catch (error) {
    return failure(error);
  }
};
