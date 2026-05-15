import './GamePage.css';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import ChessBoard from '../components/board/ChessBoard';
import PlayAIModal from '../components/modals/PlayAIModal';
import GameOverModal from '../components/GameOverModal';
import PageShell from '../components/PageShell';
import { useToast } from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';

const useBoardSize = () => {
  const calc = () => Math.min(window.innerWidth - 20, window.innerHeight * 0.52, 560);
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const update = () => setSize(calc());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
};

const DIFFICULTY_NAMES = { 1:'Beginner', 2:'Easy', 3:'Medium', 4:'Hard', 5:'Expert' };

export default function GamePage() {
  const { state, dispatch, resign, offerDraw, undoMove, startNewGame, playerElo } = useGame();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    whiteTime, blackTime, timeControl
  } = state;

  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { mode: requestedMode = 'local', difficulty: paramDiff = 3, timeControl: paramTimeControl = 600, playerColor: paramColor = 'w', resume = false, fen: paramFen = '' } = location.state || {};

  const [showAISetup, setShowAISetup] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Resume game logic
  useEffect(() => {
    if (resume) {
      try {
        const saved = JSON.parse(localStorage.getItem('chess_saved_game'));
        if (saved) {
          startNewGame({ mode: saved.mode, difficulty: saved.difficulty, fen: saved.fen });
        }
      } catch(e) {}
    }
  }, [resume, startNewGame]);

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

  // Auto-reset confirmResign after 5 seconds
  useEffect(() => {
    if (confirmResign) {
      const t = setTimeout(() => setConfirmResign(false), 5000);
      return () => clearTimeout(t);
    }
  }, [confirmResign]);

  // Auto scroll moves
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const boardSize = useBoardSize();

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      switch (e.key.toLowerCase()) {
        case 'n':
          if (history.length > 0) setConfirmNewGame(true);
          else startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty });
          break;
        case 'f':
          dispatch({ type: 'TOGGLE_BOARD_FLIP' });
          showToast('Board flipped', 'info');
          break;
        case 'u':
          if (history.length > 0 && !isGameOver && !isAIThinking) {
            undoMove();
            showToast('Move undone', 'info');
          }
          break;
        case 'h':
          handleHint();
          break;
        case 's':
          handleSaveGame();
          break;
        case 'escape':
          setConfirmResign(false);
          setConfirmNewGame(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history.length, gameMode, playerColor, aiDifficulty, isGameOver, isAIThinking, undoMove, dispatch, showToast]);

  const [confirmNewGame, setConfirmNewGame] = useState(false);

  const handleHint = async () => {
    if (hintsUsed >= 3) {
      showToast('No hints left', 'warning');
      return;
    }
    const engine = await import('../engine/StockfishService');
    const uciMove = await engine.stockfishEngine.getBestMove(fen, 6);
    if (uciMove && uciMove !== '(none)') {
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      dispatch({ type: 'SET_HINT_SQUARES', payload: { from, to } });
      setHintsUsed(prev => prev + 1);
      showToast(`Hint shown (${2 - hintsUsed} left)`, 'info');
      setTimeout(() => dispatch({ type: 'SET_HINT_SQUARES', payload: null }), 3000);
    }
  };

  const handleSaveGame = () => {
    localStorage.setItem('chess_saved_game', JSON.stringify({ pgn: chess.pgn(), fen: chess.fen(), mode: gameMode, difficulty: aiDifficulty, timestamp: Date.now() }));
    showToast('Game saved ✓', 'success');
  };

  const handleShare = () => {
    navigator.clipboard.writeText("I'm playing chess on ChessMaster Pro! Game: " + window.location.href);
    showToast('Link copied ✓', 'success');
  };

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
    <PageShell>
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

          <div className="chess-board-container" style={{ width: boardSize, height: boardSize }}>
            <ChessBoard />
          </div>

          <div className="player-card">
            <div className="player-left">
              <div className="avatar you">♙</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="player-name">{bottomPlayer.name} <span className="you-badge">You</span></span>
                <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 'bold' }}>ELO: {playerElo}</span>
              </div>
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
            <button className="action-btn" onClick={() => { undoMove(); showToast('Move undone', 'info'); }} disabled={history.length === 0 || isGameOver || isAIThinking}>↩ Undo</button>
            <button className="action-btn" onClick={handleHint} disabled={hintsUsed >= 3 || isGameOver || isAIThinking}>💡 Hint</button>
            <button className="action-btn" onClick={() => { dispatch({ type: 'TOGGLE_BOARD_FLIP' }); showToast('Board flipped', 'info'); }}>🔄 Flip</button>
          </div>
          <div className="action-row" style={{ marginTop: 8 }}>
            <button className="action-btn" onClick={handleSaveGame} disabled={isGameOver}>💾 Save</button>
            <button className="action-btn" onClick={handleShare}>🔗 Share</button>
            <button className="action-btn" onClick={() => { if(history.length > 0) setConfirmNewGame(true); else startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty }); }}>➕ New</button>
          </div>

          {confirmResign ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="resign-btn confirm" onClick={() => { resign(); setConfirmResign(false); }} style={{ flex: 1 }}>
                Yes, Resign
              </button>
              <button className="resign-btn" onClick={() => setConfirmResign(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="resign-btn" onClick={() => setConfirmResign(true)} disabled={isGameOver}>🏳 Resign</button>
          )}
        </div>
      </div>
      
      {/* Mobile controls (slide up) */}
      <div className="mobile-game-controls">
        <button onClick={undoMove} disabled={history.length === 0 || isGameOver || isAIThinking}>↩ Undo</button>
        <button onClick={offerDraw} disabled={isGameOver}>🤝 Draw</button>
        {confirmResign ? (
          <button className="confirm" onClick={() => { resign(); setConfirmResign(false); }} style={{ color: 'var(--red)' }}>Sure? Yes</button>
        ) : (
          <button onClick={() => setConfirmResign(true)} disabled={isGameOver} style={{ color: 'var(--red)' }}>🏳 Resign</button>
        )}
      </div>

      <PlayAIModal 
        show={showAISetup} 
        onClose={handleCloseAISetup} 
        onStart={handleStartAI} 
      />
      <GameOverModal />
      <ConfirmModal
        isOpen={confirmNewGame}
        title="Start New Game?"
        message="Your current game will be lost."
        danger={false}
        confirmText="Yes, Start New"
        cancelText="Cancel"
        onCancel={() => setConfirmNewGame(false)}
        onConfirm={() => { startNewGame({ mode: gameMode, playerColor, difficulty: aiDifficulty }); setConfirmNewGame(false); showToast('New game started', 'info'); }}
      />
      </div>
    </PageShell>
  );
}
