import { Component, ReactNode, ErrorInfo } from 'react'

interface State { hasError: boolean; error?: Error }
interface Props { children: ReactNode }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('=== CHESS APP CRASH ===')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    console.error('Component trace:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a14', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: '48px', color: '#D4AF37' }}>♛</div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.8rem', letterSpacing: '2px', color: '#D4AF37', margin: '8px 0 16px' }}>ChessMaster Pro</h1>
          <p style={{ color: '#aaa', marginBottom: '24px' }}>Something went wrong. Please refresh the page.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Refresh
          </button>
          {import.meta.env.DEV && (
            <pre style={{ marginTop: '24px', padding: '12px', background: '#1a1a2e', color: '#ef4444', borderRadius: '6px', fontSize: '13px', maxWidth: '80%', overflowX: 'auto' }}>
              {this.state.error?.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
