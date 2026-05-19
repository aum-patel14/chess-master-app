import React, { useEffect, useState } from 'react';
import { Trophy, Handshake, Flag, Share2, Copy, ExternalLink, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { useToast } from '../hooks/useToast';
import './GameOverModal.css';

export default function GameOverModal() {
  const { state, startNewGame, eloChange } = useGame();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { status, moveCount, gameStartTime, history, fen } = state;
  const isGameOver = status.type !== 'playing' && status.type !== 'check';

  const [openingInfo, setOpeningInfo] = useState(null);

  useEffect(() => {
    if (isGameOver) {
      const isWin = 
        (status.winner === 'White' && state.playerColor === 'w') || 
        (status.winner === 'Black' && state.playerColor === 'b');
        
      if (isWin) {
        confetti({ particleCount: 150, spread: 70, colors: ['#D4AF37','#FFD700','#fff'] });
      }

      // Fetch Opening from Lichess Explorer
      const moves = history.map(m => m.san).join(',');
      if (moves) {
        fetch(`https://explorer.lichess.ovh/lichess?play=${moves}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.opening) setOpeningInfo(data.opening);
          })
          .catch(err => console.error('Opening explorer failed', err));
      }
    }
  }, [isGameOver, status.winner, state.playerColor, history]);

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

        {/* Phase 8: Opening Explorer */}
        {openingInfo && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'left', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Opening Played</div>
            <div style={{ fontWeight: 600, color: '#e8e8e8', display: 'flex', justifyContent: 'space-between' }}>
              <span>{openingInfo.name}</span>
              <span style={{ color: 'var(--gold)' }}>{openingInfo.eco}</span>
            </div>
          </div>
        )}

        {/* Phase 7: Post-Game Coaching (Mock Data) */}
        <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            <TrendingUp size={18} color="var(--gold)" />
            <span style={{ fontWeight: 700 }}>Match Analysis</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Accuracy</div>
              <div style={{ fontWeight: 800, color: isWin ? '#4ade80' : '#fbbf24', fontSize: '18px' }}>{isWin ? '92.4%' : '78.1%'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Blunders</div>
              <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '18px' }}>{isWin ? '0' : '2'}</div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#e8e8e8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><Lightbulb size={14} color="var(--gold)" /> Keep controlling the center early.</div>
            {!isWin && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} color="#ef4444" /> Watch out for fork tactics on move 14.</div>}
          </div>
        </div>

        {/* Phase 9: Share Sheet */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button 
            className="btn-feature outline" 
            style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', gap: '6px', justifyContent: 'center' }}
            onClick={() => {
              const pgnStr = history.map((m, i) => (i % 2 === 0 ? `${Math.floor(i/2)+1}. ` : '') + m.san).join(' ');
              navigator.clipboard.writeText(pgnStr);
              showToast('PGN Copied to clipboard', 'success');
            }}
          >
            <Copy size={16} /> PGN
          </button>
          <button 
            className="btn-feature outline" 
            style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', gap: '6px', justifyContent: 'center' }}
            onClick={() => {
              const hash = btoa(history.map(m=>m.san).join(','));
              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?game=${hash}`);
              showToast('Game Link Copied', 'success');
            }}
          >
            <Share2 size={16} /> Link
          </button>
          <button 
            className="btn-feature outline" 
            style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', gap: '6px', justifyContent: 'center' }}
            onClick={() => {
              const pgnStr = history.map((m, i) => (i % 2 === 0 ? `${Math.floor(i/2)+1}. ` : '') + m.san).join(' ');
              window.open(`https://lichess.org/paste?pgn=${encodeURIComponent(pgnStr)}`, '_blank');
            }}
          >
            <ExternalLink size={16} /> Lichess
          </button>
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
