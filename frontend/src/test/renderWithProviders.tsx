import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { ToastProvider } from '../context/ToastContext';

interface Options {
  mocks?: MockLink.MockedResponse[];
  route?: string;
  path?: string;
}

/** Renders a component inside Apollo (mocked), Router and Toast providers. */
export function renderWithProviders(ui: ReactElement, { mocks = [], route = '/', path = '*' }: Options = {}) {
  return render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}
