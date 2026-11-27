import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { EmployeeStatus } from '../models/employee.js';
import { getEmployeeService, success, failure } from './shared.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const params = event.queryStringParameters ?? {};

    const employees = await getEmployeeService().listEmployees({
      search: params.search,
      department: params.department,
      status: params.status as EmployeeStatus | undefined,
    });

    return success(employees);
  } catch (error) {
    return failure(error);
  }
};
