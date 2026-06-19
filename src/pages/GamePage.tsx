import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const ENUM_TO_SECONDS: Record<string, number> = {
  'bullet_1_0': 60,
  'bullet_1_1': 60,
  'bullet_2_1': 120,
  'blitz_3_0': 180,
  'blitz_3_2': 180,
  'blitz_5_0': 300,
  'blitz_5_3': 300,
  'rapid_10_0': 600,
  'rapid_10_5': 600,
  'rapid_15_10': 900,
  'classical_30_0': 1800
};

const reconstructMovesFromFens = (fens: string[]) => {
  if (!fens || fens.length <= 1) return [];
  const chess = new Chess();
  const moves = [];
  for (let i = 1; i < fens.length; i++) {
    const targetFen = fens[i];
    const legalMoves = chess.moves({ verbose: true });
    let matchedMove = null;
    for (const m of legalMoves) {
      const testChess = new Chess(chess.fen());
      const testMove = testChess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      if (testMove && testChess.fen() === targetFen) {
        matchedMove = {
          from: m.from,
          to: m.to,
          promotion: m.promotion,
          san: testMove.san
        };
        break;
      }
    }
    if (matchedMove) {
      chess.move({ from: matchedMove.from, to: matchedMove.to, promotion: matchedMove.promotion });
      moves.push(matchedMove);
    } else {
      break;
    }
  }
  return moves;
};
import { useToast } from '../hooks/useToast';
import PageShell from '../components/PageShell';
import ChessBoard from '../components/ChessBoard';
import GameOverDialog from '../components/game/GameOverDialog';
import MultiplayerLobby from '../components/game/MultiplayerLobby';
import { readElo, readStats, writeStats } from '../utils/chessStats';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Flag, RefreshCw, Undo2, HelpCircle, Download, Share2, Loader2 } from 'lucide-react';
import { soundManager } from '../engine/soundManager';
import AnalysisPanel from '../components/game/AnalysisPanel';
import CapturedPieces from '../components/game/CapturedPieces';
import { downloadPgn, generatePgnString } from '../utils/pgnExporter';
import EvalBar from '../components/chesscom/EvalBar';
import EngineDifficultyBar from '../components/chesscom/EngineDifficultyBar';
import ThinkingIndicator from '../components/chesscom/ThinkingIndicator';
import { BOTS, BotConfig } from '../config/bots';
import { useCustomEngine } from '../hooks/useCustomEngine';
import { BotSelector } from '../components/BotSelector';


const TIME_OPTIONS = [
  { base: 1, increment: 0, label: '1 min (Bullet)' },
  { base: 3, increment: 0, label: '3 min (Blitz)' },
  { base: 5, increment: 0, label: '5 min (Blitz)' },
  { base: 10, increment: 0, label: '10 min (Rapid)' },
  { base: 0, increment: 0, label: 'Unlimited' },
];

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const normalizeColor = (color: any, fallback: 'w' | 'b' = 'w'): 'w' | 'b' => {
  if (color === 'white') return 'w';
  if (color === 'black') return 'b';
  return color === 'w' || color === 'b' ? color : fallback;
};

export default function GamePage() {
  const { state, dispatch, resign, undoMove, startNewGame, applyMove, isSimpleMode } = useGame();
  const { isThinking: isCustomEngineThinking, getBestMove } = useCustomEngine();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode?: string }>();
  const { currentUser } = useAuth();

  const userRating = readElo();
  const pgnLoadedRef = useRef(false);

  // Load online game if roomCode is in URL
  useEffect(() => {
    if (roomCode && currentUser?.uid && currentUser.uid !== 'guest' && state.roomCode !== roomCode) {
      const loadOnlineGame = async () => {
        try {
          const { data: game, error } = await supabase
            .from('online_games')
            .select('*')
            .eq('room_code', roomCode)
            .maybeSingle();

          if (error) {
            showToast('Error loading game: ' + error.message, 'error');
            return;
          }

          if (game) {
            if (game.status === 'completed' || game.status === 'abandoned') {
              showToast('This game has already ended.', 'info');
              navigate('/play/online');
              return;
            }

            const isWhite = game.white_id === currentUser.uid;
            const isBlack = game.black_id === currentUser.uid;

            if (isWhite || isBlack) {
              const opponentName = isWhite ? game.black_username : game.white_username;
              const opponentRating = isWhite ? game.black_elo : game.white_elo;
              const timeControlSecs = ENUM_TO_SECONDS[game.time_control] || 180;
              const reconstructedHistory = reconstructMovesFromFens(game.fen_history || []);

              // Set active game locally
              localStorage.setItem('active_online_game', JSON.stringify({
                roomCode: game.room_code,
                color: isWhite ? 'w' : 'b',
                opponentName,
                opponentRating,
                timeControl: timeControlSecs
              }));

              dispatch({
                type: 'RESTORE_ONLINE_GAME',
                payload: {
                  roomCode: game.room_code,
                  color: isWhite ? 'w' : 'b',
                  opponentName,
                  opponentRating,
                  fen: game.current_fen,
                  history: reconstructedHistory,
                  timeControl: timeControlSecs
                }
              });

              dispatch({
                type: 'SYNC_TIMES',
                payload: {
                  whiteTime: (game.white_time_ms || 180000) / 1000,
                  blackTime: (game.black_time_ms || 180000) / 1000
                }
              });

              setIsPlaying(true);
              setGameState('playing');
            } else {
              showToast('You are not a player in this game room.', 'warning');
              navigate('/play/online');
            }
          } else {
            showToast('Game room not found.', 'error');
            navigate('/play/online');
          }
        } catch (err: any) {
          console.error(err);
          showToast('Failed to load game room: ' + err.message, 'error');
        }
      };

      loadOnlineGame();
    }
  }, [roomCode, currentUser, state.roomCode]);

  // Load analysis game if PGN is in location.state
  useEffect(() => {
    if (location.state?.pgn && location.state?.mode === 'analysis' && !pgnLoadedRef.current) {
      pgnLoadedRef.current = true;
      try {
        const tempChess = new Chess();
        tempChess.loadPgn(location.state.pgn);
        const moves = tempChess.history({ verbose: true }).map((m: any) => ({
          from: m.from,
          to: m.to,
          promotion: m.promotion,
          san: m.san
        }));
        
        dispatch({
          type: 'LOAD_ANALYSIS_GAME',
          payload: {
            history: moves,
            color: normalizeColor(location.state.playerColor),
            opponentName: location.state.opponentName || 'Opponent',
            opponentRating: location.state.opponentRating || 1200
          }
        });
        
        setIsPlaying(true);
        setGameState('playing');
        setShowAnalysis(true);
      } catch (err: any) {
        console.error('Failed to load PGN for analysis:', err);
        showToast('Failed to load game history: ' + err.message, 'error');
      }
    }
  }, [location.state?.pgn, location.state?.mode, dispatch, showToast]);

  const chess = useMemo(() => {
    try {
      return new Chess(state.fen);
    } catch (e) {
      return new Chess();
    }
  }, [state.fen]);

  // Navigation states
  const {
    mode: paramMode = 'local',
    difficulty: paramDiff,
    timeControl: paramTimeControl,
    playerColor: paramColor = 'w',
    botId: paramBotId,
    resume = false
  } = location.state || {};

  const [gameState, setGameState] = useState<'selection' | 'timepicker' | 'playing'>('selection');
  const [activeTab, setActiveTab] = useState<'levels' | 'bots'>('levels');
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [selectedTc, setSelectedTc] = useState<{ base: number; increment: number } | null>({ base: 10, increment: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth > 900);
  const [hintLoading, setHintLoading] = useState(false);

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[] | null>(null);
  const [bestMoveArrow, setBestMoveArrow] = useState<{ from: string; to: string } | null>(null);
  const [retryBoardProps, setRetryBoardProps] = useState<any>(null);

  // Refs for move history auto-scroll
  const desktopMoveListRef = useRef<HTMLDivElement>(null);
  const mobileMoveListRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(Date.now());

  const handleAnalysisComplete = (results: any[]) => {
    setAnalysisResults(results);
    
    let wTotalScore = 0;
    let wMoves = 0;
    results.forEach(res => {
      const moveAccuracy = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-2.0 * Math.max(0, res.loss)))));
      if (res.color === 'w') {
        wTotalScore += moveAccuracy;
        wMoves++;
      }
    });
    const playerAcc = wMoves > 0 ? Math.round(wTotalScore / wMoves) : 100;
    
    try {
      const stats = readStats();
      const currentAvg = stats.avgAccuracy || 80.0;
      const gamesWithAcc = stats.gamesWithAccuracy || 0;
      const newAvg = ((currentAvg * gamesWithAcc) + playerAcc) / (gamesWithAcc + 1);
      
      stats.avgAccuracy = Math.round(newAvg * 10) / 10;
      stats.gamesWithAccuracy = gamesWithAcc + 1;
      writeStats(stats);
    } catch (e) {
      console.warn("Failed to update average accuracy:", e);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll move list to latest move
  useEffect(() => {
    if (state.history.length > 0) {
      requestAnimationFrame(() => {
        desktopMoveListRef.current?.scrollTo({ top: desktopMoveListRef.current.scrollHeight, behavior: 'smooth' });
        mobileMoveListRef.current?.scrollTo({ top: mobileMoveListRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [state.history.length]);

  // Reset game start time on new game
  useEffect(() => {
    if (state.history.length === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, [state.history.length]);

  // Resume or start requested game immediately
  useEffect(() => {
    if (resume) {
      setIsPlaying(true);
      setGameState('playing');
    } else if (paramMode === 'ai') {
      if (paramDiff || paramBotId) {
        const activeBot = BOTS.find(b => b.id === paramBotId) || BOTS.find(b => b.id === localStorage.getItem('chess_bot_id')) || BOTS[0];
        setSelectedBot(activeBot);
        const tc = paramTimeControl ? paramTimeControl : { base: 10, increment: 0 };
        startNewGame({
          mode: 'vsAI',
          playerColor: normalizeColor(paramColor),
          difficulty: Math.max(1, Math.min(5, Math.round((Number(activeBot.skillLevel) || 3) / 3))),
          botId: activeBot.id,
          timeControl: tc.base > 0 ? tc : null,
        });
        setIsPlaying(true);
        setGameState('playing');
      } else {
        setIsPlaying(false);
        setGameState('selection');
      }
    } else if (paramMode === 'local') {
      startNewGame({ mode: 'local' });
      setIsPlaying(true);
      setGameState('playing');
    } else if (paramMode === 'online') {
      setIsPlaying(true);
      setGameState('playing');
    }
  }, [paramMode, paramDiff, paramColor, paramBotId, paramTimeControl, resume, startNewGame]);

  // Trigger Stockfish AI moves in vsAI mode
  useEffect(() => {
    if (state.gameMode !== 'vsAI' || isCustomEngineThinking) return;
    if (state.status.type !== 'playing' && state.status.type !== 'check') return;

    const activeChess = new Chess(state.fen);
    if (activeChess.isGameOver()) return;

    const isPlayerTurn = activeChess.turn() === state.playerColor;
    if (!isPlayerTurn) {
      const activeBot = BOTS.find(b => b.id === state.aiBotId) || BOTS[0];

      const triggerAiMove = async () => {
        dispatch({ type: 'SET_AI_THINKING', payload: true });
        const startTime = Date.now();

        try {
          const uciMove = await getBestMove(state.fen, activeBot);
          
          // Enforce minimum 400ms delay for bots with moveTimeMs < 1000ms
          const elapsed = Date.now() - startTime;
          const minDelay = activeBot.moveTimeMs < 1000 ? 400 : 0;
          if (elapsed < minDelay) {
            await new Promise(r => setTimeout(r, minDelay - elapsed));
          }

          if (uciMove && uciMove !== '(none)') {
            const aiChess = new Chess(state.fen);
            const moveResult = aiChess.move({
              from: uciMove.substring(0, 2),
              to: uciMove.substring(2, 4),
              promotion: uciMove.length > 4 ? uciMove[4] : undefined
            });

            if (moveResult) {
              applyMove(moveResult, aiChess);
              // Play sound for AI moves
              try {
                if (aiChess.isCheck()) {
                  soundManager.playCheck();
                } else if (moveResult.captured) {
                  soundManager.playCapture();
                } else {
                  soundManager.playMove();
                }
              } catch (_) {}
            } else {
              throw new Error('Stockfish returned illegal move: ' + uciMove);
            }
          } else {
            throw new Error('Stockfish returned empty move');
          }
        } catch (e) {
          console.error('Stockfish error, playing random fallback move:', e);
          showToast('AI error — playing random move', 'error');

          const aiChess = new Chess(state.fen);
          const moves = aiChess.moves({ verbose: true });
          if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            const moveResult = aiChess.move(randomMove);
            if (moveResult) {
              applyMove(moveResult, aiChess);
              try { soundManager.playMove(); } catch (_) {}
            }
          }
        } finally {
          dispatch({ type: 'SET_AI_THINKING', payload: false });
        }
      };

      const timer = setTimeout(triggerAiMove, 300);
      return () => clearTimeout(timer);
    }
  }, [state.fen, state.gameMode, state.playerColor, state.aiBotId, isCustomEngineThinking, getBestMove, dispatch, applyMove, showToast]);


  // Handle active ticking clock warnings
  const formatTime = (timeInSeconds: number) => {
    if (timeInSeconds <= 0) return '0:00.0';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    if (timeInSeconds > 60) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const tenths = Math.floor((timeInSeconds % 1) * 10);
      return `${secs}.${tenths}`;
    }
  };

  const getClockColor = (timeInSeconds: number, isActive: boolean) => {
    if (!isActive) return '#aaaaaa';
    if (timeInSeconds < 10) return '#ef4444'; // red danger
    if (timeInSeconds < 30) return '#f97316'; // orange warning
    return '#ffffff';
  };

  // Captured pieces and material advantages calculation
  const opponentCaptures = useMemo(() => {
    // If player color is White: Opponent has captured state.capturedPieces.b (White pieces)
    // If player color is Black: Opponent has captured state.capturedPieces.w (Black pieces)
    return state.playerColor === 'b' ? state.capturedPieces.w : state.capturedPieces.b;
  }, [state.capturedPieces, state.playerColor]);

  const playerCaptures = useMemo(() => {
    // Player has captured opponent's pieces
    return state.playerColor === 'b' ? state.capturedPieces.b : state.capturedPieces.w;
  }, [state.capturedPieces, state.playerColor]);

  const advantageStats = useMemo(() => {
    let playerScore = 0;
    let opponentScore = 0;

    playerCaptures.forEach((p: any) => {
      const type = typeof p === 'string' ? p.toLowerCase() : p.type.toLowerCase();
      playerScore += PIECE_VALUES[type] || 0;
    });

    opponentCaptures.forEach((p: any) => {
      const type = typeof p === 'string' ? p.toLowerCase() : p.type.toLowerCase();
      opponentScore += PIECE_VALUES[type] || 0;
    });

    const diff = playerScore - opponentScore;
    return {
      playerAdv: diff > 0 ? diff : 0,
      oppAdv: diff < 0 ? Math.abs(diff) : 0
    };
  }, [playerCaptures, opponentCaptures]);

  // History move navigation arrows
  const handleFirstMove = () => {
    if (state.history.length === 0) return;
    setReviewIndex(-1);
    dispatch({ type: 'SET_REVIEW_FEN', payload: new Chess().fen() });
  };

  const handlePrevMove = () => {
    if (state.history.length === 0) return;
    let nextIdx = reviewIndex === null ? state.history.length - 2 : reviewIndex - 1;
    if (nextIdx < -1) nextIdx = -1;
    setReviewIndex(nextIdx);
    if (nextIdx === -1) {
      dispatch({ type: 'SET_REVIEW_FEN', payload: new Chess().fen() });
    } else {
      dispatch({ type: 'SET_REVIEW_FEN', payload: state.history[nextIdx].fen });
    }
  };

  const handleNextMove = () => {
    if (reviewIndex === null) return;
    let nextIdx = reviewIndex + 1;
    if (nextIdx >= state.history.length) {
      setReviewIndex(null);
      dispatch({ type: 'SET_REVIEW_FEN', payload: null });
    } else {
      setReviewIndex(nextIdx);
      dispatch({ type: 'SET_REVIEW_FEN', payload: state.history[nextIdx].fen });
    }
  };

  const handleLastMove = () => {
    setReviewIndex(null);
    dispatch({ type: 'SET_REVIEW_FEN', payload: null });
  };

  const handleMoveClick = (idx: number) => {
    setReviewIndex(idx);
    dispatch({ type: 'SET_REVIEW_FEN', payload: state.history[idx].fen });
  };

  // Engine-powered move hint
  const handleHint = useCallback(async () => {
    if (hintLoading) return;
    try {
      const chessEngine = new Chess(state.fen);
      const moves = chessEngine.moves({ verbose: true });
      if (moves.length === 0) return;

      setHintLoading(true);
      try {
        // Use engine to find the best move
        const hintBot = { skillLevel: 15, moveTimeMs: 800, id: 'hint', name: 'Hint', elo: 2000, description: '', colorClass: 'teal' };
        const uciMove = await getBestMove(state.fen, hintBot as any);
        if (uciMove && uciMove !== '(none)') {
          const from = uciMove.substring(0, 2);
          const to = uciMove.substring(2, 4);
          // Convert to SAN for a nicer toast
          const sanChess = new Chess(state.fen);
          const sanMove = sanChess.move({ from, to, promotion: uciMove.length > 4 ? uciMove[4] : undefined });
          dispatch({ type: 'SET_HINT_SQUARES', payload: { from, to } });
          showToast(`Hint: ${sanMove ? sanMove.san : `${from} → ${to}`}`, 'info');
        } else {
          throw new Error('No hint');
        }
      } catch {
        // Fallback to random move if engine fails
        const bestMove = moves[Math.floor(Math.random() * moves.length)];
        if (bestMove) {
          dispatch({ type: 'SET_HINT_SQUARES', payload: { from: bestMove.from, to: bestMove.to } });
          showToast(`Hint: ${bestMove.san}`, 'info');
        }
      } finally {
        setHintLoading(false);
      }
    } catch (e) {}
  }, [state.fen, hintLoading, getBestMove, dispatch, showToast]);

  const handleFlip = () => {
    dispatch({ type: 'TOGGLE_BOARD_FLIP' });
  };

  const handleEngineDifficulty = (level: number) => {
    dispatch({ type: 'SET_DIFFICULTY', payload: level });
    localStorage.setItem('chess_difficulty', String(level));
    showToast(`Engine set to level ${level}`, 'info', 1500);
  };

  // Keyboard shortcuts for gameplay
  useEffect(() => {
    if (!isPlaying || showAnalysis) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevMove();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextMove();
          break;
        case 'Home':
          e.preventDefault();
          handleFirstMove();
          break;
        case 'End':
          e.preventDefault();
          handleLastMove();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undoMove();
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleFlip();
          }
          break;
        case 'Escape':
          e.preventDefault();
          dispatch({ type: 'CLEAR_SELECTION' });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, showAnalysis, reviewIndex, state.history.length]);

  const handleSelectBot = (bot: Bot) => {
    setSelectedBot(bot);
    setGameState('timepicker');
  };

  // Bot selector card grid UI
  if (paramMode === 'ai' && !isPlaying) {
    return (
      <PageShell>
        <BotSelector
          show={true}
          onBotSelected={(bot, color, timeControl) => {
            setSelectedBot(bot);
            const diff = Math.max(1, Math.min(5, Math.round((Number(bot.skillLevel) || 3) / 3)));
            
            startNewGame({
              mode: 'vsAI',
              playerColor: color === 'white' ? 'w' : 'b',
              difficulty: diff,
              botId: bot.id,
              timeControl: timeControl,
            });
            setIsPlaying(true);
            setGameState('playing');
          }}
        />
      </PageShell>
    );
  }

  // Active playing view matching Chess.com Clean Mobile UI
  const activeBot = BOTS.find(b => b.id === state.aiBotId) || BOTS[0];
  const playerPieceIcon = state.playerColor === 'w' ? '♙' : '♟';
  const opponentPieceIcon = state.playerColor === 'w' ? '♟' : '♙';
  const isOpponentTurn = state.playerColor === 'w' ? (chess.turn() === 'b') : (chess.turn() === 'w'); // simplified ticking

  return (
    <PageShell>
      <div
        style={{
          background: '#302e2b',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: isDesktop ? 'center' : 'flex-start',
          padding: isDesktop ? '40px 20px' : '0',
        }}
      >
        {state.gameMode === 'online' && !state.roomCode ? (
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              background: '#2b2b2b',
              borderRadius: '12px',
              padding: '24px',
              color: '#ffffff',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >
            <MultiplayerLobby />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: isDesktop ? '1100px' : '430px',
              background: isDesktop ? 'transparent' : '#2b2b2b',
              display: 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              position: 'relative',
              boxShadow: isDesktop ? 'none' : '0 0 30px rgba(0,0,0,0.5)',
              gap: isDesktop ? '30px' : '0',
              alignItems: isDesktop ? 'stretch' : 'unset',
            }}
          >
            {/* Left Column: Board and Player Bars */}
            <div
              style={{
                flex: isDesktop ? '1 1 60%' : 'unset',
                width: isDesktop ? '60%' : '100%',
                maxWidth: isDesktop ? '620px' : '100%',
                background: '#2b2b2b',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: isDesktop ? '12px' : '0',
                overflow: 'hidden',
                boxShadow: isDesktop ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {state.gameMode === 'vsAI' && (
                <EngineDifficultyBar
                  value={state.aiDifficulty}
                  onChange={handleEngineDifficulty}
                  disabled={state.isAIThinking}
                />
              )}

              {/* 1. OPPONENT INFO BAR */}
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #333',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Avatar circle (40px) */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: state.gameMode === 'vsAI' ? 
                        ((activeBot.colorClass === 'gray' && 'linear-gradient(135deg, #707070, #4a4a4a)') ||
                         (activeBot.colorClass === 'teal' && 'linear-gradient(135deg, #0d9488, #0f766e)') ||
                         (activeBot.colorClass === 'blue' && 'linear-gradient(135deg, #2563eb, #1d4ed8)') ||
                         (activeBot.colorClass === 'purple' && 'linear-gradient(135deg, #7c3aed, #6d28d9)') ||
                         (activeBot.colorClass === 'amber' && 'linear-gradient(135deg, #d97706, #b45309)') ||
                         (activeBot.colorClass === 'coral' && 'linear-gradient(135deg, #ff7f50, #e05c3c)') ||
                         (activeBot.colorClass === 'pink' && 'linear-gradient(135deg, #db2777, #be185d)') ||
                         (activeBot.colorClass === 'red' && 'linear-gradient(135deg, #dc2626, #b91c1c)') || '#3a3a3a') : '#3a3a3a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: state.gameMode === 'vsAI' ? '14px' : '22px',
                      fontWeight: state.gameMode === 'vsAI' ? 'bold' : 'normal',
                      color: '#ffffff',
                      border: '2px solid #555',
                    }}
                  >
                    {state.gameMode === 'vsAI' ? opponentPieceIcon : '👤'}
                  </div>
                  <div>
                    {/* Bot name & ELO */}
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px' }}>
                      {state.gameMode === 'vsAI' ? activeBot.name : state.gameMode === 'online' ? state.opponentName : 'Local Opponent'}
                      <span style={{ color: '#aaaaaa', fontWeight: 500, fontSize: '12px', marginLeft: '6px' }}>
                        ({state.gameMode === 'vsAI' ? activeBot.elo : state.gameMode === 'online' ? state.opponentRating : '1200'})
                      </span>
                    </div>
                    {/* Pulsing dots under name */}
                    {state.gameMode === 'vsAI' && state.isAIThinking && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#81b64c', fontWeight: 600 }}>Thinking</span>
                        <span className="cc-thinking-dots">
                          <span className="cc-dot" />
                          <span className="cc-dot" />
                          <span className="cc-dot" />
                        </span>
                      </div>
                    )}
                    {/* Captured pieces + material diff */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <CapturedPieces
                        pieces={opponentCaptures}
                        color={state.playerColor === 'w' ? 'b' : 'w'}
                      />
                      {advantageStats.oppAdv > 0 && (
                        <span style={{ fontSize: '11px', color: '#aaaaaa', fontWeight: 700, marginLeft: '2px' }}>
                          +{advantageStats.oppAdv}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
 
                {/* Opponent Clock Display */}
                {state.timeControl && (
                  <div
                    className={(state.playerColor === 'w' ? (chess.turn() === 'b') : (chess.turn() === 'w')) && (state.playerColor === 'w' ? state.blackTime : state.whiteTime) < 10 ? 'clock-urgent' : ''}
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      color: getClockColor(
                        state.playerColor === 'w' ? state.blackTime : state.whiteTime,
                        state.playerColor === 'w' ? (chess.turn() === 'b') : (chess.turn() === 'w')
                      ),
                      opacity: (state.playerColor === 'w' ? (chess.turn() === 'b') : (chess.turn() === 'w')) ? 1 : 0.55,
                    }}
                  >
                    {formatTime(state.playerColor === 'w' ? state.blackTime : state.whiteTime)}
                  </div>
                )}
              </div>
 
              {/* 2. CHESS BOARD + EVAL BAR */}
              <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'stretch', gap: '6px' }}>
                {(state.gameMode === 'vsAI' || state.gameMode === 'analysis') && (
                  <EvalBar fen={state.reviewFen || state.fen} flipped={state.boardFlipped} refreshKey={state.evalTick} />
                )}
                <div style={{ flex: 1, minWidth: 0, pointerEvents: state.isAIThinking || isCustomEngineThinking ? 'none' : 'auto' }}>
                  {state.gameMode === 'vsAI' && isSimpleMode && (
                    <div style={{ marginBottom: '8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.45)', color: '#fbbf24', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 600 }}>
                      Engine unavailable - using fallback AI mode.
                    </div>
                  )}
                  <ChessBoard
                    currentReviewIndex={reviewIndex}
                    analysisResults={analysisResults}
                    bestMoveArrow={bestMoveArrow}
                    {...retryBoardProps}
                  />
                </div>
              </div>

              <ThinkingIndicator
                visible={state.gameMode === 'vsAI' && state.isAIThinking}
              />

              {/* 3. PLAYER INFO BAR */}
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #333',
                  borderBottom: isDesktop ? 'none' : '1px solid #333',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Avatar circle (40px) */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#3a3a3a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      border: '2px solid #6bbd44',
                    }}
                  >
                    {state.gameMode === 'vsAI' ? playerPieceIcon : '♟'}
                  </div>
                  <div>
                    {/* User name & ELO */}
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px' }}>
                      You
                      <span style={{ color: '#aaaaaa', fontWeight: 500, fontSize: '12px', marginLeft: '6px' }}>
                        ({userRating})
                      </span>
                    </div>
                    {/* Captured pieces + material diff */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <CapturedPieces pieces={playerCaptures} color={state.playerColor === 'w' ? 'w' : 'b'} />
                      {advantageStats.playerAdv > 0 && (
                        <span style={{ fontSize: '11px', color: '#aaaaaa', fontWeight: 700, marginLeft: '2px' }}>
                          +{advantageStats.playerAdv}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Clock Display */}
                {state.timeControl && (
                  <div
                    className={(state.playerColor === 'w' ? (chess.turn() === 'w') : (chess.turn() === 'b')) && (state.playerColor === 'w' ? state.whiteTime : state.blackTime) < 10 ? 'clock-urgent' : ''}
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      color: getClockColor(
                        state.playerColor === 'w' ? state.whiteTime : state.blackTime,
                        state.playerColor === 'w' ? (chess.turn() === 'w') : (chess.turn() === 'b')
                      ),
                      opacity: (state.playerColor === 'w' ? (chess.turn() === 'w') : (chess.turn() === 'b')) ? 1 : 0.55,
                    }}
                  >
                    {formatTime(state.playerColor === 'w' ? state.whiteTime : state.blackTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sidebar (Desktop) or Action controls (Mobile) */}
            {isDesktop ? (
              <div
                style={{
                  flex: '1 1 40%',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  padding: showAnalysis ? '0px' : '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid #333',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  minWidth: '340px',
                  maxHeight: '620px',
                  overflow: 'hidden',
                }}
              >
                {showAnalysis ? (
                  <AnalysisPanel
                    history={state.history}
                    onJumpToMove={handleMoveClick}
                    onSelectArrow={(arrow: any) => setBestMoveArrow(arrow)}
                    onCloseAnalysis={() => {
                      setShowAnalysis(false);
                      setBestMoveArrow(null);
                      setReviewIndex(null);
                      dispatch({ type: 'SET_REVIEW_FEN', payload: null });
                      setRetryBoardProps(null);
                    }}
                    onAnalysisComplete={handleAnalysisComplete}
                    activeReviewIndex={reviewIndex}
                    onRetryBoardPropsChange={setRetryBoardProps}
                  />
                ) : (
                  <>
                    {/* Game / Opponent Header */}
                    <div style={{ borderBottom: '1px solid #333', paddingBottom: '14px', marginBottom: '16px', textAlign: 'left' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                        {state.gameMode === 'vsAI' ? `🤖 vs ${activeBot.name}` : state.gameMode === 'online' ? `⚔️ vs ${state.opponentName || 'Online'}` : state.gameMode === 'analysis' ? '🔬 Game Analysis' : '👥 Local Game'}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#aaaaaa', marginTop: '4px', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                        {state.gameMode === 'vsAI' ? activeBot.description : state.gameMode === 'analysis' ? 'Analyze positions, review mistakes and explore optimal moves.' : 'Analyze positions, review mistakes and play in real time.'}
                      </p>
                    </div>

                    {/* Move List Section */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '220px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#888', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                        Moves
                      </h4>
                      <div style={{ flex: 1, background: '#111111', borderRadius: '6px', border: '1px solid #2d2d2d', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr', padding: '8px 12px', background: '#202020', fontSize: '11px', color: '#888', fontWeight: 700, borderBottom: '1px solid #2d2d2d', textAlign: 'left' }}>
                          <div>#</div>
                          <div>White</div>
                          <div>Black</div>
                        </div>
                        <div ref={desktopMoveListRef} style={{ flex: 1, overflowY: 'auto', maxHeight: '240px' }}>
                          {state.history.length === 0 ? (
                            <div style={{ padding: '24px 12px', color: '#555', textAlign: 'center', fontSize: '13px' }}>
                              No moves played yet.
                            </div>
                          ) : (
                            (() => {
                              const rows = [];
                              for (let i = 0; i < state.history.length; i += 2) {
                                const turnNum = Math.floor(i / 2) + 1;
                                rows.push({
                                  turnNum,
                                  white: state.history[i],
                                  whiteIdx: i,
                                  black: state.history[i + 1],
                                  blackIdx: i + 1,
                                });
                              }
                              return rows.map((row) => (
                                <div
                                  key={row.turnNum}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '50px 1fr 1fr',
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #222',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    textAlign: 'left',
                                  }}
                                >
                                  <div style={{ color: '#555' }}>{row.turnNum}</div>
                                  <div
                                    onClick={() => handleMoveClick(row.whiteIdx)}
                                    style={{
                                      color: reviewIndex === row.whiteIdx ? '#6bbd44' : '#ffffff',
                                      cursor: 'pointer',
                                      fontWeight: reviewIndex === row.whiteIdx ? 700 : 400,
                                    }}
                                  >
                                    {row.white.san}
                                  </div>
                                  <div
                                    onClick={() => row.black && handleMoveClick(row.blackIdx)}
                                    style={{
                                      color: row.black && reviewIndex === row.blackIdx ? '#6bbd44' : '#ffffff',
                                      cursor: 'pointer',
                                      fontWeight: row.black && reviewIndex === row.blackIdx ? 700 : 400,
                                    }}
                                  >
                                    {row.black ? row.black.san : ''}
                                  </div>
                                </div>
                              ));
                            })()
                          )}
                        </div>
                      </div>

                      {/* Navigation Arrows under list */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center', marginTop: '12px' }}>
                        <button onClick={handleFirstMove} style={navArrowStyle} title="First Move" aria-label="First Move">
                          <ChevronsLeft size={16} />
                        </button>
                        <button onClick={handlePrevMove} style={navArrowStyle} title="Previous Move" aria-label="Previous Move">
                          <ArrowLeft size={16} />
                        </button>
                        <button onClick={handleNextMove} style={navArrowStyle} title="Next Move" aria-label="Next Move">
                          <ArrowRight size={16} />
                        </button>
                        <button onClick={handleLastMove} style={navArrowStyle} title="Last Move" aria-label="Last Move">
                          <ChevronsRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Primary Game Action Row */}
                    <div style={{ display: 'flex', gap: '8px', margin: '20px 0 12px 0' }}>
                      <button onClick={undoMove} style={historySubBtnStyle} aria-label="Undo move">
                        <Undo2 size={13} style={{ marginRight: '4px' }} /> Undo
                      </button>
                      <button onClick={handleHint} style={historySubBtnStyle} aria-label="Show hint" disabled={hintLoading}>
                        {hintLoading ? <><Loader2 size={13} style={{ marginRight: '4px', animation: 'spin 1s linear infinite' }} /> Thinking...</> : '💡 Hint'}
                      </button>
                      <button onClick={handleFlip} style={historySubBtnStyle} aria-label="Flip board">
                        <RefreshCw size={13} style={{ marginRight: '4px' }} /> Flip
                      </button>
                    </div>

                    {/* Secondary actions + Resign */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            if (state.history.length > 0) {
                              downloadPgn(state.history, state.playerColor, state.gameMode, state.opponentName || (state.gameMode === 'vsAI' ? activeBot.name : 'Local'), state.status);
                              showToast('PGN Downloaded', 'success');
                            } else {
                              showToast('No moves to export', 'warning');
                            }
                          }}
                          style={historySubBtnStyle}
                        >
                          <Download size={12} style={{ marginRight: '3px' }} /> PGN
                        </button>
                        <button
                          onClick={() => {
                            if (state.history.length > 0) {
                              navigator.clipboard.writeText(generatePgnString(state.history, state.playerColor, state.gameMode, state.opponentName || (state.gameMode === 'vsAI' ? activeBot.name : 'Local'), state.status));
                              showToast('PGN copied to clipboard', 'success');
                            } else {
                              showToast('No moves to copy', 'warning');
                            }
                          }}
                          style={historySubBtnStyle}
                        >
                          <Share2 size={12} style={{ marginRight: '3px' }} /> Copy PGN
                        </button>
                        <button
                          onClick={() => {
                            setIsPlaying(false);
                            setGameState('selection');
                            navigate('/game', { state: { mode: 'ai' } });
                          }}
                          style={{ ...historySubBtnStyle, background: '#6bbd44', color: '#fff', borderColor: '#6bbd44' }}
                        >
                          New Game
                        </button>
                      </div>

                      <button
                        onClick={resign}
                        style={{
                          height: '44px',
                          borderRadius: '6px',
                          background: '#8b1a1a',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#a62424')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#8b1a1a')}
                      >
                        <Flag size={14} fill="#ffffff" /> Resign
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Mobile Bottom controls
              showAnalysis ? (
                <div style={{ background: '#1a1a1a', padding: '16px', borderTop: '1px solid #333', overflowY: 'auto', maxHeight: '420px', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <AnalysisPanel
                    history={state.history}
                    onJumpToMove={handleMoveClick}
                    onSelectArrow={(arrow: any) => setBestMoveArrow(arrow)}
                    onCloseAnalysis={() => {
                      setShowAnalysis(false);
                      setBestMoveArrow(null);
                      setReviewIndex(null);
                      dispatch({ type: 'SET_REVIEW_FEN', payload: null });
                      setRetryBoardProps(null);
                    }}
                    onAnalysisComplete={handleAnalysisComplete}
                    activeReviewIndex={reviewIndex}
                    onRetryBoardPropsChange={setRetryBoardProps}
                  />
                </div>
              ) : (
                <>
                  {/* 4. ACTION BUTTONS */}
                  <div
                    style={{
                      background: '#222222',
                      padding: '10px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px',
                      borderBottom: '1px solid #333',
                    }}
                  >
                    <button
                      onClick={undoMove}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '20px',
                        background: '#3a3a3a',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Undo2 size={16} /> Undo
                    </button>
                    <button
                      onClick={handleHint}
                      disabled={hintLoading}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '20px',
                        background: '#3a3a3a',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: hintLoading ? 'wait' : 'pointer',
                        opacity: hintLoading ? 0.6 : 1,
                      }}
                    >
                      {hintLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> ...</> : '💡 Hint'}
                    </button>
                    <button
                      onClick={handleFlip}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '20px',
                        background: '#3a3a3a',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={16} /> Flip
                    </button>
                    <button
                      onClick={() => setHistoryExpanded(prev => !prev)}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '20px',
                        background: '#3a3a3a',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ☰ Options
                    </button>
                  </div>

                  {/* 5. MOVE HISTORY (collapsible panel) */}
                  <div style={{ background: '#1c1c1c', borderBottom: '1px solid #333' }}>
                    <button
                      onClick={() => setHistoryExpanded(p => !p)}
                      style={{
                        width: '100%',
                        height: '36px',
                        background: 'transparent',
                        border: 'none',
                        color: '#aaaaaa',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      Move History {historyExpanded ? '▲' : '▼'}
                    </button>

                    {historyExpanded && (
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Move string notation container */}
                        <div
                          ref={mobileMoveListRef}
                          style={{
                            maxHeight: '100px',
                            overflowY: 'auto',
                            background: '#111',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            color: '#4ade80',
                            lineHeight: 1.5,
                            textAlign: 'left',
                          }}
                        >
                          {state.history.length === 0 ? (
                            <span style={{ color: '#555' }}>No moves made yet.</span>
                          ) : (
                            state.history.map((m: any, idx: number) => {
                              const isWhiteMove = idx % 2 === 0;
                              const turnNum = Math.floor(idx / 2) + 1;
                              return (
                                <span key={idx} style={{ marginRight: '8px', color: reviewIndex === idx ? '#ffcc00' : '#ffffff' }}>
                                  {isWhiteMove && `${turnNum}. `}
                                  {m.san}
                                </span>
                              );
                            })
                          )}
                        </div>

                        {/* Navigation arrows */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
                          <button onClick={handleFirstMove} style={navArrowStyle} title="First Move" aria-label="First Move">
                            <ChevronsLeft size={16} />
                          </button>
                          <button onClick={handlePrevMove} style={navArrowStyle} title="Previous Move" aria-label="Previous Move">
                            <ArrowLeft size={16} />
                          </button>
                          <button onClick={handleNextMove} style={navArrowStyle} title="Next Move" aria-label="Next Move">
                            <ArrowRight size={16} />
                          </button>
                          <button onClick={handleLastMove} style={navArrowStyle} title="Last Move" aria-label="Last Move">
                            <ChevronsRight size={16} />
                          </button>
                        </div>

                        {/* Save / Share / New buttons row */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              if (state.history.length > 0) {
                                downloadPgn(state.history, state.playerColor, state.gameMode, state.opponentName || (state.gameMode === 'vsAI' ? activeBot.name : 'Local'), state.status);
                                showToast('PGN Downloaded', 'success');
                              } else {
                                showToast('No moves to export', 'warning');
                              }
                            }}
                            style={historySubBtnStyle}
                          >
                            <Download size={12} style={{ marginRight: '3px' }} /> PGN
                          </button>
                          <button
                            onClick={() => {
                              if (state.history.length > 0) {
                                navigator.clipboard.writeText(generatePgnString(state.history, state.playerColor, state.gameMode, state.opponentName || (state.gameMode === 'vsAI' ? activeBot.name : 'Local'), state.status));
                                showToast('PGN copied to clipboard', 'success');
                              } else {
                                showToast('No moves to copy', 'warning');
                              }
                            }}
                            style={historySubBtnStyle}
                          >
                            <Share2 size={12} style={{ marginRight: '3px' }} /> Copy PGN
                          </button>
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setGameState('selection');
                              navigate('/game', { state: { mode: 'ai' } });
                            }}
                            style={historySubBtnStyle}
                          >
                            + New
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. RESIGNATION BUTTON */}
                  <button
                    onClick={resign}
                    style={{
                      width: '100%',
                      height: '48px',
                      background: '#8b1a1a', // Chess.com dark resign red
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background 0.2s',
                      marginTop: 'auto',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#a62424')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#8b1a1a')}
                  >
                    <Flag size={16} fill="#ffffff" /> Resign
                  </button>
                </>
              )
            )}
          </div>
        )}

        {/* GameOver results modal popup dialog */}
        {state.status.type !== 'playing' && state.status.type !== 'check' && (
          <GameOverDialog onAnalyze={() => setShowAnalysis(true)} />
        )}
      </div>
    </PageShell>
  );
}

// Styling descriptors for move history subcontrols
const navArrowStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: '#3a3a3a',
  border: 'none',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const historySubBtnStyle = {
  flex: 1,
  height: '32px',
  borderRadius: '4px',
  background: '#2c2c2c',
  border: '1px solid #444',
  color: '#aaaaaa',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
