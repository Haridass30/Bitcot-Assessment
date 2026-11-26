import { useMutation } from '@apollo/client/react';
import { DELETE_EMPLOYEE } from '../graphql/employees';
import { useToast } from '../context/ToastContext';
import type { Employee } from '../types/employee';
import { getErrorMessage } from '../utils/errors';

/** Deletes an employee, evicts it from the Apollo cache and shows a toast. Resolves to true on success. */
export function useDeleteEmployee() {
  const toast = useToast();
  const [mutate, { loading }] = useMutation(DELETE_EMPLOYEE, {
    update(cache, { data }) {
      if (!data) return;
      cache.evict({ id: cache.identify({ __typename: 'Employee', id: data.deleteEmployee }) });
      cache.gc();
    },
  });

  const deleteEmployee = async (employee: Employee): Promise<boolean> => {
    try {
      await mutate({ variables: { id: employee.id } });
      toast.success(`${employee.name} was deleted.`);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete employee.'));
      return false;
    }
  };

  return { deleteEmployee, loading };
}
