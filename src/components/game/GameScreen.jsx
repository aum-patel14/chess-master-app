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

  const formatClockTime = (timeInSeconds) => {
    if (timeInSeconds <= 0) return '0:00.0';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    if (timeInSeconds < 10) {
      const tenths = Math.floor((timeInSeconds % 1) * 10);
      return `0:0${seconds}.${tenths}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const moves = history.map(m => m.san);
  const movesPaired = [];
  for (let i = 0; i < moves.length; i += 2) {
    movesPaired.push([moves[i], moves[i + 1] || '']);
  }
  const currentMoveIndex = reviewIndex !== null ? reviewIndex : history.length - 1;

  const avatarLetterTop = topPlayer.name ? topPlayer.name.trim().charAt(0).toUpperCase() : 'A';
  const avatarLetterBottom = bottomPlayer.name ? bottomPlayer.name.trim().charAt(0).toUpperCase() : 'Y';

  return (
    <div className="game-page">
      {/* CENTER BOARD ZONE */}
      <div className="game-center">
        <div className="board-and-players-wrapper">
          {/* BLACK player bar — above board (aligned with board) */}
          <div style={{
            width: 'var(--board-size)',
            height: '44px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            marginLeft: '40px',
            boxSizing: 'border-box',
            flexShrink: 0
          }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#374151',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'14px',fontWeight:'600',color:'white'}}>{avatarLetterTop}</div>
              <span style={{fontSize:'14px',fontWeight:'500',color:'white'}}>{topPlayer.name}</span>
              <span style={{fontSize:'12px',padding:'2px 8px',background:'rgba(255,255,255,0.1)',
                borderRadius:'99px',color:'#aaa'}}>{topPlayer.rating}</span>
            </div>
            <span style={{fontSize:'16px',fontWeight:'600',color:'white',fontFamily:'monospace'}}>
              {formatClockTime(topPlayer.time)}
            </span>
          </div>

          {/* Board row: eval bar + rank labels + board */}
          <div style={{display:'flex', flexDirection:'row', alignItems:'flex-start', gap:'4px', flexShrink:0, width:'100%'}}>
            {/* Eval Bar */}
            <div className="eval-bar" style={{ height: 'var(--board-size)', width: '12px' }}>
              <div className="eval-fill-black" />
              <div className="eval-fill-white" style={{ height: `${clampedEval}%` }} />
              <div className="eval-score">
                {stockfishEngine.isReady ? stockfishEval.text : ((materialAdv.w - materialAdv.b) > 0 ? `+${materialAdv.w - materialAdv.b}` : materialAdv.w - materialAdv.b)}
              </div>
            </div>
            
            {/* Rank numbers LEFT (spans the board height perfectly) */}
            <div style={{display:'flex',flexDirection:'column',height:'var(--board-size)',width:'20px',flexShrink:0}}>
              {(flippedView?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1]).map(r=>(
                <div key={r} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.6)'}}>
                  {r}
                </div>
              ))}
            </div>

            {/* The actual 8x8 board */}
            <div className="board-outer">
              <ChessBoard bestMoveArrow={analysisArrow} />
            </div>
          </div>

          {/* File letters BOTTOM (aligned with board) */}
          <div style={{display:'flex',flexDirection:'row',width:'var(--board-size)',marginLeft:'40px',flexShrink:0}}>
            {(flippedView?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h']).map(f=>(
              <div key={f} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.6)',height:'20px'}}>
                {f}
              </div>
            ))}
          </div>

          {/* WHITE player bar — below board (aligned with board) */}
          <div style={{
            width: 'var(--board-size)',
            height: '44px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            marginLeft: '40px',
            boxSizing: 'border-box',
            flexShrink: 0
          }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#4B5563',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'14px',fontWeight:'600',color:'white'}}>{avatarLetterBottom}</div>
              <span style={{fontSize:'14px',fontWeight:'500',color:'white'}}>{bottomPlayer.name}</span>
              <span style={{fontSize:'12px',padding:'2px 8px',background:'rgba(255,255,255,0.1)',
                borderRadius:'99px',color:'#aaa'}}>{bottomPlayer.rating}</span>
            </div>
            <span style={{fontSize:'16px',fontWeight:'600',color:'white',fontFamily:'monospace'}}>
              {formatClockTime(bottomPlayer.time)}
            </span>
          </div>
        </div>
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
          <div style={{width:'260px', height:'100vh', 
            background:'#16213e', display:'flex', flexDirection:'column', 
            borderLeft:'1px solid rgba(255,255,255,0.08)'}}>

            {/* Header */}
            <div style={{padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              <span style={{fontSize:'11px',fontWeight:'600',letterSpacing:'0.08em',
                color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>Moves</span>
            </div>

            {/* Move list */}
            <div style={{flex:1, overflowY:'auto', padding:'8px'}}>
              {moves.length === 0 ? (
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.3)',
                  textAlign:'center',marginTop:'20px'}}>No moves yet</p>
              ) : (
                movesPaired.map(([white, black], i) => (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'32px 1fr 1fr',
                    gap:'4px',padding:'4px 6px',borderRadius:'4px',
                    background: currentMoveIndex === i*2 || currentMoveIndex === i*2+1 ? 'rgba(226,176,74,0.15)' : 'transparent'}}>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>{i+1}.</span>
                    <span 
                      onClick={() => handleJumpToMove(i * 2)}
                      style={{
                        fontSize:'13px',
                        color:'white',
                        cursor:'pointer',
                        background: currentMoveIndex === i * 2 ? 'rgba(226,176,74,0.3)' : 'transparent',
                        padding: '1px 3px',
                        borderRadius: '3px'
                      }}
                    >
                      {white}
                    </span>
                    {black && (
                      <span 
                        onClick={() => handleJumpToMove(i * 2 + 1)}
                        style={{
                          fontSize:'13px',
                          color:'rgba(255,255,255,0.8)',
                          cursor:'pointer',
                          background: currentMoveIndex === i * 2 + 1 ? 'rgba(226,176,74,0.3)' : 'transparent',
                          padding: '1px 3px',
                          borderRadius: '3px'
                        }}
                      >
                        {black}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Playback controls */}
            <div style={{display:'flex',justifyContent:'center',gap:'8px',
              padding:'12px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              {['|◀','◀','▶','▶|'].map((icon,i) => {
                const handlers = [handleFirst, handlePrev, handleNext, handleLast];
                const disabled = [
                  history.length === 0,
                  history.length === 0,
                  history.length === 0 || reviewIndex === null,
                  history.length === 0 || reviewIndex === null
                ];
                return (
                  <button 
                    key={i} 
                    onClick={handlers[i]}
                    disabled={disabled[i]}
                    style={{width:'40px',height:'40px',background:'rgba(255,255,255,0.05)',
                      border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',
                      color:'white',fontSize:'14px',cursor:'pointer', opacity: disabled[i] ? 0.35 : 1}}>
                    {icon}
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',
              padding:'8px 12px'}}>
              {[
                ['↩ Undo', 'undo'],
                ['💡 Hint', 'hint'],
                ['⟲ Flip', 'flip'],
                ['＋ New', 'new']
              ].map(([label,action]) => {
                const handlers = {
                  undo: handleUndo,
                  hint: handleHint,
                  flip: () => dispatch({ type: 'TOGGLE_BOARD_FLIP' }),
                  new: () => startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty })
                };
                const disabled = {
                  undo: isGameOver || isAIThinking || history.length === 0,
                  hint: isGameOver || isAIThinking,
                  flip: false,
                  new: false
                };
                return (
                  <button 
                    key={action} 
                    onClick={handlers[action]}
                    disabled={disabled[action]}
                    style={{height:'40px',background:'rgba(255,255,255,0.05)',
                      border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',
                      color:'white',fontSize:'12px',cursor:'pointer',fontWeight:'500', opacity: disabled[action] ? 0.35 : 1}}>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Save + Share */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',
              padding:'0 12px 8px'}}>
              <button onClick={handleSaveGame} style={{height:'36px',background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',
                color:'white',fontSize:'12px',cursor:'pointer'}}>
                💾 Save
              </button>
              <button onClick={handleShareGame} style={{height:'36px',background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',
                color:'white',fontSize:'12px',cursor:'pointer'}}>
                🔗 Share
              </button>
            </div>

            {/* Resign */}
            <div style={{padding:'8px 12px 16px'}}>
              {isGameOver ? (
                <button 
                  onClick={handleAnalyzeGameClick}
                  style={{width:'100%',height:'40px',background:'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                    border:'none',borderRadius:'6px',
                    color:'#111',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                  📊 Analyze Game
                </button>
              ) : (
                <button 
                  onClick={() => { if(confirmResign) { resign(); setConfirmResign(false); } else setConfirmResign(true); }}
                  disabled={isGameOver}
                  style={{width:'100%',height:'40px',background:'rgba(220,50,50,0.15)',
                    border:'1px solid rgba(220,50,50,0.3)',borderRadius:'6px',
                    color:'#f87171',fontSize:'13px',fontWeight:'600',cursor:'pointer', opacity: isGameOver ? 0.35 : 1}}>
                  🏳 {confirmResign ? 'CONFIRM RESIGNATION' : 'Resign'}
                </button>
              )}
            </div>
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
