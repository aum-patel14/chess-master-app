import './OtherPage.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { Target, Book, Calculator, Search, CheckCircle, AlertTriangle, RefreshCw, Compass } from 'lucide-react';
import { useToast } from '../hooks/useToast';

// SEARCHABLE GLOSSARY DEFINITIONS
const GLOSSARY = [
  { term: 'Zugzwang', def: 'A German term meaning "compulsion to move". A position in which the player whose turn it is to move is at a disadvantage because they must make a move when they would prefer to pass.' },
  { term: 'Zwischenzug', def: 'An "in-between move" played instead of an expected reply. It forces the opponent to respond immediately, turning a tactical line in the player\'s favor.' },
  { term: 'Fianchetto', def: 'Developing a bishop by placing it on the long diagonal (squares b2/g2 for White, b7/g7 for Black) after moving the adjacent b- or g-pawn.' },
  { term: 'En Passant', def: 'A special pawn capture. When a pawn moves forward two squares from its starting position and lands adjacent to an enemy pawn, the enemy pawn can capture it "in passing", as if it moved only one square.' },
  { term: 'Fianchetto', def: 'Developing a bishop by placing it on the long diagonal (squares b2/g2 for White, b7/g7 for Black) after moving the adjacent b- or g-pawn.' },
  { term: 'Castling', def: 'A dual-piece move involving the King and Rook. It moves the King two squares toward a Rook, and places the Rook on the square the King just crossed. Eligible only if neither piece has moved and the path is clear.' },
  { term: 'Skewer', def: 'A tactical attack where a valuable piece is attacked, and once forced to move, reveals a less valuable piece behind it that can be captured.' },
  { term: 'Pin', def: 'A tactical defense/attack where a piece is restricted from moving because doing so would expose a more valuable piece behind it (Absolute pin if King, Relative if other).' },
  { term: 'Fork', def: 'A single move that attacks two or more enemy pieces simultaneously, forcing the opponent to lose material.' },
  { term: 'Gambit', def: 'A chess opening sacrifice (usually a pawn) in exchange for rapid development, active pieces, or central space.' },
  { term: 'Opposition', def: 'A king endgame scenario where two Kings face each other across a single file or rank with one square separating them. The player who does not have to move holds the opposition.' },
  { term: 'Stalemate', def: 'A drawing scenario where the active player has no legal moves remaining and their King is NOT in check.' }
];

// EXPLORER OPENINGS
const OPENINGS = [
  { name: 'Sicilian Defense', moves: '1. e4 c5', winsW: 38, draws: 29, winsB: 33, desc: 'The most popular response to 1.e4, leading to asymmetrical, highly tactical games.' },
  { name: 'Ruy Lopez (Spanish)', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5', winsW: 41, draws: 32, winsB: 27, desc: 'One of the oldest, most deeply studied openings, emphasizing central control and minor piece activity.' },
  { name: 'Queen\'s Gambit', moves: '1. d4 d5 2. c4', winsW: 43, draws: 34, winsB: 23, desc: 'White offers a temporary wing pawn to gain space and leverage in the center.' },
  { name: 'Caro-Kann Defense', moves: '1. e4 c6', winsW: 37, draws: 33, winsB: 30, desc: 'A solid, hyper-reliable defensive system seeking to establish a resilient pawn structure.' },
  { name: 'French Defense', moves: '1. e4 e5', winsW: 39, draws: 30, winsB: 31, desc: 'A counter-attacking opening where Black concedes space early but builds a compact pawn chain.' }
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function OtherPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'vision' | 'rules' | 'elo' | 'explorer'
  
  // VISION TRAINER STATE
  const [visionActive, setVisionActive] = useState(false);
  const [targetSquare, setTargetSquare] = useState('');
  const [visionScore, setVisionScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lastFeedback, setLastFeedback] = useState(null); // 'correct' | 'incorrect'
  const timerRef = useRef(null);

  // ELO CALCULATOR STATE
  const [playerElo, setPlayerElo] = useState(1200);
  const [oppElo, setOppElo] = useState(1200);
  const [gameResult, setGameResult] = useState('win'); // 'win' | 'draw' | 'loss'
  const [kFactor, setKFactor] = useState(32);
  const [calculatedChange, setCalculatedChange] = useState(null);

  // GLOSSARY SEARCH STATE
  const [glossarySearch, setGlossarySearch] = useState('');

  // ── VISION TRAINER LOGIC ──
  const generateRandomSquare = () => {
    const file = FILES[Math.floor(Math.random() * 8)];
    const rank = RANKS[Math.floor(Math.random() * 8)];
    return `${file}${rank}`;
  };

  const startVisionTraining = () => {
    setVisionScore(0);
    setTimeLeft(30);
    setTargetSquare(generateRandomSquare());
    setVisionActive(true);
    setLastFeedback(null);
    showToast('Identify the target squares as fast as you can!', 'info');
  };

  useEffect(() => {
    if (visionActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && visionActive) {
      setVisionActive(false);
      showToast(`Training complete! Final Score: ${visionScore}`, 'success');
    }
    return () => clearInterval(timerRef.current);
  }, [visionActive, timeLeft]);

  const handleSquareClick = (square) => {
    if (!visionActive) return;
    if (square === targetSquare) {
      setVisionScore(s => s + 1);
      setLastFeedback('correct');
      setTargetSquare(generateRandomSquare());
    } else {
      setLastFeedback('incorrect');
      showToast(`Oops! That was ${square}. Keep trying!`, 'error', 1000);
    }
    setTimeout(() => setLastFeedback(null), 300);
  };

  // ── ELO CALCULATOR LOGIC ──
  const calculateEloChange = () => {
    const pE = parseFloat(playerElo);
    const oE = parseFloat(oppElo);
    if (isNaN(pE) || isNaN(oE)) {
      showToast('Please enter valid ratings numbers', 'warning');
      return;
    }
    
    // Expectation value (sigmoid formula)
    const expected = 1 / (1 + Math.pow(10, (oE - pE) / 400));
    
    let actual = 0.5;
    if (gameResult === 'win') actual = 1;
    if (gameResult === 'loss') actual = 0;

    const change = Math.round(kFactor * (actual - expected));
    setCalculatedChange(change);
  };

  // Filter glossary
  const filteredGlossary = GLOSSARY.filter(item => 
    item.term.toLowerCase().includes(glossarySearch.toLowerCase()) || 
    item.def.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <PageShell>
      <div className="other-page-container">
        {/* TOP BAR / NAVIGATION */}
        <div className="other-page-header">
          <button 
            type="button" 
            onClick={() => {
              if (activeTab === 'dashboard') navigate(-1);
              else setActiveTab('dashboard');
            }} 
            className="other-back-btn"
          >
            ← {activeTab === 'dashboard' ? 'Back' : 'Back to Dashboard'}
          </button>
          <h1 className="other-title font-cinzel">Chess Tools</h1>
          <p className="other-subtitle">Enhance your game with premium ChessMaster Pro tools</p>
        </div>

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Vision Trainer Card */}
            <div className="tool-card green" onClick={() => setActiveTab('vision')}>
              <div className="tool-card-icon"><Target size={32} /></div>
              <h2 className="font-cinzel">Vision Training</h2>
              <p>Practice board squares coordinates. Identify ranks and files instantly.</p>
              <span className="tool-card-action">Play Game →</span>
            </div>

            {/* Glossary / Terms Card */}
            <div className="tool-card blue" onClick={() => setActiveTab('rules')}>
              <div className="tool-card-icon"><Book size={32} /></div>
              <h2 className="font-cinzel">Rules & Glossary</h2>
              <p>Search advanced chess terminology: Zugzwang, Fianchetto, and more.</p>
              <span className="tool-card-action">Browse terms →</span>
            </div>

            {/* ELO Calculator Card */}
            <div className="tool-card brown" onClick={() => setActiveTab('elo')}>
              <div className="tool-card-icon"><Calculator size={32} /></div>
              <h2 className="font-cinzel">ELO Calculator</h2>
              <p>Compute official FIDE rating adjustments for wins, losses, or draws.</p>
              <span className="tool-card-action">Open Calculator →</span>
            </div>

            {/* Explorer Card */}
            <div className="tool-card grey" onClick={() => setActiveTab('explorer')}>
              <div className="tool-card-icon"><Compass size={32} /></div>
              <h2 className="font-cinzel">Opening Explorer</h2>
              <p>Master standard opening moves: Sicilian Defense, Ruy Lopez, and stats.</p>
              <span className="tool-card-action">Learn openings →</span>
            </div>

            {/* Promo Showcase Cards mimicking Chess.com's Other Section */}
            <div className="showcase-card">
              <span className="showcase-emoji">🏟</span>
              <h3 className="font-cinzel">Computer Championship</h3>
              <p>Watch stockfish and neural network chess engines fight online.</p>
              <span className="badge-premium">Live soon</span>
            </div>

            <div className="showcase-card">
              <span className="showcase-emoji">👶</span>
              <h3 className="font-cinzel">ChessKid</h3>
              <p>Safe chess training portal specifically designed for kids and schools.</p>
              <span className="badge-premium">Partnership</span>
            </div>

            <div className="showcase-card">
              <span className="showcase-emoji">🎪</span>
              <h3 className="font-cinzel">Vote Chess</h3>
              <p>Play in community leagues. Vote collectively to make the best team move.</p>
              <span className="badge-premium">Coming Soon</span>
            </div>

            <div className="showcase-card">
              <span className="showcase-emoji">🎁</span>
              <h3 className="font-cinzel">Gift Memberships</h3>
              <p>Surprise a friend with premium diamond memberships and badges.</p>
              <span className="badge-premium">Shop</span>
            </div>
          </div>
        )}

        {/* 2. VISION TRAINER VIEW */}
        {activeTab === 'vision' && (
          <div className="vision-view-container">
            <div className="tool-header font-cinzel">🎯 COORDINATES VISION TRAINING</div>
            <div className="vision-stats-row">
              <div className="vision-stat-item">
                <span className="stat-label">TIME</span>
                <span className="stat-value">{timeLeft}s</span>
              </div>
              <div className="vision-stat-item">
                <span className="stat-label">SCORE</span>
                <span className="stat-value">{visionScore}</span>
              </div>
              {!visionActive ? (
                <button className="vision-start-btn" onClick={startVisionTraining}>
                  Start Practice
                </button>
              ) : (
                <div className="vision-target-square">
                  Target: <span className="highlight-target font-cinzel">{targetSquare.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* VISION BOARD GRID */}
            <div className={`vision-board-grid ${!visionActive ? 'disabled' : ''}`}>
              {RANKS.map((rank) =>
                FILES.map((file) => {
                  const squareName = `${file}${rank}`;
                  const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
                  const isTargetClicked = lastFeedback && squareName === targetSquare;

                  return (
                    <div 
                      key={squareName}
                      onClick={() => handleSquareClick(squareName)}
                      className={`vision-square ${isLight ? 'light' : 'dark'} ${lastFeedback==='correct' && isTargetClicked ? 'correct-flash' : ''}`}
                    >
                      <span className="vision-coords-label">{squareName}</span>
                    </div>
                  );
                })
              )}
              {!visionActive && (
                <div className="board-overlay-prompt font-cinzel" onClick={startVisionTraining}>
                  CLICK TO START TRAINING
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. GLOSSARY VIEW */}
        {activeTab === 'rules' && (
          <div className="glossary-view-container">
            <div className="tool-header font-cinzel">📖 RULES & CHESS GLOSSARY</div>
            <div className="search-bar-wrap">
              <Search size={18} className="search-bar-icon" />
              <input 
                type="text" 
                placeholder="Search advanced terms (e.g. Zugzwang, Fianchetto...)" 
                value={glossarySearch} 
                onChange={(e) => setGlossarySearch(e.target.value)} 
                className="glossary-search-input"
              />
            </div>

            <div className="glossary-list">
              {filteredGlossary.length === 0 ? (
                <p className="no-results">No glossary matches found.</p>
              ) : (
                filteredGlossary.map((item, idx) => (
                  <div key={idx} className="glossary-item-card">
                    <h3 className="glossary-term font-cinzel">{item.term}</h3>
                    <p className="glossary-def">{item.def}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. ELO CALCULATOR VIEW */}
        {activeTab === 'elo' && (
          <div className="elo-view-container">
            <div className="tool-header font-cinzel">🧮 FIDE ELO CALCULATOR</div>
            <div className="calculator-form">
              <div className="calc-row">
                <div className="calc-col">
                  <label className="calc-label">Your Rating</label>
                  <input 
                    type="number" 
                    value={playerElo} 
                    onChange={(e) => setPlayerElo(e.target.value)} 
                    className="calc-input" 
                  />
                </div>
                <div className="calc-col">
                  <label className="calc-label">Opponent Rating</label>
                  <input 
                    type="number" 
                    value={oppElo} 
                    onChange={(e) => setOppElo(e.target.value)} 
                    className="calc-input" 
                  />
                </div>
              </div>

              <div className="calc-row">
                <div className="calc-col">
                  <label className="calc-label">Game Outcome</label>
                  <select 
                    value={gameResult} 
                    onChange={(e) => setGameResult(e.target.value)} 
                    className="calc-select"
                  >
                    <option value="win">Win ✓</option>
                    <option value="draw">Draw =</option>
                    <option value="loss">Loss ✗</option>
                  </select>
                </div>
                <div className="calc-col">
                  <label className="calc-label">FIDE K-Factor</label>
                  <select 
                    value={kFactor} 
                    onChange={(e) => setKFactor(e.target.value)} 
                    className="calc-select"
                  >
                    <option value="32">K = 32 (Junior/Club default)</option>
                    <option value="20">K = 20 (FIDE default)</option>
                    <option value="10">K = 10 (Master/2400+ default)</option>
                  </select>
                </div>
              </div>

              <button className="calc-btn font-cinzel" onClick={calculateEloChange}>
                Calculate Rating Adjustment
              </button>

              {calculatedChange !== null && (
                <div className="calc-results-card">
                  <div className="calc-diff font-cinzel" style={{ color: calculatedChange >= 0 ? '#10b981' : '#ef4444' }}>
                    {calculatedChange >= 0 ? `+${calculatedChange}` : calculatedChange} ELO
                  </div>
                  <p className="calc-new-rating">
                    Your New Rating: <span style={{ fontWeight: 800 }}>{parseInt(playerElo) + calculatedChange} ELO</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. OPENINGS EXPLORER VIEW */}
        {activeTab === 'explorer' && (
          <div className="explorer-view-container">
            <div className="tool-header font-cinzel">🌐 MASTER OPENINGS EXPLORER</div>
            <p className="explorer-intro">Learn standard opening theories and view actual master game results database from FIDE master tournaments.</p>

            <div className="openings-list">
              {OPENINGS.map((op, idx) => (
                <div key={idx} className="opening-detail-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="opening-name font-cinzel">{op.name}</h3>
                    <span className="opening-moves">{op.moves}</span>
                  </div>
                  <p className="opening-desc">{op.desc}</p>
                  
                  {/* Visual Bar of Wins/Draws/Losses */}
                  <div className="win-ratio-bar">
                    <div className="bar-part white" style={{ width: `${op.winsW}%` }} title={`White Wins: ${op.winsW}%`}>
                      {op.winsW}%
                    </div>
                    <div className="bar-part draw" style={{ width: `${op.draws}%` }} title={`Draws: ${op.draws}%`}>
                      {op.draws}%
                    </div>
                    <div className="bar-part black" style={{ width: `${op.winsB}%` }} title={`Black Wins: ${op.winsB}%`}>
                      {op.winsB}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
