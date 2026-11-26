import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeForm } from '../EmployeeForm';

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), '  Ada Lovelace ');
  await user.type(screen.getByLabelText('Email'), 'Ada@Example.com');
  await user.selectOptions(screen.getByLabelText('Department'), 'Engineering');
  await user.type(screen.getByLabelText('Designation'), 'Mathematician');
  await user.type(screen.getByLabelText('Joining date'), '2024-03-10');
}

describe('EmployeeForm', () => {
  it('shows validation errors and does not submit when the form is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EmployeeForm submitLabel="Create employee" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Department is required.')).toBeInTheDocument();
    expect(screen.getByText('Designation is required.')).toBeInTheDocument();
    expect(screen.getByText('Joining date is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates a field when it loses focus', async () => {
    const user = userEvent.setup();
    render(<EmployeeForm submitLabel="Save" onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.tab();

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('submits trimmed, normalised values when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EmployeeForm submitLabel="Create employee" onSubmit={onSubmit} />);

    await fillValidForm(user);
    await user.selectOptions(screen.getByLabelText('Employment status'), 'ON_LEAVE');
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      department: 'Engineering',
      designation: 'Mathematician',
      joiningDate: '2024-03-10',
      status: 'ON_LEAVE',
    });
  });

  it('pre-fills initial values for editing and displays server-side field errors', () => {
    render(
      <EmployeeForm
        submitLabel="Save changes"
        initialValues={{
          name: 'Grace Hopper',
          email: 'grace@example.com',
          department: 'Engineering',
          designation: 'Admiral',
          joiningDate: '2020-01-01',
          status: 'ACTIVE',
        }}
        serverErrors={{ email: 'An employee with this email already exists.' }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Full name')).toHaveValue('Grace Hopper');
    expect(screen.getByLabelText('Department')).toHaveValue('Engineering');
    expect(screen.getByText('An employee with this email already exists.')).toBeInTheDocument();
  });

  it('disables the submit button while submitting', () => {
    render(<EmployeeForm submitLabel="Create employee" submitting onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Create employee' })).toBeDisabled();
  });
});
