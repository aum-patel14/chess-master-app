import { Component } from 'react'

const homeHref = `${import.meta.env.BASE_URL || '/chess-master-app/'}#/`

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('=== CHESS APP CRASH ===')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    console.error('Component trace:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#1a1a2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>♟</div>
          <h2 style={{ color: '#e2b04a', fontSize: '20px', margin: '0 0 8px' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 4px' }}>
            {err?.message ?? 'Unknown error'}
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '11px',
              fontFamily: 'monospace',
              margin: '0 0 24px',
              maxWidth: '500px',
            }}
          >
            Check browser console (F12) for full details
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '10px 24px',
                background: '#e2b04a',
                border: 'none',
                borderRadius: '8px',
                color: '#1a1a2e',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = homeHref
              }}
              style={{
                padding: '10px 24px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: 'white',
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
