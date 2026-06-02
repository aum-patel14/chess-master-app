import { useEffect, useRef } from 'react';
import './ChessClock.css';

export default function ChessClock({ whiteTime, blackTime, activeColor, isGameOver, onTimeout }) {
  const prevWhiteRef = useRef(whiteTime);
  const prevBlackRef = useRef(blackTime);

  // Auto-flagging check
  useEffect(() => {
    if (isGameOver) return;

    if (whiteTime <= 0 && prevWhiteRef.current > 0) {
      onTimeout('b', 'Time! Black wins on time.');
    }
    if (blackTime <= 0 && prevBlackRef.current > 0) {
      onTimeout('w', 'Time! White wins on time.');
    }

    prevWhiteRef.current = whiteTime;
    prevBlackRef.current = blackTime;
  }, [whiteTime, blackTime, isGameOver, onTimeout]);

  const formatClock = (secs) => {
    if (secs <= 0) return '0:00.0';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    
    // Decisecond format for extreme low time (under 10s)
    if (secs < 10) {
      const tenths = Math.floor((secs % 1) * 10);
      return `0:0${seconds}.${tenths}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWhiteLow = whiteTime < 30 && whiteTime > 0;
  const isBlackLow = blackTime < 30 && blackTime > 0;

  return (
    <div className="chess-clock-container">
      {/* Black Player Clock */}
      <div 
        className={`clock-box black-clock ${activeColor === 'b' && !isGameOver ? 'active' : ''} ${isBlackLow && !isGameOver ? 'low-time' : ''}`}
      >
        <span className="clock-label">BLACK</span>
        <span className="clock-time font-cinzel">
          {blackTime <= 0 ? 'Time!' : formatClock(blackTime)}
        </span>
      </div>

      {/* White Player Clock */}
      <div 
        className={`clock-box white-clock ${activeColor === 'w' && !isGameOver ? 'active' : ''} ${isWhiteLow && !isGameOver ? 'low-time' : ''}`}
      >
        <span className="clock-label">WHITE</span>
        <span className="clock-time font-cinzel">
          {whiteTime <= 0 ? 'Time!' : formatClock(whiteTime)}
        </span>
      </div>
    </div>
  );
}
