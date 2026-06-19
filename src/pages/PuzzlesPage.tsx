import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import PageShell from '../components/PageShell';
import { useToast } from '../hooks/useToast';
import puzzlesData from '../data/puzzles.json';
import { Calendar, Zap, Star, Swords, Target, RefreshCw, Eye, Award, HelpCircle } from 'lucide-react';
import { soundManager } from '../engine/soundManager';
import { incrementPuzzlesSolved } from '../utils/chessStats';

interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  title: string;
  opponentPlaysFirst?: boolean;
}

const PIECE_SYMBOLS: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟'
};

export default function PuzzlesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Screen state: 'menu' | 'solving' | 'rush'
  const [screen, setScreen] = useState<'menu' | 'solving' | 'rush'>('menu');
  const [currentMode, setCurrentMode] = useState<'daily' | 'rated' | 'custom'>('daily');
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);

  // Solving states
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(puzzlesData[0]);
  const [puzzleList, setPuzzleList] = useState<Puzzle[]>(puzzlesData);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [flashClass, setFlashClass] = useState<'none' | 'correct' | 'wrong'>('none');
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHintDetail, setShowHintDetail] = useState(false);

  // Puzzle Rush states
  const [rushScore, setRushScore] = useState(0);
  const [rushStrikes, setRushStrikes] = useState(0);
  const [rushTime, setRushTime] = useState(180); // 3 mins default
  const [rushActive, setRushActive] = useState(false);
  const [rushModeType, setRushModeType] = useState<'3min' | '5min' | 'survival'>('3min');

  // Chess.com-style streak tracking (local only)
  const [puzzleStreak, setPuzzleStreak] = useState(() => {
    const v = parseInt(localStorage.getItem('chess_puzzle_streak') || '0', 10);
    return Number.isFinite(v) ? v : 0;
  });
  const [puzzleStreakDate, setPuzzleStreakDate] = useState(() => localStorage.getItem('chess_puzzle_streak_date') || '');
  const todayKey = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setPuzzleStreak(parseInt(localStorage.getItem('chess_puzzle_streak') || '0', 10) || 0);
    setPuzzleStreakDate(localStorage.getItem('chess_puzzle_streak_date') || '');
  }, []);

  const commitDailyStreakIfNeeded = () => {
    const today = todayKey();
    const last = localStorage.getItem('chess_puzzle_streak_date') || '';
    if (last === today) return;

    const prev = parseInt(localStorage.getItem('chess_puzzle_streak') || '0', 10) || 0;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const next = last === yesterday ? prev + 1 : 1;
    localStorage.setItem('chess_puzzle_streak', String(next));
    localStorage.setItem('chess_puzzle_streak_date', today);
    setPuzzleStreak(next);
    setPuzzleStreakDate(today);
  };

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch (e) {
      return new Chess();
    }
  }, [fen]);

  const board = chess.board();

  // Load a new puzzle to solve
  const loadPuzzle = (puz: Puzzle) => {
    setCurrentPuzzle(puz);
    setSelectedSquare(null);
    setIsSolved(false);
    setFlashClass('none');
    setHintsUsed(0);
    setShowHintDetail(false);

    try {
      const pChess = new Chess(puz.fen);
      if (puz.opponentPlaysFirst && puz.moves && puz.moves.length > 0) {
        const firstMove = puz.moves[0];
        const fromSq = firstMove.slice(0, 2);
        const toSq = firstMove.slice(2, 4);
        const prom = firstMove.slice(4, 5) || undefined;
        
        pChess.move({ from: fromSq, to: toSq, promotion: prom });
        setFen(pChess.fen());
        setMoveIndex(1);
      } else {
        setFen(puz.fen);
        setMoveIndex(0);
      }
      
      // Auto-flip board based on active player's turn color
      const playerColor = pChess.turn();
      setBoardFlipped(playerColor === 'b');
    } catch (e) {
      console.error('Error loading puzzle:', e);
      setFen(puz.fen);
      setMoveIndex(0);
      setBoardFlipped(false);
    }
  };

  // Load daily puzzle from Lichess API
  useEffect(() => {
    if (currentMode === 'daily') {
      setLoadingPuzzle(true);
      fetch('https://lichess.org/api/puzzle/daily')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch from Lichess');
          return res.json();
        })
        .then((data) => {
          if (data && data.puzzle && data.puzzle.fen) {
            const mappedPuzzle: Puzzle = {
              id: data.puzzle.id,
              fen: data.puzzle.fen,
              moves: data.puzzle.solution,
              rating: data.puzzle.rating,
              themes: data.puzzle.themes || [],
              title: data.game?.perf?.name 
                ? `${data.game.perf.name.charAt(0).toUpperCase() + data.game.perf.name.slice(1)} Tactical Puzzle` 
                : 'Lichess Daily Puzzle',
              opponentPlaysFirst: true
            };
            loadPuzzle(mappedPuzzle);
          }
          setLoadingPuzzle(false);
        })
        .catch((err) => {
          console.warn('Lichess daily puzzle API error (CORS or offline), falling back to offline db:', err);
          const fallback = puzzlesData[0];
          loadPuzzle(fallback);
          setLoadingPuzzle(false);
        });
    }
  }, [currentMode]);

  // Timer loop for Puzzle Rush
  useEffect(() => {
    let timer: any = null;
    if (screen === 'rush' && rushActive && rushTime > 0 && rushModeType !== 'survival') {
      timer = setInterval(() => {
        setRushTime((t) => {
          if (t <= 1) {
            setRushActive(false);
            showToast(`Time's up! You solved ${rushScore} puzzles!`, 'success');
            confetti();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [screen, rushActive, rushScore, rushTime, rushModeType]);

  // Piece theme selector setup
  const pieceTheme = typeof localStorage !== 'undefined' ? (localStorage.getItem('chess_pieces') || 'cburnett') : 'cburnett';
  const getPieceImage = (color: string, type: string) => {
    const key = `${color}${type.toUpperCase()}`;
    return `${import.meta.env.BASE_URL || '/'}pieces/${pieceTheme}/${key}.svg`;
  };

  const handleSquareClick = (square: string) => {
    if (isSolved) return;

    if (!selectedSquare) {
      const piece = chess.get(square as any);
      // Ensure player clicks their own color piece
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    } else {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      // Attempt move validation
      try {
        const testChess = new Chess(fen);
        
        // Underpromotion and standard promotion validation
        const expectedUci = currentPuzzle.moves[moveIndex].toLowerCase();
        let promotionPiece = 'q';
        if (expectedUci.length === 5 && expectedUci.substring(0, 4) === `${selectedSquare}${square}`) {
          promotionPiece = expectedUci[4];
        }

        const move = testChess.move({ from: selectedSquare, to: square, promotion: promotionPiece });
        
        if (move) {
          // Construct UCI representation (e.g. "e2e4" or "e7e8q")
          let moveUci = `${selectedSquare}${square}`;
          if (move.promotion) {
            moveUci += move.promotion.toLowerCase();
          }

          if (moveUci === expectedUci) {
            // Correct player move
            const nextFen = testChess.fen();
            setFen(nextFen);
            setSelectedSquare(null);
            
            const nextMoveIdx = moveIndex + 1;
            
            if (nextMoveIdx >= currentPuzzle.moves.length) {
              // Puzzle solved completely!
              setIsSolved(true);
              setFlashClass('correct');
              soundManager.playWin();
              confetti();
              showToast('Best Move!', 'success');
              
              if (currentMode === 'daily' || currentMode === 'rated') {
                try {
                  incrementPuzzlesSolved();
                } catch (e) {
                  console.warn("Failed to increment puzzles solved:", e);
                }
              }
              if (currentMode === 'daily' && screen !== 'rush') {
                commitDailyStreakIfNeeded();
              }

              if (screen === 'rush') {
                setRushScore((s) => s + 1);
                // Load next puzzle immediately in Rush
                setTimeout(() => {
                  const nextIdx = (puzzleIndex + 1) % puzzleList.length;
                  setPuzzleIndex(nextIdx);
                  loadPuzzle(puzzleList[nextIdx]);
                }, 800);
              }
            } else {
              // Play correct intermediate move sound
              if (testChess.inCheck()) {
                soundManager.playCheck();
              } else if (move.captured) {
                soundManager.playCapture();
              } else {
                soundManager.playMove();
              }

              // Auto-play opponent response move
              setFlashClass('correct');
              setTimeout(() => {
                setFlashClass('none');
                const oppUci = currentPuzzle.moves[nextMoveIdx];
                const fromSq = oppUci.slice(0, 2);
                const toSq = oppUci.slice(2, 4);
                const prom = oppUci.slice(4, 5) || undefined;
                
                const oppMove = testChess.move({ from: fromSq, to: toSq, promotion: prom });
                setFen(testChess.fen());
                setMoveIndex(nextMoveIdx + 1);

                if (oppMove) {
                  if (testChess.inCheck()) {
                    soundManager.playCheck();
                  } else if (oppMove.captured) {
                    soundManager.playCapture();
                  } else {
                    soundManager.playMove();
                  }
                }
              }, 600);
            }
          } else {
            // Incorrect move
            setFlashClass('wrong');
            soundManager.playDraw(); // Buzzer sound
            showToast('Incorrect move!', 'error');
            setSelectedSquare(null);
            
            if (screen === 'rush') {
              setRushStrikes((s) => {
                const nextStrikes = s + 1;
                if (nextStrikes >= 3) {
                  setRushActive(false);
                  showToast(`Game Over! You solved ${rushScore} puzzles!`, 'info');
                }
                return nextStrikes;
              });
              // Load next puzzle in Rush anyway
              setTimeout(() => {
                const nextIdx = (puzzleIndex + 1) % puzzleList.length;
                setPuzzleIndex(nextIdx);
                loadPuzzle(puzzleList[nextIdx]);
              }, 800);
            } else {
              setHintsUsed((h) => h + 1);
            }
          }
        }
      } catch (e) {
        setSelectedSquare(null);
      }
    }
  };

  const handleHint = () => {
    const expected = currentPuzzle.moves[moveIndex];
    if (expected) {
      showToast(`Hint: Move piece from ${expected.slice(0, 2)}`, 'info');
      setShowHintDetail(true);
    }
  };

  const handleNextPuzzle = () => {
    const nextIdx = (puzzleIndex + 1) % puzzleList.length;
    setPuzzleIndex(nextIdx);
    loadPuzzle(puzzleList[nextIdx]);
  };

  // Puzzle Rush configurations
  const startPuzzleRush = (type: '3min' | '5min' | 'survival') => {
    setRushScore(0);
    setRushStrikes(0);
    setRushModeType(type);
    
    let timeLimit = 180;
    if (type === '5min') timeLimit = 300;
    else if (type === 'survival') timeLimit = 999999; // no timer for survival

    setRushTime(timeLimit);
    setRushActive(true);
    setScreen('rush');
    setPuzzleIndex(0);
    loadPuzzle(puzzlesData[0]);
  };

  const getTimerPercentage = () => {
    if (rushModeType === 'survival') return 100;
    const maxTime = rushModeType === '5min' ? 300 : 180;
    return (rushTime / maxTime) * 100;
  };

  const getTimerColor = () => {
    if (rushModeType === 'survival') return '#6bbd44';
    if (rushTime < 30) return '#ef4444'; // red
    if (rushTime < 60) return '#f59e0b'; // amber
    return '#6bbd44'; // green
  };

  const getDifficultyLabel = (rating: number) => {
    if (rating < 1000) return 'Beginner';
    if (rating < 1600) return 'Intermediate';
    return 'Advanced';
  };

  return (
    <PageShell>
      <div style={{ background: '#161513', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
        <style>{`
          .puzzle-card {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            text-align: left;
          }
          
          .puzzle-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .puzzle-card-icon-container {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            flex-shrink: 0;
          }

          .puzzle-card-title {
            font-size: 16px;
            color: #ffffff;
            font-weight: 700;
            margin: 0;
          }

          .puzzle-card-subtitle {
            font-size: 13px;
            color: #888888;
            margin: 2px 0 0;
            line-height: 1.3;
          }

          .btn-chess-green {
            width: 100%;
            height: 40px;
            background: #6bbd44;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          .btn-chess-green:hover {
            background: #78d24c;
          }

          .btn-chess-green:active {
            transform: scale(0.98);
          }

          /* Interactive flash animations */
          .board-flash-correct {
            animation: flash-correct 0.6s ease;
          }

          .board-flash-wrong {
            animation: flash-wrong 0.6s ease, shake-board 0.4s ease;
          }

          @keyframes flash-correct {
            0% { box-shadow: 0 0 0px transparent; }
            50% { box-shadow: 0 0 25px rgba(107, 189, 68, 0.85); }
            100% { box-shadow: 0 0 0px transparent; }
          }

          @keyframes flash-wrong {
            0% { box-shadow: 0 0 0px transparent; }
            50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.85); }
            100% { box-shadow: 0 0 0px transparent; }
          }

          @keyframes shake-board {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Grid for Puzzle modes */
          .puzzle-modes-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          @media (max-width: 360px) {
            .puzzle-modes-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            background: '#2b2b2b',
            display: 'flex',
            flexDirection: 'column',
            color: '#ffffff',
            position: 'relative',
            boxShadow: '0 0 35px rgba(0,0,0,0.6)',
          }}
        >
          {/* SCREEN 1: MENU / DASHBOARD */}
          {screen === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ background: '#1a1a1a', padding: '20px 16px', borderBottom: '1px solid #333333', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>Puzzles</h1>
                    <p style={{ fontSize: '13px', color: '#aaaaaa', margin: '4px 0 0' }}>Sharpen your skills</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', background: '#252525', border: '1px solid #333', padding: '6px 10px', borderRadius: '999px', color: '#e5e7eb', fontWeight: 700 }}>
                      🔥 {puzzleStreak} day streak
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    { id: 'daily', label: 'Daily', onClick: () => { setCurrentMode('daily'); setScreen('solving'); } },
                    { id: 'rated', label: 'Rated', onClick: () => { setCurrentMode('rated'); loadPuzzle(puzzlesData[1]); setScreen('solving'); } },
                    { id: 'rush', label: 'Rush', onClick: () => startPuzzleRush('3min') },
                    { id: 'custom', label: 'By Theme', onClick: () => { setCurrentMode('custom'); loadPuzzle(puzzlesData[2]); setScreen('solving'); } },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={tab.onClick}
                      style={{
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: tab.id === currentMode ? 'rgba(107,189,68,0.18)' : 'transparent',
                        color: tab.id === currentMode ? '#6bbd44' : '#cbd5e1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Contents */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* DAILY PUZZLE CARD */}
                <div className="puzzle-card" style={{ border: '1px solid #333' }}>
                  <div className="puzzle-card-header">
                    <div className="puzzle-card-icon-container" style={{ background: 'rgba(107,189,68,0.15)', color: '#6bbd44' }}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6bbd44', fontWeight: 800, letterSpacing: '0.5px' }}>Daily Puzzle</div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{currentPuzzle.title}</h3>
                    </div>
                  </div>
                  
                  {/* Streak and badge info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ background: '#2b2b2b', padding: '4px 8px', borderRadius: '6px', color: '#aaaaaa', fontSize: '11px', fontWeight: 700 }}>
                      {getDifficultyLabel(currentPuzzle.rating)} ({currentPuzzle.rating})
                    </span>
                    <span style={{ color: '#ff9f0a', fontWeight: 700 }}>
                      🔥 {puzzleStreak} day streak
                    </span>
                  </div>

                  {/* Thumbnail Board Representation */}
                  {loadingPuzzle ? (
                    <div style={{ width: '100%', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1c1c', borderRadius: '8px', gap: '12px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                      <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #6bbd44', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '12px', color: '#888' }}>Fetching from Lichess...</span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1', background: '#769656', borderRadius: '8px', overflow: 'hidden', pointerEvents: 'none', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                      {board.map((row, rIdx) =>
                        row.map((cell, cIdx) => {
                          const isLight = (rIdx + cIdx) % 2 === 0;
                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              style={{
                                background: isLight ? '#eeeed2' : '#769656',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                              }}
                            >
                              {cell && (
                                <img
                                  src={getPieceImage(cell.color, cell.type)}
                                  alt=""
                                  style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setCurrentMode('daily');
                      loadPuzzle(currentPuzzle);
                      setScreen('solving');
                    }}
                    className="btn-chess-green"
                    style={{ height: '44px' }}
                  >
                    Solve Today's Puzzle
                  </button>
                </div>

                {/* 2x2 MODES GRID */}
                <div className="puzzle-modes-grid">
                  
                  {/* Card 1: Puzzle Rush */}
                  <div className="puzzle-card">
                    <div className="puzzle-card-header">
                      <div className="puzzle-card-icon-container" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="puzzle-card-title">Puzzle Rush</h4>
                        <p className="puzzle-card-subtitle">Solve as many as you can</p>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', background: '#252525', padding: '4px 8px', borderRadius: '4px', color: '#f59e0b', fontWeight: 700, width: 'fit-content' }}>
                      3 min | 5 min | Survival
                    </div>
                    <button
                      onClick={() => startPuzzleRush('3min')}
                      className="btn-chess-green"
                    >
                      Start Rush
                    </button>
                  </div>

                  {/* Card 2: Rated Puzzles */}
                  <div className="puzzle-card">
                    <div className="puzzle-card-header">
                      <div className="puzzle-card-icon-container" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                        <Star size={20} />
                      </div>
                      <div>
                        <h4 className="puzzle-card-title">Puzzles</h4>
                        <p className="puzzle-card-subtitle">Improve your rating</p>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', background: '#252525', padding: '4px 8px', borderRadius: '4px', color: '#3b82f6', fontWeight: 700, width: 'fit-content' }}>
                      Rating: 1247 ±45
                    </div>
                    <button
                      onClick={() => {
                        navigate('/puzzles/rated');
                      }}
                      className="btn-chess-green"
                    >
                      Solve Puzzles
                    </button>
                  </div>

                  {/* Card 3: Puzzle Battle */}
                  <div className="puzzle-card">
                    <div className="puzzle-card-header">
                      <div className="puzzle-card-icon-container" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                        <Swords size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <h4 className="puzzle-card-title">Puzzle Battle</h4>
                        </div>
                        <p className="puzzle-card-subtitle">Race a friend</p>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', background: '#2e1e3a', border: '1px solid rgba(212,175,55,0.4)', padding: '2px 6px', borderRadius: '4px', color: '#d4af37', fontWeight: 800, width: 'fit-content' }}>
                      Premium
                    </div>
                    <button
                      onClick={() => showToast('Puzzle Battle matchmaking starting...', 'info')}
                      className="btn-chess-green"
                    >
                      Find Opponent
                    </button>
                  </div>

                  {/* Card 4: Custom Puzzles */}
                  <div className="puzzle-card">
                    <div className="puzzle-card-header">
                      <div className="puzzle-card-icon-container" style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}>
                        <Target size={20} />
                      </div>
                      <div>
                        <h4 className="puzzle-card-title">By Theme</h4>
                        <p className="puzzle-card-subtitle">Fork · Pin · Skewer · Mate</p>
                      </div>
                    </div>
                    <div style={{ height: '21px' }} /> {/* spacing helper */}
                    <button
                      onClick={() => {
                        setCurrentMode('custom');
                        loadPuzzle(puzzlesData[2]);
                        setScreen('solving');
                      }}
                      className="btn-chess-green"
                    >
                      Choose Theme
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: ACTIVE SOLVING INTERFACE */}
          {screen === 'solving' && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
              {/* Header Info */}
              <div style={{ background: '#1a1a1a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
                <button
                  onClick={() => setScreen('menu')}
                  style={{ background: 'transparent', border: 'none', color: '#6bbd44', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  ◀ Back
                </button>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>
                  {currentMode === 'daily' ? 'Daily Puzzle' : currentMode === 'rated' ? 'Rated Training' : 'Theme Practice'}
                </span>
                <span style={{ fontSize: '12px', background: '#3a3a3a', padding: '2px 6px', borderRadius: '4px', color: '#aaaaaa' }}>
                  Rating: {currentPuzzle.rating}
                </span>
              </div>

              {/* Find move instruction bar */}
              <div
                style={{
                  background: '#6bbd44',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                Find the best move for {chess.turn() === 'w' ? 'White' : 'Black'} {chess.turn() === 'w' ? '▶' : '◀'}
              </div>

              {/* Solved / Shaking visual board container */}
              <div style={{ padding: '16px', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className={`board-flash-${flashClass}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: '#769656',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gridTemplateRows: 'repeat(8, 1fr)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}
                >
                  {board.map((row, rIdx) => {
                    const actualRow = boardFlipped ? 7 - rIdx : rIdx;
                    return board[actualRow].map((cell, cIdx) => {
                      const actualCol = boardFlipped ? 7 - cIdx : cIdx;
                      const activeCell = board[actualRow][actualCol];
                      
                      const file = String.fromCharCode(97 + actualCol);
                      const rank = boardFlipped ? rIdx + 1 : 8 - rIdx;
                      const square = `${file}${rank}`;
                      
                      const isSelected = selectedSquare === square;
                      const isLight = (actualRow + actualCol) % 2 !== 0;

                      return (
                        <div
                          key={square}
                          onClick={() => handleSquareClick(square)}
                          style={{
                            background: isSelected
                              ? 'rgba(235, 208, 5, 0.5)'
                              : isLight ? '#eeeed2' : '#769656',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {activeCell && (
                            <img
                              src={getPieceImage(activeCell.color, activeCell.type)}
                              alt={`${activeCell.color} ${activeCell.type}`}
                              style={{
                                width: '85%',
                                height: '85%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.35))',
                                pointerEvents: 'none'
                              }}
                            />
                          )}

                          {/* Coordinates inside corner squares */}
                          {cIdx === 0 && (
                            <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '9px', opacity: 0.5, fontWeight: 700, color: isLight ? '#769656' : '#eeeed2', pointerEvents: 'none' }}>
                              {rank}
                            </span>
                          )}
                          {rIdx === 7 && (
                            <span style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', opacity: 0.5, fontWeight: 700, color: isLight ? '#769656' : '#eeeed2', pointerEvents: 'none' }}>
                              {file}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>

              {/* Correct overlay feedback message */}
              {isSolved && (
                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(107, 189, 68, 0.12)', borderTop: '1px solid #6bbd44', borderBottom: '1px solid #6bbd44', margin: '0 16px 16px', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80', margin: '0 0 4px' }}>Best Move!</h4>
                  <p style={{ fontSize: '13px', color: '#aaaaaa', margin: '0 0 12px' }}>You solved it successfully!</p>
                  <button onClick={handleNextPuzzle} className="btn-chess-green" style={{ height: '44px' }}>
                    Next Puzzle ▶
                  </button>
                </div>
              )}

              {/* Wrong hints info */}
              {hintsUsed > 0 && !isSolved && (
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', margin: '0 16px 16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#f87171' }}>Stuck? </span>
                  <button onClick={handleHint} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                    Show Hint 💡
                  </button>
                </div>
              )}

              {/* Bottom toolbar */}
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  borderTop: '1px solid #333',
                  marginTop: 'auto',
                  gap: '12px'
                }}
              >
                <button
                  onClick={handleHint}
                  style={toolbarBtnStyle}
                >
                  💡 Hint
                </button>
                <button
                  onClick={() => setBoardFlipped(prev => !prev)}
                  style={toolbarBtnStyle}
                >
                  🔄 Flip
                </button>
                <button
                  onClick={() => {
                    showToast('Analyzing puzzle position...', 'info');
                    navigate('/game', { state: { mode: 'local', fen: currentPuzzle.fen } });
                  }}
                  style={toolbarBtnStyle}
                >
                  📊 Analysis
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: PUZZLE RUSH PLAY INTERFACE */}
          {screen === 'rush' && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
              {/* Header Info */}
              <div style={{ background: '#1a1a1a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>⚡ Puzzle Rush</span>
                  <span style={{ fontSize: '12px', background: '#333', padding: '2px 8px', borderRadius: '4px' }}>
                    {rushModeType === 'survival' ? 'Survival' : `${rushModeType}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#4ade80' }}>
                    {rushScore} solved
                  </span>
                  
                  {/* Mistake Tracker */}
                  <div style={{ display: 'flex', gap: '4px', fontSize: '16px', fontWeight: 'bold' }}>
                    <span style={{ color: rushStrikes >= 1 ? '#ef4444' : '#444444' }}>✗</span>
                    <span style={{ color: rushStrikes >= 2 ? '#ef4444' : '#444444' }}>✗</span>
                    <span style={{ color: rushStrikes >= 3 ? '#ef4444' : '#444444' }}>✗</span>
                  </div>
                </div>
              </div>

              {/* Timer Progress Bar */}
              {rushModeType !== 'survival' && (
                <div style={{ width: '100%', height: '6px', background: '#1a1a1a' }}>
                  <div
                    style={{
                      width: `${getTimerPercentage()}%`,
                      height: '100%',
                      background: getTimerColor(),
                      transition: 'width 1s linear, background-color 0.5s ease',
                    }}
                  />
                </div>
              )}

              {/* Ticking timer display */}
              {rushModeType !== 'survival' && (
                <div style={{ textAlign: 'center', padding: '6px', background: '#252525', fontSize: '13px', color: rushTime < 30 ? '#f87171' : '#aaaaaa', fontWeight: 700 }}>
                  ⏰ Time: {Math.floor(rushTime / 60)}:{(rushTime % 60).toString().padStart(2, '0')}
                </div>
              )}

              {/* Find move instruction bar */}
              <div
                style={{
                  background: '#6bbd44',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                Find the best move for {chess.turn() === 'w' ? 'White' : 'Black'} ▶
              </div>

              {/* Game board */}
              <div style={{ padding: '16px', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className={`board-flash-${flashClass}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: '#769656',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gridTemplateRows: 'repeat(8, 1fr)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}
                >
                  {board.map((row, rIdx) => {
                    const actualRow = boardFlipped ? 7 - rIdx : rIdx;
                    return board[actualRow].map((cell, cIdx) => {
                      const actualCol = boardFlipped ? 7 - cIdx : cIdx;
                      const activeCell = board[actualRow][actualCol];
                      
                      const file = String.fromCharCode(97 + actualCol);
                      const rank = boardFlipped ? rIdx + 1 : 8 - rIdx;
                      const square = `${file}${rank}`;
                      
                      const isSelected = selectedSquare === square;
                      const isLight = (actualRow + actualCol) % 2 !== 0;

                      return (
                        <div
                          key={square}
                          onClick={() => handleSquareClick(square)}
                          style={{
                            background: isSelected
                              ? 'rgba(235, 208, 5, 0.5)'
                              : isLight ? '#eeeed2' : '#769656',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {activeCell && (
                            <img
                              src={getPieceImage(activeCell.color, activeCell.type)}
                              alt=""
                              style={{
                                width: '85%',
                                height: '85%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.35))',
                                pointerEvents: 'none'
                              }}
                            />
                          )}

                          {/* Coordinates inside corner squares */}
                          {cIdx === 0 && (
                            <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '9px', opacity: 0.5, fontWeight: 700, color: isLight ? '#769656' : '#eeeed2', pointerEvents: 'none' }}>
                              {rank}
                            </span>
                          )}
                          {rIdx === 7 && (
                            <span style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', opacity: 0.5, fontWeight: 700, color: isLight ? '#769656' : '#eeeed2', pointerEvents: 'none' }}>
                              {file}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>

              {/* End of Game overlay options */}
              {!rushActive && (
                <div style={{ textAlign: 'center', padding: '24px 16px', background: '#1a1a1a', borderTop: '2px solid #333' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#ff9f0a' }}>⚡ Rush Completed!</h3>
                  <p style={{ fontSize: '14px', color: '#aaaaaa', marginBottom: '24px' }}>You successfully solved <b style={{ color: '#fff', fontSize: '18px' }}>{rushScore}</b> puzzles.</p>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setScreen('menu')}
                      style={{ flex: 1, height: '44px', background: '#3a3a3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Menu
                    </button>
                    <button
                      onClick={() => startPuzzleRush(rushModeType)}
                      style={{ flex: 1, height: '44px', background: '#6bbd44', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PageShell>
  );
}

const toolbarBtnStyle = {
  flex: 1,
  background: '#3a3a3a',
  border: 'none',
  borderRadius: '8px',
  height: '40px',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'background 0.2s',
};
