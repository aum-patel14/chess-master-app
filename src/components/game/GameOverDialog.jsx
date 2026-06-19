import { useEffect } from 'react';
import { RotateCcw, BarChart2, Home } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useNavigate } from 'react-router-dom';
import './GameOverDialog.css';

const STATUS_CONFIG = {
  checkmate: { emoji: '🏆', color: '#e2b04a', title: 'Checkmate!' },
  win: { emoji: '🏆', color: '#81b64c', title: 'You Win!' },
  loss: { emoji: '🏳', color: '#ef4444', title: 'You Lose' },
  resign: { emoji: '🏳', color: '#ef4444', title: 'Resignation' },
  stalemate: { emoji: '🤝', color: '#a855f7', title: 'Stalemate' },
  draw: { emoji: '🤝', color: '#3b82f6', title: 'Draw' },
  repetition: { emoji: '🔄', color: '#3b82f6', title: 'Threefold Repetition' },
  insufficient: { emoji: '⚡', color: '#a855f7', title: 'Insufficient Material' },
  timeout: { emoji: '⏱', color: '#ff7a00', title: 'Time Out!' },
};

export default function GameOverDialog({
  status: statusProp,
  onNewGame,
  onRematch,
  onMenu,
  moveCount: moveCountProp,
  onAnalyze,
}) {
  const { state, playerElo, eloChange, startNewGame } = useGame();
  const navigate = useNavigate();
  const status = statusProp || state.status;
  const isVisible = status && status.type !== 'playing' && status.type !== 'check';

  if (!isVisible) {
    return null;
  }

  const config = STATUS_CONFIG[status.type] || STATUS_CONFIG.draw;
  const moveCount = moveCountProp ?? state.history.length;

  const handleNewGame = () => {
    if (onNewGame) {
      onNewGame();
      return;
    }
    startNewGame({
      mode: state.gameMode,
      playerColor: state.playerColor,
      difficulty: state.aiDifficulty,
      botId: state.aiBotId,
    });
  };

  const handleRematch = () => {
    if (onRematch) {
      onRematch();
      return;
    }
    handleNewGame();
  };

  const handleMenu = () => {
    if (onMenu) {
      onMenu();
      return;
    }
    navigate('/');
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleMenu();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="game-over-overlay" role="presentation">
      <div className="game-over-dialog revamped-game-over animate-scaleIn" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <div className="dialog-glow" style={{ '--color': config.color }} />

        <div className="result-emoji animate-scaleIn" style={{ color: config.color }}>
          {status.winner && status.winner === (state.playerColor === 'w' ? 'White' : 'Black')
            ? '👑'
            : config.emoji}
        </div>

        <div className="result-content">
          <h2 id="game-over-title" className="result-title" style={{ color: config.color }}>
            {config.title}
          </h2>
          <p className="result-message">{status.message}</p>
        </div>

        <div className="result-stats">
          <div className="result-stat">
            <span className="rs-label">Moves</span>
            <span className="rs-value">{moveCount}</span>
          </div>
          {state.gameMode === 'vsAI' && (
            <div className="result-stat">
              <span className="rs-label">ELO</span>
              <span className="rs-value" style={{ color: '#d4af37' }}>
                {playerElo}
                {eloChange !== 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: eloChange > 0 ? '#22c55e' : '#ef4444',
                      marginLeft: '3px',
                    }}
                  >
                    ({eloChange > 0 ? '+' : ''}
                    {eloChange})
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="result-stat">
            <span className="rs-label">Result</span>
            <span className="rs-value" style={{ color: config.color }}>
              {status.winner ? (status.winner === 'White' ? '1-0' : '0-1') : '½-½'}
            </span>
          </div>
        </div>

        <div className="result-actions">
          <button type="button" className="btn btn-primary result-btn" onClick={handleRematch}>
            <RotateCcw size={16} style={{ marginRight: '6px' }} />
            Play Again
          </button>
          <button type="button" className="btn btn-secondary result-btn" onClick={handleNewGame}>
            ♛ New Game
          </button>
          {onAnalyze && (
            <button
              type="button"
              className="btn btn-secondary result-btn"
              onClick={onAnalyze}
              style={{ border: '1px solid #e2b04a', color: '#e2b04a' }}
            >
              <BarChart2 size={16} style={{ marginRight: '6px' }} />
              Analyze Game
            </button>
          )}
          <button type="button" className="btn btn-secondary result-btn" onClick={handleMenu}>
            <Home size={16} style={{ marginRight: '6px' }} />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
