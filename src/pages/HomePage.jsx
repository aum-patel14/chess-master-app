import './HomePage.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import PageShell from '../components/PageShell';
import { readStats, readElo } from '../utils/chessStats';
import { Chess } from 'chess.js';

const TIME_OPTS = [
  { label: 'Bullet 1m', sec: 60 },
  { label: 'Blitz 3m', sec: 180 },
  { label: 'Rapid 10m', sec: 600 },
  { label: 'Classical 30m', sec: 1800 },
  { label: '∞ Unlimited', sec: 0 },
];

function mapDifficultyToLevel(d) {
  if (d === 'easy') return 2;
  if (d === 'hard') return 4;
  return 3;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [difficulty, setDifficulty] = useLocalStorage('chess_difficulty', 'medium');
  const [timeControl, setTimeControl] = useLocalStorage('chess_timecontrol', 600);
  const [playerColor, setPlayerColor] = useLocalStorage('chess_playercolor', 'w');

  const elo = readElo();
  const stats = readStats();
  const gamesPlayed = stats.gamesPlayed || 0;

  const [hasSaved, setHasSaved] = useState(false);
  
  // Daily Puzzle State
  const [dailyPuzzle, setDailyPuzzle] = useState(null);
  const [puzzleStreak, setPuzzleStreak] = useLocalStorage('chess_puzzle_streak', 0);
  
  useEffect(() => {
    setHasSaved(!!localStorage.getItem('chess_saved_game'));
    
    // Fetch Daily Puzzle
    fetch('https://lichess.org/api/puzzle/daily')
      .then(res => res.json())
      .then(data => {
        // We only need the URL or simple data for the card
        setDailyPuzzle(data);
      })
      .catch(err => {
        console.error('Lichess puzzle error', err);
        setDailyPuzzle({ puzzle: { id: 'fallback', rating: 1500, themes: ['tactics'] } });
      });
  }, []);

  const lastPuzzle = typeof localStorage !== 'undefined' ? localStorage.getItem('chess_last_puzzle_date') : null;
  const showNewBadge = lastPuzzle !== new Date().toDateString();

  const chip = (active) => ({
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    background: active ? '#d4af37' : 'rgba(255,255,255,0.06)',
    color: active ? '#0a0a14' : '#aaa',
    transition: 'transform 0.15s, box-shadow 0.2s',
  });

  return (
    <PageShell>
      <div className="home-page home-page-phase3">
        <style>{`
          .home-page-phase3 .hero-actions button:hover { transform: scale(1.03); box-shadow: 0 0 20px rgba(212,175,55,0.4); }
          .home-page-phase3 .hero-actions button:active { transform: scale(0.97); }
          @media (max-width: 767px) {
            .home-page-phase3 { padding-bottom: 80px; }
            .home-page-phase3 .hero-actions { flex-direction: column; width: 100%; }
            .home-page-phase3 .hero-actions button { width: 100%; }
          }
          @media (min-width: 1024px) {
            .home-phase-grid { display: grid; grid-template-columns: 1fr 380px; gap: 32px; align-items: start; max-width: 1200px; margin: 0 auto; }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .home-mid-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          }
        `}</style>

        <section className="hero-section">
          <div className="hero-content home-phase-grid">
            <div className="hero-left">
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>Play Chess Online on the #1 Platform!</h1>
              <p>Join 10,000+ players. Challenge AI, play friends, and master chess — completely free.</p>
              <div className="hero-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-hero"
                  onClick={() =>
                    navigate('/game', {
                      state: {
                        mode: 'ai',
                        difficulty: mapDifficultyToLevel(difficulty),
                        timeControl,
                        playerColor,
                      },
                    })
                  }
                >
                  Play vs AI
                </button>
                <button
                  className="btn-hero secondary"
                  onClick={() => navigate('/game', { state: { mode: 'online' } })}
                  style={{ background: 'linear-gradient(135deg, #c4a028 0%, #e6b84a 50%, #c4a028 100%)', color: '#0a0a14', border: 'none' }}
                >
                  🌐 Play Online
                </button>
                <button
                  className="btn-hero secondary"
                  onClick={() => navigate('/game', { state: { mode: 'two-player', timeControl } })}
                >
                  Local Pass & Play
                </button>
              </div>
              {hasSaved && (
                <button
                  className="btn-hero secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => navigate('/game', { state: { resume: true } })}
                >
                  Continue Game
                </button>
              )}
            </div>

            <aside
              className="hero-right"
              style={{
                background: 'rgba(26,26,46,0.6)',
                borderRadius: 16,
                padding: 20,
                border: '1px solid rgba(212,175,55,0.2)',
              }}
            >
              <h3 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 12 }}>Game settings</h3>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Difficulty</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button key={d} type="button" style={chip(difficulty === d)} onClick={() => setDifficulty(d)}>
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Time control</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TIME_OPTS.map((t) => (
                    <button key={t.sec} type="button" style={chip(timeControl === t.sec)} onClick={() => setTimeControl(t.sec)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Play as</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPlayerColor('w')}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 8,
                      border: playerColor === 'w' ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent',
                      color: playerColor === 'w' ? '#d4af37' : '#aaa',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ♔ White
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerColor('b')}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 8,
                      border: playerColor === 'b' ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent',
                      color: playerColor === 'b' ? '#d4af37' : '#aaa',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ♚ Black
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 24px' }}>
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              border: '1px solid rgba(212,175,55,0.2)',
              fontFamily: 'Cinzel, serif',
              textAlign: 'center',
            }}
          >
            {gamesPlayed === 0 ? (
              <div style={{ color: '#d4af37' }}>Unrated — Play your first game!</div>
            ) : (
              <div>
                Your Rating: <span style={{ color: '#d4af37', fontWeight: 800, fontSize: '1.4rem' }}>{elo}</span>
              </div>
            )}
          </div>

          <div className="home-mid-buttons" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-feature green" onClick={() => navigate('/learn')}>
              Learn Chess
            </button>
            <button className="btn-feature outline" onClick={() => navigate('/leaderboard')}>
              Leaderboard
            </button>
          </div>

          {/* Daily Puzzle Card */}
          <div style={{ marginTop: '24px', background: '#1a1a2e', borderRadius: '12px', padding: '20px', border: '1px solid var(--gold)' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--gold)', display: 'flex', justifyContent: 'space-between' }}>
              Daily Puzzle
              <span style={{ fontSize: '14px', background: 'rgba(212,175,55,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                🔥 Streak: {puzzleStreak}
              </span>
            </h2>
            {dailyPuzzle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  Rating: {dailyPuzzle.puzzle.rating} • Themes: {dailyPuzzle.puzzle.themes.slice(0, 3).join(', ')}
                </p>
                <button 
                  className="btn-feature outline" 
                  onClick={() => navigate('/puzzles')}
                  style={{ width: '100%', border: '1px solid var(--gold)', color: 'var(--gold)' }}
                >
                  Solve Today's Puzzle {showNewBadge && <span style={{ marginLeft: 8, fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>NEW</span>}
                </button>
              </div>
            ) : (
              <p style={{ opacity: 0.7 }}>Loading daily puzzle...</p>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            {[
              ['✓', stats.wins || 0, 'Wins'],
              ['✗', stats.losses || 0, 'Losses'],
              ['=', stats.draws || 0, 'Draws'],
              ['🔥', stats.streak || 0, 'Streak'],
            ].map(([icon, n, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate('/stats')}
                style={{
                  minHeight: 44,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(212,175,55,0.2)',
                  background: '#1a1a2e',
                  color: '#e8e8e8',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {icon} {n} {label}
              </button>
            ))}
          </div>
        </section>

        <section className="feature-section">
          <div className="feature-image">
            <img src="/images/lessons.png" alt="Chess Lessons" className="feature-img" />
          </div>
          <div className="feature-text">
            <h2>Improve Your Game with Lessons</h2>
            <p>Learn with quick, fun lessons designed for all levels.</p>
            <button className="btn-feature green" onClick={() => navigate('/learn')}>
              Start a Lesson →
            </button>
          </div>
        </section>

        <section className="feature-section alt">
          <div className="feature-text">
            <h2>Play Chess Bots</h2>
            <p>Play against AI with unique personalities and skill levels.</p>
            <button className="btn-feature outline" onClick={() => navigate('/game', { state: { mode: 'ai', difficulty: mapDifficultyToLevel(difficulty), timeControl, playerColor } })}>
              Challenge a Bot →
            </button>
          </div>
          <div className="feature-image">
            <img src="/images/bots.png" alt="Chess Bots" className="feature-img" />
          </div>
        </section>

        <section className="feature-section">
          <div className="feature-image">
            <img src="/images/puzzles.png" alt="Chess Puzzles" className="feature-img" />
          </div>
          <div className="feature-text">
            <h2>Level Up with Chess Puzzles</h2>
            <p>Sharpen your skills with thousands of tactical puzzles.</p>
            <button className="btn-feature outline" onClick={() => navigate('/puzzles')}>
              Solve a Puzzle →
            </button>
          </div>
        </section>

        <section className="app-download-section">
          <h3>Play Anywhere with the ChessMaster Pro App</h3>
          <div className="app-buttons">
            <button type="button" className="app-btn" onClick={() => showToast('Coming soon', 'info')}>
              📱 Download on App Store
            </button>
            <button type="button" className="app-btn" onClick={() => showToast('Coming soon', 'info')}>
              🤖 Get it on Google Play
            </button>
          </div>
        </section>

        <section className="cta-section">
          <h2>Learn, Play, and Have Fun!</h2>
          <button className="btn-cta" onClick={() => navigate('/game')}>
            Get Started →
          </button>
        </section>

        <footer className="footer">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Company</h4>
              <span>Support</span>
              <span>About</span>
              <span>Jobs</span>
              <span>Blog</span>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <span>User Agreement</span>
              <span>Privacy</span>
              <span>Cookies</span>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <span>Chess Terms</span>
              <span>Cheating Policy</span>
            </div>
            <div className="footer-col">
              <h4>Social</h4>
              <span>Twitter</span>
              <span>YouTube</span>
              <span>Instagram</span>
              <span>Discord</span>
            </div>
            <div className="footer-col">
              <h4>App</h4>
              <span>App Store</span>
              <span>Google Play</span>
            </div>
          </div>
          <div className="footer-bottom">ChessMaster Pro © 2026</div>
        </footer>
      </div>
    </PageShell>
  );
}
