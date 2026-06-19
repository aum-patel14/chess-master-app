import { useLocation } from 'react-router-dom';
import ChesscomLayout from '../chesscom/ChesscomLayout';
import './AppShell.css';

export default function AppShell({ children }) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return (
      <div className="app-shell landing-shell">
        <main style={{ width: '100%' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ChesscomLayout>{children}</ChesscomLayout>
    </div>
  );
}
