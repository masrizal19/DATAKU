import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in DATAKU:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8FF',
          padding: '20px',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '3px solid #0F172A',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '6px 6px 0px #0F172A'
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#FEE2E2',
              border: '2px solid #EF4444',
              color: '#991B1B',
              fontWeight: 800,
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '8px',
              marginBottom: '16px',
              textTransform: 'uppercase'
            }}>
              Terjadi Kesalahan Runtime
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 12px 0' }}>
              DATAKU Mengalami Kendala
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
              {this.state.error?.message || 'Aplikasi tidak dapat memuat tampilan. Silakan muat ulang halaman.'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#0284C7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '2px solid #0F172A',
                  boxShadow: '3px 3px 0px #0F172A',
                  cursor: 'pointer'
                }}
              >
                Muat Ulang Halaman
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                style={{
                  backgroundColor: '#F1F5F9',
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '2px solid #0F172A',
                  cursor: 'pointer'
                }}
              >
                Reset Cache & Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
