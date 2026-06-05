import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useGame } from '../context/GameContext';
import { useToast } from '../hooks/useToast';
import { readStats } from '../utils/chessStats';

// Custom ScrollReveal component using Intersection Observer for entrance animations
interface ScrollRevealProps {
  children: React.ReactNode;
}

function ScrollReveal({ children }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        width: '100%'
      }}
    >
      {children}
    </div>
  );
}

// Interactive Animated CSS Chessboard cycling moves
const BOARD_POSITIONS = [
  // Position 1: Starting Position
  [
    'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
    'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
    'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'
  ],
  // Position 2: e4 e5 Nf3 Nc6 Bc4 Nf6
  [
    'r', '', 'b', 'q', 'k', 'b', '', 'r',
    'p', 'p', 'p', 'p', '', 'p', 'p', 'p',
    '', '', 'n', '', '', 'n', '', '',
    '', '', '', '', 'p', '', '', '',
    '', '', 'B', '', 'P', '', '', '',
    '', '', '', '', '', 'N', '', '',
    'P', 'P', 'P', 'P', '', 'P', 'P', 'P',
    'R', 'N', 'B', 'Q', 'K', '', '', 'R'
  ],
  // Position 3: Scholar's mate checkmate (White Queen on f7)
  [
    'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
    'p', 'p', 'p', 'p', '', 'Q', 'p', 'p',
    '', '', '', '', '', '', '', '',
    '', '', '', '', 'p', '', '', '',
    '', '', '', '', 'P', '', '', '',
    '', '', '', '', '', '', '', '',
    'P', 'P', 'P', 'P', '', 'P', 'P', 'P',
    'R', 'N', 'B', '', 'K', 'B', 'N', 'R'
  ]
];

function CyclingChessBoard() {
  const [positionIdx, setPositionIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPositionIdx((prev) => (prev + 1) % BOARD_POSITIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const grid = BOARD_POSITIONS[positionIdx];
  const pieceTheme = typeof localStorage !== 'undefined' ? (localStorage.getItem('chess_pieces') || 'cburnett') : 'cburnett';
  const getPieceImage = (piece: string) => {
    const color = piece === piece.toUpperCase() ? 'w' : 'b';
    const type = piece.toLowerCase();
    return `${import.meta.env.BASE_URL || '/'}pieces/${pieceTheme}/${color}${type.toUpperCase()}.svg`;
  };

  return (
    <div className="board">
      {grid.map((piece, cellIdx) => {
        const fileIdx = cellIdx % 8;
        const rankIdx = Math.floor(cellIdx / 8);
        const isLight = (fileIdx + rankIdx) % 2 === 0;

        return (
          <div
            key={cellIdx}
            className={`sq ${isLight ? 'light' : 'dark'}`}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1',
            }}
          >
            {piece && (
              <img
                src={getPieceImage(piece)}
                alt=""
                style={{
                  width: '85%',
                  height: '85%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ELO and setup bots list
interface BotData {
  id: string;
  name: string;
  elo: number;
  avatar: string;
  difficulty: number;
}

const HOMEPAGE_BOTS: BotData[] = [
  { id: 'casual', name: 'Aria', elo: 800, avatar: '😊', difficulty: 3 },
  { id: 'rookie', name: 'Martin', elo: 250, avatar: '🧔', difficulty: 1 },
  { id: 'intermediate', name: 'Zara', elo: 1500, avatar: '👩', difficulty: 6 },
  { id: 'advanced', name: 'Viktor', elo: 1800, avatar: '🧠', difficulty: 8 },
  { id: 'master', name: 'Magnus', elo: 2850, avatar: '👑', difficulty: 10 },
  { id: 'stockfish', name: 'Stockfish', elo: 3500, avatar: '🤖', difficulty: 10 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { startNewGame } = useGame();
  const { showToast } = useToast();
  const stats = readStats();

  const handlePlayBot = (bot: BotData) => {
    startNewGame({
      mode: 'vsAI',
      playerColor: 'w',
      difficulty: bot.difficulty,
      botId: bot.id
    });
    navigate('/game', {
      state: {
        mode: 'ai',
        difficulty: bot.difficulty,
        playerColor: 'w',
        botId: bot.id
      }
    });
  };

  // Helper static board renderer
  const pieceTheme = typeof localStorage !== 'undefined' ? (localStorage.getItem('chess_pieces') || 'cburnett') : 'cburnett';
  const renderStaticBoard = (fen: string) => {
    const rows = fen.split('/');
    const grid: string[] = [];
    for (const row of rows) {
      for (const c of row) {
        if (isNaN(c as any)) {
          grid.push(c);
        } else {
          for (let i = 0; i < parseInt(c); i++) grid.push('');
        }
      }
    }

    return grid.map((piece, cellIdx) => {
      const fileIdx = cellIdx % 8;
      const rankIdx = Math.floor(cellIdx / 8);
      const isLight = (fileIdx + rankIdx) % 2 === 0;
      const pieceColor = piece && piece === piece.toUpperCase() ? 'w' : 'b';
      const pieceType = piece.toLowerCase();

      return (
        <div
          key={cellIdx}
          style={{
            background: isLight ? '#eeeed2' : '#769656',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '1',
          }}
        >
          {piece && (
            <img
              src={`${import.meta.env.BASE_URL || '/'}pieces/${pieceTheme}/${pieceColor}${pieceType.toUpperCase()}.svg`}
              alt=""
              style={{ width: '85%', height: '85%', objectFit: 'contain' }}
            />
          )}
        </div>
      );
    });
  };

  return (
    <PageShell>
      <div style={{ background: '#1a1a1a', minHeight: '100vh', color: '#e0e0e0', width: '100%' }}>
        <style>{`
          :root {
            --bg: #1a1a1a;
            --bg2: #242424;
            --bg3: #2d2d2d;
            --bg4: #333;
            --sidebar: #1e1e1e;
            --green: #6bbd44;
            --green2: #5aad33;
            --text: #e0e0e0;
            --text2: #999;
            --text3: #ccc;
            --border: #3a3a3a;
            --hover: #2a2a2a;
            --accent: #6bbd44;
          }

          /* STATS BAR */
          .stats-bar {
            background: var(--bg2);
            border-bottom: 1px solid var(--border);
            padding: 16px 60px;
            display: flex;
            justify-content: center;
            gap: 40px;
            align-items: center;
          }
          .stat {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .stat-num {
            font-size: 20px;
            font-weight: 800;
            color: #fff;
          }
          .stat-label {
            font-size: 13px;
            color: var(--text2);
          }
          .stat-sep {
            width: 1px;
            height: 24px;
            background: var(--border);
          }

          /* HERO */
          .hero {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 40px;
            align-items: center;
            padding: 60px 40px;
            max-width: 1100px;
            margin: 0 auto;
          }
          .hero-text h1 {
            font-size: 42px;
            font-weight: 800;
            color: #fff;
            line-height: 1.15;
            margin-bottom: 16px;
          }
          .hero-text p {
            color: var(--text2);
            font-size: 16px;
            margin-bottom: 28px;
            line-height: 1.6;
          }
          .btn-cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 14px 36px;
            background: var(--green);
            color: #fff;
            font-weight: 700;
            font-size: 16px;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: background 0.15s, transform 0.1s;
            box-shadow: 0 4px 0 #589b37;
          }
          .btn-cta:hover {
            background: #78d24c;
          }
          .btn-cta:active {
            transform: translateY(2px);
            box-shadow: none;
          }

          /* CHESS BOARD */
          .board-wrap {
            position: relative;
            width: 100%;
            max-width: 440px;
            margin: 0 auto;
          }
          .board {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            border: 3px solid #5a5a5a;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,.6);
            width: 100%;
            aspect-ratio: 1;
          }
          .sq.light { background: #eeeed2; }
          .sq.dark { background: #769656; }
          .sq:hover { filter: brightness(1.08); }

          /* FEATURE PILLS */
          .feature-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 24px;
          }
          .fpill {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 6px 14px;
            font-size: 13px;
            color: var(--text2);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .fpill .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--green);
          }

          /* SECTIONS */
          .section {
            padding: 60px 40px;
            border-top: 1px solid var(--border);
            max-width: 1100px;
            margin: 0 auto;
          }
          .section-inner {
            display: grid;
            grid-template-columns: 1fr 1.1fr;
            gap: 60px;
            align-items: center;
          }
          .section-inner.reverse {
            grid-template-columns: 1.1fr 1fr;
          }
          .section h2 {
            font-size: 32px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 16px;
            line-height: 1.2;
          }
          .section p {
            color: var(--text2);
            font-size: 15px;
            line-height: 1.7;
            margin-bottom: 24px;
          }
          .btn-outline {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: var(--bg2);
            color: var(--text3);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-outline:hover {
            background: var(--bg3);
            color: #fff;
            border-color: #666;
          }

          /* BOTS GRID */
          .bots-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .bot-card {
            background: var(--bg2);
            border-radius: 10px;
            padding: 16px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            border: 1px solid var(--border);
            cursor: pointer;
            transition: all 0.15s;
          }
          .bot-card:hover {
            background: var(--bg3);
            border-color: #666;
            transform: translateY(-2px);
          }
          .bot-avatar {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: var(--bg3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            margin-bottom: 8px;
            border: 2px solid var(--border);
          }
          .bot-name {
            font-size: 13px;
            font-weight: 700;
            color: #fff;
          }
          .bot-rating {
            font-size: 11px;
            color: var(--green);
            font-weight: 700;
            margin-top: 2px;
          }

          /* LESSONS VISUAL */
          .lessons-visual {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
          .lesson-chip {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.15s;
          }
          .lesson-chip:hover {
            background: var(--bg3);
            border-color: #666;
          }
          .lesson-chip .lc-icon {
            font-size: 28px;
          }
          .lesson-chip .lc-text span {
            display: block;
            font-size: 11px;
            color: var(--text2);
          }
          .lesson-chip .lc-text strong {
            display: block;
            font-size: 14px;
            color: #fff;
            font-weight: 700;
          }

          /* PUZZLES */
          .puzzle-display {
            background: var(--bg2);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border);
            max-width: 360px;
            margin: 0 auto;
          }
          .puzzle-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
          }
          .puzzle-rating {
            font-size: 22px;
            font-weight: 800;
            color: #fff;
          }
          .puzzle-streak {
            font-size: 13px;
            color: #ff9f0a;
            font-weight: 700;
          }
          .mini-board {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            border-radius: 6px;
            overflow: hidden;
            border: 2px solid #5a5a5a;
            aspect-ratio: 1;
            width: 100%;
          }

          /* PHONE MOCKUP */
          .phone-mockup {
            background: #1c1c1e;
            border-radius: 40px;
            padding: 12px;
            border: 3px solid #444;
            box-shadow: 0 20px 60px rgba(0,0,0,.6);
            width: 250px;
            margin: 0 auto;
          }
          .phone-top {
            background: #000;
            border-radius: 30px 30px 0 0;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #fff;
          }
          .phone-screen {
            background: #1a1a1a;
            border-radius: 0 0 28px 28px;
            padding: 12px;
          }
          .phone-board {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            border-radius: 4px;
            overflow: hidden;
            aspect-ratio: 1;
            width: 100%;
          }
          .app-badges {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            flex-wrap: wrap;
          }
          .app-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text3);
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s;
          }
          .app-badge:hover {
            background: var(--bg3);
            border-color: #666;
            color: #fff;
          }
          .app-badge .ab-icon {
            font-size: 20px;
          }

          /* FOOTER CTA */
          .footer-cta {
            padding: 80px 40px;
            text-align: center;
            border-top: 1px solid var(--border);
            background: linear-gradient(to bottom, var(--bg), #111111);
          }
          .footer-cta h2 {
            font-size: 36px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 24px;
          }

          /* FOOTER */
          .footer-links {
            padding: 40px 24px;
            background: #111111;
            text-align: center;
            border-top: 1px solid var(--border);
            font-size: 13px;
            color: var(--text2);
          }
          .footer-row-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          .footer-row-links span {
            cursor: pointer;
            transition: color 0.15s;
          }
          .footer-row-links span:hover {
            color: #fff;
          }

          @media (max-width: 900px) {
            .hero {
              grid-template-columns: 1fr;
              padding: 40px 24px;
              text-align: center;
            }
            .section {
              padding: 40px 24px;
            }
            .section-inner, .section-inner.reverse {
              grid-template-columns: 1fr;
              gap: 40px;
            }
            .section-inner.reverse {
              display: flex;
              flex-direction: column-reverse;
            }
            .stats-bar {
              padding: 16px 24px;
              gap: 16px;
              flex-wrap: wrap;
            }
            .bots-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}</style>

        {/* 1. STATS BAR */}
        <div className="stats-bar">
          <div className="stat"><span className="stat-num">250M+</span><span className="stat-label">Players</span></div>
          <div className="stat-sep"></div>
          <div className="stat"><span className="stat-num">1M+</span><span className="stat-label">Games / day</span></div>
          <div className="stat-sep"></div>
          <div className="stat"><span className="stat-num">50K+</span><span className="stat-label">Online now</span></div>
          <div className="stat-sep"></div>
          <div className="stat"><span className="stat-num">#1</span><span className="stat-label">Chess site</span></div>
        </div>

        {/* 2. HERO */}
        <section id="hero" className="hero">
          <div className="hero-text">
            <h1>Play Chess Online<br />on the #1 Site!</h1>
            <p>Join 250+ million players in the world's largest chess community. Play fast, play smart, play beautiful.</p>
            <button className="btn-cta" onClick={() => navigate('/game')}>Get Started</button>
            
            <div className="feature-row">
              <div className="fpill"><span className="dot"></span>Free to play</div>
              <div className="fpill"><span className="dot"></span>No download needed</div>
              <div className="fpill"><span className="dot"></span>Play vs AI</div>
              <div className="fpill"><span className="dot"></span>Online multiplayer</div>
            </div>
          </div>
          <div className="board-wrap">
            <CyclingChessBoard />
          </div>
        </section>

        {/* 3. LESSONS SECTION */}
        <ScrollReveal>
          <section id="lessons" className="section">
            <div className="section-inner reverse">
              <div className="lessons-visual">
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♟️</span><div className="lc-text"><strong>Tactics</strong><span>1,240 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♜</span><div className="lc-text"><strong>Endgames</strong><span>890 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♛</span><div className="lc-text"><strong>Openings</strong><span>2,100 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♞</span><div className="lc-text"><strong>Strategy</strong><span>650 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">♝</span><div className="lc-text"><strong>Fundamentals</strong><span>320 lessons</span></div></div>
                <div className="lesson-chip" onClick={() => navigate('/learn')}><span className="lc-icon">🎯</span><div className="lc-text"><strong>Practice</strong><span>Unlimited</span></div></div>
              </div>
              
              <div>
                <h2>Improve Your Game<br />with Lessons</h2>
                <p>Learn with quick, fun lessons designed for players of all levels. From beginner fundamentals to advanced grandmaster strategies.</p>
                <button className="btn-outline" onClick={() => navigate('/learn')}>
                  🎓 Start a Lesson
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 4. BOTS SECTION */}
        <ScrollReveal>
          <section id="bots" className="section">
            <div className="section-inner">
              <div>
                <h2>Play Chess Bots</h2>
                <p>Play against unique chess personalities ranging in skill and playstyle. From friendly beginners to ruthless grandmasters.</p>
                <button className="btn-outline" onClick={() => navigate('/game', { state: { mode: 'ai' } })}>
                  🤖 Challenge a Bot
                </button>
              </div>
              
              <div className="bots-grid">
                {HOMEPAGE_BOTS.map((bot) => (
                  <div key={bot.id} className="bot-card" onClick={() => handlePlayBot(bot)}>
                    <div className="bot-avatar">{bot.avatar}</div>
                    <div className="bot-name">{bot.name}</div>
                    <div className="bot-rating">⭐ {bot.elo}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 5. PUZZLES SECTION */}
        <ScrollReveal>
          <section id="puzzles" className="section">
            <div className="section-inner reverse">
              <div className="puzzle-display">
                <div className="puzzle-header">
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Puzzle Rating</div>
                    <div className="puzzle-rating">1,847</div>
                  </div>
                  <div className="puzzle-streak">🔥 12-day streak</div>
                </div>
                <div className="mini-board">
                  {renderStaticBoard('6k1/5ppp/8/8/8/8/5PPP/4R1K1')}
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text2)', textAlign: 'center', fontWeight: 600 }}>
                  White to move — find the best move!
                </div>
              </div>
              
              <div>
                <h2>Level Up With<br />Chess Puzzles</h2>
                <p>Sharpen your skills and improve your game with thousands of puzzles. Track your rating and compete with players worldwide.</p>
                <button className="btn-outline" onClick={() => navigate('/puzzles')}>
                  🧩 Solve a Puzzle
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 6. MOBILE APP SECTION */}
        <ScrollReveal>
          <section className="section">
            <div className="section-inner">
              <div>
                <h2>Play Anywhere with<br />the ChessMaster App</h2>
                <p>Take your chess game on the go. Available on iOS and Android, with all your stats and games synced across devices.</p>
                <div className="app-badges">
                  <button className="app-badge" onClick={() => showToast('App Store download coming soon!', 'info')}>
                    <span className="ab-icon">🍎</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Download on the</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>App Store</div>
                    </div>
                  </button>
                  <button className="app-badge" onClick={() => showToast('Google Play download coming soon!', 'info')}>
                    <span className="ab-icon">▶️</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Get it on</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Google Play</div>
                    </div>
                  </button>
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
                    <div className="phone-board">
                      {renderStaticBoard('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R')}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--text2)', textAlign: 'center', fontWeight: 600 }}>
                      Anna (1326) 🇺🇸 vs You
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 7. FOOTER CTA */}
        <div className="footer-cta">
          <h2>Learn, Play, and Have Fun!</h2>
          <button className="btn-cta" style={{ padding: '16px 48px', fontSize: '18px' }} onClick={() => navigate('/game')}>
            Get Started — It's Free!
          </button>
        </div>

        {/* 8. FOOTER LINKS */}
        <footer className="footer-links">
          <div className="footer-row-links">
            <span onClick={() => navigate('/learn')}>About</span>
            <span onClick={() => navigate('/settings')}>Help</span>
            <span onClick={() => navigate('/privacy')}>Terms</span>
            <span onClick={() => navigate('/privacy')}>Privacy</span>
            <span onClick={() => navigate('/leaderboard')}>Community</span>
          </div>
          <div style={{ fontSize: '11px', color: '#555555', marginTop: '10px' }}>
            ChessMaster Pro © 2026. Made with ❤️ for chess fans.
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
