import './AnalysisPanel.css';
import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../services/supabase';
import { stockfishEngine } from '../../engine/StockfishService';
import { Award, Zap, AlertCircle, HelpCircle, Check, X, ShieldAlert, Sparkles, User, MessageCircle } from 'lucide-react';
import { Chess } from 'chess.js';
import { soundManager } from '../../engine/soundManager';

function getMoveCommentary(res) {
  if (!res) return null;
  const c = res.classification;
  switch (c) {
    case 'Brilliant':
      return "Spectacular! This brilliant move sacrifices material to gain a winning tactical or positional advantage. Absolutely masterclass!";
    case 'Great':
      return "A great move! This was a critical decision that maintains your strong grip on the game or finds a difficult defense.";
    case 'Best':
      return "The best move in the position. You found the optimal choice recommended by Stockfish, solidifying your strategy.";
    case 'Excellent':
      return "Excellent choice! You kept the position balanced and followed strong chess principles.";
    case 'Book':
      return "A standard book opening move. You're following established opening theory here.";
    case 'Good':
      return "A good move, though there were slightly more precise alternatives. Your position remains comfortable.";
    case 'Neutral':
      return "A solid, playable move that keeps the game steady without major changes.";
    case 'Inaccuracy':
      return "An inaccuracy. You missed a slightly more active plan, allowing your opponent an easy path to equality.";
    case 'Mistake':
      return "A mistake! This move yields some of your advantage or gives your opponent active counterplay. Slow down and calculate!";
    case 'Blunder':
      return "Oh no, a blunder! This move hangs material or ignores a direct tactical threat, severely hurting your position.";
    default:
      return null;
  }
}


const BOOK_OPENINGS = [
  "e4", "e4 e5", "e4 e5 Nf3", "e4 e5 Nf3 Nc6", "e4 e5 Nf3 Nc6 Bb5", // Ruy Lopez
  "e4 e5 Nf3 Nc6 Bc4", // Italian
  "e4 e5 Nf3 Nc6 d4", // Scotch
  "e4 c5", "e4 c5 Nf3", "e4 c5 Nf3 d6", "e4 c5 Nf3 d6 d4", "e4 c5 Nf3 d6 d4 cxd4", "e4 c5 Nf3 d6 d4 cxd4 Nxd4", // Sicilian
  "e4 e6", "e4 e6 d4", "e4 e6 d4 d5", // French
  "e4 c6", "e4 c6 d4", "e4 c6 d4 d5", // Caro-Kann
  "d4", "d4 d5", "d4 d5 c4", "d4 d5 c4 e6", // Queen's Gambit Declined
  "d4 d5 c4 c6", // Slav
  "d4 Nf6", "d4 Nf6 c4", "d4 Nf6 c4 e6", "d4 Nf6 c4 g6", // Indian Defenses
  "Nf3", "c4", "g3", "f4" // Reti, English, King's Fianchetto, Bird's
];

function getCoachCommentary(accuracies, counts, historyLength) {
  if (historyLength === 0) return "Play some moves to see coach analysis commentary!";
  
  const playerAcc = accuracies.w;
  const oppAcc = accuracies.b;
  const blunders = counts.w.blunder;

  if (blunders >= 3) {
    return `Oh no! A highly chaotic game. You had promising positions, but committing ${blunders} major blunders let Black seize control. Take your time and verify your safety checks!`;
  }
  if (counts.w.brilliant > 0) {
    return `Spectacular performance! Playing that brilliant sacrifice (!!) was absolutely masterclass. You maintained a high ${playerAcc}% accuracy and completely shut down your opponent!`;
  }
  if (playerAcc >= 90) {
    return `Magnificent play! You played with a near-flawless ${playerAcc}% accuracy. Your positional control and tactical vision were absolute textbook perfection!`;
  }
  if (playerAcc >= 75) {
    return `A very solid and respectable game! You achieved ${playerAcc}% accuracy, keeping blunders to a minimum while maintaining consistent pressure. Nice job!`;
  }
  if (playerAcc >= 60) {
    return `Good effort! You played at a ${playerAcc}% accuracy level, but missed some critical tactical transitions in the middlegame. Slow down and check for hanging pieces!`;
  }
  return `A tough battle, but a great learning opportunity! Focus on practicing board vision and checkmate patterns to avoid early blunders.`;
}

export default function AnalysisPanel({ 
  history, 
  onJumpToMove, 
  onSelectArrow, 
  onCloseAnalysis, 
  onAnalysisComplete,
  activeReviewIndex,
  onRetryBoardPropsChange
}) {
  const [analyzingIdx, setAnalyzingIdx] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [accuracies, setAccuracies] = useState({ w: 0, b: 0 });
  const [aiCommentary, setAiCommentary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [counts, setCounts] = useState({
    w: { brilliant: 0, great: 0, best: 0, book: 0, excellent: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    b: { brilliant: 0, great: 0, best: 0, book: 0, excellent: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
  });

  const [retryState, setRetryState] = useState(null);

  const startRetry = (idx) => {
    const res = analysisResults[idx];
    if (!res || !res.bestMove) return;

    const fenBefore = idx === 0 
      ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
      : history[idx - 1].fen;

    setRetryState({
      idx,
      fen: fenBefore,
      selectedSquare: null,
      validMoves: [],
      status: 'solving',
      correctMove: res.bestMove,
      san: res.san,
      errorCount: 0
    });
  };

  useEffect(() => {
    if (!onRetryBoardPropsChange) return;

    if (!retryState) {
      onRetryBoardPropsChange(null);
      return;
    }

    const localChess = new Chess(retryState.fen);
    const isCheck = localChess.inCheck();

    let checkSquareName = null;
    if (isCheck) {
      const activeColor = localChess.turn();
      const board = localChess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === activeColor) {
            const file = String.fromCharCode(97 + c);
            const rank = 8 - r;
            checkSquareName = `${file}${rank}`;
            break;
          }
        }
      }
    }

    const handleRetryMove = (from, to) => {
      const retryChess = new Chess(retryState.fen);
      try {
        const piece = retryChess.get(from);
        const isPawn = piece && piece.type === 'p';
        const isPromotionRow = (piece && piece.color === 'w' && to[1] === '8') || (piece && piece.color === 'b' && to[1] === '1');
        const promotion = (isPawn && isPromotionRow) ? 'q' : undefined;

        const moveResult = retryChess.move({ from, to, promotion });
        if (!moveResult) return;

        const playedUci = from + to + (promotion || '');
        const bestMoveUci = retryState.correctMove;

        const isCorrect = (playedUci === bestMoveUci) || 
                          (from === bestMoveUci.substring(0, 2) && to === bestMoveUci.substring(2, 4));

        if (isCorrect) {
          soundManager.playSuccess();

          const toEl = document.getElementById(`sq-${to}`);
          const boardEl = document.querySelector('[aria-label="Chess board"]');
          if (toEl && boardEl) {
            import('../../components/board/ParticleCanvas').then(({ triggerBrilliantEffect }) => {
              if (triggerBrilliantEffect) triggerBrilliantEffect({ current: boardEl }, toEl);
            });
          }

          setRetryState(prev => prev ? {
            ...prev,
            fen: retryChess.fen(),
            selectedSquare: null,
            validMoves: [],
            status: 'success'
          } : null);
        } else {
          soundManager.playError();
          setRetryState(prev => prev ? {
            ...prev,
            selectedSquare: null,
            validMoves: [],
            status: 'failed',
            errorCount: prev.errorCount + 1
          } : null);
        }
      } catch (err) {
        console.warn("Invalid move in retry solver:", err);
      }
    };

    const props = {
      customState: {
        fen: retryState.fen,
        selectedSquare: retryState.selectedSquare,
        validMoves: retryState.validMoves,
        lastMove: null,
        checkSquare: checkSquareName,
        showCoords: true,
        playerColor: localChess.turn(),
        promotionPending: null,
        gameMode: 'analysis',
        animationsEnabled: true,
        history: [],
        hintSquares: null,
        boardFlipped: false,
        reviewFen: null,
        isAIThinking: false,
        errorSquare: retryState.status === 'failed' ? retryState.selectedSquare : null
      },
      customHandleSquareClick: (square) => {
        const clickChess = new Chess(retryState.fen);

        if (retryState.selectedSquare && retryState.validMoves.includes(square)) {
          handleRetryMove(retryState.selectedSquare, square);
          return;
        }

        const piece = clickChess.get(square);
        if (piece && piece.color === clickChess.turn()) {
          const moves = clickChess.moves({ square: square, verbose: true });
          const targets = moves.map(m => m.to);
          setRetryState(prev => prev ? {
            ...prev,
            selectedSquare: square,
            validMoves: targets
          } : null);
        } else {
          setRetryState(prev => prev ? {
            ...prev,
            selectedSquare: null,
            validMoves: []
          } : null);
        }
      },
      onMove: (from, to) => {
        handleRetryMove(from, to);
      }
    };

    onRetryBoardPropsChange(props);
  }, [retryState, onRetryBoardPropsChange]);

  const abortRef = useRef(false);

  // Run analysis loop
  useEffect(() => {
    abortRef.current = false;
    async function runAnalysis() {
      const results = [];

      for (let i = 0; i < history.length; i++) {
        if (abortRef.current) return;
        setAnalyzingIdx(i + 1);

        const move = history[i];
        
        // We evaluate the FEN *before* the move to see what Stockfish recommends!
        const fenBefore = i === 0 
          ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
          : history[i - 1].fen;

        const evalBefore = await stockfishEngine.evaluatePosition(fenBefore, 10);
        const evalAfter = await stockfishEngine.evaluatePosition(move.fen, 10);

        // Diff the score (normalized so white is positive, black is negative)
        const activeColor = move.color; // 'w' or 'b'
        const scoreBefore = evalBefore.score;
        const scoreAfter = evalAfter.score;
        
        // Loss represents how much evaluation dropped for the active player
        let loss = 0;
        if (activeColor === 'w') {
          loss = scoreBefore - scoreAfter;
        } else {
          loss = scoreAfter - scoreBefore; // positive drops are bad
        }

        // Move Classifications - Aligned with Chess.com parameters
        const playedMovesStr = history.slice(0, i + 1).map(h => h.san).join(' ');
        const isBook = i < 8 && BOOK_OPENINGS.some(line => line.startsWith(playedMovesStr));

        let classification = 'Neutral';
        let badge = ' ';
        let badgeClass = 'neutral-badge';

        if (isBook) {
          classification = 'Book';
          badge = '📘';
          badgeClass = 'book-badge';
        } else if (loss <= -0.5) {
          classification = 'Brilliant';
          badge = '!!';
          badgeClass = 'brilliant-badge';
        } else if (loss <= -0.15) {
          classification = 'Great';
          badge = '!';
          badgeClass = 'great-badge';
        } else if (loss <= 0.01) {
          classification = 'Best';
          badge = '✓';
          badgeClass = 'best-badge';
        } else if (loss <= 0.08) {
          classification = 'Excellent';
          badge = '✓';
          badgeClass = 'excellent-badge';
        } else if (loss <= 0.18) {
          classification = 'Good';
          badge = '!';
          badgeClass = 'good-badge';
        } else if (loss <= 0.35) {
          classification = 'Neutral';
          badge = ' ';
          badgeClass = 'neutral-badge';
        } else if (loss <= 0.6) {
          classification = 'Inaccuracy';
          badge = '?!';
          badgeClass = 'inaccuracy-badge';
        } else if (loss <= 1.3) {
          classification = 'Mistake';
          badge = '?';
          badgeClass = 'mistake-badge';
        } else {
          classification = 'Blunder';
          badge = '??';
          badgeClass = 'blunder-badge';
        }

        // Save result
        results.push({
          num: Math.floor(i / 2) + 1,
          san: move.san,
          color: move.color,
          from: move.from,
          to: move.to,
          fen: move.fen,
          score: scoreAfter,
          bestMove: evalBefore.bestMove,
          classification,
          badge,
          badgeClass,
          loss
        });
      }

      if (abortRef.current) return;

      // Compute final summaries & accuracies
      const finalSummaries = calculateSummaries(results);
      setAnalysisResults(results);
      setIsDone(true);

      // Bubble up the results to GameScreen so they can be rendered on the board!
      if (onAnalysisComplete) {
        onAnalysisComplete(results);
      }

      // Fetch dynamic Claude AI review summary
      if (results.length > 0) {
        setLoadingAi(true);
        try {
          const { data, error } = await supabase.functions.invoke('analyze-game', {
            body: {
              history: results,
              accuracies: finalSummaries.accuracies,
              counts: finalSummaries.counts
            }
          });

          if (data?.commentary) {
            setAiCommentary(data.commentary);
          }
        } catch (err) {
          console.warn('Claude game analysis failed, falling back to local review:', err);
        } finally {
          setLoadingAi(false);
        }
      }
    }

    if (history.length > 0) {
      runAnalysis();
    } else {
      setIsDone(true);
    }

    return () => {
      abortRef.current = true;
    };
  }, [history]);

  const calculateSummaries = (results) => {
    const wCounts = { brilliant: 0, great: 0, best: 0, book: 0, excellent: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const bCounts = { brilliant: 0, great: 0, best: 0, book: 0, excellent: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    
    let wTotalScore = 0;
    let bTotalScore = 0;
    let wMoves = 0;
    let bMoves = 0;

    results.forEach(res => {
      const c = res.color === 'w' ? wCounts : bCounts;
      
      // Calculate move accuracy based on centipawn loss (sigmoid curve)
      const moveAccuracy = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-2.0 * Math.max(0, res.loss)))));

      if (res.color === 'w') {
        wTotalScore += moveAccuracy;
        wMoves++;
      } else {
        bTotalScore += moveAccuracy;
        bMoves++;
      }

      switch (res.classification) {
        case 'Brilliant': c.brilliant++; break;
        case 'Great': c.great++; break;
        case 'Best': c.best++; break;
        case 'Book': c.book++; break;
        case 'Excellent': c.excellent++; break;
        case 'Good': c.good++; break;
        case 'Neutral': c.neutral++; break;
        case 'Inaccuracy': c.inaccuracy++; break;
        case 'Mistake': c.mistake++; break;
        case 'Blunder': c.blunder++; break;
      }
    });

    const wAcc = wMoves > 0 ? Math.round(wTotalScore / wMoves) : 100;
    const bAcc = bMoves > 0 ? Math.round(bTotalScore / bMoves) : 100;

    const accResult = { w: wAcc, b: bAcc };
    const countsResult = { w: wCounts, b: bCounts };

    setAccuracies(accResult);
    setCounts(countsResult);

    return { accuracies: accResult, counts: countsResult };
  };

  const handleRowClick = (res, idx) => {
    onJumpToMove(idx);
    
    // Draw SVG arrow showing Stockfish's suggested best move
    if (res.bestMove) {
      const bestMoveFrom = res.bestMove.substring(0, 2);
      const bestMoveTo = res.bestMove.substring(2, 4);
      onSelectArrow({ from: bestMoveFrom, to: bestMoveTo });
    } else {
      onSelectArrow(null);
    }
  };

  // Group pairs for display
  const pairs = [];
  for (let i = 0; i < analysisResults.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: analysisResults[i],
      black: analysisResults[i + 1],
      whiteIndex: i,
      blackIndex: i + 1
    });
  }

  const progressPercent = history.length > 0 ? Math.round((analyzingIdx / history.length) * 100) : 0;

  if (!isDone) {
    return (
      <div className="analysis-panel-loading-container">
        <Sparkles size={36} className="analysis-glow-icon" />
        <h3 className="font-cinzel">Stockfish Analyzing...</h3>
        <p className="loading-subtitle">Computing move accuracy and blunders</p>
        <div className="analysis-progress-bar-bg">
          <div className="analysis-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="loading-counter">{analyzingIdx} / {history.length} moves</span>
      </div>
    );
  }

  const currentMoveAnalysis = (activeReviewIndex !== null && activeReviewIndex !== undefined && activeReviewIndex >= 0 && analysisResults && analysisResults[activeReviewIndex])
    ? analysisResults[activeReviewIndex]
    : null;

  const coachComment = getCoachCommentary(accuracies, counts, history.length);
  const moveComment = currentMoveAnalysis ? getMoveCommentary(currentMoveAnalysis) : null;

  return (
    <div className="analysis-panel-container">
      {/* HEADER SECTION */}
      <div className="analysis-panel-header font-cinzel">
        {retryState ? "RETRY MISTAKE" : "GAME REVIEW"}
      </div>

      {/* COACH SUMMARY / RETRY BLOCK */}
      {retryState ? (
        <div className="coach-review-card retry-mode-active">
          <div className="coach-avatar-container">
            <div className="coach-avatar">
              <span style={{ fontSize: '24px' }}>🎓</span>
              <div className="coach-avatar-badge" style={{ backgroundColor: '#10b981' }} />
            </div>
            <span className="coach-name font-cinzel" style={{ color: '#10b981' }}>RETRY</span>
          </div>
          <div className="coach-bubble retry-bubble" style={{ borderColor: retryState.status === 'success' ? '#10b981' : retryState.status === 'failed' ? '#ef4444' : 'var(--gold)' }}>
            {retryState.status === 'solving' && (
              <p className="coach-text">
                You played <strong>{retryState.san || 'a mistake'}</strong> in this position. Can you find a better move?
              </p>
            )}
            {retryState.status === 'success' && (
              <div>
                <p className="coach-text" style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <Check size={14} /> Solved! You found the best move!
                </p>
                <p className="coach-text" style={{ marginTop: '4px' }}>
                  This is the strongest continuation.
                </p>
              </div>
            )}
            {retryState.status === 'failed' && (
              <div>
                <p className="coach-text" style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <X size={14} /> Not quite the best move.
                </p>
                <p className="coach-text" style={{ marginTop: '4px' }}>
                  Keep trying, or view the solution if you are stuck!
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {retryState.status !== 'success' && (
                <button
                  type="button"
                  className="retry-action-btn show-solution"
                  onClick={() => {
                    if (onSelectArrow) {
                      const from = retryState.correctMove.substring(0, 2);
                      const to = retryState.correctMove.substring(2, 4);
                      onSelectArrow({ from, to });
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Show Solution
                </button>
              )}

              {(retryState.status === 'failed' || retryState.status === 'success') && (
                <button
                  type="button"
                  className="retry-action-btn try-again"
                  onClick={() => startRetry(retryState.idx)}
                  style={{
                    background: 'var(--gold-dark)',
                    border: 'none',
                    color: '#111',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
              )}

              <button
                type="button"
                className="retry-action-btn exit-retry"
                onClick={() => {
                  setRetryState(null);
                  if (onSelectArrow) onSelectArrow(null);
                }}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                Exit Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="coach-review-card">
          <div className="coach-avatar-container">
            <div className="coach-avatar">
              <span style={{ fontSize: '24px' }}>🤖</span>
              <div className="coach-avatar-badge" />
            </div>
            <span className="coach-name font-cinzel">Coach Danny</span>
          </div>
          <div className="coach-bubble">
            {currentMoveAnalysis ? (
              <div>
                <p className="coach-text" style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>
                  Move {activeReviewIndex + 1}: {currentMoveAnalysis.classification}
                </p>
                <p className="coach-text">{moveComment}</p>
                {['Blunder', 'Mistake', 'Inaccuracy'].includes(currentMoveAnalysis.classification) && currentMoveAnalysis.bestMove && (
                  <button
                    type="button"
                    className="btn-retry-mistake"
                    onClick={() => startRetry(activeReviewIndex)}
                    style={{
                      marginTop: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      background: 'rgba(129, 182, 76, 0.15)',
                      border: '1px solid rgba(129, 182, 76, 0.35)',
                      color: '#81b64c',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>↻</span> Retry Move
                  </button>
                )}
              </div>
            ) : (
              loadingAi ? (
                <p className="coach-text" style={{ fontStyle: 'italic', opacity: 0.7 }}>Drafting thoughts with Claude...</p>
              ) : aiCommentary ? (
                <div className="coach-text" style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  <ReactMarkdown>{aiCommentary}</ReactMarkdown>
                </div>
              ) : (
                <p className="coach-text">{coachComment}</p>
              )
            )}
          </div>
        </div>
      )}

      {/* ACCURACIES SUMMARY */}
      <div className="analysis-accuracy-card">
        <div className="accuracies-row">
          <div className="accuracy-badge white">
            <span className="accuracy-label">WHITE ACCURACY</span>
            <span className="accuracy-percent">{accuracies.w}%</span>
          </div>
          <div className="accuracy-badge black">
            <span className="accuracy-label">BLACK ACCURACY</span>
            <span className="accuracy-percent">{accuracies.b}%</span>
          </div>
        </div>

        {/* Quality breakdown lists */}
        <div className="quality-lists-container">
          <div className="quality-player-column">
            <div className="quality-summary-item"><span className="quality-badge brilliant-badge">!!</span> <span>{counts.w.brilliant} Brilliant</span></div>
            <div className="quality-summary-item"><span className="quality-badge great-badge">!</span> <span>{counts.w.great} Great Move</span></div>
            <div className="quality-summary-item"><span className="quality-badge best-badge">✓</span> <span>{counts.w.best} Best Move</span></div>
            <div className="quality-summary-item"><span className="quality-badge book-badge">📘</span> <span>{counts.w.book} Book Move</span></div>
            <div className="quality-summary-item"><span className="quality-badge excellent-badge">✓</span> <span>{counts.w.excellent} Excellent</span></div>
            <div className="quality-summary-item"><span className="quality-badge good-badge">!</span> <span>{counts.w.good} Good</span></div>
            <div className="quality-summary-item"><span className="quality-badge inaccuracy-badge">?!</span> <span>{counts.w.inaccuracy} Inaccuracy</span></div>
            <div className="quality-summary-item"><span className="quality-badge mistake-badge">?</span> <span>{counts.w.mistake} Mistake</span></div>
            <div className="quality-summary-item"><span className="quality-badge blunder-badge">??</span> <span>{counts.w.blunder} Blunder</span></div>
          </div>
          <div className="quality-player-column">
            <div className="quality-summary-item"><span className="quality-badge brilliant-badge">!!</span> <span>{counts.b.brilliant} Brilliant</span></div>
            <div className="quality-summary-item"><span className="quality-badge great-badge">!</span> <span>{counts.b.great} Great Move</span></div>
            <div className="quality-summary-item"><span className="quality-badge best-badge">✓</span> <span>{counts.b.best} Best Move</span></div>
            <div className="quality-summary-item"><span className="quality-badge book-badge">📘</span> <span>{counts.b.book} Book Move</span></div>
            <div className="quality-summary-item"><span className="quality-badge excellent-badge">✓</span> <span>{counts.b.excellent} Excellent</span></div>
            <div className="quality-summary-item"><span className="quality-badge good-badge">!</span> <span>{counts.b.good} Good</span></div>
            <div className="quality-summary-item"><span className="quality-badge inaccuracy-badge">?!</span> <span>{counts.b.inaccuracy} Inaccuracy</span></div>
            <div className="quality-summary-item"><span className="quality-badge mistake-badge">?</span> <span>{counts.b.mistake} Mistake</span></div>
            <div className="quality-summary-item"><span className="quality-badge blunder-badge">??</span> <span>{counts.b.blunder} Blunder</span></div>
          </div>
        </div>
      </div>

      {/* MOVE LIST ROW */}
      <div className="analysis-moves-scroll">
        {pairs.length === 0 ? (
          <div className="analysis-empty">No moves analyzed</div>
        ) : (
          <div className="analysis-moves-table">
            {pairs.map((pair, i) => (
              <div key={i} className={`analysis-moves-row ${i % 2 === 0 ? 'even' : 'odd'}`}>
                <div className="analysis-col-num">{pair.num}.</div>
                
                {/* White Move cell */}
                <div 
                  className="analysis-col-san white"
                  onClick={() => handleRowClick(pair.white, pair.whiteIndex)}
                >
                  <span className="san-text">{pair.white.san}</span>
                  {pair.white.badge !== ' ' && (
                    <span className={`analysis-move-badge ${pair.white.badgeClass}`}>{pair.white.badge}</span>
                  )}
                </div>

                {/* Black Move cell */}
                {pair.black ? (
                  <div 
                    className="analysis-col-san black"
                    onClick={() => handleRowClick(pair.black, pair.blackIndex)}
                  >
                    <span className="san-text">{pair.black.san}</span>
                    {pair.black.badge !== ' ' && (
                      <span className={`analysis-move-badge ${pair.black.badgeClass}`}>{pair.black.badge}</span>
                    )}
                  </div>
                ) : (
                  <div className="analysis-col-san black empty" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLOSE BUTTON */}
      <button className="analysis-close-btn font-cinzel" onClick={onCloseAnalysis}>
        Exit Game Review
      </button>
    </div>
  );
}
