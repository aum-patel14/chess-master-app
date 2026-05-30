import './PlayerInfoBar.css';
import { useGame } from '../../context/GameContext';
import { Crown } from 'lucide-react';

export default function PlayerInfoBar({ player, isAIThinking }) {
  const { state } = useGame();
  const { isPremium } = useGame();

  const formatClockTime = (timeInSeconds) => {
    if (timeInSeconds <= 0) return '0:00.0';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (timeInSeconds < 10) {
      // Under 10s: show tenths of a second ("0:09.4")
      const tenths = Math.floor((timeInSeconds % 1) * 10);
      return `0:0${seconds}.${tenths}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getClockClass = () => {
    let classes = ['info-bar-clock'];
    if (player.isActive && state.timerRunning && !state.isAIThinking) {
      classes.push('clock-active');
    } else {
      classes.push('clock-inactive');
    }
    
    if (player.time < 10) {
      classes.push('clock-danger'); // red + pulse animation
    } else if (player.time < 30) {
      classes.push('clock-warning'); // orange
    }
    
    return classes.join(' ');
  };

  // Get letter of name for avatar
  const avatarLetter = player.name ? player.name.trim().charAt(0).toUpperCase() : 'P';
  
  // Background for avatar based on player color
  const avatarBg = player.color === 'w' ? '#f0d9b5' : '#705335';

  return (
    <div className="player-info-bar">
      {/* Left side: Avatar, Name, Rating */}
      <div className="info-bar-left">
        <div 
          className="info-bar-avatar" 
          style={{ backgroundColor: avatarBg, color: player.color === 'w' ? '#100f20' : '#ffffff' }}
        >
          {avatarLetter}
        </div>
        <div className="info-bar-meta">
          <div className="info-bar-name-row">
            <span className="info-bar-name">{player.name}</span>
            {player.color === 'w' && isPremium && (
              <Crown size={14} className="premium-crown-badge" />
            )}
            {player.color === 'b' && state.gameMode === 'online' && state.opponentName && (
              // If opponent is premium (let's mock it for leaderboard/online parity)
              <Crown size={14} className="premium-crown-badge" style={{ opacity: 0.8 }} />
            )}
          </div>
          <span className="info-bar-rating">{player.rating || 1500}</span>
        </div>
        {player.isAI && isAIThinking && player.isActive && (
          <div className="info-bar-thinking">
            <span className="thinking-dot">.</span>
            <span className="thinking-dot">.</span>
            <span className="thinking-dot">.</span>
          </div>
        )}
      </div>

      {/* Right side: Captures, Material, Clock */}
      <div className="info-bar-right">
        <div className="info-bar-captures-container">
          <div className="info-bar-captured-row">
            {player.captured && player.captured.map((pieceType, index) => {
              const pieceColor = player.color === 'w' ? 'b' : 'w';
              const key = `${pieceColor}${pieceType.toUpperCase()}`;
              return (
                <img 
                  key={index}
                  src={`${import.meta.env.BASE_URL}pieces/cburnett/${key}.svg`} 
                  alt={key} 
                  className="info-bar-captured-piece"
                />
              );
            })}
          </div>
          {player.material > 0 && (
            <span className="info-bar-material">+{player.material}</span>
          )}
        </div>

        {state.timeControl && (
          <div className={getClockClass()}>
            {formatClockTime(player.time)}
          </div>
        )}
      </div>
    </div>
  );
}
