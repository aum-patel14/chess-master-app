import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Trophy, Clock, Target, Calendar, Activity } from 'lucide-react';
import GameHistory from '../components/GameHistory';
import './GameHistoryPage.css';

export default function GameHistoryPage() {
  const { currentUser, userData } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      if (!currentUser || !db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'games'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );

        const querySnapshot = await getDocs(q);
        const fetchedGames = [];
        querySnapshot.forEach((doc) => {
          fetchedGames.push({ id: doc.id, ...doc.data() });
        });
        
        setGames(fetchedGames);
      } catch (err) {
        console.error("Error fetching games (this might be due to missing Firestore indices):", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="history-page loading-state">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="history-page">
        <div className="history-container" style={{ marginTop: '20px' }}>
          <h2>Local Game History</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            You are not logged in. Showing games saved to this browser.
            Log in to save games to the cloud and track your global Elo!
          </p>
          <GameHistory />
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="profile-info">
          <h1>{userData?.displayName || 'Player'}</h1>
          <div className="profile-stats">
            <div className="stat-badge">
              <Trophy size={16} color="var(--gold)" />
              <span>{userData?.rating || 1200} Elo</span>
            </div>
            <div className="stat-badge">
              <Activity size={16} color="#0ea5e9" />
              <span>{games.length} Games Played</span>
            </div>
          </div>
        </div>
      </div>

      <div className="history-container">
        <h2>Recent Matches</h2>
        
        {games.length === 0 ? (
          <div className="no-games">
            <Target size={32} />
            <p>You haven't played any games yet. Start a match against the AI to see your history!</p>
          </div>
        ) : (
          <div className="games-list">
            {games.map(game => {
              const date = new Date(game.timestamp).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', year: 'numeric' 
              });
              
              const isWin = game.result === 'win' || game.result === 'win_white' || game.result === 'win_black';
              const isLoss = game.result === 'loss';
              
              let resultClass = 'result-draw';
              let resultText = 'Draw';
              if (isWin) { resultClass = 'result-win'; resultText = 'Victory'; }
              if (isLoss) { resultClass = 'result-loss'; resultText = 'Defeat'; }

              return (
                <div key={game.id} className="game-card">
                  <div className="game-main-info">
                    <div className={`game-result-indicator ${resultClass}`}></div>
                    <div className="opponent-info">
                      <span className="vs-label">vs</span>
                      <span className="opponent-name">{game.opponent || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="game-details">
                    <div className={`result-badge ${resultClass}`}>
                      {resultText}
                    </div>
                    
                    <div className="game-meta">
                      <div className="meta-item">
                        <Clock size={14} />
                        <span>{game.movesCount} moves</span>
                      </div>
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>{date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
