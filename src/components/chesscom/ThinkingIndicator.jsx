import './chesscom.css';

export default function ThinkingIndicator({ visible, label = 'Stockfish is thinking' }) {
  if (!visible) return null;
  return (
    <div id="thinking-indicator" className="cc-thinking">
      <span>{label}</span>
      <span className="cc-thinking-dots">
        <span className="cc-dot" />
        <span className="cc-dot" />
        <span className="cc-dot" />
      </span>
    </div>
  );
}
