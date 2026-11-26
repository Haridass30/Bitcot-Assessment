import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { createApolloClient } from './apollo/client';
import { ToastProvider } from './context/ToastContext';
import { App } from './App';
import './index.css';

const client = createApolloClient();
const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>,
);
