import './LandingPage.css';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SignUpModal, LoginModal } from '../components/Modals';
import LandingPageToast from '../components/LandingPageToast';
import { CHESSCOM_NAV, LANDING_BOTS } from '../data/chesscomNav';

// Helper to convert FEN string to a 2D grid of chess pieces
function fenToGrid(fen) {
  const rows = fen.split(' ')[0].split('/');
  const grid = [];
  for (const row of rows) {
    const r = [];
    for (const char of row) {
      if (isNaN(char)) {
        r.push(char);
      } else {
        const emptyCount = parseInt(char, 10);
        for (let i = 0; i < emptyCount; i++) {
          r.push('');
        }
      }
    }
    grid.push(r);
  }
  return grid;
}

const BOTS = LANDING_BOTS.map((b, i) => ({ ...b, id: b.name.toLowerCase() + i }));

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startNewGame } = useGame();
  const [toastMsg, setToastMsg] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Custom states for interactive mock elements
  const [heroBoardHighlighted, setHeroBoardHighlighted] = useState(null);
  const [puzzleBoardHighlighted, setPuzzleBoardHighlighted] = useState(null);
  const [mobileBoardHighlighted, setMobileBoardHighlighted] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavItem = (item) => {
    if (item.soon) {
      showToast('Coming soon!');
      return;
    }
    if (item.state) {
      navigate(item.path, { state: item.state });
    } else {
      navigate(item.path);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const handlePlayDefault = () => {
    navigate('/game');
  };

  const handlePlayBot = (bot) => {
    startNewGame({
      mode: 'vsAI',
      playerColor: 'w',
      difficulty: bot.difficulty,
    });
    navigate('/game', {
      state: {
        mode: 'ai',
        difficulty: bot.difficulty,
        playerColor: 'w',
        botId: bot.id,
      },
    });
  };

  // Helper static board renderer
  const renderBoard = (fen, highlightedSq, setHighlightedSq, small = false) => {
    const grid = fenToGrid(fen);
    return (
      <div className={small ? "phone-board" : "board"}>
        {grid.map((row, rIdx) =>
          row.map((piece, cIdx) => {
            const idx = rIdx * 8 + cIdx;
            const isLight = (rIdx + cIdx) % 2 === 0;
            const isHighlighted = highlightedSq === idx;
            const pieceColor = piece && piece === piece.toUpperCase() ? 'w' : 'b';
            const pieceType = piece.toLowerCase();
            return (
              <div
                key={idx}
                className={`sq ${isLight ? 'light' : 'dark'} ${isHighlighted ? 'highlight' : ''}`}
                onClick={() => setHighlightedSq && setHighlightedSq(idx)}
              >
                {piece && (
                  <img
                    src={`/pieces/cburnett/${pieceColor}${pieceType.toUpperCase()}.svg`}
                    className="piece"
                    alt={piece}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="lp-container">
      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)}>
          ☰
        </button>
        <span className="mobile-logo-text">♛ ChessMaster</span>
        <button className="mobile-login-btn" onClick={() => setShowLogin(true)}>Log In</button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <aside className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="logo" onClick={() => { setMobileMenuOpen(false); navigate('/'); }}>
              <div className="logo-icon">♛</div>
              <span><em>Chess</em>Master</span>
            </div>
            <nav className="mobile-nav">
              <div className="nav-link" onClick={() => { setMobileMenuOpen(false); handlePlayDefault(); }}>🎮 Play</div>
              <div className="nav-link" onClick={() => { setMobileMenuOpen(false); navigate('/puzzles'); }}>🧩 Puzzles</div>
              <div className="nav-link" onClick={() => { setMobileMenuOpen(false); navigate('/learn'); }}>🎓 Learn</div>
              <div className="nav-link" onClick={() => { setMobileMenuOpen(false); navigate('/leaderboard'); }}>🏆 Leaderboard</div>
              <div className="nav-link" onClick={() => { setMobileMenuOpen(false); navigate('/stats'); }}>📊 Stats</div>
              <div className="nav-link" onClick={() => { setMobileMenuOpen(false); navigate('/settings'); }}>⚙️ Settings</div>
            </nav>
            <div className="mobile-sidebar-bottom">
              <button className="btn-signup" onClick={() => { setMobileMenuOpen(false); setShowSignUp(true); }}>Sign Up</button>
              <button className="btn-login" onClick={() => { setMobileMenuOpen(false); setShowLogin(true); }}>Log In</button>
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside id="sidebar" className="desktop-only">
        <div className="logo" onClick={() => navigate('/')}>
          <div className="logo-icon">♛</div>
          <span>ChessMaster Pro</span>
        </div>

        <nav>
          {CHESSCOM_NAV.map((section, idx) => (
            <div key={section.id} className="nav-item">
              <div
                className={`nav-link${location.pathname === section.path ? ' active' : ''}`}
                onClick={() => handleNavItem({ path: section.path, soon: false })}
              >
                <span className="nav-icon">{section.icon}</span> {section.label}
              </div>
              {section.items?.length > 0 && (
                <div className="dropdown" style={{ top: `${80 + idx * 44}px` }}>
                  {section.items.map((item) => (
                    <span
                      key={item.label}
                      className="dropdown-link"
                      onClick={() => handleNavItem(item)}
                    >
                      <span className="di">{item.icon}</span> {item.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <input
            type="search"
            className="sidebar-search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                showToast(`Searching for "${searchQuery}"...`);
              }
            }}
          />
          <button type="button" className="btn-signup" onClick={() => setShowSignUp(true)}>Sign Up</button>
          <button type="button" className="btn-login" onClick={() => setShowLogin(true)}>Log In</button>
          <span className="help-link" onClick={() => showToast('Help section coming soon!')}>❓ Help &amp; Support</span>
          <div className="lang-select">
            <span>🌐</span> English
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main id="main">
        {/* STATS BAR */}
        <div className="stats-bar">
          <div className="stat"><span className="stat-num">250M+</span><span className="stat-label">Players</span></div>
          <div className="stat-sep"></div>
          <div className="stat"><span className="stat-num">1M+</span><span className="stat-label">Games / day</span></div>
          <div className="stat-sep"></div>
          <div className="stat"><span className="stat-num">50K+</span><span className="stat-label">Online now</span></div>
          <div className="stat-sep"></div>
          <div className="stat"><span className="stat-num">#1</span><span className="stat-label">Chess site</span></div>
        </div>

        {/* HERO SECTION */}
        <section id="hero" className="hero">
          <div className="hero-text">
            <h1>Play Chess Online<br />on the #1 Site!</h1>
            <p>Join 250+ million players in the world's largest chess community. Play fast, play smart, play beautiful.</p>
            <button className="btn-cta" onClick={handlePlayDefault}>Get Started</button>
            <div className="feature-row">
              <div className="fpill"><span className="dot"></span>Free to play</div>
              <div className="fpill"><span className="dot"></span>No download needed</div>
              <div className="fpill"><span className="dot"></span>Play vs AI</div>
              <div className="fpill"><span className="dot"></span>Online multiplayer</div>
            </div>
          </div>
          <div className="board-wrap">
            {renderBoard(
              'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R',
              heroBoardHighlighted,
              setHeroBoardHighlighted
            )}
          </div>
        </section>

        {/* LESSONS SECTION */}
        <section id="lessons" className="section">
          <div className="section-inner reverse">
            <div>
              <h2>Improve Your Game<br />with Lessons</h2>
              <p>Learn with quick, fun lessons designed for players of all levels. From beginner fundamentals to advanced grandmaster strategies.</p>
              <button className="btn-outline" onClick={() => navigate('/learn')}>🎓 Start a Lesson</button>
            </div>
            <div>
              <div className="lessons-visual">
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♟️</span><div className="lc-text"><strong>Tactics</strong><span>1,240 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♜</span><div className="lc-text"><strong>Endgames</strong><span>890 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♛</span><div className="lc-text"><strong>Openings</strong><span>2,100 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♞</span><div className="lc-text"><strong>Strategy</strong><span>650 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♝</span><div className="lc-text"><strong>Fundamentals</strong><span>320 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">🎯</span><div className="lc-text"><strong>Practice</strong><span>Unlimited</span></div></div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTS SECTION */}
        <section id="bots" className="section">
          <div className="section-inner">
            <div>
              <h2>Play Chess Bots</h2>
              <p>Play against unique chess personalities ranging in skill and playstyle. From friendly beginners to ruthless grandmasters.</p>
              <button className="btn-outline" onClick={handlePlayDefault}>🤖 Challenge a Bot</button>
            </div>
            <div>
              <div className="bots-grid">
                {BOTS.map((bot, index) => (
                  <div key={index} className="bot-card" onClick={() => handlePlayBot(bot)}>
                    <div className="bot-avatar">{bot.avatar}</div>
                    <div className="bot-name">{bot.name}</div>
                    <div className="bot-rating">⭐ {bot.elo}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PUZZLES SECTION */}
        <section id="puzzles" className="section">
          <div className="section-inner reverse">
            <div>
              <h2>Level Up With<br />Chess Puzzles</h2>
              <p>Sharpen your skills and improve your game with thousands of puzzles. Track your rating and compete with players worldwide.</p>
              <button className="btn-outline" onClick={() => navigate('/puzzles')}>🧩 Solve a Puzzle</button>
            </div>
            <div>
              <div className="puzzle-display">
                <div className="puzzle-header">
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px' }}>Puzzle Rating</div>
                    <div className="puzzle-rating">1,847</div>
                  </div>
                  <div className="puzzle-streak">🔥 12-day streak</div>
                </div>
                <div className="mini-board-wrap">
                  {renderBoard(
                    '6k1/5ppp/8/8/8/8/5PPP/4R1K1',
                    puzzleBoardHighlighted,
                    setPuzzleBoardHighlighted
                  )}
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text2)', textAlign: 'center' }}>
                  White to move — find the best move!
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE SECTION */}
        <section className="section">
          <div className="section-inner">
            <div>
              <h2>Play Anywhere with<br />the ChessMaster App</h2>
              <p>Take your chess game on the go. Available on iOS and Android, with all your stats and games synced across devices.</p>
              <div className="app-badges">
                <span className="app-badge" onClick={() => showToast('App Store download coming soon!')}>
                  <span className="ab-icon">🍎</span>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Download on the</div>
                    <div>App Store</div>
                  </div>
                </span>
                <span className="app-badge" onClick={() => showToast('Google Play download coming soon!')}>
                  <span className="ab-icon">▶️</span>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Get it on</div>
                    <div>Google Play</div>
                  </div>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="phone-mockup">
                <div className="phone-top"><span>9:41</span><span>📶 🔋</span></div>
                <div className="phone-screen">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>♛ ChessMaster</div>
                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>⏱ 2:45</div>
                  </div>
                  {renderBoard(
                    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R',
                    mobileBoardHighlighted,
                    setMobileBoardHighlighted,
                    true
                  )}
                  <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text2)', textAlign: 'center' }}>Anna (1326) 🇺🇸 vs You</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER CTA */}
        <div className="footer-cta">
          <h2>Learn, Play, and Have Fun!</h2>
          <button className="btn-cta" onClick={handlePlayDefault}>Get Started — It's Free!</button>
        </div>

        {/* FOOTER LINKS */}
        <footer className="footer-links">
          <div className="footer-row-links">
            <span onClick={() => showToast('About section coming soon!')}>About</span>
            <span onClick={() => showToast('Help center coming soon!')}>Help</span>
            <span onClick={() => navigate('/privacy')}>Terms</span>
            <span onClick={() => navigate('/privacy')}>Privacy</span>
            <span onClick={() => navigate('/leaderboard')}>Community</span>
          </div>
          <div style={{ fontSize: '11px', color: '#555555', marginTop: '10px' }}>
            ChessMaster Pro © 2026. Made with ❤️ for chess fans.
          </div>
        </footer>
      </main>

      <LandingPageToast show={!!toastMsg} message={toastMsg} onClose={() => setToastMsg('')} />
      <SignUpModal show={showSignUp} onClose={() => setShowSignUp(false)} onSwitchToLogin={() => { setShowSignUp(false); setShowLogin(true); }} />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onSwitchToSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
    </div>
  );
}
