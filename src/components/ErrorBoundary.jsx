import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('=== CHESS APP CRASH ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a14',
            color: '#e8e8e8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>♟</div>
          <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d4af37', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ opacity: 0.85, marginBottom: 8 }}>The game encountered an error.</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: 28 }}>
            {this.state.error?.message}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 10,
                border: 'none',
                background: '#d4af37',
                color: '#0a0a14',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = `${window.location.origin}${window.location.pathname}#/`
              }}
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 10,
                border: '1px solid rgba(212,175,55,0.4)',
                background: 'transparent',
                color: '#d4af37',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
