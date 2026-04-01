'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[StellarKraal] Unhandled React error:', error, info.componentStack);
  }

  private retry = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#fafafa',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐄</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#171717', margin: '0 0 0.5rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#525252', maxWidth: '400px', textAlign: 'center', margin: '0 0 1.5rem' }}>
          An unexpected error occurred in StellarKraal. Your funds are safe on-chain.
        </p>
        {this.state.error && (
          <pre
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '0.375rem',
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              color: '#b91c1c',
              maxWidth: '500px',
              overflowX: 'auto',
              marginBottom: '1.5rem',
            }}
          >
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.retry}
          style={{
            background: '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.625rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
