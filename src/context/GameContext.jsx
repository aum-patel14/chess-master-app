import { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { getGameStatus, getBestMove as getFallbackBestMove } from '../engine/chessEngine';
import { stockfishEngine } from '../engine/StockfishService';
import { soundManager } from '../engine/soundManager';
import { auth, db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { calculateElo, getAIElo } from '../utils/eloSystem';
import { saveGame, getHistory } from '../utils/gameHistory';
import { checkAchievements } from '../utils/achievements';
import AchievementToast from '../components/AchievementToast';

const GameContext = createContext(null);

const BOARD_THEMES = {
  classic:  { light: '#f0d9b5', dark: '#b58863', name: 'Classic', accent: '#c4a028' },
  walnut:   { light: '#ecdab9', dark: '#8b5e3c', name: 'Walnut',  accent: '#c47a28' },
  neon:     { light: '#1a1a4e', dark: '#0d0d2b', name: 'Neon',    accent: '#4488ff' },
  marble:   { light: '#e8e8e8', dark: '#3a3a3a', name: 'Marble',  accent: '#888888' },
  emerald:  { light: '#d4e8d4', dark: '#2d6a4f', name: 'Emerald', accent: '#2d9e6a' },
  midnight: { light: '#2a2a4a', dark: '#12121f', name: 'Midnight', accent: '#8866ff' },
};

const initialDifficulty = parseInt(localStorage.getItem('chess_difficulty')) || 3;
const initialTheme = localStorage.getItem('chess_theme') || 'classic';
const initialSound = localStorage.getItem('chess_sound') !== 'false';
const initialAnimations = localStorage.getItem('chess_animations') !== 'false';
const initialCoords = localStorage.getItem('chess_coords') !== 'false';
const initialTime = localStorage.getItem('chess_time') ? parseInt(localStorage.getItem('chess_time')) : null;

const initialState = {
  fen: new Chess().fen(),
  history: [],
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  status: { type: 'playing', message: '', winner: null },
  gameMode: 'menu',          // 'menu' | 'vsAI' | 'local' | 'puzzle'
  playerColor: 'w',          // player is white by default
  aiDifficulty: initialDifficulty,
  isAIThinking: false,
  capturedPieces: { w: [], b: [] },
  theme: initialTheme,
  showCoords: initialCoords,
  soundEnabled: initialSound,
  animationsEnabled: initialAnimations,
  timeControl: initialTime,          // null = unlimited
  whiteTime: initialTime ? initialTime * 60 : 600,
  blackTime: initialTime ? initialTime * 60 : 600,
  timerRunning: false,
  promotionPending: null,     // { from, to } when pawn reaches last rank
  checkSquare: null,
  highlightedSquares: [],
  moveCount: 0,
  gameStartTime: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE': return { ...state, gameMode: action.payload };
    case 'SET_THEME': return { ...state, theme: action.payload };
    case 'SET_DIFFICULTY': return { ...state, aiDifficulty: action.payload };
    case 'SET_PLAYER_COLOR': return { ...state, playerColor: action.payload };
    case 'TOGGLE_SOUND': return { ...state, soundEnabled: !state.soundEnabled };
    case 'TOGGLE_ANIMATIONS': return { ...state, animationsEnabled: !state.animationsEnabled };
    case 'TOGGLE_COORDS': return { ...state, showCoords: !state.showCoords };
    case 'SET_SELECTED': return { ...state, selectedSquare: action.square, validMoves: action.moves };
    case 'CLEAR_SELECTION': return { ...state, selectedSquare: null, validMoves: [] };
    case 'SET_AI_THINKING': return { ...state, isAIThinking: action.payload };
    case 'SET_PROMOTION_PENDING': return { ...state, promotionPending: action.payload };
    case 'SET_TIME_CONTROL': return {
      ...state,
      timeControl: action.payload,
      whiteTime: action.payload ? action.payload * 60 : 600,
      blackTime: action.payload ? action.payload * 60 : 600,
    };
    case 'TICK_TIMER': {
      if (!state.timerRunning || !state.timeControl) return state;
      const chess = new Chess(state.fen);
      const turn = chess.turn();
      if (turn === 'w') return { ...state, whiteTime: Math.max(0, state.whiteTime - 1) };
      return { ...state, blackTime: Math.max(0, state.blackTime - 1) };
    }
    case 'TIMEOUT': {
      if (state.status.type === 'timeout') return state;
      const winner = state.whiteTime === 0 ? 'Black' : 'White';
      return {
        ...state,
        status: { type: 'timeout', message: `Time's up! ${winner} wins!`, winner },
        timerRunning: false,
      };
    }
    case 'APPLY_MOVE': {
      const { move, chess, capturedPieces, status, checkSquare } = action;
      return {
        ...state,
        fen: chess.fen(),
        history: [...state.history, move],
        selectedSquare: null,
        validMoves: [],
        lastMove: { from: move.from, to: move.to },
        status,
        capturedPieces,
        checkSquare,
        isAIThinking: false,
        promotionPending: null,
        timerRunning: status.type === 'playing' || status.type === 'check',
        moveCount: state.moveCount + 1,
        gameStartTime: state.gameStartTime || Date.now(),
      };
    }
    case 'NEW_GAME': {
      return {
        ...initialState,
        gameMode: action.mode || 'vsAI',
        playerColor: action.playerColor || 'w',
        aiDifficulty: action.difficulty || state.aiDifficulty,
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        animationsEnabled: state.animationsEnabled,
        showCoords: state.showCoords,
        timeControl: state.timeControl,
        whiteTime: state.timeControl ? state.timeControl * 60 : 600,
        blackTime: state.timeControl ? state.timeControl * 60 : 600,
        gameStartTime: Date.now(),
        fen: action.fen || new Chess().fen(),
      };
    }
    case 'RESIGN': {
      const winner = new Chess(state.fen).turn() === 'w' ? 'Black' : 'White';
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
  const [playerElo, setPlayerElo] = useState(
    parseInt(localStorage.getItem('playerElo')) || 1200
  );
  const [eloChange, setEloChange] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [aiStatus, setAiStatus] = useState('loading'); // 'loading', 'ready', 'fallback'

  const aiTimerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const applyMoveRef = useRef(null);

  // Poll Stockfish status
  useEffect(() => {
    const interval = setInterval(() => {
      if (stockfishEngine.isReady) {
        setAiStatus('ready');
        clearInterval(interval);
      } else if (stockfishEngine.failed) {
        setAiStatus('fallback');
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Sync settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chess_difficulty', state.aiDifficulty);
    localStorage.setItem('chess_theme', state.theme);
    localStorage.setItem('chess_sound', state.soundEnabled);
    localStorage.setItem('chess_animations', state.animationsEnabled);
    localStorage.setItem('chess_coords', state.showCoords);
    if (state.timeControl !== null) {
      localStorage.setItem('chess_time', state.timeControl);
    } else {
      localStorage.removeItem('chess_time');
    }
  }, [state.aiDifficulty, state.theme, state.soundEnabled, state.animationsEnabled, state.showCoords, state.timeControl]);

  // Update sound manager when settings change
  useEffect(() => {
    soundManager.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Game timer - explicitly paused if AI is thinking
  useEffect(() => {
    if (state.timerRunning && state.timeControl && !state.isAIThinking && (state.status.type === 'playing' || state.status.type === 'check')) {
      timerIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [state.timerRunning, state.timeControl, state.isAIThinking, state.status.type, state.fen]);

  // Check for timeout
  useEffect(() => {
    if (state.timeControl && (state.whiteTime === 0 || state.blackTime === 0)) {
      dispatch({ type: 'TIMEOUT' });
    }
  }, [state.whiteTime, state.blackTime, state.timeControl]);

async function saveGameToCloud(state, finalStatus, history, fen) {
  if (!auth?.currentUser || !db) return;
  
  let result = 'draw';
  if (finalStatus.winner) {
    if (state.gameMode === 'vsAI') {
      result = finalStatus.winner === (state.playerColor === 'w' ? 'White' : 'Black') ? 'win' : 'loss';
    } else {
      result = finalStatus.winner === 'White' ? 'win_white' : 'win_black';
    }
  }

  try {
    await addDoc(collection(db, 'games'), {
      userId: auth.currentUser.uid,
      opponent: state.gameMode === 'vsAI' ? `AI Level ${state.aiDifficulty}` : 'Local',
      result,
      movesCount: history.length,
      fen,
      timestamp: new Date().toISOString()
    });

    // Update Elo rating if playing against AI
    if (state.gameMode === 'vsAI') {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      if (result === 'win') await updateDoc(userRef, { rating: increment(15) });
      else if (result === 'loss') await updateDoc(userRef, { rating: increment(-10) });
    }
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
      
      // Update local ELO if playing AI
      if (state.gameMode === 'vsAI') {
        let result = 'draw';
        if (status.winner) {
          result = status.winner === (state.playerColor === 'w' ? 'White' : 'Black') ? 'win' : 'loss';
        }
        
        const newElo = calculateElo(playerElo, getAIElo(state.aiDifficulty), result);
        const change = newElo - playerElo;
        setEloChange(change);
        setPlayerElo(newElo);
        localStorage.setItem('playerElo', newElo);
      }

      // Save local history
      let localResult = 'draw';
      if (status.winner) localResult = status.winner === (state.playerColor === 'w' ? 'White' : 'Black') ? 'win' : 'loss';
      
      saveGame({
        result: localResult,
        opponent: state.gameMode === 'vsAI' ? `AI Lvl ${state.aiDifficulty}` : 'Local',
        difficulty: state.aiDifficulty,
        moveCount: state.moveCount,
        duration: state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : 0,
        playerColor: state.playerColor
      });

      // Check achievements
      let lostQueen = false;
      if (state.playerColor === 'w') lostQueen = capturedPieces.b.some(p => p.type === 'q');
      else lostQueen = capturedPieces.w.some(p => p.type === 'q');
      
      const newUnlocks = checkAchievements({
        result: localResult,
        totalGames: getHistory().length,
        difficulty: state.aiDifficulty,
        moveCount: state.moveCount,
        lostQueen
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

  const requestAIMoveStockfish = useCallback(async (fen, difficulty) => {
    dispatch({ type: 'SET_AI_THINKING', payload: true });
    
    let bestMoveObj = null;
    if (aiStatus === 'ready') {
      const uciMove = await stockfishEngine.getBestMove(fen, difficulty);
      if (uciMove && uciMove !== '(none)') {
        bestMoveObj = {
          from: uciMove.substring(0, 2),
          to: uciMove.substring(2, 4),
          promotion: uciMove.length > 4 ? uciMove[4] : undefined
        };
      }
    }
    
    // Fallback if Stockfish failed
    if (!bestMoveObj) {
      const aiChess = new Chess(fen);
      bestMoveObj = getFallbackBestMove(aiChess, difficulty);
    }
    
    if (bestMoveObj && applyMoveRef.current) {
      const aiChess = new Chess(fen);
      const aiResult = aiChess.move(bestMoveObj);
      if (aiResult) applyMoveRef.current(aiResult, aiChess);
    }
    dispatch({ type: 'SET_AI_THINKING', payload: false });
  }, [aiStatus]);

  // Auto-trigger AI if it's the AI's turn
  useEffect(() => {
    if (state.gameMode === 'vsAI' && !state.isAIThinking && (state.status.type === 'playing' || state.status.type === 'check')) {
      const chess = new Chess(state.fen);
      if (chess.turn() !== state.playerColor) {
        requestAIMoveStockfish(state.fen, state.aiDifficulty);
      }
    }
  }, [state.gameMode, state.isAIThinking, state.status.type, state.fen, state.playerColor, state.aiDifficulty, requestAIMoveStockfish]);

  const handleSquareClick = useCallback((square) => {
    if (state.status.type !== 'playing' && state.status.type !== 'check') return;
    if (state.isAIThinking) return;

    const chess = new Chess(state.fen);
    const currentTurn = chess.turn();

    // In vsAI mode, only allow player's turn
    if (state.gameMode === 'vsAI' && currentTurn !== state.playerColor) return;

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
        }
        return;
      }
    }

    dispatch({ type: 'CLEAR_SELECTION' });
  }, [state, applyMove]);

  const handlePromotion = useCallback((piece) => {
    if (!state.promotionPending) return;
    const chess = new Chess(state.fen);
    const moveResult = chess.move({
      from: state.promotionPending.from,
      to: state.promotionPending.to,
      promotion: piece,
    });
    if (moveResult) {
      applyMove(moveResult, chess);
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
    
    dispatch({ type: 'NEW_GAME', ...config });
  }, []);

  const resign = useCallback(() => {
    soundManager.playDraw();
    dispatch({ type: 'RESIGN' });
    
    if (state.gameMode === 'vsAI') {
      const newElo = calculateElo(playerElo, getAIElo(state.aiDifficulty), 'loss');
      const change = newElo - playerElo;
      setEloChange(change);
      setPlayerElo(newElo);
      localStorage.setItem('playerElo', newElo);
    }

    // Save local history
    saveGame({
      result: 'loss',
      opponent: state.gameMode === 'vsAI' ? `AI Lvl ${state.aiDifficulty}` : 'Local',
      difficulty: state.aiDifficulty,
      moveCount: state.moveCount,
      duration: state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : 0,
      playerColor: state.playerColor
    });
  }, [state.gameMode, state.aiDifficulty, playerElo, state.moveCount, state.gameStartTime, state.playerColor]);

  const offerDraw = useCallback(() => {
    soundManager.playDraw();
    dispatch({ type: 'OFFER_DRAW' });
  }, []);

  const undoMove = useCallback(() => {
    if (state.history.length === 0) return;
    const chess = new Chess();
    const historySlice = state.history.slice(0, -1);
    if (state.gameMode === 'vsAI') {
      historySlice.splice(-1); // undo AI move too
    }
    historySlice.forEach(m => chess.move(m));
    const status = getGameStatus(chess);
    const capturedPieces = computeCaptured(chess.history({ verbose: true }));
    dispatch({ type: 'APPLY_MOVE', move: chess.history({ verbose: true }).slice(-1)[0] || {}, chess, capturedPieces, status, checkSquare: null });
    // Actually just reset with replay
    const newChess = new Chess();
    historySlice.forEach(m => newChess.move(m));
    dispatch({
      type: 'APPLY_MOVE',
      move: newChess.history({ verbose: true }).slice(-1)[0] || { from: null, to: null },
      chess: newChess,
      capturedPieces: computeCaptured(newChess.history({ verbose: true })),
      status: getGameStatus(newChess),
      checkSquare: null,
    });
  }, [state.history, state.gameMode]);

  const boardThemes = BOARD_THEMES;
  const currentTheme = BOARD_THEMES[state.theme] || BOARD_THEMES.classic;

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      handleSquareClick,
      handlePromotion,
      startNewGame,
      resign,
      offerDraw,
      undoMove,
      boardThemes,
      currentTheme,
      playerElo,
      eloChange,
      aiStatus,
    }}>
      {children}
      <AchievementToast unlockedIds={unlockedAchievements} />
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
