import './errorGuard';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Global error handlers to intercept and suppress unhandled promise rejections & async errors
if (typeof window !== 'undefined') {
  window.onerror = function (message, source, lineno, colno, error) {
    console.warn('[Global Safe Guard] Handled window error:', message, error);
    return true; // Suppress default browser error reporting
  };

  window.addEventListener('error', (event) => {
    console.warn('[Global Safe Guard] Handled error event:', event.message || event);
    event.preventDefault();
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global Safe Guard] Handled unhandled rejection:', event.reason);
    event.preventDefault();
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>
);

