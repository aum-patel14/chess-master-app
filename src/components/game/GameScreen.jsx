import './GameScreen.css';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import ChessBoard from '../board/ChessBoard';
import GameOverDialog from './GameOverDialog';
import MoveHistoryPanel from './MoveHistoryPanel';
import PlayerInfoBar from './PlayerInfoBar';
import MultiplayerLobby from './MultiplayerLobby';
import ChatPanel from './ChatPanel';
import AnalysisPanel from './AnalysisPanel';
import { stockfishEngine } from '../../engine/StockfishService';
import { Play, RotateCcw, Flag, Sparkles, RefreshCw, Save, Share2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const DIFFICULTY_NAMES = { 1:'Beginner', 2:'Easy', 3:'Medium', 4:'Hard', 5:'Master' };
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function getMaterialAdvantage(capturedByW, capturedByB) {
  let wScore = 0;
  let bScore = 0;
  
  const getVal = (p) => {
    if (!p) return 0;
    const type = typeof p === 'string' ? p : p.type;
    return type ? (PIECE_VALUES[type.toLowerCase()] || 0) : 0;
  };

  capturedByW.forEach(p => { wScore += getVal(p); });
  capturedByB.forEach(p => { bScore += getVal(p); });
  
  const diff = wScore - bScore;
  return { w: diff > 0 ? diff : 0, b: diff < 0 ? Math.abs(diff) : 0 };
}

export default function GameScreen() {
  const { 
    state, dispatch, resign, offerDraw, undoMove, startNewGame, 
    opponentDisconnectedCountdown, checkFeatureLimit, incrementUsage 
  } = useGame();
  const { showToast } = useToast();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    whiteTime, blackTime, timeControl, moveCount, boardFlipped, reviewFen
  } = state;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [confirmResign, setConfirmResign] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(null);
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisArrow, setAnalysisArrow] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);

  const prevStatusRef = useRef(null);
  const prevIsGameOver = useRef(false);

  // Trigger Check Toast
  useEffect(() => {
    if (status.type === 'check' && prevStatusRef.current !== 'check') {
      showToast('⚠ Check!', 'warning', 2000);
    }
    prevStatusRef.current = status.type;
  }, [status.type, showToast]);

  // Elapsed game time
  const isGameOver = status.type !== 'playing' && status.type !== 'check';
  useEffect(() => {
    if (isGameOver) return;
    const t = setInterval(() => setElapsedTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isGameOver]);

  // Sync showGameOver when game ends
  useEffect(() => {
    if (isGameOver && !prevIsGameOver.current) {
      setShowGameOver(true);
    }
    prevIsGameOver.current = isGameOver;
  }, [isGameOver]);

  // Reset analysis on new game
  useEffect(() => {
    if (history.length === 0) {
      setIsAnalyzing(false);
      setAnalysisArrow(null);
    }
  }, [history.length]);

  const handleAnalyzeGameClick = () => {
    if (!checkFeatureLimit('analysis', "You've used all 3 free analyses today. Upgrade to Premium for unlimited analyses!")) return;
    incrementUsage('analysis');
    setIsAnalyzing(true);
    setShowGameOver(false);
  };

  const activeReviewFen = reviewFen || fen;

  // Real-time Stockfish evaluation state
  const [stockfishEval, setStockfishEval] = useState({ score: 0, text: '0.0', type: 'cp' });

  useEffect(() => {
    let active = true;
    async function updateEval() {
      if (!stockfishEngine.isReady) return;
      
      const res = await stockfishEngine.evaluatePosition(activeReviewFen, 8);
      if (!active) return;
      
      const score = res.score;
      let text = '0.0';
      let type = 'cp';

      if (Math.abs(score) >= 90) {
        text = 'M';
        type = 'mate';
      } else {
        text = (score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1));
      }
      
      setStockfishEval({ score, text, type });
    }

    updateEval();

    return () => {
      active = false;
    };
  }, [activeReviewFen]);

  const handleBack = () => dispatch({ type: 'SET_MODE', payload: 'menu' });

  // Whose info goes where
  const flippedView = (playerColor === 'b') !== !!boardFlipped;
  const topColor = flippedView ? 'w' : 'b';
  const bottomColor = flippedView ? 'b' : 'w';

  const materialAdv = getMaterialAdvantage(capturedPieces.w, capturedPieces.b);

  const myName = localStorage.getItem('chess_display_name') || 'You';
  const myElo = parseInt(localStorage.getItem('chess_elo')) || 1200;

  const topPlayer = {
    name: gameMode === 'vsAI' && playerColor === topColor
      ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}`
      : gameMode === 'online'
      ? (topColor === playerColor ? myName : (state.opponentName || 'Opponent'))
      : (topColor === playerColor ? 'You' : 'Opponent'),
    rating: gameMode === 'online'
      ? (topColor === playerColor ? myElo : (state.opponentRating || 1200))
      : 1500,
    isAI: gameMode === 'vsAI' && playerColor !== topColor,
    color: topColor,
    time: topColor === 'w' ? whiteTime : blackTime,
    isActive: new Chess(reviewFen || fen).turn() === topColor,
    captured: capturedPieces[topColor === 'w' ? 'b' : 'w'], // Pieces captured BY top player
    material: materialAdv[topColor]
  };

  const bottomPlayer = {
    name: gameMode === 'vsAI' && playerColor === bottomColor
      ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}`
      : gameMode === 'online'
      ? (bottomColor === playerColor ? myName : (state.opponentName || 'Opponent'))
      : (bottomColor === playerColor ? 'You' : 'Opponent'),
    rating: gameMode === 'online'
      ? (bottomColor === playerColor ? myElo : (state.opponentRating || 1200))
      : 1500,
    isAI: gameMode === 'vsAI' && playerColor !== bottomColor,
    color: bottomColor,
    time: bottomColor === 'w' ? whiteTime : blackTime,
    isActive: new Chess(reviewFen || fen).turn() === bottomColor,
    captured: capturedPieces[bottomColor === 'w' ? 'b' : 'w'], // Pieces captured BY bottom player
    material: materialAdv[bottomColor]
  };

  // Evaluation Bar based on Stockfish if ready, else material + basic positional heuristic
  const clampedEval = useMemo(() => {
    let score = stockfishEval.score;
    if (!stockfishEngine.isReady) {
      score = materialAdv.w - materialAdv.b;
    }
    // Scale score: e.g. +3 is 65%, -3 is 35%
    const percentage = 50 + score * 5;
    return Math.max(5, Math.min(95, percentage));
  }, [stockfishEval, materialAdv]);

  // PLAYBACK NAVIGATION
  const handleJumpToMove = (index) => {
    if (index === null || index < 0 || index >= history.length) {
      setReviewIndex(null);
      dispatch({ type: 'SET_REVIEW_FEN', payload: null });
    } else {
      setReviewIndex(index);
      dispatch({ type: 'SET_REVIEW_FEN', payload: history[index].fen });
    }
  };

  const handleFirst = () => {
    if (history.length === 0) return;
    setReviewIndex(-1);
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    dispatch({ type: 'SET_REVIEW_FEN', payload: startingFen });
  };

  const handlePrev = () => {
    if (history.length === 0) return;
    if (reviewIndex === null) {
      handleJumpToMove(history.length - 1);
    } else if (reviewIndex > 0) {
      handleJumpToMove(reviewIndex - 1);
    } else if (reviewIndex === 0) {
      handleFirst();
    }
  };

  const handleNext = () => {
    if (history.length === 0 || reviewIndex === null) return;
    if (reviewIndex === -1) {
      handleJumpToMove(0);
    } else if (reviewIndex < history.length - 1) {
      handleJumpToMove(reviewIndex + 1);
    } else {
      handleJumpToMove(null);
    }
  };

  const handleLast = () => {
    handleJumpToMove(null);
  };

  const handleUndo = () => {
    undoMove();
    setReviewIndex(null);
  };

  const handleHint = async () => {
    showToast('Stockfish finding best move...', 'info', 1000);
    let bestMove = null;
    if (stockfishEngine.isReady) {
      const uciMove = await stockfishEngine.getBestMove(fen, aiDifficulty);
      if (uciMove && uciMove !== '(none)') {
        bestMove = {
          from: uciMove.substring(0, 2),
          to: uciMove.substring(2, 4)
        };
      }
    }
    
    if (!bestMove) {
      const fallbackChess = new Chess(fen);
      const moves = fallbackChess.moves({ verbose: true });
      if (moves.length > 0) {
        const capture = moves.find(m => m.captured);
        const selected = capture || moves[Math.floor(Math.random() * moves.length)];
        bestMove = { from: selected.from, to: selected.to };
      }
    }
    
    if (bestMove) {
      dispatch({ type: 'SET_HINT_SQUARES', payload: bestMove });
      showToast('Hint highlighted on board!', 'success', 2000);
    } else {
      showToast('No hints available.', 'warning');
    }
  };

  const handleSaveGame = () => {
    const c = new Chess(fen);
    navigator.clipboard.writeText(c.fen());
    showToast('FEN copied to clipboard! 💾', 'success');
  };

  const handleShareGame = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('App link copied to clipboard! 🔗', 'success');
  };

  if (gameMode === 'online' && !state.roomCode) {
    return (
      <div className="game-screen-wrapper">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
          <MultiplayerLobby onStartGame={(gameData) => {
            dispatch({
              type: 'SET_ONLINE_GAME',
              payload: {
                roomCode: gameData.roomCode,
                color: gameData.color,
                opponentName: gameData.opponentName,
                opponentRating: gameData.opponentRating,
                timeControl: gameData.timeControl
              }
            });
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      {/* CENTER BOARD ZONE */}
      <div className="center-area">
        {/* Black Player Info Bar */}
        <PlayerInfoBar player={topPlayer} isAIThinking={isAIThinking} />
        
        <div className="board-layout-wrapper">
          {/* Eval Bar */}
          <div className="eval-bar">
            <div className="eval-fill-black" />
            <div className="eval-fill-white" style={{ height: `${clampedEval}%` }} />
            <div className="eval-score">
              {stockfishEngine.isReady ? stockfishEval.text : ((materialAdv.w - materialAdv.b) > 0 ? `+${materialAdv.w - materialAdv.b}` : materialAdv.w - materialAdv.b)}
            </div>
          </div>

          <div className="board-and-controls">
            {state.opponentDisconnected && (
              <div style={disconnectBannerStyle}>
                ⚠️ Opponent disconnected! Auto-win in {opponentDisconnectedCountdown}s...
              </div>
            )}
            <div className="board-wrapper-inner">
              <ChessBoard bestMoveArrow={analysisArrow} />
            </div>
          </div>
        </div>

        {/* White Player Info Bar */}
        <PlayerInfoBar player={bottomPlayer} isAIThinking={isAIThinking} />
      </div>

      {/* RIGHT CONTROL PANEL */}
      <div className="right-panel">
        {isAnalyzing ? (
          <AnalysisPanel
            history={history}
            onJumpToMove={handleJumpToMove}
            onSelectArrow={setAnalysisArrow}
            onCloseAnalysis={() => {
              setIsAnalyzing(false);
              setAnalysisArrow(null);
              handleJumpToMove(null);
            }}
          />
        ) : (
          <div className="right-panel-content">
            <div className="right-panel-header">MOVES</div>

            {/* MOVE HISTORY SCROLL AREA */}
            <div className="history-wrapper">
              <MoveHistoryPanel 
                history={history} 
                activeReviewFen={reviewFen} 
                onJumpToMove={handleJumpToMove} 
              />
            </div>
            
            {/* PLAYBACK CONTROLS */}
            <div className="history-controls">
              <button className="hist-btn" onClick={handleFirst} disabled={history.length === 0}>|◀</button>
              <button className="hist-btn" onClick={handlePrev} disabled={history.length === 0}>◀</button>
              <button className="hist-btn" onClick={handleNext} disabled={history.length === 0 || reviewIndex === null}>▶</button>
              <button className="hist-btn" onClick={handleLast} disabled={history.length === 0 || reviewIndex === null}>▶|</button>
            </div>

            {/* ACTION BUTTONS */}
            <div className="game-actions-container">
              <div className="action-row">
                <button className="action-btn-half" onClick={handleUndo} disabled={isGameOver || isAIThinking || history.length === 0}>
                  <RefreshCw size={16} />
                  <span>Undo</span>
                </button>
                <button className="action-btn-half" onClick={handleHint} disabled={isGameOver || isAIThinking}>
                  <Sparkles size={16} />
                  <span>Hint</span>
                </button>
              </div>
              
              <div className="action-row">
                <button className="action-btn-half" onClick={() => dispatch({ type: 'TOGGLE_BOARD_FLIP' })}>
                  <RotateCcw size={16} />
                  <span>Flip</span>
                </button>
                <button className="action-btn-half" onClick={() => startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty })}>
                  <Play size={16} />
                  <span>New</span>
                </button>
              </div>

              <div className="action-row">
                <button className="action-btn-half" onClick={handleSaveGame}>
                  <Save size={16} />
                  <span>Save</span>
                </button>
                <button className="action-btn-half" onClick={handleShareGame}>
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* RESIGN OR ANALYZE BUTTON */}
            {isGameOver ? (
              <button 
                className="resign-btn font-cinzel animate-pulse" 
                onClick={handleAnalyzeGameClick}
                style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', color: '#111', fontWeight: 800 }}
              >
                <Sparkles size={16} style={{ marginRight: '8px' }} />
                ANALYZE GAME
              </button>
            ) : (
              <button 
                className="resign-btn font-cinzel" 
                onClick={() => { if(confirmResign) { resign(); setConfirmResign(false); } else setConfirmResign(true); }} 
                disabled={isGameOver}
              >
                <Flag size={16} style={{ marginRight: '8px' }} />
                {confirmResign ? 'CONFIRM RESIGNATION' : 'RESIGN'}
              </button>
            )}
          </div>
        )}
      </div>

      {isGameOver && showGameOver && (
        <GameOverDialog
          status={status}
          onNewGame={() => {
            setShowGameOver(false);
            startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty });
          }}
          onMenu={handleBack}
          moveCount={moveCount}
          elapsed={elapsedTime}
          onAnalyze={handleAnalyzeGameClick}
        />
      )}
    </div>
  );
}

const disconnectBannerStyle = {
  background: 'rgba(239, 68, 68, 0.95)',
  border: '1px solid #ef4444',
  color: '#fff',
  padding: '10px 16px',
  borderRadius: '8px',
  marginBottom: '12px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '13px',
  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
  animation: 'pulse 1.5s ease-in-out infinite'
};
