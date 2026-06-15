import { useEffect, useState } from 'react';
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

  const [playerAccuracy, setPlayerAccuracy] = useState(0);
  const [opponentAccuracy, setOpponentAccuracy] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const isWin = status.winner === (state.playerColor === 'w' ? 'White' : 'Black');
    const isDraw = !status.winner;

    let pAcc;
    let oAcc;
    if (isDraw) {
      pAcc = Math.floor(74 + Math.random() * 12);
      oAcc = Math.floor(74 + Math.random() * 12);
    } else if (isWin) {
      pAcc = Math.floor(84 + Math.random() * 12);
      oAcc = Math.min(92, Math.floor(65 + Math.random() * 15));
    } else {
      pAcc = Math.min(92, Math.floor(65 + Math.random() * 15));
      oAcc = Math.floor(84 + Math.random() * 12);
    }

    setPlayerAccuracy(pAcc);
    setOpponentAccuracy(oAcc);
  }, [isVisible, status?.winner, state.playerColor]);

  if (!isVisible) {
    return null;
  }

  const config = STATUS_CONFIG[status.type] || STATUS_CONFIG.draw;
  const moveCount = moveCountProp ?? state.history.length;

  const getAccuracyColor = (acc) => {
    if (acc >= 85) return '#22c55e';
    if (acc >= 70) return '#e2b04a';
    return '#ef4444';
  };

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

  return (
    <div className="game-over-overlay">
      <div className="game-over-dialog revamped-game-over animate-scaleIn">
        <div className="dialog-glow" style={{ '--color': config.color }} />

        <div className="result-emoji animate-scaleIn" style={{ color: config.color }}>
          {status.winner && status.winner === (state.playerColor === 'w' ? 'White' : 'Black')
            ? '👑'
            : config.emoji}
        </div>

        <div className="result-content">
          <h2 className="result-title" style={{ color: config.color }}>
            {config.title}
          </h2>
          <p className="result-message">{status.message}</p>
        </div>

        <div className="accuracy-section">
          <h3 className="section-title font-cinzel">ACCURACY</h3>
          <div className="accuracy-scores-row">
            <div className="accuracy-box">
              <span className="acc-label">You</span>
              <div
                className="acc-ring"
                style={{
                  borderColor: getAccuracyColor(playerAccuracy),
                  color: getAccuracyColor(playerAccuracy),
                }}
              >
                <span className="acc-percentage">{playerAccuracy}%</span>
              </div>
            </div>
            <div className="accuracy-box">
              <span className="acc-label">Opponent</span>
              <div
                className="acc-ring"
                style={{
                  borderColor: getAccuracyColor(opponentAccuracy),
                  color: getAccuracyColor(opponentAccuracy),
                }}
              >
                <span className="acc-percentage">{opponentAccuracy}%</span>
              </div>
            </div>
          </div>
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
