import request from 'supertest';
import type { Express } from 'express';

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T | null;
  errors?: Array<{ message: string; extensions?: { code?: string; fields?: Record<string, string> } }>;
}

export function graphql(app: Express) {
  return async <T = Record<string, unknown>>(query: string, variables?: Record<string, unknown>) => {
    const res = await request(app).post('/graphql').set('Content-Type', 'application/json').send({ query, variables });
    return { status: res.status, body: res.body as GraphQLResponse<T> };
  };
}

export const EMPLOYEE_FIELDS = 'id name email department designation joiningDate status createdAt updatedAt';
