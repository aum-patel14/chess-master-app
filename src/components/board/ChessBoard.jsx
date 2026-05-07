import './ChessBoard.css';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import ChessPiece from './ChessPiece';
import MoveIndicator from './MoveIndicator';
import PromotionDialog from './PromotionDialog';
import ParticleCanvas, { triggerCaptureEffect, triggerMoveEffect } from './ParticleCanvas';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard() {
  const { state, handleSquareClick, currentTheme } = useGame();
  const {
    fen, selectedSquare, validMoves, lastMove,
    checkSquare, showCoords, playerColor, promotionPending,
    gameMode, animationsEnabled, history,
  } = state;

  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = chess.board();

  const flipped = gameMode === 'vsAI' && playerColor === 'b';
  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;

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

  // Neon glow overlay for neon theme
  const isNeonTheme = currentTheme.name === 'Neon' || currentTheme.name === 'Midnight';

  return (
    <div className="board-container">
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
                      className={getSquareClasses(squareName)}
                      style={{ backgroundColor: sqColor === 'light' ? currentTheme.light : currentTheme.dark }}
                      onClick={() => handleSquareClick(squareName)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(squareName); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleDrop(e, squareName)}
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
                        />
                      )}

                      {/* Move dot / capture ring */}
                      {isValidTarget && (
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
      {promotionPending && <PromotionDialog color={chess.turn()} />}
    </div>
  );
}
