import './LandingPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { LANDING_BOTS } from '../data/chesscomNav';
import { GraduationCap, Bot, Puzzle, Binoculars, Smartphone } from 'lucide-react';

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
  { white: 'Magnus', black: 'Hikaru', event: 'Speed Chess Championship', viewers: '12.4K' },
  { white: 'Anna', black: 'Ding', event: 'Titled Tuesday', viewers: '8.1K' },
  { white: 'Fabiano', black: 'Nepo', event: 'Live Rated', viewers: '5.6K' },
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
      {/* HERO — matches chess.com headline */}
      <section className="hero">
        <div className="hero-text">
          <h1>Play Chess Online<br />on the #1 Site!</h1>
          <p>Join 250+ million players in the world&apos;s largest chess community</p>
          <button type="button" className="btn-cta" onClick={handlePlayDefault}>Get Started</button>
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
              <div key={title} className="lesson-chip" onClick={() => navigate('/learn')}>
                <div className="lc-text">
                  <strong>{title}</strong>
                  <span>{count}</span>
                </div>
              </div>
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
              <div key={index} className="bot-card" onClick={() => handlePlayBot(bot)}>
                <div className="bot-avatar">{bot.avatar}</div>
                <div className="bot-name">{bot.name}</div>
                <div className="bot-rating">{bot.elo}</div>
              </div>
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
            <h2>Watch the Best in the World Compete</h2>
            <p>Tune into live events, and follow top players move-by-move with real-time analysis.</p>
            <button type="button" className="btn-section" onClick={() => navigate('/watch')}>
              <Binoculars size={18} /> Watch Chess
            </button>
          </div>
          <div className="watch-list">
            {LIVE_GAMES.map((g) => (
              <div key={g.white + g.black} className="watch-card" onClick={() => navigate('/watch')}>
                <div className="watch-live">LIVE</div>
                <div className="watch-players">{g.white} vs {g.black}</div>
                <div className="watch-event">{g.event}</div>
                <div className="watch-viewers">{g.viewers} watching</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE APP */}
      <section className="section section-alt">
        <div className="section-inner">
          <div>
            <h2>Play Anywhere with the ChessMaster App</h2>
            <p>Take your chess game on the go. Available on iOS and Android.</p>
            <div className="app-badges">
              <span className="app-badge"><Smartphone size={18} /><div><small>Download on the</small><strong>App Store</strong></div></span>
              <span className="app-badge"><Smartphone size={18} /><div><small>Get it on</small><strong>Google Play</strong></div></span>
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
