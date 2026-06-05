import { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { getGameStatus, getBestMove as getFallbackBestMove } from '../engine/chessEngine';
import { stockfishEngine } from '../engine/StockfishService';
import {
  initStockfish,
  getBestMove as stockfishGetBestMove,
  getRandomLegalMove,
} from '../services/stockfishService';
import { soundManager } from '../engine/soundManager';
import { auth, db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { saveGame, getHistory } from '../utils/gameHistory';
import { readElo, writeElo, updateStats, updateEloForResult, appendGameHistory, readStats, writeStats } from '../utils/chessStats';
import { checkAndUnlockAchievements } from '../utils/achievements';
import AchievementToast from '../components/AchievementToast';
import UpgradeModal from '../components/modals/UpgradeModal';
import { getSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';

const initGame = (fen) => {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch (e) {
    console.error('Chess init failed:', e);
    return new Chess(); // fallback to start position
  }
};

const GameContext = createContext(null);

const BOARD_THEMES = {
  classic:  { light: '#f0d9b5', dark: '#b58863', name: 'Classic', accent: '#c4a028' },
  ocean:    { light: '#dee3e6', dark: '#8ca2ad', name: 'Ocean',   accent: '#4a728a' },
  wood:     { light: '#f0c070', dark: '#8a4f2a', name: 'Wood',    accent: '#734122' },
  midnight: { light: '#6f8fa4', dark: '#2e4057', name: 'Midnight',accent: '#8866ff' },
};

const initialDifficulty = parseInt(localStorage.getItem('chess_difficulty')) || 3;
const initialTheme = localStorage.getItem('chess_theme') || 'classic';
const initialSound = localStorage.getItem('chess_sound') !== 'false';
const initialAnimations = localStorage.getItem('chess_animations') !== 'false';
const initialCoords = localStorage.getItem('chess_coords') !== 'false';

// Default to Rapid: 10 minutes, 0 increment
const defaultTimeControl = { base: 10, increment: 0 };
const initialTime = (() => {
  try {
    const saved = localStorage.getItem('chess_time');
    return saved ? JSON.parse(saved) : defaultTimeControl;
  } catch (e) {
    return defaultTimeControl;
  }
})();

const savedOnlineGame = (() => {
  try {
    const saved = localStorage.getItem('active_online_game');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

const initialState = {
  fen: initGame().fen(),
  history: [],
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  errorSquare: null,          // Square that triggered an illegal move (for shake animation)
  status: { type: 'playing', message: '', winner: null },
  gameMode: savedOnlineGame ? 'online' : 'menu',          // 'menu' | 'vsAI' | 'local' | 'puzzle' | 'online'
  playerColor: savedOnlineGame ? savedOnlineGame.color : 'w',          // player is white by default
  aiDifficulty: initialDifficulty,
  aiBotId: localStorage.getItem('chess_bot_id') || 'beginner',
  isAIThinking: false,
  capturedPieces: { w: [], b: [] },
  theme: initialTheme,
  showCoords: initialCoords,
  soundEnabled: initialSound,
  animationsEnabled: initialAnimations,
  timeControl: savedOnlineGame ? savedOnlineGame.timeControl : initialTime,          // { base: number, increment: number }
  whiteTime: savedOnlineGame ? (savedOnlineGame.timeControl ? savedOnlineGame.timeControl.base * 60 : 600) : (initialTime ? initialTime.base * 60 : 600),
  blackTime: savedOnlineGame ? (savedOnlineGame.timeControl ? savedOnlineGame.timeControl.base * 60 : 600) : (initialTime ? initialTime.base * 60 : 600),
  timerRunning: false,
  promotionPending: null,     // { from, to } when pawn reaches last rank
  checkSquare: null,
  highlightedSquares: [],
  hintSquares: null,
  boardFlipped: false,
  reviewFen: null,
  moveCount: 0,
  gameStartTime: null,
  roomCode: savedOnlineGame ? savedOnlineGame.roomCode : null,
  opponentName: savedOnlineGame ? savedOnlineGame.opponentName : null,
  opponentRating: savedOnlineGame ? savedOnlineGame.opponentRating : null,
  opponentDisconnected: false,
  opponentDisconnectedSeconds: null,
  drawOfferedByOpponent: false,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_ONLINE_GAME': {
      const payloadTc = action.payload.timeControl;
      let tc = payloadTc;
      if (typeof payloadTc === 'number') {
        tc = { base: payloadTc / 60, increment: 0 };
      } else if (!payloadTc) {
        tc = { base: 10, increment: 0 };
      }
      return {
        ...state,
        gameMode: 'online',
        roomCode: action.payload.roomCode,
        playerColor: action.payload.color,
        opponentName: action.payload.opponentName,
        opponentRating: action.payload.opponentRating,
        timeControl: tc,
        whiteTime: tc.base * 60,
        blackTime: tc.base * 60,
        timerRunning: true,
        fen: new Chess().fen(),
        history: [],
        selectedSquare: null,
        validMoves: [],
        lastMove: null,
        status: { type: 'playing', message: '', winner: null },
        opponentDisconnected: false,
        capturedPieces: { w: [], b: [] },
        checkSquare: null,
        reviewFen: null,
        hintSquares: null,
        moveCount: 0,
        gameStartTime: Date.now(),
        drawOfferedByOpponent: false,
      };
    }
    case 'RESTORE_ONLINE_GAME': {
      const tc = action.payload.timeControl;
      let parsedTc = tc;
      if (typeof tc === 'number') {
        parsedTc = { base: tc / 60, increment: 0 };
      } else if (!tc) {
        parsedTc = { base: 10, increment: 0 };
      }

      const chess = new Chess();
      const reconstructedHistory = [];
      for (const m of action.payload.history) {
        const moveRes = chess.move({ from: m.from, to: m.to, promotion: m.promotion });
        if (moveRes) {
          reconstructedHistory.push({
            from: m.from,
            to: m.to,
            promotion: m.promotion,
            san: m.san || moveRes.san,
            fen: chess.fen()
          });
        }
      }

      const status = getGameStatus(chess);
      const capturedPieces = computeCaptured(chess.history({ verbose: true }));

      return {
        ...state,
        gameMode: 'online',
        roomCode: action.payload.roomCode,
        playerColor: action.payload.color,
        opponentName: action.payload.opponentName,
        opponentRating: action.payload.opponentRating,
        timeControl: parsedTc,
        fen: chess.fen(),
        history: reconstructedHistory,
        selectedSquare: null,
        validMoves: [],
        lastMove: reconstructedHistory.length ? { from: reconstructedHistory[reconstructedHistory.length - 1].from, to: reconstructedHistory[reconstructedHistory.length - 1].to } : null,
        status,
        timerRunning: status.type === 'playing' || status.type === 'check',
        opponentDisconnected: false,
        capturedPieces,
        checkSquare: null,
        reviewFen: null,
        hintSquares: null,
        moveCount: reconstructedHistory.length,
        gameStartTime: state.gameStartTime || Date.now(),
        drawOfferedByOpponent: false,
      };
    }
    case 'SET_DRAW_OFFERED':
      return {
        ...state,
        drawOfferedByOpponent: action.payload
      };
    case 'SET_OPPONENT_DISCONNECTED':
      return {
        ...state,
        opponentDisconnected: action.payload.disconnected,
        opponentDisconnectedSeconds: action.payload.seconds
      };
    case 'SET_GAME_OVER_STATUS':
      return {
        ...state,
        status: action.payload,
        timerRunning: false,
        opponentDisconnected: false
      };
    case 'SET_REVIEW_FEN':
      return { ...state, reviewFen: action.payload };
    case 'SET_HINT_SQUARES':
      return { ...state, hintSquares: action.payload };
    case 'TOGGLE_BOARD_FLIP':
      return { ...state, boardFlipped: !state.boardFlipped };
    case 'SET_MODE': return { ...state, gameMode: action.payload };
    case 'SET_THEME': return { ...state, theme: action.payload };
    case 'SET_DIFFICULTY': return { ...state, aiDifficulty: action.payload };
    case 'SET_PLAYER_COLOR': return { ...state, playerColor: action.payload };
    case 'SET_BOT_ID': {
      localStorage.setItem('chess_bot_id', action.payload);
      return { ...state, aiBotId: action.payload };
    }
    case 'TOGGLE_SOUND': return { ...state, soundEnabled: !state.soundEnabled };
    case 'TOGGLE_ANIMATIONS': return { ...state, animationsEnabled: !state.animationsEnabled };
    case 'TOGGLE_COORDS': return { ...state, showCoords: !state.showCoords };
    case 'SET_SELECTED': return { ...state, selectedSquare: action.square, validMoves: action.moves, errorSquare: null };
    case 'CLEAR_SELECTION': return { ...state, selectedSquare: null, validMoves: [], errorSquare: null };
    case 'SET_ERROR_SQUARE': return { ...state, errorSquare: action.payload };
    case 'CLEAR_ERROR_SQUARE': return { ...state, errorSquare: null };
    case 'SET_AI_THINKING': return { ...state, isAIThinking: action.payload };
    case 'SET_PROMOTION_PENDING': return { ...state, promotionPending: action.payload };
    case 'SET_TIME_CONTROL': return {
      ...state,
      timeControl: action.payload,
      whiteTime: action.payload ? action.payload.base * 60 : 600,
      blackTime: action.payload ? action.payload.base * 60 : 600,
    };
    case 'TICK_TIMER': {
      if (!state.timerRunning || !state.timeControl) return state;
      const chess = initGame(state.fen);
      const turn = chess.turn();
      if (turn === 'w') return { ...state, whiteTime: Math.max(0, state.whiteTime - 0.1) };
      return { ...state, blackTime: Math.max(0, state.blackTime - 0.1) };
    }
    case 'TIMEOUT': {
      if (state.status.type === 'timeout') return state;
      const winner = state.whiteTime <= 0 ? 'Black' : 'White';
      return {
        ...state,
        status: { type: 'timeout', message: `Time's up! ${winner} wins!`, winner },
        timerRunning: false,
      };
    }
    case 'APPLY_MOVE': {
      const { move, chess, capturedPieces, status, checkSquare } = action;
      const turnAfterMove = chess.turn();
      let whiteTime = state.whiteTime;
      let blackTime = state.blackTime;
      
      if (state.timeControl && state.timeControl.increment > 0 && state.moveCount >= 1) {
        if (turnAfterMove === 'b') {
          // White just completed a move, add increment to White
          whiteTime += state.timeControl.increment;
        } else {
          // Black just completed a move, add increment to Black
          blackTime += state.timeControl.increment;
        }
      }

      return {
        ...state,
        fen: chess.fen(),
        history: [...state.history, { ...move, fen: chess.fen() }],
        selectedSquare: null,
        validMoves: [],
        errorSquare: null,
        lastMove: { from: move.from, to: move.to },
        hintSquares: null,
        reviewFen: null,
        status,
        capturedPieces,
        checkSquare,
        isAIThinking: false,
        promotionPending: null,
        timerRunning: status.type === 'playing' || status.type === 'check',
        moveCount: state.moveCount + 1,
        gameStartTime: state.gameStartTime || Date.now(),
        whiteTime,
        blackTime,
        drawOfferedByOpponent: false,
      };
    }
    case 'NEW_GAME': {
      const tc = action.timeControl !== undefined ? action.timeControl : state.timeControl;
      const baseSecs = tc ? tc.base * 60 : 600;
      let pColor = action.playerColor || 'w';
      if (pColor === 'r') {
        pColor = Math.random() < 0.5 ? 'w' : 'b';
      }
      return {
        ...initialState,
        gameMode: action.mode || 'vsAI',
        playerColor: pColor,
        aiDifficulty: action.difficulty ?? state.aiDifficulty,
        aiBotId: action.botId || state.aiBotId,
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        animationsEnabled: state.animationsEnabled,
        showCoords: state.showCoords,
        timeControl: tc,
        whiteTime: baseSecs,
        blackTime: baseSecs,
        gameStartTime: Date.now(),
        fen: action.fen || new Chess().fen(),
        boardFlipped: false,
        reviewFen: null,
        drawOfferedByOpponent: false,
      };
    }
    case 'REMATCH': {
      const nextColor = state.playerColor === 'w' ? 'b' : state.playerColor === 'b' ? 'w' : (Math.random() < 0.5 ? 'w' : 'b');
      const tc = state.timeControl;
      const baseSecs = tc ? tc.base * 60 : 600;
      return {
        ...initialState,
        gameMode: state.gameMode,
        playerColor: nextColor,
        aiDifficulty: state.aiDifficulty,
        aiBotId: state.aiBotId,
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        animationsEnabled: state.animationsEnabled,
        showCoords: state.showCoords,
        timeControl: tc,
        whiteTime: baseSecs,
        blackTime: baseSecs,
        gameStartTime: Date.now(),
        fen: new Chess().fen(),
        boardFlipped: false,
        reviewFen: null,
        drawOfferedByOpponent: false,
      };
    }
    case 'UNDO_TO': {
      const { fen, history, capturedPieces, status, checkSquare, lastMove } = action.payload;
      return {
        ...state,
        fen,
        history,
        capturedPieces,
        status,
        checkSquare: checkSquare ?? null,
        lastMove: lastMove || null,
        selectedSquare: null,
        validMoves: [],
        moveCount: history.length,
        isAIThinking: false,
        promotionPending: null,
        timerRunning: status.type === 'playing' || status.type === 'check',
      };
    }
    case 'RESIGN': {
      const winner = initGame(state.fen).turn() === 'w' ? 'Black' : 'White';
      return {
        ...state,
        status: { type: 'resign', message: `${winner} wins by resignation!`, winner },
        timerRunning: false,
      };
    }
    case 'OFFER_DRAW': {
      return {
        ...state,
        status: { type: 'draw', message: 'Game drawn by agreement', winner: null },
        timerRunning: false,
      };
    }
    default: return state;
  }
}

function computeCaptured(history) {
  const captured = { w: [], b: [] };
  history.forEach(m => {
    if (m.captured) {
      // Captured by white means black piece was taken, push to white's captures
      if (m.color === 'w') captured.w.push(m.captured);
      else captured.b.push(m.captured);
    }
  });
  return captured;
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [playerElo, setPlayerElo] = useState(readElo());
  const { updateEloInCloud } = useAuth();
  const [eloChange, setEloChange] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [aiStatus, setAiStatus] = useState('loading'); // 'loading', 'ready', 'fallback'
  const [opponentDisconnectedCountdown, setOpponentDisconnectedCountdown] = useState(30);

  const fenRef = useRef(state.fen);
  const gameModeRef = useRef(state.gameMode);
  const playerColorRef = useRef(state.playerColor);

  useEffect(() => {
    fenRef.current = state.fen;
    gameModeRef.current = state.gameMode;
    playerColorRef.current = state.playerColor;
  }, [state.fen, state.gameMode, state.playerColor]);

  useEffect(() => {
    let interval = null;
    if (state.opponentDisconnected) {
      setOpponentDisconnectedCountdown(30);
      interval = setInterval(() => {
        setOpponentDisconnectedCountdown(c => Math.max(0, c - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.opponentDisconnected]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      const saved = localStorage.getItem('active_online_game');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.roomCode) {
            console.log(`Socket connected, sending reconnect-game for room: ${parsed.roomCode}`);
            socket.emit('reconnect-game', {
              roomCode: parsed.roomCode,
              color: parsed.color,
              name: localStorage.getItem('chess_display_name') || 'Guest Player',
              rating: parseInt(localStorage.getItem('chess_elo')) || 1200
            });
          }
        } catch(e) {}
      }
    };

    const handleMoveMade = ({ from, to, promotion }) => {
      if (gameModeRef.current !== 'online') return;
      const chess = new Chess(fenRef.current);
      if (chess.turn() === playerColorRef.current) return;

      const moveResult = chess.move({ from, to, promotion });
      if (moveResult && applyMoveRef.current) {
        applyMoveRef.current(moveResult, chess);
      }
    };

    const handleOpponentDisconnected = ({ secondsToReconnect }) => {
      dispatch({ type: 'SET_OPPONENT_DISCONNECTED', payload: { disconnected: true, seconds: secondsToReconnect } });
    };

    const handleOpponentReconnected = () => {
      dispatch({ type: 'SET_OPPONENT_DISCONNECTED', payload: { disconnected: false, seconds: null } });
    };

    const handleGameOver = ({ result, reason, winnerColor }) => {
      const isWin = result === 'win' || (result === 'loss' && winnerColor === playerColorRef.current);
      const isDraw = result === 'draw';
      
      let msg = 'Game Over';
      if (reason === 'disconnect-timeout') {
        msg = 'Opponent disconnected (reconnection timeout)';
      } else if (reason === 'resignation') {
        msg = `${winnerColor === 'w' ? 'White' : 'Black'} won by resignation`;
      } else if (reason === 'agreement' || reason === 'draw-agreement') {
        msg = 'Draw by agreement';
      } else if (reason === 'checkmate') {
        msg = `${winnerColor === 'w' ? 'White' : 'Black'} won by checkmate`;
      } else if (reason === 'stalemate') {
        msg = 'Game drawn by stalemate';
      }

      dispatch({
        type: 'SET_GAME_OVER_STATUS',
        payload: {
          type: isDraw ? 'draw' : isWin ? 'win' : 'loss',
          message: msg,
          winner: winnerColor === 'w' ? 'White' : winnerColor === 'b' ? 'Black' : null
        }
      });
    };

    const handleGameRestored = (gameData) => {
      dispatch({
        type: 'RESTORE_ONLINE_GAME',
        payload: {
          roomCode: gameData.roomCode,
          color: gameData.color,
          opponentName: gameData.opponentName,
          opponentRating: gameData.opponentRating,
          fen: gameData.fen,
          history: gameData.history,
          timeControl: gameData.timeControl
        }
      });
    };

    const handleDrawOffered = () => {
      dispatch({ type: 'SET_DRAW_OFFERED', payload: true });
    };

    const handleDrawDeclined = () => {
      dispatch({ type: 'SET_DRAW_OFFERED', payload: false });
    };

    socket.on('connect', handleConnect);
    socket.on('move-made', handleMoveMade);
    socket.on('opponent-disconnected', handleOpponentDisconnected);
    socket.on('opponent-reconnected', handleOpponentReconnected);
    socket.on('game-over', handleGameOver);
    socket.on('game-restored', handleGameRestored);
    socket.on('draw-offered', handleDrawOffered);
    socket.on('draw-declined', handleDrawDeclined);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('move-made', handleMoveMade);
      socket.off('opponent-disconnected', handleOpponentDisconnected);
      socket.off('opponent-reconnected', handleOpponentReconnected);
      socket.off('game-over', handleGameOver);
      socket.off('game-restored', handleGameRestored);
      socket.off('draw-offered', handleDrawOffered);
      socket.off('draw-declined', handleDrawDeclined);
    };
  }, []);

  const aiTimerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const applyMoveRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    initStockfish().then((ok) => {
      if (!mounted) return;
      setAiStatus(ok ? 'ready' : 'fallback');
      stockfishEngine.isReady = ok;
      stockfishEngine.failed = !ok;
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chess_difficulty', state.aiDifficulty);
    localStorage.setItem('chess_theme', state.theme);
    localStorage.setItem('chess_sound', state.soundEnabled);
    localStorage.setItem('chess_animations', state.animationsEnabled);
    localStorage.setItem('chess_coords', state.showCoords);
    if (state.timeControl !== null) {
      localStorage.setItem('chess_time', JSON.stringify(state.timeControl));
    } else {
      localStorage.removeItem('chess_time');
    }
  }, [state.aiDifficulty, state.theme, state.soundEnabled, state.animationsEnabled, state.showCoords, state.timeControl]);

  // Sync active online game to localStorage for page-reload persistence
  useEffect(() => {
    if (state.gameMode === 'online' && state.roomCode && (state.status.type === 'playing' || state.status.type === 'check')) {
      localStorage.setItem('active_online_game', JSON.stringify({
        roomCode: state.roomCode,
        color: state.playerColor,
        opponentName: state.opponentName,
        opponentRating: state.opponentRating,
        timeControl: state.timeControl
      }));
    } else {
      localStorage.removeItem('active_online_game');
    }
  }, [state.gameMode, state.roomCode, state.playerColor, state.opponentName, state.opponentRating, state.timeControl, state.status.type]);

  // Update sound manager when settings change
  useEffect(() => {
    soundManager.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Game timer - tick active player's clock
  useEffect(() => {
    if (state.timerRunning && state.timeControl && (state.status.type === 'playing' || state.status.type === 'check')) {
      timerIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 100);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [state.timerRunning, state.timeControl, state.status.type, state.fen]);

  // Check for timeout
  useEffect(() => {
    if (state.timeControl && (state.whiteTime <= 0 || state.blackTime <= 0)) {
      dispatch({ type: 'TIMEOUT' });
    }
  }, [state.whiteTime, state.blackTime, state.timeControl]);

async function saveGameToCloud(state, finalStatus, history, fen) {
  if (!auth?.currentUser || !db) return;
  
  let result = '1/2-1/2';
  if (finalStatus.winner === 'White') {
    result = '1-0';
  } else if (finalStatus.winner === 'Black') {
    result = '0-1';
  }

  const whiteId = state.playerColor === 'w' ? auth.currentUser.uid : 'ai';
  const blackId = state.playerColor === 'b' ? auth.currentUser.uid : 'ai';
  const whiteName = state.playerColor === 'w' ? 'You' : (state.opponentName || 'AI');
  const blackName = state.playerColor === 'b' ? 'You' : (state.opponentName || 'AI');
  const timeControlStr = state.timeControl ? `${state.timeControl.base}+${state.timeControl.increment}` : '10+0';

  try {
    await addDoc(collection(db, 'games'), {
      userId: auth.currentUser.uid,
      opponent: state.opponentName || (state.gameMode === 'vsAI' ? `AI Level ${state.aiDifficulty}` : 'Local'),
      result,
      movesCount: history.length,
      fen,
      white_id: whiteId,
      black_id: blackId,
      white: { username: whiteName },
      black: { username: blackName },
      time_control: timeControlStr,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch(e) {
    console.error("Failed to save game to cloud:", e);
  }
}

  const applyMove = useCallback((moveObj, chessInstance) => {
    const chess = chessInstance;
    const status = getGameStatus(chess);
    const capturedPieces = computeCaptured(chess.history({ verbose: true }));

    let checkSquare = null;
    if (status.type === 'check' || status.type === 'checkmate') {
      const board = chess.board();
      board.forEach(row => row.forEach(cell => {
        if (cell && cell.type === 'k' && cell.color === chess.turn()) {
          checkSquare = cell.square;
        }
      }));
    }

    // Play sounds
    if (moveObj.captured) soundManager.playCapture();
    else soundManager.playMove();
    if (status.type === 'check') soundManager.playCheck();
    if (status.type === 'checkmate') soundManager.playWin();
    if (status.type === 'draw' || status.type === 'stalemate') soundManager.playDraw();

    dispatch({ type: 'APPLY_MOVE', move: moveObj, chess, capturedPieces, status, checkSquare });

    // If game is over
    if (status.type !== 'playing' && status.type !== 'check') {
      saveGameToCloud(state, status, chess.history(), chess.fen());
      
      let localResult = 'draw';
      if (status.winner) {
        localResult = status.winner === (state.playerColor === 'w' ? 'White' : 'Black') ? 'win' : 'loss';
      }

      if (state.gameMode === 'vsAI') {
        updateStats(localResult);
        const newElo = updateEloForResult(localResult, state.aiDifficulty);
        const change = newElo - playerElo;
        setEloChange(change);
        setPlayerElo(newElo);
        writeElo(newElo);

        // Sync ELO update to cloud
        updateEloInCloud(newElo);
      } else {
        const s = readStats();
        s.gamesPlayed = (s.gamesPlayed || 0) + 1;
        writeStats(s);
      }

      saveGame({
        result: localResult,
        opponent: state.gameMode === 'vsAI' ? `AI Lvl ${state.aiDifficulty}` : 'Local',
        difficulty: state.aiDifficulty,
        moveCount: state.moveCount + 1,
        duration: state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : 0,
        playerColor: state.playerColor
      });

      appendGameHistory({
        result: localResult,
        opponent: state.gameMode === 'vsAI' ? `AI Lvl ${state.aiDifficulty}` : 'Local',
        moveCount: state.moveCount + 1,
        ratingAfter: readElo(),
        moves: chess.history().slice(0, 4),
      });

      let lostQueen = false;
      if (state.playerColor === 'w') lostQueen = capturedPieces.b.some(p => p.type === 'q');
      else lostQueen = capturedPieces.w.some(p => p.type === 'q');

      const newUnlocks = checkAndUnlockAchievements('game_end', {
        result: localResult,
        difficulty: state.aiDifficulty,
        moveCount: state.moveCount + 1,
        lostQueen,
        hadPromotion: chess.history({ verbose: true }).some((m) => m.promotion),
        whiteTimeLeft: state.whiteTime,
        blackTimeLeft: state.blackTime,
      });
      if (newUnlocks.length > 0) {
        setUnlockedAchievements(newUnlocks);
      }
    }

    return status;
  }, [state]);

  // Keep a stable ref to applyMove for the worker callback
  useEffect(() => {
    applyMoveRef.current = applyMove;
  }, [applyMove]);

  const requestAIMoveStockfish = useCallback(async (fen, difficulty, botId) => {
    try {
      const activeChess = initGame(fen);
      if (activeChess.isGameOver()) return;
      if (activeChess.turn() === state.playerColor) return;

      dispatch({ type: 'SET_AI_THINKING', payload: true });

      let bestMoveObj = null;

      if (botId) {
        if (botId === 'rookie') {
          // Rookie plays random legal moves
          await new Promise(r => setTimeout(r, 600)); // simulate thinking
          const uci = getRandomLegalMove(activeChess);
          if (uci) {
            bestMoveObj = {
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
              promotion: uci[4] || undefined,
            };
          }
        } else if (aiStatus === 'ready') {
          const uciMove = await stockfishGetBestMove(fen, botId);
          if (uciMove && uciMove !== '(none)') {
            bestMoveObj = {
              from: uciMove.substring(0, 2),
              to: uciMove.substring(2, 4),
              promotion: uciMove.length > 4 ? uciMove[4] : undefined,
            };
          }
        }
      } else {
        const numDifficulty = Number(difficulty);
        if (numDifficulty === 1) {
          const uci = getRandomLegalMove(activeChess);
          if (uci) {
            bestMoveObj = {
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
              promotion: uci[4] || undefined,
            };
          }
        } else if (aiStatus === 'ready') {
          const uciMove = await stockfishGetBestMove(fen, numDifficulty);
          if (uciMove && uciMove !== '(none)') {
            bestMoveObj = {
              from: uciMove.substring(0, 2),
              to: uciMove.substring(2, 4),
              promotion: uciMove.length > 4 ? uciMove[4] : undefined,
            };
          }
        }
      }

      if (!bestMoveObj) {
        try {
          const aiChess = initGame(fen);
          bestMoveObj = getFallbackBestMove(aiChess, Number(difficulty) || 3);
        } catch (fallbackErr) {
          console.warn('chessEngine fallback failed:', fallbackErr);
        }
      }

      if (!bestMoveObj) {
        const aiChess = initGame(fen);
        const uci = getRandomLegalMove(aiChess);
        if (uci) {
          bestMoveObj = {
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4] || undefined,
          };
        }
      }

      if (bestMoveObj && applyMoveRef.current) {
        const aiChess = initGame(fen);
        const aiResult = aiChess.move(bestMoveObj);
        if (aiResult) applyMoveRef.current(aiResult, aiChess);
      }
    } catch (error) {
      console.error('AI move generation crash caught safely:', error);
    } finally {
      dispatch({ type: 'SET_AI_THINKING', payload: false });
    }
  }, [aiStatus, state.playerColor]);

  useEffect(() => {
    try {
      if (state.gameMode !== 'vsAI' || state.isAIThinking) return;
      if (state.status.type !== 'playing' && state.status.type !== 'check') return;

      const chess = initGame(state.fen);
      if (chess.isGameOver()) return;
      if (chess.turn() === state.playerColor) return;

      const timer = setTimeout(() => {
        requestAIMoveStockfish(state.fen, state.aiDifficulty, state.aiBotId);
      }, 300);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error('AI trigger error in useEffect:', err);
    }
  }, [
    state.gameMode,
    state.isAIThinking,
    state.status.type,
    state.fen,
    state.playerColor,
    state.aiDifficulty,
    state.aiBotId,
    requestAIMoveStockfish,
  ]);

  const handleSquareClick = useCallback((square) => {
    if (state.reviewFen) return;
    if (state.status.type !== 'playing' && state.status.type !== 'check') return;
    if (state.isAIThinking) return;

    const chess = initGame(state.fen);
    const currentTurn = chess.turn();

    // In vsAI or online mode, only allow player's turn
    if ((state.gameMode === 'vsAI' || state.gameMode === 'online') && currentTurn !== state.playerColor) return;

    const piece = chess.get(square);

    // If clicking on own piece — select it
    if (piece && piece.color === currentTurn) {
      if (state.selectedSquare === square) {
        dispatch({ type: 'CLEAR_SELECTION' });
        return;
      }
      soundManager.playSelect();
      const moves = chess.moves({ square, verbose: true });
      dispatch({ type: 'SET_SELECTED', square, moves: moves.map(m => m.to) });
      return;
    }

    // If a piece is selected, try to move
    if (state.selectedSquare) {
      const moves = chess.moves({ square: state.selectedSquare, verbose: true });
      const targetMove = moves.find(m => m.to === square);

      if (targetMove) {
        // Check for pawn promotion
        if (targetMove.flags.includes('p')) {
          dispatch({ type: 'SET_PROMOTION_PENDING', payload: { from: state.selectedSquare, to: square } });
          return;
        }

        const moveResult = chess.move({ from: state.selectedSquare, to: square });
        if (moveResult) {
          applyMove(moveResult, chess);

          if (state.gameMode === 'online') {
            const socket = getSocket();
            if (socket) {
              socket.emit('make-move', {
                roomCode: state.roomCode,
                from: state.selectedSquare,
                to: square,
                promotion: targetMove.promotion,
                fen: chess.fen(),
                san: moveResult.san
              });
            }
          }
        }
        return;
      } else {
        // Illegal move attempt
        dispatch({ type: 'SET_ERROR_SQUARE', payload: square });
        setTimeout(() => dispatch({ type: 'CLEAR_ERROR_SQUARE' }), 400);
      }
    }

    dispatch({ type: 'CLEAR_SELECTION' });
  }, [state, applyMove]);

  const handlePromotion = useCallback((piece) => {
    if (!state.promotionPending) return;
    const chess = initGame(state.fen);
    const moveResult = chess.move({
      from: state.promotionPending.from,
      to: state.promotionPending.to,
      promotion: piece,
    });
    if (moveResult) {
      applyMove(moveResult, chess);

      if (state.gameMode === 'online') {
        const socket = getSocket();
        if (socket) {
          socket.emit('make-move', {
            roomCode: state.roomCode,
            from: state.promotionPending.from,
            to: state.promotionPending.to,
            promotion: piece,
            fen: chess.fen(),
            san: moveResult.san
          });
        }
      }
    }
  }, [state, applyMove]);

  const startNewGame = useCallback((config = {}) => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    // Force stockfish to stop thinking if it is
    if (stockfishEngine.isThinking) {
      stockfishEngine.worker?.postMessage('stop');
      stockfishEngine.isThinking = false;
    }
    
    if (config.botId) {
      localStorage.setItem('chess_bot_id', config.botId);
    }
    dispatch({ type: 'NEW_GAME', ...config });
  }, []);

  const resign = useCallback(() => {
    soundManager.playDraw();
    dispatch({ type: 'RESIGN' });
    
    if (state.gameMode === 'online') {
      const socket = getSocket();
      if (socket) socket.emit('resign', { roomCode: state.roomCode });
      return;
    }

    if (state.gameMode === 'vsAI') {
      updateStats('loss');
      const newElo = updateEloForResult('loss', state.aiDifficulty);
      const change = newElo - playerElo;
      setEloChange(change);
      setPlayerElo(newElo);
      writeElo(newElo);
    }

    saveGame({
      result: 'loss',
      opponent: state.gameMode === 'vsAI' ? `AI Lvl ${state.aiDifficulty}` : 'Local',
      difficulty: state.aiDifficulty,
      moveCount: state.moveCount,
      duration: state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : 0,
      playerColor: state.playerColor
    });
    appendGameHistory({
      result: 'loss',
      opponent: state.gameMode === 'vsAI' ? `AI Lvl ${state.aiDifficulty}` : 'Local',
      moveCount: state.moveCount,
    });
  }, [state.gameMode, state.roomCode, state.aiDifficulty, playerElo, state.moveCount, state.gameStartTime, state.playerColor]);

  const offerDraw = useCallback(() => {
    soundManager.playDraw();
    dispatch({ type: 'OFFER_DRAW' });

    if (state.gameMode === 'online') {
      const socket = getSocket();
      if (socket) socket.emit('offer-draw', { roomCode: state.roomCode });
    }
  }, [state.gameMode, state.roomCode]);

  const acceptDraw = useCallback(() => {
    if (state.gameMode === 'online') {
      const socket = getSocket();
      if (socket) socket.emit('accept-draw', { roomCode: state.roomCode });
    }
    dispatch({ type: 'SET_DRAW_OFFERED', payload: false });
  }, [state.gameMode, state.roomCode]);

  const declineDraw = useCallback(() => {
    if (state.gameMode === 'online') {
      const socket = getSocket();
      if (socket) socket.emit('decline-draw', { roomCode: state.roomCode });
    }
    dispatch({ type: 'SET_DRAW_OFFERED', payload: false });
  }, [state.gameMode, state.roomCode]);

  const undoMove = useCallback(() => {
    if (state.history.length === 0) return;
    let historySlice = [...state.history];
    if (state.gameMode === 'vsAI') {
      if (historySlice.length < 2) return;
      historySlice = historySlice.slice(0, -2);
    } else {
      historySlice = historySlice.slice(0, -1);
    }
    const chess = initGame();
    for (const m of historySlice) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    const status = getGameStatus(chess);
    const capturedPieces = computeCaptured(chess.history({ verbose: true }));
    let checkSquare = null;
    if (status.type === 'check' || status.type === 'checkmate') {
      const board = chess.board();
      board.forEach(row => row.forEach(cell => {
        if (cell && cell.type === 'k' && cell.color === chess.turn()) {
          checkSquare = cell.square;
        }
      }));
    }
    const last = historySlice.length ? historySlice[historySlice.length - 1] : null;
    const lastMove = last ? { from: last.from, to: last.to } : null;
    dispatch({
      type: 'UNDO_TO',
      payload: { fen: chess.fen(), history: historySlice, capturedPieces, status, checkSquare, lastMove },
    });
    if (stockfishEngine.isThinking) {
      stockfishEngine.worker?.postMessage('stop');
      stockfishEngine.isThinking = false;
    }
  }, [state.history, state.gameMode]);

  const [userPlan, setUserPlan] = useState(() => localStorage.getItem('plan') || 'free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  const isPremium = userPlan === 'premium';

  const upgradeToPremium = useCallback(() => {
    setUserPlan('premium');
    localStorage.setItem('plan', 'premium');
    setShowUpgradeModal(false);
  }, []);

  const getUsage = useCallback((type) => {
    const usageKey = `usage_${new Date().toDateString()}`;
    const usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
    return usage[type] || 0;
  }, []);

  const incrementUsage = useCallback((type) => {
    const usageKey = `usage_${new Date().toDateString()}`;
    const usage = JSON.parse(localStorage.getItem(usageKey) || '{}');
    usage[type] = (usage[type] || 0) + 1;
    localStorage.setItem(usageKey, JSON.stringify(usage));
  }, []);

  const checkFeatureLimit = useCallback((type, message) => {
    if (isPremium) return true;

    const limit = type === 'analysis' ? 3 : type === 'puzzle' ? 10 : 0;
    const current = getUsage(type);
    if (current >= limit) {
      setUpgradeReason(message);
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }, [isPremium, getUsage]);

  const boardThemes = BOARD_THEMES;
  const currentTheme = BOARD_THEMES[state.theme] || BOARD_THEMES.classic;

  const setHintSquares = useCallback((payload) => {
    dispatch({ type: 'SET_HINT_SQUARES', payload });
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      handleSquareClick,
      handlePromotion,
      startNewGame,
      resign,
      offerDraw,
      acceptDraw,
      declineDraw,
      undoMove,
      setHintSquares,
      boardThemes,
      currentTheme,
      playerElo,
      eloChange,
      aiStatus,
      isSimpleMode: aiStatus === 'fallback',
      opponentDisconnectedCountdown,
      userPlan,
      isPremium,
      upgradeToPremium,
      checkFeatureLimit,
      incrementUsage,
      getUsage,
      setShowUpgradeModal,
      setUpgradeReason,
    }}>
      {children}
      <AchievementToast unlockedIds={unlockedAchievements} />
      <UpgradeModal
        show={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={upgradeToPremium}
        reason={upgradeReason}
      />
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
