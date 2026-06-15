import ChesscomLayout from '../chesscom/ChesscomLayout';
import './AppShell.css';

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <ChesscomLayout>{children}</ChesscomLayout>
    </div>
  );
}
