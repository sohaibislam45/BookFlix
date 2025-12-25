'use client';

import React from 'react';
import { showError } from '@/lib/swal';
import Link from 'next/link';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log to error reporting service in production
    // Example: logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Show user-friendly error message
    showError(
      'Something went wrong',
      'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-dark p-6">
          <div className="max-w-md w-full bg-surface-dark rounded-2xl border border-white/10 p-8 text-center">
            <div className="mb-6">
              <span className="material-symbols-outlined text-6xl text-alert-red mb-4">error</span>
              <h2 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h2>
              <p className="text-text-secondary text-sm">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-black/20 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-alert-red text-xs font-mono mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-text-secondary overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-primary/20"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center border border-white/10"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

