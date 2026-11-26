import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { EmployeesPage } from '../EmployeesPage';
import { GET_EMPLOYEES } from '../../graphql/employees';
import { makeEmployee } from '../../test/fixtures';
import { renderWithProviders } from '../../test/renderWithProviders';

const employees = [
  makeEmployee({ id: '1', name: 'Jane Doe', email: 'jane@example.com', department: 'Engineering' }),
  makeEmployee({ id: '2', name: 'John Smith', email: 'john@example.com', department: 'Sales', status: 'INACTIVE' }),
];

describe('EmployeesPage', () => {
  it('shows a loading state, then renders employees from the GraphQL API', async () => {
    renderWithProviders(<EmployeesPage />, {
      mocks: [{ request: { query: GET_EMPLOYEES, variables: { filter: {} } }, result: { data: { employees } } }],
    });

    expect(screen.getByText('Loading employees…')).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(table).getByText('john@example.com')).toBeInTheDocument();
    expect(within(table).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('2 employees')).toBeInTheDocument();
  });

  it('queries with the department filter taken from the URL', async () => {
    renderWithProviders(<EmployeesPage />, {
      route: '/employees?department=Sales',
      mocks: [
        {
          request: { query: GET_EMPLOYEES, variables: { filter: { department: 'Sales' } } },
          result: { data: { employees: [employees[1]!] } },
        },
      ],
    });

    const table = await screen.findByRole('table');
    expect(within(table).getByText('John Smith')).toBeInTheDocument();
    expect(within(table).queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filter by department')).toHaveValue('Sales');
  });

  it('shows an empty state for a search with no results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeesPage />, {
      mocks: [
        { request: { query: GET_EMPLOYEES, variables: { filter: {} } }, result: { data: { employees } } },
        { request: { query: GET_EMPLOYEES, variables: { filter: { search: 'zzz' } } }, result: { data: { employees: [] } } },
      ],
    });

    await screen.findByRole('table');
    await user.type(screen.getByLabelText('Search employees by name'), 'zzz');
    expect(await screen.findByText('No matching employees')).toBeInTheDocument();
  });

  it('shows an error state with retry when the query fails', async () => {
    renderWithProviders(<EmployeesPage />, {
      mocks: [
        {
          request: { query: GET_EMPLOYEES, variables: { filter: {} } },
          result: { errors: [new GraphQLError('Database unavailable')] },
        },
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
