import { gql, type TypedDocumentNode } from '@apollo/client';
import type { Employee, EmployeeFilter, EmployeeInput } from '../types/employee';

const EMPLOYEE_FIELDS = gql`
  fragment EmployeeFields on Employee {
    id
    name
    email
    department
    designation
    joiningDate
    status
    createdAt
    updatedAt
  }
`;

export interface GetEmployeesData {
  employees: Employee[];
}
export interface GetEmployeesVars {
  filter?: EmployeeFilter;
}

export const GET_EMPLOYEES: TypedDocumentNode<GetEmployeesData, GetEmployeesVars> = gql`
  query GetEmployees($filter: EmployeeFilter) {
    employees(filter: $filter) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export interface GetEmployeeData {
  employee: Employee | null;
}
export interface GetEmployeeVars {
  id: string;
}

export const GET_EMPLOYEE: TypedDocumentNode<GetEmployeeData, GetEmployeeVars> = gql`
  query GetEmployee($id: ID!) {
    employee(id: $id) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export interface CreateEmployeeData {
  createEmployee: Employee;
}
export interface CreateEmployeeVars {
  input: EmployeeInput;
}

export const CREATE_EMPLOYEE: TypedDocumentNode<CreateEmployeeData, CreateEmployeeVars> = gql`
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export interface UpdateEmployeeData {
  updateEmployee: Employee;
}
export interface UpdateEmployeeVars {
  id: string;
  input: Partial<EmployeeInput>;
}

export const UPDATE_EMPLOYEE: TypedDocumentNode<UpdateEmployeeData, UpdateEmployeeVars> = gql`
  mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export interface DeleteEmployeeData {
  deleteEmployee: string;
}
export interface DeleteEmployeeVars {
  id: string;
}

export const DELETE_EMPLOYEE: TypedDocumentNode<DeleteEmployeeData, DeleteEmployeeVars> = gql`
  mutation DeleteEmployee($id: ID!) {
    deleteEmployee(id: $id)
  }
`;
