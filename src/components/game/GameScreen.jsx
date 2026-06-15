import './GameScreen.css';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
import { useStockfish } from '../../hooks/useStockfish';
import { AiStatusBar } from '../AiStatusBar';
import { DifficultySelector } from '../DifficultySelector';
import { DIFFICULTY_CONFIG } from '../../services/stockfishService';
import { Play, RotateCcw, Flag, Sparkles, RefreshCw, Save, Share2, Settings } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useChessClock } from '../../hooks/useChessClock';
import { BOTS } from '../../data/bots';

const initGame = (fen) => {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch (e) {
    console.error('Chess init failed in GameScreen:', e);
    return new Chess(); // fallback to start position
  }
};

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

const clockStyle = (seconds, isActive) => ({
  fontSize: '18px',
  fontWeight: '700',
  fontFamily: 'monospace',
  color: seconds < 10 ? '#ef4444' : seconds < 30 ? '#f97316' : 'white',
  opacity: isActive ? 1 : 0.5,
  animation: seconds < 10 && isActive ? 'pulse 1s ease-in-out infinite' : 'none',
  transition: 'color 0.3s',
  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
  padding: '4px 10px',
  borderRadius: '6px',
});

const EvalBar = ({ score, isMate, mateIn, flipped }) => {
  let pct = isMate
    ? (score > 0 ? 5 : 95)
    : Math.min(95, Math.max(5, 50 - (score / 10)));

  if (flipped) {
    pct = 100 - pct;
  }

  return (
    <div style={{
      width: '10px',
      height: 'var(--board-size)',
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative',
      background: '#1a1a2e',
      flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Black side (top if not flipped, bottom if flipped) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${pct}%`,
        background: '#1a1a2e',
        transition: 'height 0.4s ease'
      }}/>
      {/* White side (bottom if not flipped, top if flipped) */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${100 - pct}%`,
        background: '#f0d9b5',
        transition: 'height 0.4s ease'
      }}/>
      {/* Score label */}
      <div style={{
        position: 'absolute',
        top: pct < 50 ? '4px' : 'auto',
        bottom: pct >= 50 ? '4px' : 'auto',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '9px',
        fontWeight: '700',
        color: pct < 50 ? 'white' : '#333',
        writingMode: 'horizontal-tb',
        whiteSpace: 'nowrap'
      }}>
        {isMate ? `M${Math.abs(mateIn || 0)}` : (score > 0 ? `+${(score / 100).toFixed(1)}` : (score / 100).toFixed(1))}
      </div>
    </div>
  );
};

export default function GameScreen() {
  const { 
    state, dispatch, resign, offerDraw, acceptDraw, declineDraw, undoMove, startNewGame, 
    opponentDisconnectedCountdown, checkFeatureLimit, incrementUsage,
    isPremium, setShowUpgradeModal, isSimpleMode: contextSimpleMode,
    claimAbandonmentWin,
  } = useGame();
  const { showToast } = useToast();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    timeControl, moveCount, boardFlipped, reviewFen,
    soundEnabled, showCoords, whiteTime, blackTime,
  } = state;

  const { isSimpleMode: hookSimpleMode, setDifficulty: setHookDifficulty } =
    useStockfish(aiDifficulty);

  const isSimpleMode = contextSimpleMode ?? hookSimpleMode;
  const selectedDifficulty = Number(aiDifficulty) || 3;

  const handleDifficultyChange = (level) => {
    const lvl = Number(level);
    if (!isPremium && lvl >= 4) {
      setShowUpgradeModal(true);
      return;
    }
    setHookDifficulty(lvl);
    dispatch({ type: 'SET_DIFFICULTY', payload: lvl });
    localStorage.setItem('chess_difficulty', String(lvl));
  };

  let baseSecs = 600;
  let incrementSecs = 0;
  if (timeControl) {
    if (typeof timeControl === 'object') {
      const base = Number(timeControl.base);
      const inc = Number(timeControl.increment);
      if (!isNaN(base)) {
        baseSecs = base > 30 ? base : base * 60;
      }
      if (!isNaN(inc)) {
        incrementSecs = inc;
      }
    } else if (typeof timeControl === 'number') {
      baseSecs = timeControl > 30 ? timeControl : timeControl * 60;
    } else if (typeof timeControl === 'string') {
      const parsed = Number(timeControl);
      if (!isNaN(parsed)) {
        baseSecs = parsed > 30 ? parsed : parsed * 60;
      }
    }
  }

  const safeBaseSecs =
    Number.isFinite(baseSecs) && baseSecs > 0 ? baseSecs : 600;
  const safeIncrementSecs =
    Number.isFinite(incrementSecs) && incrementSecs >= 0 ? incrementSecs : 0;

  const { 
    whiteTime: clockWhiteTime, 
    blackTime: clockBlackTime, 
    formatTime, 
    start: startClock, 
    switchClock, 
    stop: stopClock, 
    reset: resetClock, 
    activeColor 
  } = useChessClock(safeBaseSecs, safeIncrementSecs);

  const formatClockDisplay = useCallback((seconds) => {
    const s = Number(seconds);
    if (!Number.isFinite(s) || s < 0) {
      return formatTime(safeBaseSecs);
    }
    return formatTime(s);
  }, [formatTime, safeBaseSecs]);

  const isGameOver = status.type !== 'playing' && status.type !== 'check';

  const onGameOver = (winnerColor, reason) => {
    const winnerName = winnerColor === 'w' ? 'White' : 'Black';
    dispatch({
      type: 'SET_GAME_OVER_STATUS',
      payload: {
        type: 'timeout',
        message: `Time's up! ${winnerName} wins!`,
        winner: winnerName
      }
    });
    stopClock();
  };

  useEffect(() => {
    if (clockWhiteTime <= 0) onGameOver('b', 'timeout');
  }, [clockWhiteTime]);

  useEffect(() => {
    if (clockBlackTime <= 0) onGameOver('w', 'timeout');
  }, [clockBlackTime]);

  const prevHistoryLengthRef = useRef(history.length);

  useEffect(() => {
    if (isGameOver || !timeControl) {
      stopClock();
      return;
    }

    if (history.length === 0) {
      resetClock();
      stopClock();
      prevHistoryLengthRef.current = 0;
      return;
    }

    if (history.length > prevHistoryLengthRef.current) {
      const lastMove = history[history.length - 1];
      if (lastMove) {
        switchClock(lastMove.color);
      }
    } else if (history.length < prevHistoryLengthRef.current) {
      const chess = initGame(reviewFen || fen);
      startClock(chess.turn());
    }
    prevHistoryLengthRef.current = history.length;
  }, [history.length, isGameOver, timeControl, reviewFen, fen, switchClock, resetClock, stopClock, startClock]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [confirmResign, setConfirmResign] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(null);
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisArrow, setAnalysisArrow] = useState(null);
  const [analysisResults, setAnalysisResults] = useState([]);
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
      setAnalysisResults([]);
    }
  }, [history.length]);

  const handleAnalyzeGameClick = () => {
    if (!checkFeatureLimit('analysis', "You've used all 3 free analyses today. Upgrade to Premium for unlimited analyses!")) return;
    incrementUsage('analysis');
    setIsAnalyzing(true);
    setShowGameOver(false);
  };

  const activeReviewFen = reviewFen || fen;

  // Vertical evaluation bar states
  const [evalScore, setEvalScore] = useState(0);
  const [isMate, setIsMate] = useState(false);
  const [mateIn, setMateIn] = useState(0);

  const updateEval = useCallback(async (fenString) => {
    const worker = stockfishEngine.worker;
    if (!worker || !stockfishEngine.isReady) return;

    worker.postMessage('ucinewgame');
    worker.postMessage(`position fen ${fenString}`);
    worker.postMessage('go depth 12');

    const activeTurn = fenString.split(' ')[1]; // 'w' or 'b'

    const onMsg = (e) => {
      const msg = typeof e.data === 'string' ? e.data : e.data?.data;
      if (!msg) return;

      if (msg.includes('score cp')) {
        const match = msg.match(/score cp (-?\d+)/);
        if (match) {
          const cp = parseInt(match[1]);
          // Normalize so white is positive, black is negative
          const normalizedCp = activeTurn === 'w' ? cp : -cp;
          setEvalScore(normalizedCp);
          setIsMate(false);
        }
      } else if (msg.includes('score mate')) {
        const match = msg.match(/score mate (-?\d+)/);
        if (match) {
          const m = parseInt(match[1]);
          const normalizedM = activeTurn === 'w' ? m : -m;
          setMateIn(normalizedM);
          setIsMate(true);
          setEvalScore(normalizedM > 0 ? 10000 : -10000);
        }
      }

      if (msg.startsWith('bestmove')) {
        worker.removeEventListener('message', onMsg);
      }
    };

    worker.addEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    updateEval(activeReviewFen);
  }, [activeReviewFen, updateEval]);

  const handleBack = () => dispatch({ type: 'SET_MODE', payload: 'menu' });

  // Whose info goes where
  const flippedView = (playerColor === 'b') !== !!boardFlipped;
  const topColor = flippedView ? 'w' : 'b';
  const bottomColor = flippedView ? 'b' : 'w';

  const materialAdv = getMaterialAdvantage(capturedPieces.w, capturedPieces.b);

  const myName = localStorage.getItem('chess_display_name') || 'You';
  const myElo = parseInt(localStorage.getItem('chess_elo')) || 1200;

  const activeBot = BOTS.find(b => b.id === state.aiBotId) || BOTS[1];

  const topPlayer = {
    name: gameMode === 'vsAI' && playerColor !== topColor
      ? activeBot.name
      : gameMode === 'online'
      ? (topColor === playerColor ? myName : (state.opponentName || 'Opponent'))
      : (topColor === playerColor ? 'You' : 'Opponent'),
    rating: gameMode === 'vsAI' && playerColor !== topColor
      ? activeBot.elo
      : gameMode === 'online'
      ? (topColor === playerColor ? myElo : (state.opponentRating || 1200))
      : 1500,
    isAI: gameMode === 'vsAI' && playerColor !== topColor,
    avatarEmoji: activeBot.avatar,
    avatarTheme: activeBot.theme,
    color: topColor,
    time: topColor === 'w' ? clockWhiteTime : clockBlackTime,
    isActive: initGame(reviewFen || fen).turn() === topColor,
    captured: capturedPieces[topColor === 'w' ? 'b' : 'w'], // Pieces captured BY top player
    material: materialAdv[topColor]
  };

  const bottomPlayer = {
    name: gameMode === 'vsAI' && playerColor !== bottomColor
      ? activeBot.name
      : gameMode === 'online'
      ? (bottomColor === playerColor ? myName : (state.opponentName || 'Opponent'))
      : (bottomColor === playerColor ? 'You' : 'Opponent'),
    rating: gameMode === 'vsAI' && playerColor !== bottomColor
      ? activeBot.elo
      : gameMode === 'online'
      ? (bottomColor === playerColor ? myElo : (state.opponentRating || 1200))
      : 1500,
    isAI: gameMode === 'vsAI' && playerColor !== bottomColor,
    avatarEmoji: activeBot.avatar,
    avatarTheme: activeBot.theme,
    color: bottomColor,
    time: bottomColor === 'w' ? clockWhiteTime : clockBlackTime,
    isActive: initGame(reviewFen || fen).turn() === bottomColor,
    captured: capturedPieces[bottomColor === 'w' ? 'b' : 'w'], // Pieces captured BY bottom player
    material: materialAdv[bottomColor]
  };

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
      stockfishEngine.setDifficulty(aiDifficulty);
      const uciMove = await stockfishEngine.getBestMove(fen, []);
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

  const getBotDifficulty = (botId) => {
    const mapping = {
      rookie: 1,
      beginner: 2,
      casual: 3,
      club: 5,
      intermediate: 6,
      advanced: 8,
      expert: 9,
      master: 10,
    };
    return mapping[botId] || 3;
  };

  const handleStartGame = () => {
    const activeBotObj = BOTS.find(b => b.id === state.aiBotId) || BOTS[1];
    
    // Lock check
    if (!isPremium && (activeBotObj.id === 'expert' || activeBotObj.id === 'master')) {
      setShowUpgradeModal(true);
      return;
    }

    const mapping = {
      rookie: 1,
      beginner: 2,
      casual: 3,
      club: 5,
      intermediate: 6,
      advanced: 8,
      expert: 9,
      master: 10,
    };
    const diff = mapping[activeBotObj.id] || 3;

    startNewGame({ 
      mode: 'vsAI', 
      playerColor: playerColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : playerColor, 
      difficulty: diff, 
      botId: activeBotObj.id,
      timeControl: state.timeControl || { base: 10, increment: 0 }
    });
    setIsSetupPhase(false);
  };

  const playBotsPanel = (
    <div className="play-bots-panel sidebar-bot-selector">
      {/* HEADER */}
      <div className="play-bots-header">
        <span style={{ fontSize: '18px' }}>🖥</span>
        <h2>Play Bots</h2>
      </div>

      {/* SELECTED BOT SPOTLIGHT */}
      <div className="bot-info-card sidebar-spotlight" style={{ background: activeBot.theme + '15', borderColor: activeBot.theme + '30' }}>
        <div className="bot-info-avatar" style={{ background: activeBot.theme }}>
          {activeBot.avatar}
        </div>
        <div className="bot-info-details">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '700' }}>{activeBot.name}</h3>
            <span className="bot-rating" style={{ background: activeBot.theme, color: '#111', fontSize: '11px', padding: '1px 6px', borderRadius: '6px', fontWeight: '800' }}>({activeBot.elo})</span>
          </div>
          <div style={{ fontSize: '11px', color: '#e2b04a', fontWeight: '600', marginTop: '2px' }}>{activeBot.personality}</div>
          <p className="bot-desc" style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px', margin: 0 }}>{activeBot.bio}</p>
        </div>
      </div>

      {/* BOTS GRID LIST */}
      <div className="sidebar-bots-grid">
        {BOTS.map((bot) => {
          const isSelected = state.aiBotId === bot.id;
          const isLocked = !isPremium && (bot.id === 'expert' || bot.id === 'master');
          return (
            <div
              key={bot.id}
              className={`sidebar-bot-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => {
                dispatch({ type: 'SET_BOT_ID', payload: bot.id });
                handleDifficultyChange(getBotDifficulty(bot.id));
              }}
              style={{ '--theme-gradient': bot.theme }}
            >
              <span className="sidebar-bot-emoji">{bot.avatar}</span>
              <span className="sidebar-bot-card-name">{bot.name.replace(' Bot', '').replace(' Player', '')}</span>
              <span className="sidebar-bot-card-elo">{bot.elo}</span>
              {isLocked && <span className="sidebar-bot-lock">🔒</span>}
            </div>
          );
        })}
      </div>

      {/* OPTIONS ROW & COLOR SELECTOR */}
      <div className="play-bots-options-row" style={{ position: 'relative' }} ref={optionsRef}>
        <div className="options-dropdown" onClick={() => setShowOptions(!showOptions)}>
          <span>⚙ Settings & Time</span>
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
              { label: '1+0 (Bullet)', value: { base: 1, increment: 0 } },
              { label: '3+2 (Blitz)', value: { base: 3, increment: 2 } },
              { label: '10+0 (Rapid)', value: { base: 10, increment: 0 } },
              { label: '30+0 (Classical)', value: { base: 30, increment: 0 } }
            ].map((tcOption, index) => {
              const isSelected = (!timeControl && !tcOption.value) || 
                                 (timeControl && tcOption.value && timeControl.base === tcOption.value.base && timeControl.increment === tcOption.value.increment);
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
          <button 
            className={`color-btn ${playerColor === 'w' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PLAYER_COLOR', payload: 'w' })}
            title="Play as White"
          >
            ♔
          </button>
          <button 
            className={`color-btn ${playerColor === 'r' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PLAYER_COLOR', payload: 'r' })}
            title="Random Color"
          >
            ?
          </button>
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
    else if (action === 'draw') {
      offerDraw();
      showToast('Draw offered to opponent.', 'info');
    }
  };

  const renderClock = (player) => {
    if (!timeControl) {
      return (
        <span style={{
          fontSize: '18px',
          fontWeight: '700',
          fontFamily: 'monospace',
          color: 'rgba(255,255,255,0.4)',
          background: 'transparent',
          padding: '4px 10px',
          borderRadius: '6px'
        }}>∞</span>
      );
    }
    const chess = initGame(reviewFen || fen);
    const isPlayerActive =
      (activeColor === player.color || chess.turn() === player.color) &&
      !isAIThinking &&
      (status.type === 'playing' || status.type === 'check');
    const contextSeconds = player.color === 'w' ? whiteTime : blackTime;
    const hookSeconds = player.color === 'w' ? clockWhiteTime : clockBlackTime;
    const playerSeconds = Number.isFinite(contextSeconds)
      ? contextSeconds
      : Number.isFinite(hookSeconds)
        ? hookSeconds
        : safeBaseSecs;
    return (
      <span style={clockStyle(playerSeconds, isPlayerActive)}>
        {formatClockDisplay(playerSeconds)}
      </span>
    );
  };

  return (
    <div className="game-page">
      {/* CENTER BOARD ZONE */}
      <div className="game-center">
        {/* Board row */}
        <div style={{display:'flex',flexDirection:'row',alignItems:'center',gap:'6px',flexShrink:0}}>
          {gameMode === 'vsAI' && !isSetupPhase && history.length > 0 && (
            <EvalBar score={evalScore} isMate={isMate} mateIn={mateIn} flipped={flippedView} />
          )}
          {/* Rank labels LEFT */}
          <div style={{display:'flex',flexDirection:'column',height:'var(--board-size)',width:'20px',flexShrink:0}}>
            {(flippedView?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1]).map(r=>(
              <div key={r} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.6)'}}>{r}</div>
            ))}
          </div>
          {/* Board + player bars + file labels */}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {state.opponentDisconnected && (
              <div style={disconnectBannerStyle}>
                {opponentDisconnectedCountdown > 0 ? (
                  <span>⚠️ Opponent disconnected. Game ends in {opponentDisconnectedCountdown}s</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <span>⚠️ Opponent abandoned the game. You can now claim the win!</span>
                    <button onClick={claimAbandonmentWin} style={btnClaimWinStyle}>
                      Claim Win by Abandonment
                    </button>
                  </div>
                )}
              </div>
            )}
            {state.drawOfferedByOpponent && (
              <div style={drawOfferBannerStyle}>
                🤝 Opponent offered a draw.
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'center' }}>
                  <button onClick={acceptDraw} style={btnAcceptDraw}>Accept</button>
                  <button onClick={declineDraw} style={btnDeclineDraw}>Decline</button>
                </div>
              </div>
            )}
            {/* Top player bar */}
            <PlayerInfoBar player={topPlayer} isAIThinking={isAIThinking} />

            {/* Chessboard outer frame */}
            <div className="board-outer">
              <ChessBoard bestMoveArrow={analysisArrow} analysisResults={analysisResults} currentReviewIndex={reviewIndex} />
            </div>

            {/* Bottom player bar */}
            <PlayerInfoBar player={bottomPlayer} isAIThinking={isAIThinking} />

            {/* File labels BOTTOM */}
            <div style={{display:'flex',flexDirection:'row',width:'var(--board-size)',flexShrink:0}}>
              {(flippedView?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h']).map(f=>(
                <div key={f} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.6)'}}>{f}</div>
              ))}
            </div>
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
            onAnalysisComplete={setAnalysisResults}
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

            {/* ACTION BUTTONS */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',padding:'8px 12px'}}>
              {gameMode === 'online' ? (
                <>
                  <button 
                    disabled={isGameOver}
                    onClick={() => handleAction('draw')} 
                    style={{height:'40px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer',fontWeight:'500',opacity: isGameOver ? 0.35 : 1}}
                  >
                    🤝 Offer Draw
                  </button>
                  <button 
                    onClick={() => handleAction('flip')} 
                    style={{height:'40px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer',fontWeight:'500'}}
                  >
                    ⟲ Flip Board
                  </button>
                </>
              ) : (
                [['↩ Undo','undo'],['💡 Hint','hint'],['⟲ Flip','flip'],['＋ New','new']].map(([label,action])=>(
                  <button key={action} onClick={()=>handleAction(action)} style={{height:'40px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer',fontWeight:'500'}}>
                    {label}
                  </button>
                ))
              )}
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

            {gameMode === 'online' && (
              <div style={{ padding: '0 12px 16px' }}>
                <ChatPanel roomCode={state.roomCode} />
              </div>
            )}
          </>
        )}
      </div>

      {isGameOver && showGameOver && (
        <GameOverDialog
          status={status}
          onNewGame={() => {
            setShowGameOver(false);
            if (gameMode === 'online') {
              dispatch({ type: 'SET_MODE', payload: 'menu' });
            } else {
              startNewGame({ mode: gameMode, playerColor: 'w', difficulty: aiDifficulty, botId: state.aiBotId });
            }
          }}
          onRematch={() => {
            setShowGameOver(false);
            if (gameMode !== 'online') {
              dispatch({ type: 'REMATCH' });
            } else {
              // for online, start a new quick matching or similar
              dispatch({ type: 'SET_MODE', payload: 'menu' });
            }
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

const btnClaimWinStyle = {
  background: 'var(--gold)',
  color: '#0a0a14',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  fontWeight: 800,
  fontSize: '12px',
  cursor: 'pointer',
  marginTop: '4px',
  transition: 'transform 0.15s',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
};

const drawOfferBannerStyle = {
  background: 'rgba(212, 175, 55, 0.95)',
  border: '1px solid var(--gold)',
  color: '#000',
  padding: '10px 16px',
  borderRadius: '8px',
  marginBottom: '12px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '13px',
  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
};

const btnAcceptDraw = {
  background: '#10B981',
  color: '#fff',
  border: 'none',
  padding: '4px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '700',
  fontSize: '12px'
};

const btnDeclineDraw = {
  background: '#EF4444',
  color: '#fff',
  border: 'none',
  padding: '4px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '700',
  fontSize: '12px'
};
