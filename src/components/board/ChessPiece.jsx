import './ChessPiece.css';
import { useState, useEffect, useRef } from 'react';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessPiece({ piece, square, isSelected, animationsEnabled, onDragStart, onDrop, onClick, animStyle, flippedView }) {
  const [isDragging, setIsDragging] = useState(false);
  const [transformOffset, setTransformOffset] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  const prevSquareRef = useRef(square);
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  const src = `${import.meta.env.BASE_URL}pieces/cburnett/${key}.svg`;

  useEffect(() => {
    const prevSquare = prevSquareRef.current;
    if (prevSquare && prevSquare !== square && animationsEnabled) {
      const fileFrom = FILES.indexOf(prevSquare[0]);
      const rankFrom = RANKS.indexOf(prevSquare[1]);
      const fileTo = FILES.indexOf(square[0]);
      const rankTo = RANKS.indexOf(square[1]);

      const cellDeltaX = flippedView ? (fileTo - fileFrom) : (fileFrom - fileTo);
      const cellDeltaY = flippedView ? (rankTo - rankFrom) : (rankFrom - rankTo);

      // Start position (Invert)
      setTransformOffset({ x: cellDeltaX * 100, y: cellDeltaY * 100 });
      setIsAnimating(true);

      // Play transition to target B
      const frame = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setTransformOffset({ x: 0, y: 0 });
        });
      });
    }
    prevSquareRef.current = square;
  }, [square, animationsEnabled, flippedView]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    if (onDragStart) onDragStart(e, square);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleTransitionEnd = () => {
    setIsAnimating(false);
  };

  // Inline transition and transform styles following Chess.com specs
  const transitionStyle = isAnimating
    ? 'transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : 'transform 0.1s';

  const transformStyle = isAnimating
    ? `translate(${transformOffset.x}%, ${transformOffset.y}%) ${isSelected ? 'scale(1.08)' : 'scale(1)'}`
    : (isSelected ? 'scale(1.08)' : 'scale(1)');

  return (
    <img
      src={src}
      alt={`${piece.color === 'w' ? 'White' : 'Black'} ${key}`}
      draggable
      className={`chess-piece ${isSelected ? 'piece-selected' : ''} ${isDragging ? 'piece-dragging' : ''}`}
      onClick={(e) => {
        if (onClick) onClick(e, square);
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDrop) onDrop(e, square);
      }}
      onTransitionEnd={handleTransitionEnd}
      style={{
        ...animStyle,
        width: '85%',
        height: '85%',
        objectFit: 'contain',
        filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
        transition: transitionStyle,
        transform: transformStyle,
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    />
  );
}
