import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import { useToast } from '../hooks/useToast';
import PageShell from '../components/PageShell';
import ChessBoard from '../components/ChessBoard';
import GameOverDialog from '../components/game/GameOverDialog';
import MultiplayerLobby from '../components/game/MultiplayerLobby';
import { readElo, readStats, writeStats } from '../utils/chessStats';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Flag, RefreshCw, Undo2, HelpCircle, Download, Share2 } from 'lucide-react';
import AnalysisPanel from '../components/game/AnalysisPanel';
import { downloadPgn, generatePgnString } from '../utils/pgnExporter';

interface Bot {
  id: string;
  name: string;
  elo: number;
  avatar: string;
  difficulty: number;
  badge: 'green' | 'yellow' | 'orange' | 'red';
  badgeLabel: string;
  bio: string;
}

const AI_LEVELS: Bot[] = [
  { id: 'easy_ai', name: 'Easy AI', elo: 600, avatar: '😊', difficulty: 2, badge: 'green', badgeLabel: 'Easy', bio: 'Depth 2 Stockfish. Plays casual, beginner-level moves.' },
  { id: 'medium_ai', name: 'Medium AI', elo: 1200, avatar: '🧠', difficulty: 6, badge: 'yellow', badgeLabel: 'Medium', bio: 'Depth 6 Stockfish. A decent challenge for regular chess players.' },
  { id: 'hard_ai', name: 'Hard AI', elo: 2000, avatar: '🔥', difficulty: 12, badge: 'red', badgeLabel: 'Hard', bio: 'Depth 12 Stockfish. Plays at master level with ruthless precision.' },
];

const BOTS: Bot[] = [
  { id: 'rookie', name: 'Martin', elo: 250, avatar: '👶', difficulty: 1, badge: 'green', badgeLabel: 'Beginner', bio: 'Just learned how the chess pieces move. Plays entirely at random!' },
  { id: 'beginner', name: 'Mike', elo: 600, avatar: '🤖', difficulty: 2, badge: 'green', badgeLabel: 'Easy', bio: 'Familiar with basic rules but misses simple tactical threats.' },
  { id: 'casual', name: 'David', elo: 900, avatar: '☕', difficulty: 3, badge: 'yellow', badgeLabel: 'Moderate', bio: 'Plays casual games in the park. Decent, but falls for easy tactics.' },
  { id: 'club', name: 'Sarah', elo: 1200, avatar: '🧔', difficulty: 5, badge: 'yellow', badgeLabel: 'Intermediate', bio: 'A regular at local chess clubs. Knows standard openings.' },
  { id: 'intermediate', name: 'Lisa', elo: 1500, avatar: '🦊', difficulty: 6, badge: 'orange', badgeLabel: 'Advanced', bio: 'Enjoys sharp tactical lines and actively searches for forks and pins.' },
  { id: 'advanced', name: 'Anna', elo: 1800, avatar: '🧙‍♂️', difficulty: 8, badge: 'orange', badgeLabel: 'Expert', bio: 'Calculates several moves ahead and rarely blunders. A tough opponent.' },
  { id: 'expert', name: 'Carlos', elo: 2100, avatar: '🧠', difficulty: 9, badge: 'red', badgeLabel: 'Master', bio: 'Mastered positional play and endgames. Punishes mistakes instantly.' },
  { id: 'master', name: 'Wei', elo: 2400, avatar: '👑', difficulty: 10, badge: 'red', badgeLabel: 'Grandmaster', bio: 'Plays at grandmaster strength with flawless precision.' },
  { id: 'master', name: 'Magnus', elo: 2800, avatar: '🐐', difficulty: 10, badge: 'red', badgeLabel: 'Champion', bio: 'The legendary World Champion. Plays near perfect moves!' },
];

const TIME_OPTIONS = [
  { base: 1, increment: 0, label: '1 min (Bullet)' },
  { base: 3, increment: 0, label: '3 min (Blitz)' },
  { base: 5, increment: 0, label: '5 min (Blitz)' },
  { base: 10, increment: 0, label: '10 min (Rapid)' },
  { base: 0, increment: 0, label: 'Unlimited' },
];

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CAPTURED_SYMBOLS: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
  P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛'
};

export default function GamePage() {
  const { state, dispatch, resign, undoMove, startNewGame } = useGame();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const userRating = readElo();

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
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedTc, setSelectedTc] = useState<{ base: number; increment: number } | null>({ base: 10, increment: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth > 900);

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[] | null>(null);
  const [bestMoveArrow, setBestMoveArrow] = useState<{ from: string; to: string } | null>(null);

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
    } else if (paramMode === 'ai' && paramDiff && paramBotId) {
      const activeBot = BOTS.find(b => b.id === paramBotId) || BOTS[0];
      setSelectedBot(activeBot);
      const tc = paramTimeControl ? paramTimeControl : { base: 10, increment: 0 };
      startNewGame({
        mode: 'vsAI',
        playerColor: paramColor,
        difficulty: activeBot.difficulty,
        botId: activeBot.id,
        timeControl: tc.base > 0 ? tc : null,
      });
      setIsPlaying(true);
      setGameState('playing');
    } else if (paramMode === 'local') {
      startNewGame({ mode: 'local' });
      setIsPlaying(true);
      setGameState('playing');
    } else if (paramMode === 'online') {
      setIsPlaying(true);
      setGameState('playing');
    }
  }, [paramMode, paramDiff, paramColor, paramBotId, paramTimeControl, resume, startNewGame]);

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

  const handleSelectBot = (bot: Bot) => {
    setSelectedBot(bot);
    setGameState('timepicker');
  };

  const handleStartGame = () => {
    if (!selectedBot) return;
    startNewGame({
      mode: 'vsAI',
      playerColor: 'w',
      difficulty: selectedBot.difficulty,
      botId: selectedBot.id,
      timeControl: selectedTc && selectedTc.base > 0 ? selectedTc : null,
    });
    setIsPlaying(true);
    setGameState('playing');
  };

  // Bot selector card grid UI
  if (paramMode === 'ai' && !isPlaying) {
    return (
      <PageShell>
        <div style={{ background: '#161513', minHeight: '100vh', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '430px', background: '#2b2b2b', borderRadius: '12px', padding: '20px', color: '#ffffff', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            
            {gameState === 'selection' ? (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', marginBottom: '8px' }}>Play vs Computer</h2>
                <p style={{ fontSize: '14px', color: '#aaaaaa', textAlign: 'center', marginBottom: '20px' }}>Select an opponent to start playing</p>

                {/* Tab selector */}
                <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '4px', marginBottom: '20px', gap: '4px' }}>
                  <button
                    onClick={() => setActiveTab('levels')}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '6px',
                      background: activeTab === 'levels' ? '#6bbd44' : 'transparent',
                      color: activeTab === 'levels' ? '#ffffff' : '#aaaaaa',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                  >
                    AI Levels
                  </button>
                  <button
                    onClick={() => setActiveTab('bots')}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '6px',
                      background: activeTab === 'bots' ? '#6bbd44' : 'transparent',
                      color: activeTab === 'bots' ? '#ffffff' : '#aaaaaa',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                  >
                    Chess Bots
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {(activeTab === 'levels' ? AI_LEVELS : BOTS).map((bot) => {
                    const badgeColors: Record<string, string> = { green: '#4ade80', yellow: '#facc15', orange: '#fb923c', red: '#f87171' };
                    return (
                      <div
                        key={bot.id}
                        onClick={() => handleSelectBot(bot)}
                        style={{
                          background: '#1a1a1a',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          cursor: 'pointer',
                          border: '1px solid #333',
                          transition: 'transform 0.15s, border-color 0.15s',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6bbd44')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333')}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2b2b2b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: `2px solid ${badgeColors[bot.badge] || '#999'}`, overflow: 'hidden', flexShrink: 0 }}>
                          {bot.avatar}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>{bot.name}</span>
                            <span style={{ fontSize: '11px', background: badgeColors[bot.badge], color: '#000000', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {bot.badgeLabel}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#aaaaaa', marginTop: '2px' }}>ELO: {bot.elo}</div>
                          <div style={{ fontSize: '11px', color: '#888888', marginTop: '4px', lineHeight: '1.3' }}>{bot.bio}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              // Time picker overlay
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Choose Time Control</h3>
                <p style={{ fontSize: '14px', color: '#aaaaaa', marginBottom: '24px' }}>Playing vs {selectedBot?.name}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  {TIME_OPTIONS.map((opt) => {
                    const isSelected = selectedTc ? (selectedTc.base === opt.base) : (opt.base === 0);
                    return (
                      <button
                        key={opt.label}
                        onClick={() => setSelectedTc(opt.base > 0 ? { base: opt.base, increment: 0 } : null)}
                        style={{
                          height: '48px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #6bbd44' : '1px solid #444',
                          background: isSelected ? 'rgba(107, 189, 68, 0.15)' : '#1a1a1a',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setGameState('selection')}
                    style={{ flex: 1, height: '48px', background: '#3a3a3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStartGame}
                    style={{ flex: 1, height: '48px', background: '#6bbd44', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Play Game
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </PageShell>
    );
  }

  // Active playing view matching Chess.com Clean Mobile UI
  const activeBot = AI_LEVELS.find(b => b.id === state.aiBotId) || BOTS.find(b => b.id === state.aiBotId) || BOTS[0];
  const isOpponentTurn = state.playerColor === 'w' ? (chess.turn() === 'b') : (chess.turn() === 'w'); // simplified ticking

  return (
    <PageShell>
      <div
        style={{
          background: '#161513',
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
                      background: '#3a3a3a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      border: '2px solid #555',
                    }}
                  >
                    {state.gameMode === 'vsAI' ? activeBot.avatar : '👤'}
                  </div>
                  <div>
                    {/* Bot name & ELO */}
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px' }}>
                      {state.gameMode === 'vsAI' ? activeBot.name : state.gameMode === 'online' ? state.opponentName : 'Local Opponent'}
                      <span style={{ color: '#aaaaaa', fontWeight: 500, fontSize: '12px', marginLeft: '6px' }}>
                        ({state.gameMode === 'vsAI' ? activeBot.elo : state.gameMode === 'online' ? state.opponentRating : '1200'})
                      </span>
                    </div>
                    {/* Captured pieces + material diff */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ fontSize: '13px', color: '#ffffff', letterSpacing: '1px' }}>
                        {opponentCaptures.map((p: any, idx: number) => (
                          <span key={idx} style={{ color: '#ffffff' }}>{CAPTURED_SYMBOLS[typeof p === 'string' ? p : p.type]}</span>
                        ))}
                      </span>
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

              {/* 2. CHESS BOARD */}
              <div style={{ width: '100%', position: 'relative' }}>
                <ChessBoard
                  currentReviewIndex={reviewIndex}
                  analysisResults={analysisResults}
                  bestMoveArrow={bestMoveArrow}
                />
              </div>

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
                    ♟
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
                      <span style={{ fontSize: '13px', color: '#111111', letterSpacing: '1px' }}>
                        {playerCaptures.map((p: any, idx: number) => (
                          <span key={idx} style={{ color: '#111111' }}>{CAPTURED_SYMBOLS[typeof p === 'string' ? p : p.type]}</span>
                        ))}
                      </span>
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
                    }}
                    onAnalysisComplete={handleAnalysisComplete}
                  />
                ) : (
                  <>
                    {/* Game / Opponent Header */}
                    <div style={{ borderBottom: '1px solid #333', paddingBottom: '14px', marginBottom: '16px', textAlign: 'left' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                        {state.gameMode === 'vsAI' ? `🤖 vs ${activeBot.name}` : state.gameMode === 'online' ? `⚔️ vs ${state.opponentName || 'Online'}` : '👥 Local Game'}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#aaaaaa', marginTop: '4px', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                        {state.gameMode === 'vsAI' ? activeBot.bio : 'Analyze positions, review mistakes and play in real time.'}
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
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '240px' }}>
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
                      <button onClick={undoMove} style={historySubBtnStyle}>
                        <Undo2 size={13} style={{ marginRight: '4px' }} /> Undo
                      </button>
                      <button onClick={handleHint} style={historySubBtnStyle}>
                        💡 Hint
                      </button>
                      <button onClick={handleFlip} style={historySubBtnStyle}>
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
                    }}
                    onAnalysisComplete={handleAnalysisComplete}
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
                      💡 Hint
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
          <GameOverDialog />
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
