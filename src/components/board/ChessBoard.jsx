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
    gameMode, aiDifficulty, animationsEnabled, history, aiStatus, hintSquares, boardFlipped, reviewFen
  } = state;

  const effectiveFen = reviewFen || fen;
  const chess = useMemo(() => new Chess(effectiveFen), [effectiveFen]);
  const board = chess.board();
  const pieces = usePiecePositions(effectiveFen);

  const flippedView = (playerColor === 'b') !== !!boardFlipped;

  const ranks = flippedView ? [...RANKS].reverse() : RANKS;
  const files = flippedView ? [...FILES].reverse() : FILES;

  // Determine if we should show move indicators
  const isMultiplayer = gameMode === 'local';
  const isHardAI = gameMode === 'vsAI' && aiDifficulty > 3;
  const showMoveIndicators = !isMultiplayer && !isHardAI;

  const boardRef = useRef(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [movingPiece, setMovingPiece] = useState(null); // { from, to }
  const prevHistoryLen = useRef(0);

  // Trigger particle effects when moves happen
  useEffect(() => {
    if (!boardRef.current) return;
    if (history.length === 0 || history.length === prevHistoryLen.current) return;

    const lastMv = history[history.length - 1];
    if (!lastMv) return;
    prevHistoryLen.current = history.length;

    // Animate the moved piece
    setMovingPiece(lastMv.to);
    setTimeout(() => setMovingPiece(null), 350);

    const toEl = document.getElementById(`sq-${lastMv.to}`);
    if (lastMv.captured) {
      triggerCaptureEffect({ current: boardRef.current }, toEl, lastMv.color === 'w' ? 'b' : 'w');
    } else {
      triggerMoveEffect({ current: boardRef.current }, toEl);
    }
  }, [history]);

  const getSquareColor = (file, rank) => {
    const fileIdx = FILES.indexOf(file);
    const rankIdx = parseInt(rank) - 1;
    return (fileIdx + rankIdx) % 2 === 0 ? 'dark' : 'light';
  };

  const getSquareClasses = (squareName) => {
    const classes = ['board-square'];
    if (selectedSquare === squareName) classes.push('selected');
    if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) classes.push('last-move');
    if (checkSquare === squareName) classes.push('in-check');
    if (hintSquares?.from === squareName) classes.push('hint-from');
    if (hintSquares?.to === squareName) classes.push('hint-to');
    if (movingPiece === squareName) classes.push('sq-landing');
    return classes.join(' ');
  };

  const handleDragStart = (e, square) => {
    setDraggedFrom(square);
    handleSquareClick(square);
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image
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

  const handleTouchStart = (e, square) => {
    // We prevent default inside if we don't want scrolling, but handled by touch-action: none
    handleSquareClick(square);
  };

  const handleTouchEnd = (e, square) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSquare = el?.dataset?.square || el?.closest('[data-square]')?.dataset?.square;
    if (targetSquare && targetSquare !== square) {
      handleSquareClick(targetSquare);
    }
  };

  // Neon glow overlay for neon theme
  const isNeonTheme = currentTheme.name === 'Neon' || currentTheme.name === 'Midnight';

  const getSquareOffset = (squareName) => {
    const file = squareName[0];
    const rank = squareName[1];
    const fileIdx = FILES.indexOf(file);
    const rankIdx = RANKS.indexOf(rank);
    const x = flippedView ? 7 - fileIdx : fileIdx;
    const y = flippedView ? 7 - rankIdx : rankIdx;
    return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
  };

  return (
    <div className="board-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '600px', marginBottom: '4px' }}>
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
            {aiStatus === 'ready' ? 'AI Ready ✓' : 
             aiStatus === 'loading' ? 'Initializing AI...' : 
             'Playing in simple mode'}
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

      {/* Ambient glow based on theme */}
      <div className="board-glow" style={{ '--theme-accent': currentTheme.accent }} />

      {/* Premium wooden / dark frame */}
      <div className="board-frame" style={{ '--frame-accent': currentTheme.accent }}>
        {/* Corner ornaments */}
        <div className="frame-corner frame-tl">♟</div>
        <div className="frame-corner frame-tr">♞</div>
        <div className="frame-corner frame-bl">♝</div>
        <div className="frame-corner frame-br">♜</div>

        <div className="board-wrapper">
          <div className="board-row-container">
            {/* The board itself */}
            <div
              ref={boardRef}
              className={`chess-board ${isNeonTheme ? 'board-neon' : ''}`}
              style={{
                touchAction: 'none',
                '--board-light': currentTheme.light,
                '--board-dark': currentTheme.dark,
                '--theme-accent': currentTheme.accent,
              }}
            >
              {ranks.map((rank) =>
                files.map((file) => {
                  const squareName = `${file}${rank}`;
                  const boardRank = RANKS.indexOf(rank);
                  const boardFile = FILES.indexOf(file);
                  const cell = board[boardRank]?.[boardFile];
                  const isValidTarget = validMoves.includes(squareName);
                  const sqColor = getSquareColor(file, rank);

                  const isFileEdge = flippedView ? rank === '8' : rank === '1';
                  const isRankEdge = flippedView ? file === 'h' : file === 'a';
                  const labelColor = sqColor === 'light' ? currentTheme.dark : currentTheme.light;

                  return (
                    <div
                      key={squareName}
                      id={`sq-${squareName}`}
                      data-square={squareName}
                      className={`${getSquareClasses(squareName)} ${sqColor}-square`}
                      style={{ 
                        backgroundColor: sqColor === 'light' ? currentTheme.light : currentTheme.dark,
                        width: '100%',
                        height: '100%',
                        fontSize: 'clamp(24px, 6vw, 48px)'
                      }}
                      onClick={() => handleSquareClick(squareName)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(squareName); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleDrop(e, squareName)}
                      onTouchStart={(e) => handleTouchStart(e, squareName)}
                      onTouchEnd={(e) => handleTouchEnd(e, squareName)}
                    >
                      {/* Inner Coordinates */}
                      {showCoords && isRankEdge && (
                        <div className="inner-coord rank-coord" style={{ color: labelColor }}>
                          {rank}
                        </div>
                      )}
                      {showCoords && isFileEdge && (
                        <div className="inner-coord file-coord" style={{ color: labelColor }}>
                          {file}
                        </div>
                      )}

                      {/* Move dot / capture ring */}
                      {showMoveIndicators && isValidTarget && (
                        <MoveIndicator hasCapture={!!cell} themeAccent={currentTheme.accent} />
                      )}
                    </div>
                  );
                })
              )}

              {/* Pieces Layer */}
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
                      pointerEvents: 'none' // Let events pass through to grid cells, except piece drag
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

              {/* Promotion dialog */}
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
      </div>

    </div>
  );
}
