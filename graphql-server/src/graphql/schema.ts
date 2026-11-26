export const typeDefs = /* GraphQL */ `#graphql
  "Employment status of an employee."
  enum EmployeeStatus {
    ACTIVE
    INACTIVE
    ON_LEAVE
  }

  type Employee {
    id: ID!
    name: String!
    email: String!
    department: String!
    designation: String!
    "Calendar date in YYYY-MM-DD format."
    joiningDate: String!
    status: EmployeeStatus!
    "ISO-8601 timestamp (UTC)."
    createdAt: String!
    "ISO-8601 timestamp (UTC)."
    updatedAt: String!
  }

  input EmployeeFilter {
    "Case-insensitive partial match on employee name."
    search: String
    "Exact department match."
    department: String
    status: EmployeeStatus
  }

  input CreateEmployeeInput {
    name: String!
    email: String!
    department: String!
    designation: String!
    "YYYY-MM-DD"
    joiningDate: String!
    status: EmployeeStatus = ACTIVE
  }

  "All fields are optional; only provided fields are updated."
  input UpdateEmployeeInput {
    name: String
    email: String
    department: String
    designation: String
    joiningDate: String
    status: EmployeeStatus
  }

  type Query {
    "List employees, newest first. Optionally filter by name search, department and status."
    employees(filter: EmployeeFilter): [Employee!]!
    "Fetch a single employee. Returns null when the employee does not exist."
    employee(id: ID!): Employee
  }

  type Mutation {
    createEmployee(input: CreateEmployeeInput!): Employee!
    updateEmployee(id: ID!, input: UpdateEmployeeInput!): Employee!
    "Deletes an employee and returns the deleted employee's ID."
    deleteEmployee(id: ID!): ID!
  }
`;
