import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import ChessPiece from './board/ChessPiece';
import PromotionModal from './board/PromotionModal';
import ParticleCanvas, { triggerCaptureEffect, triggerMoveEffect } from './board/ParticleCanvas';
import { usePiecePositions } from './board/usePiecePositions';

interface ChessBoardProps {
  bestMoveArrow?: { from: string; to: string } | null;
  analysisResults?: any;
  currentReviewIndex?: number | null;
  customState?: any;
  customHandleSquareClick?: (square: string) => void;
  customHandlePromotion?: (pieceType: string) => void;
  readOnly?: boolean;
  arrows?: Array<{ from: string; to: string; color?: string }> | null;
  highlights?: Array<{ square: string; color?: string }> | null;
  onMove?: (from: string, to: string) => void;
  boardElementRef?: React.RefObject<HTMLDivElement | null>;
}

const getHighlightColor = (colorName?: string) => {
  const c = colorName?.toLowerCase();
  if (c === 'red') return 'rgba(239, 68, 68, 0.4)';
  if (c === 'green') return 'rgba(34, 197, 94, 0.4)';
  if (c === 'blue') return 'rgba(59, 130, 246, 0.4)';
  return 'rgba(234, 179, 8, 0.4)'; // yellow/gold default
};

const getArrowColorCode = (colorName?: string) => {
  const c = colorName?.toLowerCase();
  if (c === 'red') return '#ef4444';
  if (c === 'green') return '#22c55e';
  if (c === 'blue') return '#3b82f6';
  return '#f59e0b'; // yellow/gold default
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard({ 
  bestMoveArrow, 
  analysisResults, 
  currentReviewIndex,
  customState,
  customHandleSquareClick,
  customHandlePromotion,
  readOnly = false,
  arrows = [],
  highlights = [],
  onMove,
  boardElementRef
}: ChessBoardProps) {
  const context = useGame();
  const state = customState || context.state;
  const handleSquareClick = customHandleSquareClick || context.handleSquareClick;
  const {
    fen, selectedSquare, validMoves, lastMove,
    checkSquare, showCoords, playerColor, promotionPending,
    gameMode, aiDifficulty, animationsEnabled, history,
    hintSquares, boardFlipped, reviewFen, isAIThinking, errorSquare
  } = state;

  const effectiveFen = reviewFen || fen;
  const chess = useMemo(() => {
    try {
      return effectiveFen ? new Chess(effectiveFen) : new Chess();
    } catch (e) {
      return new Chess();
    }
  }, [effectiveFen]);
  
  const board = chess.board();
  const pieces = usePiecePositions(effectiveFen);
  
  // Default orientation should match selected player color:
  // white player -> white at bottom, black player -> black at bottom.
  const isFlipped = (playerColor === 'b') !== !!boardFlipped;

  const localBoardRef = useRef<HTMLDivElement>(null);
  const boardRef = boardElementRef || localBoardRef;

  // Trigger Brilliant move celebration when navigated in analysis review
  useEffect(() => {
    if (!boardRef.current || currentReviewIndex === null || currentReviewIndex === undefined) return;
    if (!analysisResults || !analysisResults[currentReviewIndex]) return;

    const activeAnalysis = analysisResults[currentReviewIndex];
    if (activeAnalysis.classification === 'Brilliant' || activeAnalysis.classification === 'Great') {
      const toEl = document.getElementById(`sq-${activeAnalysis.to}`);
      if (toEl) {
        import('./board/ParticleCanvas').then(({ triggerBrilliantEffect }) => {
          if (triggerBrilliantEffect && boardRef.current) {
            triggerBrilliantEffect(boardRef as any, toEl);
          }
        });
        import('../engine/soundManager').then(({ soundManager }) => {
          if (soundManager && typeof soundManager.playBrilliant === 'function') {
            soundManager.playBrilliant();
          }
        });
      }
    }
  }, [currentReviewIndex, analysisResults]);

  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [movingPiece, setMovingPiece] = useState<string | null>(null);
  const prevHistoryLen = useRef(0);
  const touchDragState = useRef({ active: false, fromSquare: null as string | null });
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const [touchActiveId, setTouchActiveId] = useState<string | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const [capturedPieceAnim, setCapturedPieceAnim] = useState<{
    square: string;
    type: string;
    color: string;
    id: string;
  } | null>(null);

  const lastActiveMoveRef = useRef<any>(null);
  useEffect(() => {
    if (!animationsEnabled) return;
    
    const currentActiveMove = (currentReviewIndex !== null && currentReviewIndex !== undefined) 
      ? history[currentReviewIndex] 
      : history[history.length - 1];
      
    if (currentActiveMove && currentActiveMove !== lastActiveMoveRef.current) {
      if (currentActiveMove.captured) {
        setCapturedPieceAnim({
          square: currentActiveMove.to,
          type: currentActiveMove.captured,
          color: currentActiveMove.color === 'w' ? 'b' : 'w',
          id: `cap_${Date.now()}`
        });
        
        const timer = setTimeout(() => {
          setCapturedPieceAnim(null);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
    lastActiveMoveRef.current = currentActiveMove;
  }, [history, currentReviewIndex, animationsEnabled]);

  // Play slide/move effects on history change
  useEffect(() => {
    if (!boardRef.current) return;
    if (history.length === 0 || history.length === prevHistoryLen.current) return;

    const lastMv = history[history.length - 1];
    if (!lastMv) return;
    prevHistoryLen.current = history.length;

    setMovingPiece(lastMv.to);
    const timer = setTimeout(() => setMovingPiece(null), 350);

    const toEl = document.getElementById(`sq-${lastMv.to}`);
    if (lastMv.captured) {
      triggerCaptureEffect({ current: boardRef.current }, toEl, lastMv.color === 'w' ? 'b' : 'w');
    } else {
      triggerMoveEffect({ current: boardRef.current }, toEl);
    }

    return () => clearTimeout(timer);
  }, [history]);

  // Convert coordinate square to percent offsets
  const getSquareOffset = (squareName: string) => {
    const file = squareName[0];
    const rank = squareName[1];
    const fileIdx = FILES.indexOf(file);
    const rankIdx = RANKS.indexOf(rank);
    const x = isFlipped ? 7 - fileIdx : fileIdx;
    const y = isFlipped ? 7 - rankIdx : rankIdx;
    return { left: `${x * 12.5}%`, top: `${y * 12.5}%` };
  };

  // Drag and drop handlers
  const handleDragStart = (e: any, square: string) => {
    if (readOnly) return;
    setDraggedFrom(square);
    handleSquareClick(square);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.style.cssText = 'width:60px;height:60px;position:fixed;top:-100px;left:-100px;opacity:0.9;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 30, 30);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDrop = (e: any, square: string) => {
    e.preventDefault();
    if (readOnly) return;
    setDragOver(null);
    if (draggedFrom && draggedFrom !== square) {
      if (onMove) {
        onMove(draggedFrom, square);
      } else {
        handleSquareClick(square);
      }
    }
    setDraggedFrom(null);
  };

  // Touch handlers
  const handlePieceTouchStart = (e: any, square: string, pieceId: string) => {
    if (readOnly) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setTouchActiveId(pieceId);
    setTouchOffset({ x: 0, y: 0 });
    setDraggedFrom(square);
    handleSquareClick(square);
  };

  const handleTouchStart = (e: any, square: string) => {
    if (readOnly) return;
    touchDragState.current = { active: true, fromSquare: square };
    handleSquareClick(square);
  };

  const handleTouchMove = (e: any) => {
    if (readOnly) return;
    if (e.touches.length === 0) return;
    const touch = e.touches[0];

    if (touchActiveId) {
      e.preventDefault();
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      setTouchOffset({ x: dx, y: dy });

      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetSquare = el?.getAttribute('data-square') || el?.closest('[data-square]')?.getAttribute('data-square');
      if (targetSquare && targetSquare !== dragOver) {
        setDragOver(targetSquare);
      }
    } else if (touchDragState.current.active) {
      e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetSquare = el?.getAttribute('data-square') || el?.closest('[data-square]')?.getAttribute('data-square');
      if (targetSquare && targetSquare !== dragOver) {
        setDragOver(targetSquare);
      }
    }
  };

  const handleTouchEnd = (e: any) => {
    e.preventDefault();
    if (readOnly) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSquare = el?.getAttribute('data-square') || el?.closest('[data-square]')?.getAttribute('data-square');

    if (touchActiveId) {
      if (targetSquare && draggedFrom && targetSquare !== draggedFrom) {
        if (onMove) {
          onMove(draggedFrom, targetSquare);
        } else {
          handleSquareClick(targetSquare);
        }
      }
      setTouchActiveId(null);
      setTouchOffset({ x: 0, y: 0 });
      setDraggedFrom(null);
    } else if (touchDragState.current.active) {
      if (targetSquare && touchDragState.current.fromSquare && targetSquare !== touchDragState.current.fromSquare) {
        if (onMove) {
          onMove(touchDragState.current.fromSquare, targetSquare);
        } else {
          handleSquareClick(targetSquare);
        }
      }
      touchDragState.current = { active: false, fromSquare: null };
    }
    setDragOver(null);
  };

  // Custom click handler wrapper to support onMove
  const handleSquareClickWithOnMove = (square: string) => {
    if (readOnly) return;
    if (onMove) {
      if (selectedSquare && selectedSquare !== square) {
        onMove(selectedSquare, square);
      } else {
        handleSquareClick(square);
      }
    } else {
      handleSquareClick(square);
    }
  };

  // Generate coordinate array of squares following correct visual representation
  const renderedSquares = useMemo(() => {
    const arr = [];
    // chess.board() is indexed from rank 8 to rank 1.
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const rankLabel = 8 - row;
        const fileLabel = String.fromCharCode(97 + col);
        const squareName = `${fileLabel}${rankLabel}`;
        
        // Physical index in board array
        const boardRank = row;
        const boardCol = col;
        const cell = board[boardRank]?.[boardCol];
        
        arr.push({
          row,
          col,
          rankLabel,
          fileLabel,
          squareName,
          cell,
        });
      }
    }
    return arr;
  }, [board]);

  return (
    <div
      ref={boardRef}
      role="grid"
      aria-label="Chess board"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`chess-board ${isAIThinking ? 'ai-thinking' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        background: '#B58863', // Chess.com dark squares
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gridTemplateRows: 'repeat(8, 1fr)',
        userSelect: 'none',
        touchAction: 'none',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Squares Rendering */}
      {renderedSquares.map(({ row, col, rankLabel, fileLabel, squareName, cell }) => {
        // Determine square coordinate color and active state colors
        const isLight = (row + col) % 2 !== 0; // standard alternation
        const defaultBg = isLight ? '#F0D9B5' : '#B58863';
        
        const isSelected = selectedSquare === squareName;
        const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
        const isCheck = checkSquare === squareName;
        const isHint = hintSquares && (hintSquares.from === squareName || hintSquares.to === squareName);
        const isDragOver = dragOver === squareName;
        
        const isValidTarget = !readOnly && validMoves.includes(squareName);
        const highlight = highlights?.find(h => h.square === squareName);
        
        // Decide coordinate label visibility: ranks on left edge, files on bottom edge
        // Left edge: col === 0 (when not flipped) or col === 7 (when flipped)
        const coordsOn = showCoords !== false;
        const showRank = coordsOn && (col === (isFlipped ? 7 : 0));
        const showFile = coordsOn && (row === (isFlipped ? 0 : 7));

        // Placement indices in CSS Grid (invert if flipped)
        const gridRow = isFlipped ? 8 - row : row + 1;
        const gridCol = isFlipped ? 8 - col : col + 1;

        return (
          <div
            key={squareName}
            id={`sq-${squareName}`}
            data-square={squareName}
            onClick={readOnly ? undefined : () => handleSquareClickWithOnMove(squareName)}
            onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setDragOver(squareName); }}
            onDragLeave={readOnly ? undefined : () => setDragOver(null)}
            onDrop={readOnly ? undefined : (e) => handleDrop(e, squareName)}
            onTouchStart={readOnly ? undefined : (e) => handleTouchStart(e, squareName)}
            style={{
              gridRow,
              gridColumn: gridCol,
              background: defaultBg,
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: readOnly ? 'default' : 'pointer',
              transition: 'background-color 100ms ease',
            }}
          >
            {/* Last Move Overlay */}
            {isLastMove && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(20, 85, 30, 0.2)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}

            {/* Selection Overlay */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(20, 85, 30, 0.5)',
                  boxShadow: 'inset 0 0 0 2px rgb(20, 85, 30)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}

            {/* Check overlay with red flash */}
            {isCheck && (
              <div
                className="check-flash-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(226, 75, 74, 0.5)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}

            {/* Hint / Dragover Overlay */}
            {(isHint || isDragOver) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: isLight ? 'rgba(127, 201, 127, 0.35)' : 'rgba(127, 201, 127, 0.25)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}

            {/* Highlight Overlay */}
            {highlight && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: getHighlightColor(highlight.color),
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}

            {/* Rank Label (inside, left-top, low opacity) */}
            {showRank && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isLight ? '#B58863' : '#F0D9B5',
                  opacity: 0.55,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                {rankLabel}
              </span>
            )}

            {/* File Label (inside, right-bottom, low opacity) */}
            {showFile && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isLight ? '#B58863' : '#F0D9B5',
                  opacity: 0.55,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                {fileLabel}
              </span>
            )}

            {/* Valid Move Indicator (Empty: small dot, Capture: green ring) */}
            {isValidTarget && !cell && (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 85, 30, 0.4)',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
            )}
            {isValidTarget && cell && (
              <div
                style={{
                  position: 'absolute',
                  width: '80%',
                  height: '80%',
                  border: '4px solid rgba(20, 85, 30, 0.4)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
            )}

            {/* Analysis move quality badge overlay */}
            {(() => {
              const activeAnalysis = (currentReviewIndex !== null && currentReviewIndex !== undefined && currentReviewIndex >= 0 && analysisResults && analysisResults[currentReviewIndex])
                ? analysisResults[currentReviewIndex]
                : null;
              const isAnalysisMoveTo = activeAnalysis && activeAnalysis.to === squareName;
              if (isAnalysisMoveTo && activeAnalysis.badge !== ' ') {
                return (
                  <span 
                    className={`analysis-move-badge ${activeAnalysis.badgeClass}`}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      zIndex: 25,
                      fontSize: '8px',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      fontWeight: 900,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      color: '#ffffff',
                    }}
                  >
                    {activeAnalysis.badge}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        );
      })}

      {/* Captured Fading Piece Overlay */}
      {capturedPieceAnim && (
        <div
          key={capturedPieceAnim.id}
          style={{
            position: 'absolute',
            width: '12.5%',
            height: '12.5%',
            ...getSquareOffset(capturedPieceAnim.square),
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <ChessPiece
              piece={{ color: capturedPieceAnim.color, type: typeof capturedPieceAnim.type === 'string' ? capturedPieceAnim.type : 'p' }}
              square={capturedPieceAnim.square}
              isSelected={false}
              animationsEnabled={false}
              animStyle={{ animation: 'pieceFadeOut 200ms linear forwards' }}
              flippedView={isFlipped}
            />
          </div>
        </div>
      )}

      {/* Absolute Pieces Layer */}
      {pieces.map((p) => {
        const isSelected = selectedSquare === p.square;
        const isLanding = movingPiece === p.square;
        const isActiveTouch = touchActiveId === p.id;
        
        // Find if this piece is the attacker in a capture
        const currentActiveMove = (currentReviewIndex !== null && currentReviewIndex !== undefined) 
          ? history[currentReviewIndex] 
          : history[history.length - 1];
        const isCaptureAttacker = animationsEnabled && currentActiveMove && 
          currentActiveMove.to === p.square && currentActiveMove.captured;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              width: '12.5%',
              height: '12.5%',
              ...getSquareOffset(p.square),
              zIndex: isActiveTouch ? 100 : (isSelected || isLanding || draggedFrom === p.square ? 10 : 2),
              pointerEvents: 'none',
              transform: isActiveTouch ? `translate3d(${touchOffset.x}px, ${touchOffset.y}px, 0)` : undefined,
              transition: isActiveTouch ? 'none' : undefined,
            }}
          >
            <div
              onTouchStart={readOnly ? undefined : (e) => handlePieceTouchStart(e, p.square, p.id)}
              style={{ pointerEvents: readOnly ? 'none' : (isActiveTouch ? 'none' : 'auto'), width: '100%', height: '100%' }}
            >
              <ChessPiece
                piece={p}
                square={p.square}
                isSelected={isSelected}
                animationsEnabled={animationsEnabled}
                onDragStart={readOnly ? undefined : handleDragStart}
                onDrop={readOnly ? undefined : handleDrop}
                onClick={readOnly ? undefined : () => handleSquareClickWithOnMove(p.square)}
                animStyle={{ animation: isLanding ? 'slideIn 0.2s ease' : 'none' }}
                flippedView={isFlipped}
                isCaptureAttacker={isCaptureAttacker}
              />
            </div>
          </div>
        );
      })}

      {/* Arrows SVG Overlay */}
      {((arrows && arrows.length > 0) || bestMoveArrow) && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 15,
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
          }}
        >
          <defs>
            <marker id="arrowhead-best" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#6bbd44" />
            </marker>
            <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
            </marker>
            <marker id="arrowhead-green" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
            </marker>
            <marker id="arrowhead-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
            </marker>
            <marker id="arrowhead-yellow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Render Best Move Arrow */}
          {bestMoveArrow && (() => {
            const fromOffset = getSquareOffset(bestMoveArrow.from);
            const toOffset = getSquareOffset(bestMoveArrow.to);
            if (!fromOffset || !toOffset) return null;
            
            const getPct = (str: string) => parseFloat(str);
            const x1 = getPct(fromOffset.left) + 6.25;
            const y1 = getPct(fromOffset.top) + 6.25;
            const x2 = getPct(toOffset.left) + 6.25;
            const y2 = getPct(toOffset.top) + 6.25;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;
            
            const shorten = 3.5;
            const x2Short = x1 + (dx / len) * (len - shorten);
            const y2Short = y1 + (dy / len) * (len - shorten);

            return (
              <line
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2Short}%`}
                y2={`${y2Short}%`}
                stroke="#6bbd44"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.8"
                markerEnd="url(#arrowhead-best)"
              />
            );
          })()}

          {/* Render Custom Arrows */}
          {arrows && arrows.map((arrow, idx) => {
            const fromOffset = getSquareOffset(arrow.from);
            const toOffset = getSquareOffset(arrow.to);
            if (!fromOffset || !toOffset) return null;

            const getPct = (str: string) => parseFloat(str);
            const x1 = getPct(fromOffset.left) + 6.25;
            const y1 = getPct(fromOffset.top) + 6.25;
            const x2 = getPct(toOffset.left) + 6.25;
            const y2 = getPct(toOffset.top) + 6.25;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;

            const shorten = 3.5;
            const x2Short = x1 + (dx / len) * (len - shorten);
            const y2Short = y1 + (dy / len) * (len - shorten);
            const colorCode = getArrowColorCode(arrow.color);
            const colorName = arrow.color?.toLowerCase() || 'yellow';
            const markerId = `arrowhead-${colorName === 'gold' ? 'yellow' : colorName}`;

            return (
              <line
                key={`custom-arrow-${idx}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2Short}%`}
                y2={`${y2Short}%`}
                stroke={colorCode}
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.85"
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
        </svg>
      )}

      {/* Particle overlay effects */}
      <ParticleCanvas boardRef={boardRef} />

      {/* Pawn Promotion Modal overlay */}
      {promotionPending && (
        <PromotionModal
          color={chess.turn()}
          file={promotionPending.to[0]}
          rank={promotionPending.to[1]}
          flipped={isFlipped}
          customHandlePromotion={customHandlePromotion}
        />
      )}
    </div>
  );
}
