import './LandingPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { LANDING_BOTS } from '../data/chesscomNav';
import { GraduationCap, Bot, Puzzle, Binoculars, Smartphone, Zap } from 'lucide-react';

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
        for (let i = 0; i < emptyCount; i++) r.push('');
      }
    }
    grid.push(r);
  }
  return grid;
}

const BOTS = LANDING_BOTS.map((b, i) => ({ ...b, id: b.name.toLowerCase() + i }));

const LIVE_GAMES = [
  { white: 'Bot Arena', black: 'Daily Challenger', event: 'Featured Match Replay', viewers: '2.1K' },
  { white: 'Puzzle Sprint', black: 'Tactics Night', event: 'Community Replay', viewers: '1.4K' },
  { white: 'Endgame Drill', black: 'Rapid Session', event: 'Training Highlight', viewers: '980' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { startNewGame } = useGame();
  const [heroBoardHighlighted, setHeroBoardHighlighted] = useState(null);
  const [puzzleBoardHighlighted, setPuzzleBoardHighlighted] = useState(null);
  const [mobileBoardHighlighted, setMobileBoardHighlighted] = useState(null);

  const handlePlayDefault = () => {
    navigate('/game', {
      state: { mode: 'ai', botId: 'beginner', difficulty: 2, playerColor: 'w' },
    });
  };

  const handlePlayBot = (bot) => {
    startNewGame({ mode: 'vsAI', playerColor: 'w', difficulty: bot.difficulty });
    navigate('/game', {
      state: { mode: 'ai', difficulty: bot.difficulty, playerColor: 'w', botId: bot.id },
    });
  };

  const renderBoard = (fen, highlightedSq, setHighlightedSq, small = false) => {
    const grid = fenToGrid(fen);
    return (
      <div className={small ? 'phone-board' : 'board'}>
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
                    src={`${import.meta.env.BASE_URL}pieces/cburnett/${pieceColor}${pieceType.toUpperCase()}.svg`}
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
    <div className="lp-page">
      {/* Cinematic Ambient Glow Blobs */}
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-bottom-right" />
      <div className="ambient-glow glow-center" />

      {/* Decorative Floating Chess Pieces in Background */}
      <div className="floating-bg-piece piece-1">♞</div>
      <div className="floating-bg-piece piece-2">♟</div>
      <div className="floating-bg-piece piece-3">♛</div>
      <div className="floating-bg-piece piece-4">♜</div>
      <div className="floating-bg-piece piece-5">♝</div>
      <div className="floating-bg-piece piece-6">♞</div>

      {/* HERO — matches chess.com headline */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            Play Chess <span className="text-highlight">Online</span>
            <br />
            on the <span className="text-gradient">#1 Site!</span>
          </h1>
          
          <div className="landing-stats">
            <div className="stat-item">
              <span className="stat-count">25,000+</span>
              <span className="stat-label">Games Today</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-count">
                <span className="live-pulse" /> 2,300+
              </span>
              <span className="stat-label">Playing Now</span>
            </div>
          </div>

          <div className="hero-cta-container">
            <div className="hero-cta-card card-green" onClick={handlePlayDefault}>
              <div className="cta-icon-container">
                <Zap size={32} fill="#ffffff" stroke="#ffffff" />
              </div>
              <div className="cta-text-container">
                <div className="cta-title">Quick Play</div>
                <div className="cta-subtitle">Jump into a game against a bot instantly</div>
              </div>
            </div>

            <div className="hero-cta-card card-dark" onClick={handlePlayDefault}>
              <div className="cta-icon-container">
                <Bot size={32} />
              </div>
              <div className="cta-text-container">
                <div className="cta-title">Play vs Computer</div>
                <div className="cta-subtitle">Challenge custom bots or full Stockfish</div>
              </div>
            </div>
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

      {/* LESSONS */}
      <section className="section section-alt">
        <div className="section-inner reverse">
          <div>
            <h2>Improve Your Game with Lessons</h2>
            <p>Learn with quick, fun lessons designed for players of all levels.</p>
            <button type="button" className="btn-section" onClick={() => navigate('/learn')}>
              <GraduationCap size={18} /> Start a Lesson
            </button>
          </div>
          <div className="lessons-visual">
            {[
              ['Tactics', '1,240 lessons'],
              ['Endgames', '890 lessons'],
              ['Openings', '2,100 lessons'],
              ['Strategy', '650 lessons'],
              ['Fundamentals', '320 lessons'],
              ['Practice', 'Unlimited'],
            ].map(([title, count]) => (
              <button
                key={title}
                type="button"
                className="lesson-chip"
                onClick={() => navigate('/learn')}
                aria-label={`Open lessons: ${title}`}
              >
                <div className="lc-text">
                  <strong>{title}</strong>
                  <span>{count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BOTS */}
      <section className="section">
        <div className="section-inner">
          <div>
            <h2>Play Chess Bots</h2>
            <p>Play against unique chess personalities ranging in skill and playstyle.</p>
            <button type="button" className="btn-section" onClick={handlePlayDefault}>
              <Bot size={18} /> Challenge a Bot
            </button>
          </div>
          <div className="bots-grid">
            {BOTS.map((bot, index) => (
              <button key={index} type="button" className="bot-card" onClick={() => handlePlayBot(bot)} aria-label={`Play bot ${bot.name}`}>
                <div className="bot-avatar">{bot.avatar}</div>
                <div className="bot-name">{bot.name}</div>
                <div className="bot-rating">{bot.elo}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PUZZLES */}
      <section className="section section-alt">
        <div className="section-inner reverse">
          <div>
            <h2>Level Up With Chess Puzzles</h2>
            <p>Sharpen your skills and improve your game with thousands of puzzles.</p>
            <button type="button" className="btn-section" onClick={() => navigate('/puzzles')}>
              <Puzzle size={18} /> Solve a Puzzle
            </button>
          </div>
          <div className="puzzle-display">
            <div className="puzzle-header">
              <div>
                <div className="puzzle-label">Puzzle Rating</div>
                <div className="puzzle-rating">1,847</div>
              </div>
              <div className="puzzle-streak">12-day streak</div>
            </div>
            <div className="mini-board-wrap">
              {renderBoard('6k1/5ppp/8/8/8/8/5PPP/4R1K1', puzzleBoardHighlighted, setPuzzleBoardHighlighted)}
            </div>
            <p className="puzzle-hint">White to move — find the best move!</p>
          </div>
        </div>
      </section>

      {/* WATCH — chess.com section */}
      <section className="section">
        <div className="section-inner">
          <div>
            <h2>Review Featured Chess Highlights</h2>
            <p>Watch curated training clips and game highlights from the ChessMaster community.</p>
            <button type="button" className="btn-section" onClick={() => navigate('/puzzles')}>
              <Binoculars size={18} /> View Highlights
            </button>
          </div>
          <div className="watch-list">
            {LIVE_GAMES.map((g) => (
              <div key={g.white + g.black} className="watch-card" onClick={() => navigate('/puzzles')}>
                <div className="watch-live">LIVE</div>
                <div className="watch-players">{g.white} vs {g.black}</div>
                <div className="watch-event">{g.event}</div>
                <div className="watch-viewers">{g.viewers} views</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE APP */}
      <section className="section section-alt">
        <div className="section-inner">
          <div>
            <h2>Play Anywhere with ChessMaster</h2>
            <p>Install the web app on desktop or mobile and keep playing from any device.</p>
            <div className="app-badges">
              <span className="app-badge"><Smartphone size={18} /><div><small>Play instantly in your</small><strong>Web Browser</strong></div></span>
              <span className="app-badge"><Smartphone size={18} /><div><small>Install as</small><strong>PWA App</strong></div></span>
            </div>
          </div>
          <div className="phone-wrap">
            <div className="phone-mockup">
              <div className="phone-top"><span>9:41</span><span>100%</span></div>
              <div className="phone-screen">
                <div className="phone-title">ChessMaster</div>
                {renderBoard(
                  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R',
                  mobileBoardHighlighted,
                  setMobileBoardHighlighted,
                  true
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <div className="footer-cta">
        <h2>Learn, Play, and Have Fun!</h2>
        <button type="button" className="btn-cta" onClick={handlePlayDefault}>Get Started</button>
      </div>

      <footer className="footer-links">
        <div className="footer-row-links">
          {['Support', 'Chess Terms', 'About', 'Students', 'Jobs', 'Developers', 'User Agreement', 'Privacy Policy', 'Community'].map((link) => (
            <span key={link} onClick={() => navigate(link === 'Privacy Policy' ? '/privacy' : link === 'Community' ? '/leaderboard' : '/')}>{link}</span>
          ))}
        </div>
        <p className="footer-copy">ChessMaster Pro © 2026</p>
      </footer>
    </div>
  );
}
