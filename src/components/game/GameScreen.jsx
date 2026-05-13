import './GameScreen.css';
import { useMemo, useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import ChessBoard from '../board/ChessBoard';
import GameOverDialog from './GameOverDialog';
import MoveHistoryPanel from './MoveHistoryPanel';
import CapturedPieces from './CapturedPieces';
import TimerDisplay from './TimerDisplay';

const DIFFICULTY_NAMES = { 1:'Beginner', 2:'Easy', 3:'Medium', 4:'Hard', 5:'Expert' };

export default function GameScreen() {
  const { state, dispatch, resign, offerDraw, undoMove, startNewGame } = useGame();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    whiteTime, blackTime, timeControl, moveCount,
  } = state;

  const chess = useMemo(() => new Chess(fen), [fen]);
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

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleBack = () => dispatch({ type: 'SET_MODE', payload: 'menu' });

  // Whose info goes where
  const topPlayer = {
    name: gameMode === 'vsAI' && playerColor === 'w' ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}` : 'Opponent',
    isAI: gameMode === 'vsAI' && playerColor === 'w',
    color: 'b',
    time: blackTime,
    isActive: currentTurn === 'b',
    captured: capturedPieces.b,
  };
  const bottomPlayer = {
    name: gameMode === 'vsAI' && playerColor === 'b' ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}` : 'You',
    isAI: gameMode === 'vsAI' && playerColor === 'b',
    color: 'w',
    time: whiteTime,
    isActive: currentTurn === 'w',
    captured: capturedPieces.w,
  };

  return (
    <div className="game-screen-wrapper">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <div className="game-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-icon">♚</span>
        </div>
        <div className="sidebar-links">
          <button className="sidebar-link" onClick={handleBack}>
            <span className="link-icon">🏠</span>
            <span className="link-text">Home</span>
          </button>
          <button className="sidebar-link active">
            <span className="link-icon">⚡</span>
            <span className="link-text">Play</span>
          </button>
          <button className="sidebar-link" onClick={() => dispatch({ type: 'SET_MODE', payload: 'puzzles' })}>
            <span className="link-icon">🧩</span>
            <span className="link-text">Puzzles</span>
          </button>
          <button className="sidebar-link" onClick={() => dispatch({ type: 'SET_MODE', payload: 'learn' })}>
            <span className="link-icon">📖</span>
            <span className="link-text">Learn</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-link" onClick={() => dispatch({ type: 'SET_MODE', payload: 'settings' })}>
            <span className="link-icon">⚙️</span>
            <span className="link-text">Settings</span>
          </button>
        </div>
      </div>

      {/* CENTER BOARD AREA */}
      <div className="game-center-panel">
        <div className="board-container-wrapper">
          {/* Top Player Info */}
          <div className="player-bar top">
            <PlayerCard player={topPlayer} timeControl={timeControl} isGameOver={isGameOver} isAIThinking={isAIThinking} />
          </div>

          {/* The Board */}
          <div className="board-wrapper-inner">
            <ChessBoard />
          </div>

          {/* Bottom Player Info */}
          <div className="player-bar bottom">
            <PlayerCard player={bottomPlayer} timeControl={timeControl} isGameOver={isGameOver} isAIThinking={isAIThinking} />
          </div>
        </div>
      </div>

      {/* RIGHT CONTROL PANEL */}
      <div className="game-right-panel">
        <div className="right-panel-tabs">
          <div className="tab active">NEW GAME</div>
          <div className="tab">GAMES</div>
          <div className="tab">PLAYERS</div>
        </div>

        <div className="right-panel-content">
          <button 
            className="btn-play-new"
            onClick={() => startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty })}
          >
            Play New Match
          </button>

          <div className="game-status-box">
            <div className="status-header">Match Info</div>
            <div className="status-row">
              <span className="status-label">Time:</span>
              <span className="status-val">{formatElapsed(elapsedTime)}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Turn:</span>
              <span className="status-val">
                {isGameOver ? status.message : (currentTurn === playerColor ? 'Your Turn' : 'Opponent')}
              </span>
            </div>
            {gameMode === 'vsAI' && (
              <div className="status-row">
                <span className="status-label">AI Level:</span>
                <span className="status-val">{DIFFICULTY_NAMES[aiDifficulty]}</span>
              </div>
            )}
          </div>

          <div className="action-buttons-grid">
            <button className="action-btn" onClick={undoMove} disabled={history.length === 0 || isAIThinking || isGameOver}>
              <span className="action-icon">↩</span> Undo
            </button>
            <button className="action-btn" onClick={offerDraw} disabled={isGameOver}>
              <span className="action-icon">🤝</span> Draw
            </button>
            {confirmResign ? (
              <button className="action-btn resign-confirm" onClick={() => { resign(); setConfirmResign(false); }}>
                ✔ Confirm
              </button>
            ) : (
              <button className="action-btn" onClick={() => setConfirmResign(true)} disabled={isGameOver}>
                <span className="action-icon">🏳</span> Resign
              </button>
            )}
          </div>

          <div className="history-wrapper">
            <div className="history-header">Move History</div>
            <div className="history-scroll">
              {history.length === 0 ? (
                <div className="history-empty">No moves yet</div>
              ) : (
                <MoveHistoryPanel history={history} />
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* Mobile Bottom Bar (visible only on small screens) */}
      <div className="mobile-bottom-bar">
        <button className="mobile-action-btn" onClick={undoMove} disabled={history.length === 0 || isAIThinking || isGameOver}>↩ Undo</button>
        <button className="mobile-action-btn" onClick={offerDraw} disabled={isGameOver}>🤝 Draw</button>
        <button className="mobile-action-btn resign" onClick={() => { resign(); setConfirmResign(false); }} disabled={isGameOver}>🏳 Resign</button>
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
      <div className="player-profile">
        <div className={`player-avatar ${player.color === 'w' ? 'bg-white' : 'bg-black'}`}>
          {player.color === 'w' ? '♙' : '♟'}
        </div>
        <div className="player-name">
          {player.name}
          {player.isAI && <span className="ai-badge">Bot</span>}
          {player.isAI && isAIThinking && player.isActive && (
            <span style={{ fontSize: '11px', color: '#ff9800', marginLeft: '8px', animation: 'pulse 1s infinite' }}>
              Thinking...
            </span>
          )}
        </div>
      </div>
      
      <div className="player-right-side">
        <CapturedPieces pieces={player.captured} color={player.color} />
        {timeControl && (
           <div className={`player-timer ${player.isActive && !isGameOver ? 'active' : ''}`}>
             <TimerDisplay seconds={player.time} isActive={player.isActive && !isGameOver && !(player.isAI && isAIThinking)} />
           </div>
        )}
      </div>
    </div>
  );
}
