import './GamePage.css';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import ChessBoard from '../components/board/ChessBoard';
import PlayAIModal from '../components/modals/PlayAIModal';

const DIFFICULTY_NAMES = { 1:'Beginner', 2:'Easy', 3:'Medium', 4:'Hard', 5:'Expert' };

export default function GamePage() {
  const { state, dispatch, resign, offerDraw, undoMove, startNewGame } = useGame();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    whiteTime, blackTime, timeControl
  } = state;

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const requestedMode = searchParams.get('mode') || 'local';
  const paramDiff = parseInt(searchParams.get('difficulty'), 10);
  const paramColor = searchParams.get('color');
  const paramFen = searchParams.get('fen'); // Support custom starting FEN

  const [showAISetup, setShowAISetup] = useState(false);

  // Initialize game mode based on URL query string
  useEffect(() => {
    if (requestedMode === 'ai') {
      if (!paramDiff || !paramColor) {
        setShowAISetup(true);
      } else if (state.gameMode !== 'vsAI' || state.aiDifficulty !== paramDiff || state.playerColor !== paramColor) {
        startNewGame({ mode: 'vsAI', playerColor: paramColor, difficulty: paramDiff, fen: paramFen });
      }
    } else if (state.gameMode !== requestedMode || (paramFen && state.moveCount === 0 && state.fen !== paramFen)) {
      // If it's a puzzle, lesson, or local mode, load it!
      startNewGame({ mode: requestedMode, fen: paramFen });
    }
  }, [requestedMode, paramDiff, paramColor, paramFen, state.gameMode, state.aiDifficulty, state.playerColor, state.moveCount, state.fen, startNewGame]);

  const handleStartAI = (config) => {
    let chosenColor = config.color;
    if (chosenColor === 'r') {
      chosenColor = Math.random() > 0.5 ? 'w' : 'b';
    }
    setShowAISetup(false);
    navigate(`/play?mode=ai&difficulty=${config.difficulty}&color=${chosenColor}`, { replace: true });
  };

  const handleCloseAISetup = () => {
    setShowAISetup(false);
    // If they cancel, fallback to a local match or home page
    if (state.gameMode !== 'vsAI') navigate('/');
  };

  const chess = useMemo(() => new Chess(fen), [fen]);
  const currentTurn = chess.turn();
  const isGameOver = status.type !== 'playing' && status.type !== 'check';
  const [confirmResign, setConfirmResign] = useState(false);
  const scrollRef = useRef(null);

  // Auto scroll moves
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const topPlayer = {
    name: gameMode === 'vsAI' && playerColor === 'w' ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}` : 'Opponent',
    isAI: gameMode === 'vsAI' && playerColor === 'w',
    color: 'b',
    time: blackTime,
    isActive: currentTurn === 'b' && !isGameOver,
    captured: capturedPieces.b,
  };

  const bottomPlayer = {
    name: gameMode === 'vsAI' && playerColor === 'b' ? `AI — ${DIFFICULTY_NAMES[aiDifficulty]}` : 'You',
    isAI: gameMode === 'vsAI' && playerColor === 'b',
    color: 'w',
    time: whiteTime,
    isActive: currentTurn === 'w' && !isGameOver,
    captured: capturedPieces.w,
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Process history into pairs for the table
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      w: history[i],
      b: history[i + 1] || null
    });
  }

  return (
    <div className="game-page">
      <div className="game-board-area">
        <div className="board-wrapper">
          
          <div className="player-card">
            <div className="player-left">
              <div className="avatar">♟</div>
              <span className="player-name">{topPlayer.name}</span>
              <div className="captured-mini">
                {topPlayer.captured.map((p, i) => <span key={i}>{p.type === 'p'?'♟':p.type==='n'?'♞':p.type==='b'?'♝':p.type==='r'?'♜':'♛'}</span>)}
              </div>
            </div>
            {timeControl && (
              <div className={`timer-box ${topPlayer.isActive ? 'active' : ''}`}>
                {formatTime(topPlayer.time)}
              </div>
            )}
          </div>

          <div className="chess-board-container">
            <ChessBoard />
          </div>

          <div className="player-card">
            <div className="player-left">
              <div className="avatar you">♙</div>
              <span className="player-name">{bottomPlayer.name} <span className="you-badge">You</span></span>
              <div className="captured-mini">
                {bottomPlayer.captured.map((p, i) => <span key={i}>{p.type === 'p'?'♙':p.type==='n'?'♘':p.type==='b'?'♗':p.type==='r'?'♖':'♕'}</span>)}
              </div>
            </div>
            {timeControl && (
              <div className={`timer-box ${bottomPlayer.isActive ? 'active' : ''}`}>
                {formatTime(bottomPlayer.time)}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="game-panel hide-mobile">
        <div className="panel-top">
          <span className="panel-heading">{gameMode === 'vsAI' ? 'vs Computer' : 'Local Match'}</span>
          {gameMode === 'vsAI' && (
            <div className="difficulty-pill">{DIFFICULTY_NAMES[aiDifficulty]}</div>
          )}
        </div>

        <div className="panel-middle" ref={scrollRef}>
          <div className="moves-header">Moves</div>
          {history.length === 0 ? (
            <div className="empty-moves">No moves yet</div>
          ) : (
            <div className="moves-table">
              {movePairs.map((pair, idx) => {
                const isLastW = history.length - 1 === idx * 2;
                const isLastB = history.length - 1 === idx * 2 + 1;
                return (
                  <div key={idx} className="move-row">
                    <div className="move-num">{pair.num}.</div>
                    <div className={`move-cell ${isLastW ? 'last-move' : ''}`}>{pair.w.san}</div>
                    <div className={`move-cell ${isLastB ? 'last-move' : ''}`}>{pair.b ? pair.b.san : ''}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel-bottom">
          <div className="nav-row">
            <button className="nav-btn">|◀</button>
            <button className="nav-btn">◀</button>
            <button className="nav-btn">▶</button>
            <button className="nav-btn">▶|</button>
          </div>
          
          <div className="action-row">
            <button className="action-btn" onClick={undoMove} disabled={history.length === 0 || isGameOver || isAIThinking}>↩ Undo</button>
            <button className="action-btn" onClick={offerDraw} disabled={isGameOver}>🤝 Draw</button>
            <button className="action-btn" onClick={() => startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty })}>➕ New</button>
          </div>

          {confirmResign ? (
            <button className="resign-btn confirm" onClick={() => { resign(); setConfirmResign(false); }}>Sure? Yes</button>
          ) : (
            <button className="resign-btn" onClick={() => setConfirmResign(true)} disabled={isGameOver}>🏳 Resign</button>
          )}
        </div>
      </div>
      
      {/* Mobile controls (slide up) */}
      <div className="mobile-game-controls">
        <button onClick={undoMove} disabled={history.length === 0 || isGameOver || isAIThinking}>↩ Undo</button>
        <button onClick={offerDraw} disabled={isGameOver}>🤝 Draw</button>
        <button onClick={() => setConfirmResign(true)} disabled={isGameOver} style={{ color: 'var(--red)' }}>🏳 Resign</button>
      </div>

      <PlayAIModal 
        show={showAISetup} 
        onClose={handleCloseAISetup} 
        onStart={handleStartAI} 
      />
    </div>
  );
}
