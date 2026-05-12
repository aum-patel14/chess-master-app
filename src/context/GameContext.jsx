import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getGameStatus, getBestMove as getFallbackBestMove } from '../engine/chessEngine';
import { soundManager } from '../engine/soundManager';
import { auth, db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

const GameContext = createContext(null);

const BOARD_THEMES = {
  classic:  { light: '#f0d9b5', dark: '#b58863', name: 'Classic', accent: '#c4a028' },
  walnut:   { light: '#ecdab9', dark: '#8b5e3c', name: 'Walnut',  accent: '#c47a28' },
  neon:     { light: '#1a1a4e', dark: '#0d0d2b', name: 'Neon',    accent: '#4488ff' },
  marble:   { light: '#e8e8e8', dark: '#3a3a3a', name: 'Marble',  accent: '#888888' },
  emerald:  { light: '#d4e8d4', dark: '#2d6a4f', name: 'Emerald', accent: '#2d9e6a' },
  midnight: { light: '#2a2a4a', dark: '#12121f', name: 'Midnight', accent: '#8866ff' },
};

const initialState = {
  fen: new Chess().fen(),
  history: [],
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  status: { type: 'playing', message: '', winner: null },
  gameMode: 'menu',          // 'menu' | 'vsAI' | 'local' | 'puzzle'
  playerColor: 'w',          // player is white by default
  aiDifficulty: 3,
  isAIThinking: false,
  capturedPieces: { w: [], b: [] },
  theme: 'classic',
  showCoords: true,
  soundEnabled: true,
  animationsEnabled: true,
  timeControl: null,          // null = unlimited
  whiteTime: 600,
  blackTime: 600,
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
  const aiTimerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const aiWorkerRef = useRef(null);
  const applyMoveRef = useRef(null);

  // Update sound manager when settings change
  useEffect(() => {
    soundManager.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Game timer
  useEffect(() => {
    if (state.timerRunning && state.timeControl) {
      timerIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [state.timerRunning, state.timeControl, state.fen]);

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

    // If game is over, save to cloud
    if (status.type !== 'playing' && status.type !== 'check') {
      saveGameToCloud(state, status, chess.history(), chess.fen());
    }

    return status;
  }, [state]);

  // Keep a stable ref to applyMove for the worker callback
  useEffect(() => {
    applyMoveRef.current = applyMove;
  }, [applyMove]);

  // Initialize AI Web Worker
  useEffect(() => {
    aiWorkerRef.current = new Worker(new URL('../engine/aiWorker.js', import.meta.url), { type: 'module' });
    
    aiWorkerRef.current.onmessage = (e) => {
      const { success, bestMove, fen, error } = e.data;
      
      if (success && bestMove && applyMoveRef.current) {
        const chess = new Chess(fen);
        const moveResult = chess.move(bestMove);
        if (moveResult) {
          applyMoveRef.current(moveResult, chess);
        } else {
          dispatch({ type: 'SET_AI_THINKING', payload: false });
        }
      } else {
        console.error('AI Worker error:', error);
        dispatch({ type: 'SET_AI_THINKING', payload: false });
      }
    };

    return () => {
      if (aiWorkerRef.current) aiWorkerRef.current.terminate();
    };
  }, []);

  const requestAIMoveStockfish = useCallback((fen, difficulty) => {
    dispatch({ type: 'SET_AI_THINKING', payload: true });
    
    if (aiWorkerRef.current) {
      aiWorkerRef.current.postMessage({ fen, difficulty });
    } else {
      // Fallback if worker isn't ready
      setTimeout(() => {
        const aiChess = new Chess(fen);
        const bestMoveObj = getFallbackBestMove(aiChess, difficulty);
        if (bestMoveObj && applyMoveRef.current) {
          const aiResult = aiChess.move(bestMoveObj);
          if (aiResult) applyMoveRef.current(aiResult, aiChess);
        }
        dispatch({ type: 'SET_AI_THINKING', payload: false });
      }, 50);
    }
  }, []);

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
    dispatch({ type: 'NEW_GAME', ...config });
  }, []);

  const resign = useCallback(() => {
    soundManager.playDraw();
    dispatch({ type: 'RESIGN' });
  }, []);

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
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
