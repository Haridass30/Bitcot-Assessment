import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { CREATE_EMPLOYEE } from '../graphql/employees';
import { EmployeeForm } from '../components/EmployeeForm';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import type { EmployeeInput } from '../types/employee';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import type { EmployeeFormErrors } from '../utils/validation';

export function CreateEmployeePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [serverErrors, setServerErrors] = useState<EmployeeFormErrors>({});
  const [createEmployee, { loading }] = useMutation(CREATE_EMPLOYEE, { refetchQueries: ['GetEmployees'] });

  const handleSubmit = async (input: EmployeeInput) => {
    setServerErrors({});
    try {
      const { data } = await createEmployee({ variables: { input } });
      toast.success(`${input.name} was added successfully.`);
      await navigate(data ? `/employees/${data.createEmployee.id}` : '/employees');
    } catch (error) {
      setServerErrors(getFieldErrors(error));
      toast.error(getErrorMessage(error, 'Failed to create employee.'));
    }
  };

  return (
    <>
      <PageHeader title="Add employee" description="Create a new employee record." />
      <EmployeeForm
        submitLabel="Create employee"
        submitting={loading}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(-1)}
      />
    </>
  );
}
