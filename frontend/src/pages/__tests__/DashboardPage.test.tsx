import { screen } from '@testing-library/react';
import { DashboardPage } from '../DashboardPage';
import { GET_EMPLOYEES } from '../../graphql/employees';
import { makeEmployee } from '../../test/fixtures';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('DashboardPage', () => {
  it('computes overview statistics and lists recently added employees', async () => {
    const employees = [
      makeEmployee({ id: '1', name: 'Old Timer', email: 'a@x.com', department: 'Sales', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeEmployee({ id: '2', name: 'Newest Hire', email: 'b@x.com', department: 'Engineering', createdAt: '2025-06-01T00:00:00.000Z' }),
      makeEmployee({ id: '3', name: 'On Break', email: 'c@x.com', department: 'Engineering', status: 'ON_LEAVE', createdAt: '2025-01-01T00:00:00.000Z' }),
    ];
    renderWithProviders(<DashboardPage />, {
      mocks: [{ request: { query: GET_EMPLOYEES, variables: {} }, result: { data: { employees } } }],
    });

    const total = await screen.findByText('Total employees');
    expect(total.nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Active employees').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Departments').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('On leave').nextElementSibling).toHaveTextContent('1');

    const recent = screen.getAllByText(/Newest Hire|On Break|Old Timer/).map((el) => el.textContent);
    expect(recent).toEqual(['Newest Hire', 'On Break', 'Old Timer']);
  });
});
