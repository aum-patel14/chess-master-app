import './GameScreen.css';
import { useMemo, useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import ChessBoard from '../board/ChessBoard';
import GameOverDialog from './GameOverDialog';
import MoveHistoryPanel from './MoveHistoryPanel';
import CapturedPieces from './CapturedPieces';
import TimerDisplay from './TimerDisplay';
import { RotateCcw, Flag, Handshake, LineChart, Settings, Home, Gamepad2, Puzzle, BookOpen, User, ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from 'lucide-react';

const DIFFICULTY_NAMES = { 1:'Beginner', 2:'Easy', 3:'Medium', 4:'Hard', 5:'Expert' };
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
  const { state, dispatch, resign, offerDraw, undoMove, startNewGame } = useGame();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    whiteTime, blackTime, timeControl, moveCount, boardFlipped, reviewFen
  } = state;

  const effectiveFen = reviewFen || fen;
  const chess = useMemo(() => new Chess(effectiveFen), [effectiveFen]);
  const currentTurn = chess.turn();
  const isGameOver = status.type !== 'playing' && status.type !== 'check';
  const [confirmResign, setConfirmResign] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Game timer (elapsed)
  useEffect(() => {
    if (isGameOver) return;
    const t = setInterval(() => setElapsedTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isGameOver]);

  const handleBack = () => dispatch({ type: 'SET_MODE', payload: 'menu' });

  // Whose info goes where
  const flippedView = (playerColor === 'b') !== !!boardFlipped;
  const topColor = flippedView ? 'w' : 'b';
  const bottomColor = flippedView ? 'b' : 'w';

  const materialAdv = getMaterialAdvantage(capturedPieces.w, capturedPieces.b);

  const topPlayer = {
    name: gameMode === 'vsAI' && playerColor === topColor ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}` : (topColor === playerColor ? 'You' : 'Opponent'),
    isAI: gameMode === 'vsAI' && playerColor !== topColor,
    color: topColor,
    time: topColor === 'w' ? whiteTime : blackTime,
    isActive: currentTurn === topColor,
    captured: capturedPieces[topColor === 'w' ? 'b' : 'w'], // Pieces captured BY top player
    material: materialAdv[topColor]
  };

  const bottomPlayer = {
    name: gameMode === 'vsAI' && playerColor === bottomColor ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}` : (bottomColor === playerColor ? 'You' : 'Opponent'),
    isAI: gameMode === 'vsAI' && playerColor !== bottomColor,
    color: bottomColor,
    time: bottomColor === 'w' ? whiteTime : blackTime,
    isActive: currentTurn === bottomColor,
    captured: capturedPieces[bottomColor === 'w' ? 'b' : 'w'], // Pieces captured BY bottom player
    material: materialAdv[bottomColor]
  };

  // Basic eval bar calculation (placeholder based on material for now)
  const evalPercentage = 50 + (materialAdv.w - materialAdv.b) * 2;
  const clampedEval = Math.max(5, Math.min(95, evalPercentage));

  return (
    <div className="game-screen-wrapper">
      
      {/* LEFT SIDEBAR NAVIGATION (Desktop only) */}
      <div className="game-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-icon">♚</span>
        </div>
        <div className="sidebar-links">
          <button className="sidebar-link" onClick={handleBack}>
            <Home size={20} className="link-icon" />
            <span className="link-text">Home</span>
          </button>
          <button className="sidebar-link active">
            <Gamepad2 size={20} className="link-icon" />
            <span className="link-text">Play</span>
          </button>
          <button className="sidebar-link" onClick={() => dispatch({ type: 'SET_MODE', payload: 'puzzles' })}>
            <Puzzle size={20} className="link-icon" />
            <span className="link-text">Puzzles</span>
          </button>
          <button className="sidebar-link" onClick={() => dispatch({ type: 'SET_MODE', payload: 'learn' })}>
            <BookOpen size={20} className="link-icon" />
            <span className="link-text">Learn</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-link" onClick={() => dispatch({ type: 'SET_MODE', payload: 'settings' })}>
            <Settings size={20} className="link-icon" />
            <span className="link-text">Settings</span>
          </button>
        </div>
      </div>

      {/* CENTER BOARD AREA */}
      <div className="game-center-panel">
        
        {/* MOBILE TOP PLAYER */}
        <div className="mobile-only">
          <PlayerCard player={topPlayer} timeControl={timeControl} isGameOver={isGameOver} isAIThinking={isAIThinking} />
        </div>

        <div className="board-layout-wrapper">
          {/* Eval Bar */}
          <div className="eval-bar">
            <div className="eval-fill-black" />
            <div className="eval-fill-white" style={{ height: `${clampedEval}%` }} />
            <div className="eval-score">{(materialAdv.w - materialAdv.b) > 0 ? `+${materialAdv.w - materialAdv.b}` : materialAdv.w - materialAdv.b}</div>
          </div>

          <div className="board-and-controls">
            <div className="board-wrapper-inner">
              <ChessBoard />
            </div>

            {/* Below Board Icons */}
            <div className="board-action-row">
              <button className="board-action-btn" title="Flip Board" onClick={() => dispatch({ type: 'TOGGLE_BOARD_FLIP' })}>
                <RotateCcw size={18} />
              </button>
              <button className="board-action-btn" title="Resign" onClick={() => { if(confirmResign) { resign(); setConfirmResign(false); } else setConfirmResign(true); }} disabled={isGameOver}>
                {confirmResign ? '✔' : <Flag size={18} />}
              </button>
              <button className="board-action-btn" title="Offer Draw" onClick={offerDraw} disabled={isGameOver}>
                <Handshake size={18} />
              </button>
              <button className="board-action-btn" title="Analysis" disabled={!isGameOver}>
                <LineChart size={18} />
              </button>
              <button className="board-action-btn" title="Settings" onClick={() => dispatch({ type: 'SET_MODE', payload: 'settings' })}>
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE BOTTOM PLAYER */}
        <div className="mobile-only">
          <PlayerCard player={bottomPlayer} timeControl={timeControl} isGameOver={isGameOver} isAIThinking={isAIThinking} />
        </div>
      </div>

      {/* RIGHT CONTROL PANEL */}
      <div className="game-right-panel">
        <div className="right-panel-content">
          {/* TOP PLAYER */}
          <PlayerCard player={topPlayer} timeControl={timeControl} isGameOver={isGameOver} isAIThinking={isAIThinking} />

          {/* MOVE HISTORY */}
          <div className="history-wrapper">
            <div className="history-header">
              <div className="right-panel-tabs">
                <div className="tab active">Moves</div>
                <div className="tab">Details</div>
              </div>
            </div>
            <div className="history-scroll">
              {history.length === 0 ? (
                <div className="history-empty">Game started</div>
              ) : (
                <MoveHistoryPanel history={history} />
              )}
            </div>
            
            {/* Play controls */}
            <div className="history-controls">
              <button className="hist-btn" onClick={() => dispatch({ type: 'JUMP_TO_MOVE', payload: 0 })}><ChevronFirst size={20} /></button>
              <button className="hist-btn" onClick={undoMove}><ChevronLeft size={20} /></button>
              <button className="hist-btn" disabled><ChevronRight size={20} /></button>
              <button className="hist-btn" disabled><ChevronLast size={20} /></button>
            </div>
          </div>

          {/* BOTTOM PLAYER */}
          <PlayerCard player={bottomPlayer} timeControl={timeControl} isGameOver={isGameOver} isAIThinking={isAIThinking} />
        </div>
      </div>
      
      {/* Mobile Bottom Bar (visible only on small screens) */}
      <div className="mobile-bottom-bar">
        <button className="mobile-tab-btn active"><Gamepad2 size={24} /><span>Play</span></button>
        <button className="mobile-tab-btn" onClick={() => dispatch({ type: 'SET_MODE', payload: 'puzzles' })}><Puzzle size={24} /><span>Puzzles</span></button>
        <button className="mobile-tab-btn" onClick={() => dispatch({ type: 'SET_MODE', payload: 'leaderboard' })}><LineChart size={24} /><span>Rank</span></button>
        <button className="mobile-tab-btn" onClick={() => dispatch({ type: 'SET_MODE', payload: 'settings' })}><User size={24} /><span>Profile</span></button>
      </div>

      {isGameOver && (
        <GameOverDialog
          status={status}
          onNewGame={() => startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty })}
          onMenu={handleBack}
          moveCount={moveCount}
          elapsed={elapsedTime}
        />
      )}
    </div>
  );
}

function PlayerCard({ player, timeControl, isGameOver, isAIThinking }) {
  return (
    <div className="player-info-container">
      <div className="player-info-top">
        <div className={`player-avatar ${player.color === 'w' ? 'bg-white' : 'bg-black'}`}>
          <User size={24} color={player.color === 'w' ? '#000' : '#fff'} />
        </div>
        <div className="player-details">
          <div className="player-name-row">
            <span className="player-name">{player.name}</span>
            <span className="player-rating">1500</span>
            <span className="player-flag">🇺🇸</span>
          </div>
          {player.isAI && isAIThinking && player.isActive && (
            <span className="ai-thinking">Thinking...</span>
          )}
        </div>
        
        {timeControl && (
          <div className={`player-timer ${player.isActive && !isGameOver ? 'active' : ''} ${player.time < 30 ? 'low-time' : ''}`}>
            <TimerDisplay seconds={player.time} isActive={player.isActive && !isGameOver && !(player.isAI && isAIThinking)} />
          </div>
        )}
      </div>
      
      <div className="player-info-bottom">
        <CapturedPieces pieces={player.captured} color={player.color} />
        {player.material > 0 && <span className="material-adv">+{player.material}</span>}
      </div>
    </div>
  );
}
