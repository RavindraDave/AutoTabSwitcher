import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { PremiumProvider } from './context/PremiumContext';
import './styles/globals.css';

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <ToastProvider>
            <PremiumProvider>
              <SettingsProvider>
                <App />
              </SettingsProvider>
            </PremiumProvider>
          </ToastProvider>
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
