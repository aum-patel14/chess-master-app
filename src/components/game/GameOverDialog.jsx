import { useEffect, useMemo } from 'react';
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

  // Estimate game duration as moveCount * 3 seconds, formatted as m:ss
  const estimatedDuration = useMemo(() => {
    const totalSeconds = moveCount * 3;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [moveCount]);

  // Generate confetti pieces for win/checkmate
  const isWin = status.type === 'checkmate' || status.type === 'win';
  const confettiPieces = useMemo(() => {
    if (!isWin) return null;
    const colors = ['#e2b04a', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 2).toFixed(2)}s`,
      duration: `${(2 + Math.random() * 2).toFixed(2)}s`,
    }));
  }, [isWin]);

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
        {/* Confetti container for win/checkmate */}
        {isWin && confettiPieces && (
          <div className="confetti-container" aria-hidden="true">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="confetti-piece"
                style={{
                  backgroundColor: piece.color,
                  left: piece.left,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                }}
              />
            ))}
          </div>
        )}
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
            <span className="rs-label">Duration</span>
            <span className="rs-value">{estimatedDuration}</span>
          </div>
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
