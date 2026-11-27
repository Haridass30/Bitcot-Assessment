import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { loadDatabaseConfig } from '../config/index.js';
import { createPool } from '../db/connection.js';
import { MySqlEmployeeRepository } from '../repositories/employee.repository.js';
import { EmployeeService } from '../services/employee.service.js';
import { AppError } from '../utils/errors.js';

let employeeService: EmployeeService | undefined;

export function getEmployeeService(): EmployeeService {
  if (!employeeService) {
    const pool = createPool({
      ...loadDatabaseConfig(),
      connectionLimit: 1,
    });

    employeeService = new EmployeeService(
      new MySqlEmployeeRepository(pool),
    );
  }

  return employeeService;
}

export function success(data: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  };
}

export function failure(error: unknown): APIGatewayProxyResultV2 {
  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'BAD_REQUEST', message: 'Invalid JSON body.' }),
    };
  }

  if (error instanceof AppError) {
    const statusCode =
      error.code === 'BAD_USER_INPUT' ? 400 :
      error.code === 'NOT_FOUND' ? 404 :
      409;

    return {
      statusCode,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: error.code,
        message: error.message,
        fields: error.fields,
      }),
    };
  }

  console.error('Lambda operation failed:', error);

  return {
    statusCode: 500,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }),
  };
}
