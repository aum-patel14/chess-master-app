import './ChessPiece.css';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ChessPiece({ piece, square, isSelected, animationsEnabled, onDragStart, onDrop, animStyle }) {
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
      alt={key}
      draggable
      layout={animationsEnabled}
      initial={animationsEnabled ? { scale: 0.6, opacity: 0 } : false}
      animate={{ scale: isDragging ? 1.1 : 1, opacity: isDragging ? 0.8 : 1 }}
      transition={{
        type: 'tween',
        duration: 0.15,
        ease: 'easeOut'
      }}
      className={`chess-piece ${isSelected ? 'piece-selected' : ''} ${isDragging ? 'piece-dragging' : ''}`}
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
        touchAction: 'none'
      }}
    />
  );
}
