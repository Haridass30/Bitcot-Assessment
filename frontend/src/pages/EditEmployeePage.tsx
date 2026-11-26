import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { GET_EMPLOYEE, UPDATE_EMPLOYEE } from '../graphql/employees';
import { EmployeeForm } from '../components/EmployeeForm';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import { useToast } from '../context/ToastContext';
import type { EmployeeInput } from '../types/employee';
import { getErrorMessage, getFieldErrors } from '../utils/errors';
import type { EmployeeFormErrors } from '../utils/validation';

export function EditEmployeePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [serverErrors, setServerErrors] = useState<EmployeeFormErrors>({});
  // network-only so the form is always initialised from the latest server state.
  const { data, loading, error, refetch } = useQuery(GET_EMPLOYEE, { variables: { id }, fetchPolicy: 'network-only' });
  const [updateEmployee, { loading: saving }] = useMutation(UPDATE_EMPLOYEE, { refetchQueries: ['GetEmployees'] });

  if (loading && !data) return <LoadingState message="Loading employee…" />;
  if (error && !data) return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  const employee = data?.employee;
  if (!employee) {
    return <ErrorState title="Employee not found" message="The employee you are trying to edit does not exist." />;
  }

  const initialValues: EmployeeInput = {
    name: employee.name,
    email: employee.email,
    department: employee.department,
    designation: employee.designation,
    joiningDate: employee.joiningDate,
    status: employee.status,
  };

  const handleSubmit = async (input: EmployeeInput) => {
    setServerErrors({});
    try {
      await updateEmployee({ variables: { id: employee.id, input } });
      toast.success(`${input.name} was updated successfully.`);
      await navigate(`/employees/${employee.id}`);
    } catch (err) {
      setServerErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'Failed to update employee.'));
    }
  };

  return (
    <>
      <PageHeader title="Edit employee" description={`Update details for ${employee.name}.`} />
      <EmployeeForm
        key={employee.id}
        initialValues={initialValues}
        submitLabel="Save changes"
        submitting={saving}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(`/employees/${employee.id}`)}
      />
    </>
  );
}
