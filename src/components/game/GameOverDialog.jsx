import './GameOverDialog.css';

const STATUS_CONFIG = {
  checkmate: { emoji: '♚', color: '#c4a028', title: 'Checkmate!' },
  resign:    { emoji: '🏳', color: '#ff6b6b', title: 'Resigned' },
  stalemate: { emoji: '🤝', color: '#8866ff', title: 'Stalemate' },
  draw:      { emoji: '🤝', color: '#8866ff', title: 'Draw' },
  repetition:{ emoji: '🔄', color: '#8866ff', title: 'Repetition' },
  insufficient:{ emoji: '⚡', color: '#8866ff', title: 'Insufficient Material' },
  timeout:   { emoji: '⏱', color: '#ff6b6b', title: 'Time Out' },
};

export default function GameOverDialog({ status, onNewGame, onMenu, moveCount }) {
  const config = STATUS_CONFIG[status.type] || STATUS_CONFIG.draw;

  return (
    <div className="game-over-overlay">
      <div className="game-over-dialog animate-scaleIn">
        {/* Glow */}
        <div className="dialog-glow" style={{ '--color': config.color }} />

        {/* Crown / emoji */}
        <div className="result-emoji animate-scaleIn" style={{ animationDelay: '0.1s' }}>
          {config.emoji}
        </div>

        <div className="result-content">
          <h2 className="result-title" style={{ color: config.color }}>
            {config.title}
          </h2>
          <p className="result-message">{status.message}</p>
          {status.winner && (
            <div className="result-winner">
              🏆 <strong>{status.winner}</strong> wins!
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="result-stats">
          <div className="result-stat">
            <span className="rs-label">Total Moves</span>
            <span className="rs-value">{moveCount}</span>
          </div>
          <div className="result-stat">
            <span className="rs-label">Half Moves</span>
            <span className="rs-value">{Math.ceil(moveCount / 2)}</span>
          </div>
          <div className="result-stat">
            <span className="rs-label">Result</span>
            <span className="rs-value" style={{ color: config.color }}>
              {status.type === 'checkmate' || status.type === 'resign' || status.type === 'timeout'
                ? (status.winner === 'White' ? '1-0' : '0-1')
                : '½-½'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button id="btn-play-again" className="btn btn-primary result-btn" onClick={onNewGame}>
            ♟ Play Again
          </button>
          {onAnalyze && (
            <button id="btn-analyze" className="btn btn-secondary result-btn" onClick={onAnalyze} style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}>
              📊 Analyze Game
            </button>
          )}
          <button id="btn-go-menu" className="btn btn-secondary result-btn" onClick={onMenu}>
            ⌂ Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
