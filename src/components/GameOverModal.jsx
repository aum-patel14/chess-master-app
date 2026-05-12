import React, { useEffect } from 'react';
import { Trophy, Handshake, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import './GameOverModal.css';

export default function GameOverModal() {
  const { state, startNewGame, eloChange } = useGame();
  const navigate = useNavigate();

  const { status, moveCount, gameStartTime } = state;
  const isGameOver = status.type !== 'playing' && status.type !== 'check';

  useEffect(() => {
    if (isGameOver) {
      const isWin = 
        (status.winner === 'White' && state.playerColor === 'w') || 
        (status.winner === 'Black' && state.playerColor === 'b');
        
      if (isWin) {
        confetti({ particleCount: 150, spread: 70, colors: ['#D4AF37','#FFD700','#fff'] });
      }
    }
  }, [isGameOver, status.winner, state.playerColor]);

  if (!isGameOver) return null;

  // Determine Title, Subtitle, and Icon
  let title = 'Game Over';
  let subtitle = status.message;
  let Icon = Flag;
  let iconColor = '#ef4444'; // Red for loss

  const isWin = 
    (status.winner === 'White' && state.playerColor === 'w') || 
    (status.winner === 'Black' && state.playerColor === 'b');
    
  const isLoss = status.winner && !isWin;
  const isDraw = !status.winner;

  if (status.type === 'checkmate') {
    if (isWin) {
      title = 'You Won!';
      subtitle = 'by Checkmate';
      Icon = Trophy;
      iconColor = '#D4AF37'; // Gold
    } else {
      title = state.gameMode === 'vsAI' ? 'AI Wins!' : 'Opponent Wins!';
      subtitle = 'by Checkmate';
    }
  } else if (status.type === 'resign') {
    if (isWin) {
      title = 'You Won!';
      subtitle = 'Opponent Resigned';
      Icon = Trophy;
      iconColor = '#D4AF37';
    } else {
      title = 'You Resigned';
      subtitle = 'Match Conceded';
    }
  } else if (isDraw) {
    title = 'Draw!';
    Icon = Handshake;
    iconColor = '#94a3b8'; // Slate
    
    if (status.type === 'stalemate') subtitle = 'by Stalemate';
    else if (status.type === 'repetition') subtitle = 'by Threefold Repetition';
    else subtitle = 'by Agreement';
  }

  // Calculate formatted game time
  let formattedTime = '0:00';
  if (gameStartTime) {
    const totalSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <div className="game-over-icon-wrapper" style={{ color: iconColor }}>
          <Icon size={56} />
        </div>
        
        <h2 className="game-over-title">{title}</h2>
        <p className="game-over-subtitle" style={{ marginBottom: eloChange ? '8px' : '32px' }}>{subtitle}</p>

        {eloChange !== 0 && state.gameMode === 'vsAI' && (
          <div style={{ 
            color: eloChange > 0 ? '#4ade80' : '#f87171', 
            fontWeight: 'bold', 
            fontSize: '18px', 
            marginBottom: '24px' 
          }}>
            {eloChange > 0 ? '+' : ''}{eloChange} ELO
          </div>
        )}

        <div className="game-over-stats">
          <div className="stat-box">
            <span className="stat-label">Moves</span>
            <span className="stat-value">{moveCount}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Time</span>
            <span className="stat-value">{formattedTime}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="play-again-btn" onClick={() => startNewGame()}>
            Play Again
          </button>
          <button className="back-menu-btn" onClick={() => navigate('/')}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
