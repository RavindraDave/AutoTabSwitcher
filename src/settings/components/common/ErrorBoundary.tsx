import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to storage for diagnostics
    this.logError(error, errorInfo);
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const result = await chrome.storage.local.get('diagnosticLogs');
      const logs: string[] = result.diagnosticLogs || [];

      const logEntry = `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${errorInfo.componentStack}`;
      logs.push(logEntry);

      // Keep only last 100 logs
      const trimmedLogs = logs.slice(-100);
      await chrome.storage.local.set({ diagnosticLogs: trimmedLogs });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.iconWrapper}>
              <Icon name="alertCircle" size={48} />
            </div>
            <h2 className={styles.title}>Something went wrong</h2>
            <p className={styles.message}>
              An error occurred while loading this section. Please try again.
            </p>

            {this.state.error && (
              <details className={styles.details}>
                <summary>Technical Details</summary>
                <pre className={styles.errorText}>
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className={styles.actions}>
              <Button variant="primary" onClick={this.handleRetry}>
                Try Again
              </Button>
              <Button variant="secondary" onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for functional components to manually trigger error boundary
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  return (error: Error) => setError(error);
}
