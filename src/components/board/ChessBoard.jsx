import './ChessBoard.css';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import ChessPiece from './ChessPiece';
import MoveIndicator from './MoveIndicator';
import PromotionModal from './PromotionModal';
import ParticleCanvas, { triggerCaptureEffect, triggerMoveEffect } from './ParticleCanvas';
import { usePiecePositions } from './usePiecePositions';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard() {
  const { state, handleSquareClick, currentTheme, dispatch } = useGame();
  const {
    fen, selectedSquare, validMoves, lastMove,
    checkSquare, showCoords, playerColor, promotionPending,
    gameMode, aiDifficulty, animationsEnabled, history, aiStatus,
    hintSquares, boardFlipped, reviewFen, isAIThinking, errorSquare
  } = state;

  const effectiveFen = reviewFen || fen;
  const chess = useMemo(() => new Chess(effectiveFen), [effectiveFen]);
  const board = chess.board();
  const pieces = usePiecePositions(effectiveFen);

  const flippedView = (playerColor === 'b') !== !!boardFlipped;
  const ranks = flippedView ? [...RANKS].reverse() : RANKS;
  const files = flippedView ? [...FILES].reverse() : FILES;

  // Show move indicators for non-hard AI modes
  const showMoveIndicators = gameMode !== 'local' && !(gameMode === 'vsAI' && aiDifficulty > 3);

  const boardRef = useRef(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [movingPiece, setMovingPiece] = useState(null);
  const [keyboardFocus, setKeyboardFocus] = useState(null);
  const prevHistoryLen = useRef(0);

  // Touch drag state for following finger
  const touchDragState = useRef({ active: false, fromSquare: null });

  /* ── Keyboard Navigation (#14) ── */
  const handleKeyDown = useCallback((e) => {
    if (!keyboardFocus) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setKeyboardFocus(flippedView ? 'h1' : 'a8');
      }
      return;
    }

    const file = keyboardFocus[0];
    const rank = keyboardFocus[1];
    let fileIdx = FILES.indexOf(file);
    let rankIdx = RANKS.indexOf(rank);

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        rankIdx = flippedView ? rankIdx + 1 : rankIdx - 1;
        break;
      case 'ArrowDown':
        e.preventDefault();
        rankIdx = flippedView ? rankIdx - 1 : rankIdx + 1;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        fileIdx = flippedView ? fileIdx + 1 : fileIdx - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        fileIdx = flippedView ? fileIdx - 1 : fileIdx + 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleSquareClick(keyboardFocus);
        break;
      case 'Escape':
        e.preventDefault();
        dispatch({ type: 'CLEAR_SELECTION' });
        setKeyboardFocus(null);
        return;
      default:
        return;
    }

    if (fileIdx >= 0 && fileIdx <= 7 && rankIdx >= 0 && rankIdx <= 7) {
      setKeyboardFocus(`${FILES[fileIdx]}${RANKS[rankIdx]}`);
    }
  }, [keyboardFocus, flippedView, handleSquareClick, dispatch]);

  /* ── Particle effects on move ── */
  useEffect(() => {
    if (!boardRef.current) return;
    if (history.length === 0 || history.length === prevHistoryLen.current) return;

    const lastMv = history[history.length - 1];
    if (!lastMv) return;
    prevHistoryLen.current = history.length;

    setMovingPiece(lastMv.to);
    setTimeout(() => setMovingPiece(null), 350);

    const toEl = document.getElementById(`sq-${lastMv.to}`);
    if (lastMv.captured) {
      triggerCaptureEffect({ current: boardRef.current }, toEl, lastMv.color === 'w' ? 'b' : 'w');
    } else {
      triggerMoveEffect({ current: boardRef.current }, toEl);
    }
  }, [history]);

  /* ── Square color ── */
  const getSquareColor = (file, rank) => {
    const fileIdx = FILES.indexOf(file);
    const rankIdx = parseInt(rank) - 1;
    return (fileIdx + rankIdx) % 2 === 0 ? 'dark' : 'light';
  };

  /* ── CSS classes for each square ── */
  const getSquareClasses = (squareName) => {
    const classes = ['board-square'];
    if (selectedSquare === squareName) classes.push('selected');
    if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) classes.push('last-move');
    if (checkSquare === squareName) classes.push('in-check');
    if (hintSquares?.from === squareName) classes.push('hint-from');
    if (hintSquares?.to === squareName) classes.push('hint-to');
    if (movingPiece === squareName) classes.push('sq-landing');
    if (dragOver === squareName) classes.push('drag-over');
    return classes.join(' ');
  };

  /* ── Square position for absolute piece layer ── */
  const getSquareOffset = (squareName) => {
    const file = squareName[0];
    const rank = squareName[1];
    const fileIdx = FILES.indexOf(file);
    const rankIdx = RANKS.indexOf(rank);
    const x = flippedView ? 7 - fileIdx : fileIdx;
    const y = flippedView ? 7 - rankIdx : rankIdx;
    return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
  };

  /* ── Drag and Drop (#8) ── */
  const handleDragStart = (e, square) => {
    setDraggedFrom(square);
    handleSquareClick(square);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.style.cssText = 'width:60px;height:60px;position:fixed;top:-100px;left:-100px;opacity:0.9;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 30, 30);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDrop = (e, square) => {
    e.preventDefault();
    setDragOver(null);
    if (draggedFrom && draggedFrom !== square) {
      handleSquareClick(square);
    }
    setDraggedFrom(null);
  };

  /* ── Touch support with touchmove drag-follow (#8) ── */
  const handleTouchStart = (e, square) => {
    touchDragState.current = { active: true, fromSquare: square };
    handleSquareClick(square);
  };

  const handleTouchMove = (e) => {
    if (!touchDragState.current.active) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSquare = el?.dataset?.square || el?.closest('[data-square]')?.dataset?.square;
    if (targetSquare && targetSquare !== dragOver) {
      setDragOver(targetSquare);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSquare = el?.dataset?.square || el?.closest('[data-square]')?.dataset?.square;
    if (targetSquare && targetSquare !== touchDragState.current.fromSquare) {
      handleSquareClick(targetSquare);
    }
    touchDragState.current = { active: false, fromSquare: null };
    setDragOver(null);
  };

  const isNeonTheme = currentTheme.name === 'Neon' || currentTheme.name === 'Midnight';

  return (
    <div className="board-container">
      {/* Top control bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '600px', marginBottom: '4px', position: 'relative' }}>
        {/* AI Status indicator */}
        {gameMode === 'vsAI' && (
          <div style={{
            marginRight: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: aiStatus === 'ready' ? '#4caf50' : aiStatus === 'loading' ? '#ff9800' : '#f44336',
            background: 'var(--surface-dark)',
            padding: '4px 12px',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            {aiStatus === 'ready' ? 'Stockfish ✓' :
             aiStatus === 'loading' ? 'Initializing AI...' :
             'Simple AI Mode'}
          </div>
        )}
        <div className="icon-btn-wrapper">
          <button
            className="small-icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_BOARD_FLIP' })}
            title="Flip board"
            style={{
              width: '32px', height: '32px', background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            ⇅
          </button>
        </div>
      </div>

      {/* ── #4: AI Thinking Indicator above board ── */}
      {isAIThinking && gameMode === 'vsAI' && (
        <div className="ai-thinking-overlay">
          <div className="ai-thinking-dot" />
          <div className="ai-thinking-dot" />
          <div className="ai-thinking-dot" />
          AI is thinking...
        </div>
      )}

      {/* Ambient glow */}
      <div className="board-glow" style={{ '--theme-accent': currentTheme.accent }} />

      {/* Premium board frame */}
      <div className="board-frame" style={{ '--frame-accent': currentTheme.accent }}>
        {/* Corner ornaments */}
        <div className="frame-corner frame-tl">♟</div>
        <div className="frame-corner frame-tr">♞</div>
        <div className="frame-corner frame-bl">♝</div>
        <div className="frame-corner frame-br">♜</div>

        <div className="board-wrapper">
          <div className="board-main-row" style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
            {showCoords && (
              <div className="rank-labels-column">
                {ranks.map((rank) => (
                  <div key={rank} className="rank-label">
                    {rank}
                  </div>
                ))}
              </div>
            )}
            <div className="board-grid-wrapper" style={{ flex: 1, position: 'relative', aspectRatio: '1 / 1' }}>
              {/* The chess board grid */}
              <div
                ref={boardRef}
                role="grid"
                aria-label="Chess board"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`chess-board ${isNeonTheme ? 'board-neon' : ''} ${isAIThinking ? 'ai-thinking' : ''}`}
                style={{
                  touchAction: 'none',
                  '--board-light': currentTheme.light,
                  '--board-dark': currentTheme.dark,
                  '--theme-accent': currentTheme.accent,
                  width: '100%',
                  height: '100%',
                }}
              >
                {/* ── Square Grid ── */}
                {ranks.map((rank) =>
                  files.map((file) => {
                    const squareName = `${file}${rank}`;
                    const boardRank = RANKS.indexOf(rank);
                    const boardFile = FILES.indexOf(file);
                    const cell = board[boardRank]?.[boardFile];
                    const isValidTarget = validMoves.includes(squareName);
                    const sqColor = getSquareColor(file, rank);

                    // Error shake
                    const isErrorShake = errorSquare === squareName;
                    // Keyboard focus
                    const isKeyboardFocused = keyboardFocus === squareName;

                    // ARIA: describe the piece on this square
                    const pieceDesc = cell
                      ? `${cell.color === 'w' ? 'white' : 'black'} ${
                          { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[cell.type]
                        }`
                      : 'empty';

                    return (
                      <div
                        key={squareName}
                        id={`sq-${squareName}`}
                        data-square={squareName}
                        role="gridcell"
                        aria-label={`${squareName}, ${pieceDesc}`}
                        className={[
                          getSquareClasses(squareName),
                          `${sqColor}-square`,
                          isErrorShake ? 'shake' : '',
                          isKeyboardFocused ? 'keyboard-focus' : '',
                        ].filter(Boolean).join(' ')}
                        style={{
                          backgroundColor: sqColor === 'light' ? currentTheme.light : currentTheme.dark,
                          width: '100%',
                          height: '100%',
                        }}
                        onClick={() => handleSquareClick(squareName)}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(squareName); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => handleDrop(e, squareName)}
                        onTouchStart={(e) => handleTouchStart(e, squareName)}
                      >
                        {/* ── #1: Legal Move Indicators (green dot / capture ring) ── */}
                        {showMoveIndicators && isValidTarget && (
                          <MoveIndicator hasCapture={!!cell} themeAccent={currentTheme.accent} />
                        )}
                      </div>
                    );
                  })
                )}

                {/* ── Pieces Layer (absolute, on top of grid) ── */}
                {pieces.map((p) => {
                  const isSelected = selectedSquare === p.square;
                  const isLanding = movingPiece === p.square;
                  return (
                    <div
                      key={p.id}
                      style={{
                        position: 'absolute',
                        width: '12.5%',
                        height: '12.5%',
                        ...getSquareOffset(p.square),
                        zIndex: isSelected || isLanding || draggedFrom === p.square ? 10 : 2,
                        pointerEvents: 'none',
                        transition: animationsEnabled ? 'left 0.18s ease, top 0.18s ease' : 'none',
                      }}
                    >
                      <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                        <ChessPiece
                          piece={p}
                          square={p.square}
                          isSelected={isSelected}
                          animationsEnabled={animationsEnabled}
                          onDragStart={handleDragStart}
                          onDrop={handleDrop}
                          onClick={() => handleSquareClick(p.square)}
                          animStyle={{ animation: isLanding ? 'slideIn 0.2s ease' : 'none' }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Particle overlay */}
                <ParticleCanvas boardRef={boardRef} />

                {/* Neon grid lines */}
                {isNeonTheme && <div className="neon-grid" style={{ '--accent': currentTheme.accent }} />}

                {/* ── #7: Pawn Promotion Modal ── */}
                {promotionPending && (
                  <PromotionModal
                    color={chess.turn()}
                    file={promotionPending.to[0]}
                    rank={promotionPending.to[1]}
                    flipped={flippedView}
                  />
                )}
              </div>
            </div>
          </div>
          {showCoords && (
            <div className="file-labels-row">
              {files.map((file) => (
                <div key={file} className="file-label">
                  {file}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
