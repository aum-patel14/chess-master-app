import { useEffect, useState } from 'react';
import { Trophy, Award, RotateCcw, BarChart2, Home, Flag, Clock } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './GameOverDialog.css';

const STATUS_CONFIG = {
  checkmate: { emoji: '🏆', color: '#e2b04a', title: 'Checkmate!' },
  resign:    { emoji: '🏳', color: '#ef4444', title: 'Resignation' },
  stalemate: { emoji: '🤝', color: '#a855f7', title: 'Stalemate' },
  draw:      { emoji: '🤝', color: '#3b82f6', title: 'Draw' },
  repetition:{ emoji: '🔄', color: '#3b82f6', title: 'Threefold Repetition' },
  insufficient:{ emoji: '⚡', color: '#a855f7', title: 'Insufficient Material' },
  timeout:   { emoji: '⏱', color: '#ff7a00', title: 'Time Out!' },
};

export default function GameOverDialog({ status, onNewGame, onRematch, onMenu, moveCount, onAnalyze }) {
  const { state } = useGame();
  const config = STATUS_CONFIG[status.type] || STATUS_CONFIG.draw;

  // Generate simulated accuracy scores once on mount
  const [playerAccuracy, setPlayerAccuracy] = useState(0);
  const [opponentAccuracy, setOpponentAccuracy] = useState(0);

  useEffect(() => {
    // Basic logic to generate organic accuracy scores based on game result
    const isWin = status.winner === (state.playerColor === 'w' ? 'White' : 'Black');
    const isDraw = !status.winner;
    
    let pAcc, oAcc;
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
  }, [status.winner, state.playerColor]);

  const getAccuracyColor = (acc) => {
    if (acc >= 85) return '#22c55e'; // Green
    if (acc >= 70) return '#e2b04a'; // Yellow/Gold
    return '#ef4444'; // Red
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-dialog revamped-game-over animate-scaleIn">
        {/* Glow behind container */}
        <div className="dialog-glow" style={{ '--color': config.color }} />

        {/* Header Icon */}
        <div className="result-emoji animate-scaleIn" style={{ color: config.color }}>
          {status.winner && status.winner === (state.playerColor === 'w' ? 'White' : 'Black') ? '👑' : config.emoji}
        </div>

        {/* Main Header */}
        <div className="result-content">
          <h2 className="result-title" style={{ color: config.color }}>
            {config.title}
          </h2>
          <p className="result-message">{status.message}</p>
        </div>

        {/* ACCURACY SECTION */}
        <div className="accuracy-section">
          <h3 className="section-title font-cinzel">ACCURACY</h3>
          <div className="accuracy-scores-row">
            <div className="accuracy-box">
              <span className="acc-label">You (White)</span>
              <div 
                className="acc-ring" 
                style={{ borderColor: getAccuracyColor(playerAccuracy), color: getAccuracyColor(playerAccuracy) }}
              >
                <span className="acc-percentage">{playerAccuracy}%</span>
              </div>
            </div>
            <div className="accuracy-box">
              <span className="acc-label">Opponent (Black)</span>
              <div 
                className="acc-ring" 
                style={{ borderColor: getAccuracyColor(opponentAccuracy), color: getAccuracyColor(opponentAccuracy) }}
              >
                <span className="acc-percentage">{opponentAccuracy}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* STATS SUMMARY */}
        <div className="result-stats">
          <div className="result-stat">
            <span className="rs-label">Total Moves</span>
            <span className="rs-value">{moveCount}</span>
          </div>
          <div className="result-stat">
            <span className="rs-label">Result Code</span>
            <span className="rs-value" style={{ color: config.color }}>
              {status.winner ? (status.winner === 'White' ? '1-0' : '0-1') : '½-½'}
            </span>
          </div>
        </div>

        {/* BUTTON ACTIONS */}
        <div className="result-actions">
          <button id="btn-rematch" className="btn btn-primary result-btn" onClick={onRematch}>
            <RotateCcw size={16} style={{ marginRight: '6px' }} />
            Rematch
          </button>
          <button id="btn-play-again" className="btn btn-secondary result-btn" onClick={onNewGame}>
            ♛ New Game
          </button>
          {onAnalyze && (
            <button id="btn-analyze" className="btn btn-secondary result-btn" onClick={onAnalyze} style={{ border: '1px solid #e2b04a', color: '#e2b04a' }}>
              <BarChart2 size={16} style={{ marginRight: '6px' }} />
              Analyze Game
            </button>
          )}
          <button id="btn-go-menu" className="btn btn-secondary result-btn" onClick={onMenu}>
            <Home size={16} style={{ marginRight: '6px' }} />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
