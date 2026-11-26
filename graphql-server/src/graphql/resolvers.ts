import type {
  CreateEmployeeInput,
  EmployeeFilter,
  UpdateEmployeeInput,
} from '../models/employee.js';
import type { GraphQLContext } from './context.js';

/** Thin resolvers: all validation and business rules live in EmployeeService. */
export const resolvers = {
  Query: {
    employees: (_: unknown, args: { filter?: EmployeeFilter | null }, ctx: GraphQLContext) =>
      ctx.employeeService.listEmployees(args.filter),
    employee: (_: unknown, args: { id: string }, ctx: GraphQLContext) => ctx.employeeService.getEmployee(args.id),
  },
  Mutation: {
    createEmployee: (_: unknown, args: { input: CreateEmployeeInput }, ctx: GraphQLContext) =>
      ctx.employeeService.createEmployee(args.input),
    updateEmployee: (_: unknown, args: { id: string; input: UpdateEmployeeInput }, ctx: GraphQLContext) =>
      ctx.employeeService.updateEmployee(args.id, args.input),
    deleteEmployee: (_: unknown, args: { id: string }, ctx: GraphQLContext) =>
      ctx.employeeService.deleteEmployee(args.id),
  },
};
