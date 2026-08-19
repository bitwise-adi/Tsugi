'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Tsugi(t) Uncaught ErrorBoundary Exception:', error, errorInfo);
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <AlertTriangle size={28} />
            </div>
            <h2 className={styles.title}>Something went wrong</h2>
            <p className={styles.description}>
              Tsugi(t) encountered an unexpected issue. Your local data remains securely stored in IndexedDB.
            </p>
            {this.state.error?.message && (
              <div className={styles.errorMessage}>
                {this.state.error.message}
              </div>
            )}
            <div className={styles.actions}>
              <button className={styles.reloadButton} onClick={this.handleReload}>
                <RefreshCw size={16} />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
