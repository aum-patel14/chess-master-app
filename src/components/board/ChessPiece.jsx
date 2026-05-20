import './ChessPiece.css';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ChessPiece({ piece, square, isSelected, animationsEnabled, onDragStart, onDrop, onClick, animStyle }) {
  const [isDragging, setIsDragging] = useState(false);
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  const src = `${import.meta.env.BASE_URL}pieces/cburnett/${key}.svg`;

  const handleDragStart = (e) => {
    setIsDragging(true);
    if (onDragStart) onDragStart(e, square);
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <motion.img
      src={src}
      alt={`${piece.color === 'w' ? 'White' : 'Black'} ${key}`}
      draggable
      layout={animationsEnabled}
      initial={animationsEnabled ? { scale: 0.6, opacity: 0 } : false}
      animate={{
        scale: isDragging ? 1.15 : isSelected ? 1.08 : 1,
        opacity: isDragging ? 0.75 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 28,
        duration: 0.15,
      }}
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
      style={{
        ...animStyle,
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // #16: smooth sliding transition
        transition: 'filter 0.12s ease',
        filter: isSelected
          ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(100,200,255,0.6))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
      }}
    />
  );
}
