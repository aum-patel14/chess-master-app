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

export default function ChessBoard({ bestMoveArrow }) {
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

  /* ── Keyboard Navigation ── */
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

  /* ── Drag and Drop ── */
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

  /* ── Touch support with touchmove drag-follow ── */
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

  // HELPER TO COMPUTE SVG PERCENTAGES FOR ARROWS
  const getSquareCenterPercent = (sq) => {
    const file = sq[0];
    const rank = sq[1];
    const fileIdx = FILES.indexOf(file);
    const rankIdx = RANKS.indexOf(rank);
    const x = flippedView ? 7 - fileIdx : fileIdx;
    const y = flippedView ? 7 - rankIdx : rankIdx;
    return {
      x: `${(x * 12.5) + 6.25}%`,
      y: `${(y * 12.5) + 6.25}%`
    };
  };

  const arrowCoords = useMemo(() => {
    if (!bestMoveArrow) return null;
    return {
      start: getSquareCenterPercent(bestMoveArrow.from),
      end: getSquareCenterPercent(bestMoveArrow.to)
    };
  }, [bestMoveArrow, flippedView]);

  return (
    <div className="board-wrapper">
      {/* AI Thinking Indicator */}
      {isAIThinking && gameMode === 'vsAI' && (
        <div className="ai-thinking-overlay">
          <div className="ai-thinking-dot" />
          <div className="ai-thinking-dot" />
          <div className="ai-thinking-dot" />
          AI is thinking...
        </div>
      )}

      {/* Rank numbers — LEFT side only */}
      <div className="rank-labels" style={{height: 'var(--board-size)', display:'flex', flexDirection:'column'}}>
        {(flippedView ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]).map(n => (
          <div key={n} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', width:'18px', fontSize:'11px', color:'rgba(255,255,255,0.5)', fontWeight:500}}>
            {n}
          </div>
        ))}
      </div>

      <div className="board-and-files">
        {/* The 8x8 board grid */}
        <div className="board-container">
          {/* Ambient glow */}
          <div className="board-glow" style={{ '--theme-accent': currentTheme.accent }} />

          <div
            ref={boardRef}
            role="grid"
            aria-label="Chess board"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`board-grid chess-board ${isNeonTheme ? 'board-neon' : ''} ${isAIThinking ? 'ai-thinking' : ''}`}
            style={{
              touchAction: 'none',
              '--board-light': '#f0d9b5',
              '--board-dark': '#b58863',
              '--theme-accent': currentTheme.accent,
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

                const isErrorShake = errorSquare === squareName;
                const isKeyboardFocused = keyboardFocus === squareName;

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
                      backgroundColor: sqColor === 'light' ? '#f0d9b5' : '#b58863',
                      width: '100%',
                      height: '100%',
                    }}
                    onClick={() => handleSquareClick(squareName)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(squareName); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => handleDrop(e, squareName)}
                    onTouchStart={(e) => handleTouchStart(e, squareName)}
                  >
                    {showMoveIndicators && isValidTarget && (
                      <MoveIndicator hasCapture={!!cell} themeAccent={currentTheme.accent} />
                    )}
                  </div>
                );
              })
            )}

            {/* ── Pieces Layer ── */}
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

            {/* BEST MOVE SVG ARROW DRAWING */}
            {arrowCoords && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="rgba(226, 176, 74, 0.85)" />
                  </marker>
                </defs>
                <line 
                  x1={arrowCoords.start.x} y1={arrowCoords.start.y} 
                  x2={arrowCoords.end.x} y2={arrowCoords.end.y} 
                  stroke="rgba(226, 176, 74, 0.85)" 
                  strokeWidth="5" 
                  markerEnd="url(#arrowhead)" 
                  strokeDasharray="1"
                />
              </svg>
            )}

            {/* Neon grid lines */}
            {isNeonTheme && <div className="neon-grid" style={{ '--accent': currentTheme.accent }} />}

            {/* Pawn Promotion Modal */}
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

        {/* File letters — BOTTOM only */}
        <div className="file-labels" style={{width:'var(--board-size)', display:'flex', flexDirection:'row'}}>
          {(flippedView ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h']).map(f => (
            <div key={f} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', height:'18px', fontSize:'11px', color:'rgba(255,255,255,0.5)', fontWeight:500}}>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
