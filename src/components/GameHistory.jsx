import React, { useEffect, useState } from 'react';
import { getHistory } from '../utils/gameHistory';

export default function GameHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  if (history.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>No local games played yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '16px' }}>
      {history.map((game) => {
        let badgeColor = '#94a3b8';
        let badgeText = 'D';
        if (game.result === 'win') { badgeColor = '#4ade80'; badgeText = 'W'; }
        else if (game.result === 'loss') { badgeColor = '#f87171'; badgeText = 'L'; }

        return (
          <div key={game.id} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '12px', background: 'var(--bg-hover)', borderRadius: '8px',
            fontSize: '13px', color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '24px', height: '24px', borderRadius: '4px', background: badgeColor, 
                color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
              }}>
                {badgeText}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold' }}>{game.opponent}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{game.date}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
              <span>{game.moves} moves</span>
              <span>{Math.floor(game.duration / 60)}:{(game.duration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
