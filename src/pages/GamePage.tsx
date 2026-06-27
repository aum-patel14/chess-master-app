import { useState, useEffect, useRef, useMemo } from 'react';
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
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Flag, RefreshCw, Undo2, HelpCircle, Download, Share2, Lightbulb } from 'lucide-react';
import AnalysisPanel from '../components/game/AnalysisPanel';
import CapturedPieces from '../components/game/CapturedPieces';
import { downloadPgn, generatePgnString } from '../utils/pgnExporter';
import EvalBar from '../components/chesscom/EvalBar';
import EngineDifficultyBar from '../components/chesscom/EngineDifficultyBar';
import ThinkingIndicator from '../components/chesscom/ThinkingIndicator';
import { BOTS, BotConfig } from '../config/bots';
import { useStockfish } from '../hooks/useStockfish';
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
  const { isThinking: isStockfishThinking, getBestMove } = useStockfish();
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

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[] | null>(null);
  const [bestMoveArrow, setBestMoveArrow] = useState<{ from: string; to: string } | null>(null);
  const [retryBoardProps, setRetryBoardProps] = useState<any>(null);

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
    if (state.gameMode !== 'vsAI' || isStockfishThinking) return;
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
            }
          }
        } finally {
          dispatch({ type: 'SET_AI_THINKING', payload: false });
        }
      };

      const timer = setTimeout(triggerAiMove, 300);
      return () => clearTimeout(timer);
    }
  }, [state.fen, state.gameMode, state.playerColor, state.aiBotId, isStockfishThinking, getBestMove, dispatch, applyMove, showToast]);


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

  // Quick move suggestion hint
  const handleHint = () => {
    try {
      const chessEngine = new Chess(state.fen);
      const moves = chessEngine.moves({ verbose: true });
      if (moves.length === 0) return;

      // Pick a smart fallback move or random legal move as hint
      const bestMove = moves[Math.floor(Math.random() * moves.length)];
      if (bestMove) {
        dispatch({ type: 'SET_HINT_SQUARES', payload: { from: bestMove.from, to: bestMove.to } });
        showToast(`Hint: Move from ${bestMove.from} to ${bestMove.to}`, 'info');
      }
    } catch (e) {}
  };

  const handleFlip = () => {
    dispatch({ type: 'TOGGLE_BOARD_FLIP' });
  };

  const handleEngineDifficulty = (level: number) => {
    dispatch({ type: 'SET_DIFFICULTY', payload: level });
    localStorage.setItem('chess_difficulty', String(level));
    showToast(`Engine set to level ${level}`, 'info', 1500);
  };

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
               <div className="game-layout-grid">
            {/* Left Column: Board and Player Bars */}
            <div className="board-column">
              {state.gameMode === 'vsAI' && (
                <EngineDifficultyBar
                  value={state.aiDifficulty}
                  onChange={handleEngineDifficulty}
                  disabled={state.isAIThinking}
                />
              )}

              {/* 1. OPPONENT INFO BAR */}
              {(() => {
                const oppTime = state.playerColor === 'w' ? state.blackTime : state.whiteTime;
                const isOppActive = state.playerColor === 'w' ? (chess.turn() === 'b') : (chess.turn() === 'w');
                const opponentName = state.gameMode === 'vsAI' ? activeBot.name : state.gameMode === 'online' ? state.opponentName : 'Local Opponent';
                const opponentRating = state.gameMode === 'vsAI' ? activeBot.elo : state.gameMode === 'online' ? state.opponentRating : '1200';
                
                return (
                  <div
                    style={{
                      background: isOppActive ? '#1e2a1e' : '#1a1a1a',
                      borderLeft: isOppActive ? '2px solid #81b64c' : '2px solid transparent',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                      margin: '8px 0',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar circle (32px) */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: state.gameMode === 'vsAI' 
                            ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' // Warm blue for bot
                            : 'linear-gradient(135deg, #707070, #4a4a4a)', // Warm gray for player
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          flexShrink: 0
                        }}
                      >
                        {state.gameMode === 'vsAI' ? activeBot.avatarEmoji : '👤'}
                      </div>
                      <div>
                        {/* Opponent name & ELO */}
                        <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{opponentName}</span>
                          <span style={{ color: '#888888', fontWeight: 500, fontSize: '12px' }}>
                            ({opponentRating})
                          </span>
                        </div>
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
                        className="player-card-clock"
                        style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: isOppActive ? '#ffffff' : '#555',
                          textAlign: 'right'
                        }}
                      >
                        {formatTime(oppTime)}
                      </div>
                    )}
                  </div>
                );
              })()}

              {state.gameMode === 'vsAI' && isSimpleMode && (
                <div style={{ marginBottom: '8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.45)', color: '#fbbf24', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 600 }}>
                  Engine unavailable - using fallback AI mode.
                </div>
              )}

              {/* 2. CHESS BOARD + EVAL BAR */}
              <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'stretch', gap: '6px' }}>
                {(state.gameMode === 'vsAI' || state.gameMode === 'analysis') && (
                  <EvalBar fen={state.reviewFen || state.fen} flipped={state.boardFlipped} refreshKey={state.evalTick} />
                )}
                <div style={{ flex: 1, minWidth: 0, aspectRatio: '1', pointerEvents: state.isAIThinking || isStockfishThinking ? 'none' : 'auto' }}>
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
              {(() => {
                const playerTime = state.playerColor === 'w' ? state.whiteTime : state.blackTime;
                const isPlayerActive = state.playerColor === 'w' ? (chess.turn() === 'w') : (chess.turn() === 'b');
                
                return (
                  <div
                    style={{
                      background: isPlayerActive ? '#1e2a1e' : '#1a1a1a',
                      borderLeft: isPlayerActive ? '2px solid #81b64c' : '2px solid transparent',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                      margin: '8px 0',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar circle (32px) */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #81b64c, #5f8d37)', // Warm green for player
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          flexShrink: 0
                        }}
                      >
                        Y
                      </div>
                      <div>
                        {/* User name & ELO */}
                        <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>You</span>
                          <span style={{ color: '#888888', fontWeight: 500, fontSize: '12px' }}>
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
                        className="player-card-clock"
                        style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: isPlayerActive ? '#ffffff' : '#555',
                          textAlign: 'right'
                        }}
                      >
                        {formatTime(playerTime)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Sidebar (Desktop / Mobile stacked via CSS) */}
            <div className="sidebar-panel">
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
                  {/* Opponent Info Panel Card */}
                  <div style={{
                    background: '#1e1e1e',
                    border: '1px solid #2d2d2d',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                        {state.gameMode === 'vsAI' ? `vs ${activeBot.name}` : state.gameMode === 'online' ? `vs ${state.opponentName || 'Online'}` : state.gameMode === 'analysis' ? 'Game Analysis' : 'Local Game'}
                      </span>
                      {state.gameMode === 'vsAI' && (() => {
                        const diff = activeBot.difficulty || 1;
                        let bg = '#4a7c59';
                        let label = 'Beginner';
                        if (diff === 2 || activeBot.name.toLowerCase().includes('rookie') || activeBot.name.toLowerCase().includes('pawn')) {
                          bg = '#4a7c59';
                          label = 'Beginner';
                        } else if (diff === 3) {
                          bg = '#4a6b7c';
                          label = 'Intermediate';
                        } else if (diff === 4) {
                          bg = '#7c4a4a';
                          label = 'Advanced';
                        } else if (diff >= 5) {
                          bg = '#5a4a7c';
                          label = 'Master';
                        }
                        return (
                          <span style={{
                            background: bg,
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: '#888',
                      lineHeight: '1.5',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {state.gameMode === 'vsAI' ? activeBot.description : state.gameMode === 'analysis' ? 'Analyze positions, review mistakes and explore optimal moves.' : 'Analyze positions, review mistakes and play in real time.'}
                    </p>
                  </div>

                  {/* Move List Section */}
                  <div className="move-list-section">
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>
                      Moves
                    </h4>
                    <div className="move-list-container">
                      <div className="move-list-grid-header">
                        <div>#</div>
                        <div>White</div>
                        <div>Black</div>
                      </div>
                      <div className="move-list-scroll">
                        {state.history.length === 0 ? (
                          <div className="move-list-empty-state">
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
                            
                            const currentActiveIdx = reviewIndex !== null ? reviewIndex : (state.history.length - 1);

                            return rows.map((row) => {
                              const isWhiteActive = currentActiveIdx === row.whiteIdx;
                              const isBlackActive = currentActiveIdx === row.blackIdx;
                              const isRowActive = isWhiteActive || isBlackActive;

                              return (
                                <div
                                  key={row.turnNum}
                                  ref={isRowActive ? activeMoveRef : undefined}
                                  className={`move-list-row ${isRowActive ? 'active-row' : ''}`}
                                >
                                  <div style={{ color: '#555', fontWeight: 600 }}>{row.turnNum}</div>
                                  <div
                                    onClick={() => handleMoveClick(row.whiteIdx)}
                                    className={`move-list-item-san ${isWhiteActive ? 'active-move' : ''}`}
                                  >
                                    {row.white.san}
                                  </div>
                                  <div
                                    onClick={() => row.black && handleMoveClick(row.blackIdx)}
                                    className={`move-list-item-san ${row.black && isBlackActive ? 'active-move' : ''}`}
                                  >
                                    {row.black ? row.black.san : ''}
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>

                    {/* Navigation Arrows under list */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center', marginTop: '12px' }}>
                      <button onClick={handleFirstMove} className="nav-arrow-btn" title="First Move" aria-label="First Move">
                        <ChevronsLeft size={16} />
                      </button>
                      <button onClick={handlePrevMove} className="nav-arrow-btn" title="Previous Move" aria-label="Previous Move">
                        <ArrowLeft size={16} />
                      </button>
                      <button onClick={handleNextMove} className="nav-arrow-btn" title="Next Move" aria-label="Next Move">
                        <ArrowRight size={16} />
                      </button>
                      <button onClick={handleLastMove} className="nav-arrow-btn" title="Last Move" aria-label="Last Move">
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Button hierarchy & options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0 12px 0' }}>
                    {/* Row 1: Hint, Undo, Flip */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleHint}
                        className="btn-hint"
                        aria-label="Show hint"
                      >
                        <Lightbulb size={13} /> Hint
                      </button>
                      <button
                        onClick={undoMove}
                        className="btn-undo-flip"
                        aria-label="Undo move"
                      >
                        <Undo2 size={13} /> Undo
                      </button>
                      <button
                        onClick={handleFlip}
                        className="btn-undo-flip"
                        aria-label="Flip board"
                      >
                        <RefreshCw size={13} /> Flip
                      </button>
                    </div>

                    {/* Row 2: New Game, Resign */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setGameState('selection');
                          navigate('/game', { state: { mode: 'ai' } });
                        }}
                        className="btn-newgame"
                      >
                        New Game
                      </button>
                      <button
                        onClick={resign}
                        className="btn-resign"
                      >
                        Resign
                      </button>
                    </div>

                    {/* Links below: PGN, Copy PGN */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '4px' }}>
                      <button
                        onClick={() => {
                          if (state.history.length > 0) {
                            downloadPgn(state.history, state.playerColor, state.gameMode, state.opponentName || (state.gameMode === 'vsAI' ? activeBot.name : 'Local'), state.status);
                            showToast('PGN Downloaded', 'success');
                          } else {
                            showToast('No moves to export', 'warning');
                          }
                        }}
                        className="btn-link-pgn"
                      >
                        Export PGN
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
                        className="btn-link-pgn"
                      >
                        Copy PGN
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
