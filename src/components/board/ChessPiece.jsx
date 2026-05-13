import './ChessPiece.css';
import { useState } from 'react';
import { motion } from 'framer-motion';

// SVG chess pieces rendered inline for zero-dependency, crisp rendering at any size
const PIECE_SVGS = {
  // White pieces
  wK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.63V6M20 8h5" stroke-linecap="square"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-1.5-7 0c-2.5 1-6 5.5 4 13" fill="#fff"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/>
    </g>
  </svg>`,
  wQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM24.5 7.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM41 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM16 8.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM33 8.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/>
      <path d="M9 26c8.5-8.5 15-8.5 21 0l3.5-6c-8.5-12.5-20.5-12.5-28 0L9 26z"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5 6.5 5 16.5 5 23 0 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4l-8 2.5L9 26z"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c4-1.5 17-1.5 21 0"/>
    </g>
  </svg>`,
  wR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="square"/>
      <path d="M34 14l-3 3H14l-3-3"/>
      <path d="M31 17v12.5H14V17" stroke-linecap="square" stroke-linejoin="miter"/>
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
      <path d="M11 14h23" fill="none" stroke-linejoin="miter"/>
    </g>
  </svg>`,
  wB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="#fff" stroke-linecap="butt">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/>
    </g>
  </svg>`,
  wN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/>
      <path d="M24 18c.38 5.12-4.08 9.52-9.5 9.5-3.34.02-9.38-1.04-11.5-7 4.5-3.5 3.5-1 10-9.5" fill="#fff"/>
      <path d="M9.5 25.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z" fill="#fff"/>
      <path d="M14.5 16.5c0 2.5-1.5 7-8 9.5" stroke="#000"/>
      <circle cx="6" cy="12" r="2" fill="#000"/>
    </g>
  </svg>`,
  wP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 13 29.6 13 32.5c0 1.06.28 2.05.75 2.92C10.57 36.79 9 39 9 39H36s-1.57-2.21-4.75-3.58c.47-.87.75-1.86.75-2.92 0-2.9-2.41-5.41-5.41-6.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  // Black pieces
  bK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.63V6M20 8h5" stroke-linecap="square"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1a1a2e" stroke-linecap="butt"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-1.5-7 0c-2.5 1-6 5.5 4 13" fill="#1a1a2e"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/>
    </g>
  </svg>`,
  bQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#1a1a2e" fill-rule="evenodd" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM24.5 7.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM41 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM16 8.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM33 8.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/>
      <path d="M9 26c8.5-8.5 15-8.5 21 0l3.5-6c-8.5-12.5-20.5-12.5-28 0L9 26z"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5 6.5 5 16.5 5 23 0 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4l-8 2.5L9 26z"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c4-1.5 17-1.5 21 0" stroke="#ccc"/>
    </g>
  </svg>`,
  bR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#1a1a2e" fill-rule="evenodd" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="square" stroke="#ccc"/>
      <path d="M34 14l-3 3H14l-3-3"/>
      <path d="M31 17v12.5H14V17" stroke-linecap="square" stroke-linejoin="miter"/>
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
      <path d="M11 14h23" fill="none" stroke-linejoin="miter"/>
    </g>
  </svg>`,
  bB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="#1a1a2e" stroke-linecap="butt">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter" stroke="#ccc"/>
    </g>
  </svg>`,
  bN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fill-rule="evenodd" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#1a1a2e"/>
      <path d="M24 18c.38 5.12-4.08 9.52-9.5 9.5-3.34.02-9.38-1.04-11.5-7 4.5-3.5 3.5-1 10-9.5" fill="#1a1a2e"/>
      <path d="M9.5 25.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z" fill="#1a1a2e"/>
      <path d="M14.5 16.5c0 2.5-1.5 7-8 9.5" stroke="#ccc"/>
      <circle cx="6" cy="12" r="2" fill="#ccc"/>
    </g>
  </svg>`,
  bP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 13 29.6 13 32.5c0 1.06.28 2.05.75 2.92C10.57 36.79 9 39 9 39H36s-1.57-2.21-4.75-3.58c.47-.87.75-1.86.75-2.92 0-2.9-2.41-5.41-5.41-6.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1a1a2e" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
};

export default function ChessPiece({ piece, square, isSelected, animationsEnabled, onDragStart, animStyle }) {
  const [isDragging, setIsDragging] = useState(false);
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  const svg = PIECE_SVGS[key];

  const handleDragStart = (e) => {
    setIsDragging(true);
    onDragStart(e, square);
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <motion.div
      layout={animationsEnabled}
      initial={animationsEnabled ? { scale: 0.6, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8
      }}
      className={`chess-piece ${isSelected ? 'piece-selected' : ''} ${isDragging ? 'piece-dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ zIndex: isSelected ? 10 : 2, ...animStyle }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
