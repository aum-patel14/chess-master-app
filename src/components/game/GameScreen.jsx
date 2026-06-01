import './GameScreen.css';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

const initGame = (fen) => {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch (e) {
    console.error('Chess init failed in GameScreen:', e);
    return new Chess(); // fallback to start position
  }
};
import { useGame } from '../../context/GameContext';
import ChessBoard from '../board/ChessBoard';
import GameOverDialog from './GameOverDialog';
import MoveHistoryPanel from './MoveHistoryPanel';
import PlayerInfoBar from './PlayerInfoBar';
import MultiplayerLobby from './MultiplayerLobby';
import ChatPanel from './ChatPanel';
import AnalysisPanel from './AnalysisPanel';
import { stockfishEngine } from '../../engine/StockfishService';
import { Play, RotateCcw, Flag, Sparkles, RefreshCw, Save, Share2, Settings } from 'lucide-react';
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
    whiteTime, blackTime, timeControl, moveCount, boardFlipped, reviewFen,
    soundEnabled, showCoords
  } = state;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [confirmResign, setConfirmResign] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(null);
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisArrow, setAnalysisArrow] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);

  // New Setup Phase state for Chess.com Play Bots Setup screen
  const [isSetupPhase, setIsSetupPhase] = useState(history.length === 0);

  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (history.length === 0) {
      setIsSetupPhase(true);
    } else {
      setIsSetupPhase(false);
    }
  }, [history.length]);

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
    isActive: initGame(reviewFen || fen).turn() === topColor,
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
    isActive: initGame(reviewFen || fen).turn() === bottomColor,
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
      const fallbackChess = initGame(fen);
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
    const c = initGame(fen);
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

  const BOT_LEVELS = {
    1: { label: 'Beginner', elo: 600, bots: '5 bots', avatar: '🤖', desc: 'Friendly bots that make lots of mistakes.' },
    2: { label: 'Casual', elo: 1000, bots: '36 bots', avatar: '👩‍💼', desc: 'Decent players that play realistic moves.' },
    3: { label: 'Club', elo: 1400, bots: '22 bots', avatar: '🧔', desc: 'Tough competitors with solid tactical skills.' },
    4: { label: 'Advanced', elo: 1800, bots: '14 bots', avatar: '👨‍🎨', desc: 'Expert players that punish small blunders.' },
    5: { label: 'Master', elo: 2800, bots: '25 bots', avatar: '🧠', desc: 'Grandmaster strength Stockfish engine.' },
  };

  const activeBot = BOT_LEVELS[aiDifficulty] || BOT_LEVELS[3];

  const handleStartGame = () => {
    startNewGame({ mode: 'vsAI', playerColor, difficulty: aiDifficulty });
    setIsSetupPhase(false);
  };

  const playBotsPanel = (
    <div className="play-bots-panel">
      {/* HEADER */}
      <div className="play-bots-header">
        <span style={{ fontSize: '18px' }}>🖥</span>
        <h2>Play Bots</h2>
      </div>

      {/* BOT INFO CARD */}
      <div className="bot-info-card">
        <div className="bot-info-avatar">
          {activeBot.avatar}
        </div>
        <div className="bot-info-details">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '700' }}>{activeBot.label}</h3>
            <span className="bot-rating">({activeBot.elo})</span>
          </div>
          <p className="bot-desc">{activeBot.desc}</p>
        </div>
      </div>

      {/* BOT CATEGORIES LIST */}
      <div className="bot-categories-label">Choose Category</div>
      <div className="bot-categories-list">
        {Object.entries(BOT_LEVELS).map(([level, data]) => {
          const isSelected = aiDifficulty === parseInt(level);
          return (
            <div 
              key={level} 
              className={`bot-category-item ${isSelected ? 'selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: parseInt(level) })}
            >
              <span className="bot-item-avatar">{data.avatar}</span>
              <div className="bot-item-details">
                <span className="bot-item-label">{data.label}</span>
                <span className="bot-item-elo">{data.elo} ELO</span>
              </div>
              <span className="bot-item-count">{data.bots}</span>
            </div>
          );
        })}
      </div>

      {/* ELO SLIDER */}
      <div className="engine-slider-container">
        <div className="engine-slider-header">
          <span>Engine</span>
          <span className="engine-bots-count">{activeBot.bots}</span>
        </div>
        
        <input 
          type="range" 
          min="1" 
          max="5" 
          step="1" 
          value={aiDifficulty} 
          onChange={(e) => dispatch({ type: 'SET_DIFFICULTY', payload: parseInt(e.target.value) })}
          className="engine-slider"
        />

        <div className="engine-slider-ticks">
          <span style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: 1 })}>600</span>
          <span style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: 2 })}>1000</span>
          <span style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: 3 })}>1400</span>
          <span style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: 4 })}>1800</span>
          <span style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_DIFFICULTY', payload: 5 })}>2800</span>
        </div>
      </div>

      {/* OPTIONS ROW & COLOR SELECTOR */}
      <div className="play-bots-options-row" style={{ position: 'relative' }} ref={optionsRef}>
        <div className="options-dropdown" onClick={() => setShowOptions(!showOptions)}>
          <span>⚙ Options</span>
          <span style={{ fontSize: '9px', marginLeft: '6px' }}>{showOptions ? '▲' : '▼'}</span>
        </div>

        {showOptions && (
          <div className="options-dropdown-menu">
            <div className="options-menu-header">Game Settings</div>
            
            <div className="options-menu-item" onClick={() => { dispatch({ type: 'TOGGLE_BOARD_FLIP' }); showToast('Board orientation flipped', 'info'); }}>
              <span className="options-menu-icon">🔄</span>
              <span className="options-menu-text">Flip Board</span>
              <span className="options-menu-value">{boardFlipped ? 'Black' : 'White'}</span>
            </div>

            <div className="options-menu-item" onClick={() => { dispatch({ type: 'TOGGLE_COORDS' }); showToast(showCoords ? 'Coordinates disabled' : 'Coordinates enabled', 'info'); }}>
              <span className="options-menu-icon">🔡</span>
              <span className="options-menu-text">Coordinates</span>
              <span className="options-menu-value">{showCoords ? 'On' : 'Off'}</span>
            </div>

            <div className="options-menu-item" onClick={() => { dispatch({ type: 'TOGGLE_SOUND' }); showToast(soundEnabled ? 'Sounds muted' : 'Sounds enabled', 'info'); }}>
              <span className="options-menu-icon">{soundEnabled ? '🔊' : '🔇'}</span>
              <span className="options-menu-text">Sound</span>
              <span className="options-menu-value">{soundEnabled ? 'On' : 'Off'}</span>
            </div>

            <div className="options-menu-divider" />
            <div className="options-menu-header">Time Control</div>

            {[
              { label: 'Casual (∞)', value: null },
              { label: '10 Minutes', value: { base: 10, increment: 0 } },
              { label: '5 Minutes', value: { base: 5, increment: 0 } },
              { label: '3 Minutes', value: { base: 3, increment: 0 } },
              { label: '1 Minute', value: { base: 1, increment: 0 } }
            ].map((tcOption, index) => {
              const isSelected = (!timeControl && !tcOption.value) || 
                                 (timeControl && tcOption.value && timeControl.base === tcOption.value.base);
              return (
                <div 
                  key={index} 
                  className={`options-menu-item tc-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    dispatch({ type: 'SET_TIME_CONTROL', payload: tcOption.value });
                    showToast(`Time Control: ${tcOption.label}`, 'success');
                    setShowOptions(false);
                  }}
                >
                  <span className="options-menu-icon">⏱</span>
                  <span className="options-menu-text">{tcOption.label}</span>
                  {isSelected && <span className="options-menu-check">✓</span>}
                </div>
              );
            })}
          </div>
        )}

        <div className="color-selector-group">
          {/* Play as White */}
          <button 
            className={`color-btn ${playerColor === 'w' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PLAYER_COLOR', payload: 'w' })}
            title="Play as White"
          >
            ♔
          </button>
          {/* Play as Random */}
          <button 
            className={`color-btn ${playerColor === 'r' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PLAYER_COLOR', payload: 'r' })}
            title="Random Color"
          >
            ?
          </button>
          {/* Play as Black */}
          <button 
            className={`color-btn ${playerColor === 'b' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PLAYER_COLOR', payload: 'b' })}
            title="Play as Black"
          >
            ♚
          </button>
        </div>
      </div>

      {/* GIANT GREEN PLAY BUTTON */}
      <button className="play-bots-start-btn" onClick={handleStartGame}>
        Play
      </button>
    </div>
  );

  const handleAction = (action) => {
    if (action === 'undo') handleUndo();
    else if (action === 'hint') handleHint();
    else if (action === 'flip') dispatch({ type: 'TOGGLE_BOARD_FLIP' });
    else if (action === 'new') startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty });
  };

  return (
    <div className="game-page">
      {/* CENTER BOARD ZONE */}
      <div className="game-center">
        {/* Black player bar */}
        <div style={{width:'calc(var(--board-size) + 24px)',height:'44px',background:'rgba(255,255,255,0.05)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 12px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#374151',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:'600',color:'white'}}>{avatarLetterTop}</div>
            <div style={{display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{fontSize:'14px',fontWeight:'500',color:'white'}}>{topPlayer.name}</span>
                <span style={{fontSize:'12px',padding:'2px 8px',background:'rgba(255,255,255,0.1)',borderRadius:'99px',color:'#aaa'}}>{topPlayer.rating}</span>
              </div>
              {topPlayer.isAI && isAIThinking && (
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',textAlign:'left',lineHeight:'1'}}>
                  thinking
                  <span style={{animation:'dots 1.2s steps(4,end) infinite'}}>...</span>
                </span>
              )}
            </div>
          </div>
          <span style={{fontSize:'16px',fontWeight:'600',color:'white',fontFamily:'monospace'}}>{formatClockTime(topPlayer.time)}</span>
        </div>

        {/* Board row */}
        <div style={{display:'flex',flexDirection:'row',alignItems:'flex-start',gap:'4px',flexShrink:0}}>
          {/* Rank labels LEFT */}
          <div style={{display:'flex',flexDirection:'column',height:'var(--board-size)',width:'20px',flexShrink:0}}>
            {(flippedView?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1]).map(r=>(
              <div key={r} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.6)'}}>{r}</div>
            ))}
          </div>
          {/* Board + file labels */}
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            <div className="board-outer">
              <ChessBoard bestMoveArrow={analysisArrow} />
            </div>
            {/* File labels BOTTOM */}
            <div style={{display:'flex',flexDirection:'row',width:'var(--board-size)',flexShrink:0}}>
              {(flippedView?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h']).map(f=>(
                <div key={f} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.6)'}}>{f}</div>
              ))}
            </div>
          </div>
        </div>

        {/* White player bar */}
        <div style={{width:'calc(var(--board-size) + 24px)',height:'44px',background:'rgba(255,255,255,0.05)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 12px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#4B5563',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:'600',color:'white'}}>{avatarLetterBottom}</div>
            <div style={{display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{fontSize:'14px',fontWeight:'500',color:'white'}}>{bottomPlayer.name}</span>
                <span style={{fontSize:'12px',padding:'2px 8px',background:'rgba(255,255,255,0.1)',borderRadius:'99px',color:'#aaa'}}>{bottomPlayer.rating}</span>
              </div>
              {bottomPlayer.isAI && isAIThinking && (
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',textAlign:'left',lineHeight:'1'}}>
                  thinking
                  <span style={{animation:'dots 1.2s steps(4,end) infinite'}}>...</span>
                </span>
              )}
            </div>
          </div>
          <span style={{fontSize:'16px',fontWeight:'600',color:'white',fontFamily:'monospace'}}>{formatClockTime(bottomPlayer.time)}</span>
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
        ) : gameMode === 'vsAI' && isSetupPhase ? (
          playBotsPanel
        ) : (
          <>
            {/* MOVES HEADER */}
            <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              <span style={{fontSize:'11px',fontWeight:'600',letterSpacing:'0.08em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>Moves</span>
            </div>

            {/* MOVE LIST - scrollable */}
            <div style={{flex:1,overflowY:'auto',padding:'8px 12px'}}>
              {movesPaired.length === 0 ? (
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.25)',textAlign:'center',marginTop:'24px'}}>No moves yet</p>
              ) : movesPaired.map(([w,b],i) => (
                <div key={i} style={{display:'grid',gridTemplateColumns:'28px 1fr 1fr',gap:'4px',padding:'3px 6px',borderRadius:'4px',background:currentMoveIndex===i*2+1?'rgba(226,176,74,0.15)':'transparent'}}>
                  <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',lineHeight:'28px'}}>{i+1}.</span>
                  <span onClick={()=>handleJumpToMove(i*2)} style={{fontSize:'13px',color:'white',padding:'4px 6px',borderRadius:'4px',cursor:'pointer',background:currentMoveIndex===i*2?'rgba(226,176,74,0.2)':'transparent'}}>{w}</span>
                  <span onClick={()=>handleJumpToMove(i*2+1)} style={{fontSize:'13px',color:'rgba(255,255,255,0.75)',padding:'4px 6px',borderRadius:'4px',cursor:'pointer',background:currentMoveIndex===i*2+1?'rgba(226,176,74,0.2)':'transparent'}}>{b||''}</span>
                </div>
              ))}
            </div>

            {/* PLAYBACK CONTROLS */}
            <div style={{display:'flex',justifyContent:'center',gap:'8px',padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              {[['|◀',()=>handleJumpToMove(-1)],['◀',()=>handleJumpToMove(currentMoveIndex > -1 ? currentMoveIndex - 1 : -1)],['▶',()=>handleJumpToMove(currentMoveIndex < history.length - 1 ? (currentMoveIndex === null ? 0 : currentMoveIndex + 1) : null)],['▶|',()=>handleJumpToMove(null)]].map(([icon,fn],i)=>(
                <button key={i} onClick={fn} style={{width:'44px',height:'36px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'13px',cursor:'pointer'}}>
                  {icon}
                </button>
              ))}
            </div>

            {/* ACTION BUTTONS 2x2 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',padding:'8px 12px'}}>
              {[['↩ Undo','undo'],['💡 Hint','hint'],['⟲ Flip','flip'],['＋ New','new']].map(([label,action])=>(
                <button key={action} onClick={()=>handleAction(action)} style={{height:'40px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer',fontWeight:'500'}}>
                  {label}
                </button>
              ))}
            </div>

            {/* SAVE + SHARE */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',padding:'0 12px 8px'}}>
              <button onClick={handleSaveGame} style={{height:'36px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer'}}>💾 Save</button>
              <button onClick={handleShareGame} style={{height:'36px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer'}}>🔗 Share</button>
            </div>

            {/* RESIGN */}
            <div style={{padding:'0 12px 16px'}}>
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
                  style={{width:'100%',height:'40px',background:'rgba(220,50,50,0.15)',border:'1px solid rgba(220,50,50,0.3)',borderRadius:'6px',color:'#f87171',fontSize:'13px',fontWeight:'600',cursor:'pointer', opacity: isGameOver ? 0.35 : 1}}>
                  🏳 {confirmResign ? 'CONFIRM RESIGN' : 'Resign'}
                </button>
              )}
            </div>
          </>
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
