import './ChessBoard.css';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import ChessPiece from './ChessPiece';
import MoveIndicator from './MoveIndicator';
import PromotionModal from './PromotionModal';
import ParticleCanvas, { triggerCaptureEffect, triggerMoveEffect } from './ParticleCanvas';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard() {
  const { state, handleSquareClick, currentTheme } = useGame();
  const {
    fen, selectedSquare, validMoves, lastMove,
    checkSquare, showCoords, playerColor, promotionPending,
    gameMode, aiDifficulty, animationsEnabled, history,
  } = state;

  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = chess.board();

  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(playerColor === 'b');
  }, [playerColor]);

  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;

  // Determine if we should show move indicators
  const isMultiplayer = gameMode === 'local';
  const isHardAI = gameMode === 'vsAI' && aiDifficulty > 3;
  const showMoveIndicators = !isMultiplayer && !isHardAI;

  const boardRef = useRef(null);
  const [boardSize, setBoardSize] = useState(
    Math.min(window.innerWidth - 32, window.innerHeight - 200, 620)
  );

  useEffect(() => {
    const handleResize = () => setBoardSize(
      Math.min(window.innerWidth - 32, window.innerHeight - 200, 620)
    );
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (dragOver === squareName && validMoves.includes(squareName)) classes.push('drag-over');
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

  return (
    <div className="board-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '4px' }}>
        <div className="icon-btn-wrapper">
          <button 
            className="small-icon-btn"
            onClick={() => setFlipped(!flipped)} 
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
          {/* Top file labels */}
          {showCoords && (
            <div className="coord-row coord-files">
              <div className="coord-corner" />
              {files.map(f => <div key={f} className="coord-label">{f}</div>)}
              <div className="coord-corner" />
            </div>
          )}

          <div className="board-row-container">
            {/* Left rank labels */}
            {showCoords && (
              <div className="coord-col coord-ranks">
                {ranks.map(r => <div key={r} className="coord-label">{r}</div>)}
              </div>
            )}

            {/* The board itself */}
            <div
              ref={boardRef}
              className={`chess-board ${isNeonTheme ? 'board-neon' : ''}`}
              style={{
                width: boardSize + 'px',
                height: boardSize + 'px',
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

                  return (
                    <div
                      key={squareName}
                      id={`sq-${squareName}`}
                      data-square={squareName}
                      className={getSquareClasses(squareName)}
                      style={{ 
                        backgroundColor: sqColor === 'light' ? currentTheme.light : currentTheme.dark,
                        width: (boardSize / 8) + 'px',
                        height: (boardSize / 8) + 'px',
                        fontSize: (boardSize / 10) + 'px'
                      }}
                      onClick={() => handleSquareClick(squareName)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(squareName); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleDrop(e, squareName)}
                      onTouchStart={(e) => handleTouchStart(e, squareName)}
                      onTouchEnd={(e) => handleTouchEnd(e, squareName)}
                    >
                      {/* Piece */}
                      {cell && (
                        <ChessPiece
                          piece={cell}
                          square={squareName}
                          isSelected={selectedSquare === squareName}
                          isLanding={movingPiece === squareName}
                          animationsEnabled={animationsEnabled}
                          onDragStart={handleDragStart}
                          animStyle={{ animation: (movingPiece === squareName) ? 'slideIn 0.2s ease' : 'none' }}
                        />
                      )}

                      {/* Move dot / capture ring */}
                      {showMoveIndicators && isValidTarget && (
                        <MoveIndicator hasCapture={!!cell} themeAccent={currentTheme.accent} />
                      )}
                    </div>
                  );
                })
              )}

              {/* Particle overlay */}
              <ParticleCanvas boardRef={boardRef} />

              {/* Neon grid lines */}
              {isNeonTheme && <div className="neon-grid" style={{ '--accent': currentTheme.accent }} />}
            </div>

            {/* Right rank labels */}
            {showCoords && (
              <div className="coord-col coord-ranks">
                {ranks.map(r => <div key={r} className="coord-label">{r}</div>)}
              </div>
            )}
          </div>

          {/* Bottom file labels */}
          {showCoords && (
            <div className="coord-row coord-files">
              <div className="coord-corner" />
              {files.map(f => <div key={f} className="coord-label">{f}</div>)}
              <div className="coord-corner" />
            </div>
          )}
        </div>
      </div>

      {/* Promotion dialog */}
      {promotionPending && (
        <PromotionModal 
          color={chess.turn()} 
          file={promotionPending.to[0]} 
          rank={promotionPending.to[1]} 
          flipped={flipped} 
        />
      )}
    </div>
  );
}
