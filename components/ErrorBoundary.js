import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
          <div className="card card-clean" style={{ padding: '24px 16px' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>🌱</span>
            <h2 style={{ fontSize: '20px', color: '#166534', margin: '0 0 8px 0' }}>
              Something went wrong / कुछ गड़बड़ हुई
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              The application encountered an unexpected issue. Please reload to continue using the Soil Health Advisor.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReload}
              style={{ maxWidth: '240px', margin: '0 auto' }}
            >
              🔄 Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
