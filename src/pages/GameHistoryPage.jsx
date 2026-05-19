import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Clock, Target, Calendar, Activity, ChevronRight } from 'lucide-react';
import { DEMO_GAMES } from '../data/demoData';
import PageShell from '../components/PageShell';
import './GameHistoryPage.css';

export default function GameHistoryPage() {
  const { userData } = useAuth();
  const [filter, setFilter] = useState('All');

  const filteredGames = DEMO_GAMES.filter(game => {
    if (filter === 'All') return true;
    if (filter === 'Wins') return game.result === 'win';
    if (filter === 'Losses') return game.result === 'loss';
    if (filter === 'Draws') return game.result === 'draw';
    return true;
  });



  return (
    <PageShell>
      <div className="history-page" style={{ paddingBottom: '100px' }}>
        <div className="profile-header">
          <div className="profile-avatar">
            {userData?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="profile-info">
            <h1>{userData?.name || 'Player'}</h1>
            <div className="profile-stats">
              <div className="stat-badge">
                <Trophy size={16} color="var(--gold)" />
                <span>{userData?.rating || 1200} Elo</span>
              </div>
              <div className="stat-badge">
                <Activity size={16} color="#0ea5e9" />
                <span>{DEMO_GAMES.length} Games Played</span>
              </div>
            </div>
          </div>
        </div>

        <div className="history-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2>Game Archive</h2>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['All', 'Wins', 'Losses', 'Draws'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: filter === f ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                    background: filter === f ? 'rgba(212,175,55,0.15)' : 'transparent',
                    color: filter === f ? '#d4af37' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          {filteredGames.length === 0 ? (
            <div className="no-games">
              <Target size={32} />
              <p>No games found for this filter.</p>
            </div>
          ) : (
            <div className="games-list" style={{ marginTop: '16px' }}>
              {filteredGames.map(game => {
                const isWin = game.result === 'win';
                const isLoss = game.result === 'loss';
                
                let resultClass = 'result-draw';
                let resultText = 'Draw';
                if (isWin) { resultClass = 'result-win'; resultText = 'Victory'; }
                if (isLoss) { resultClass = 'result-loss'; resultText = 'Defeat'; }

                return (
                  <div key={game.id} className="game-card" style={{ cursor: 'pointer', padding: '16px' }}>
                    <div className="game-main-info" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div className={`game-result-indicator ${resultClass}`} style={{ width: '4px', height: '100%', borderRadius: '4px' }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className={`result-badge ${resultClass}`}>{resultText}</span>
                          <span style={{ fontWeight: 700, fontSize: '16px' }}>vs {game.opponent}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#94a3b8', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>{game.opening}</span>
                          <span>•</span>
                          <span>{game.accuracy}% Accuracy</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="game-details" style={{ textAlign: 'right' }}>
                      <div className="game-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <div className="meta-item" style={{ fontSize: '14px', color: '#e8e8e8' }}>
                          <Calendar size={14} style={{ marginRight: '4px', opacity: 0.7 }} />
                          {game.date}
                        </div>
                        <div className="meta-item" style={{ fontSize: '12px', color: '#94a3b8' }}>
                          <Clock size={12} style={{ marginRight: '4px' }} />
                          {game.moves} moves ({game.duration})
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} color="var(--border)" style={{ marginLeft: '12px' }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
