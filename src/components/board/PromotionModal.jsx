import React from 'react';
import { useGame } from '../../context/GameContext';
import './PromotionModal.css';

const PIECES = ['q', 'r', 'b', 'n'];

const PIECE_SYMBOLS = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞' },
};

export default function PromotionModal({ color, file, rank, flipped }) {
  const { handlePromotion } = useGame();
  
  // Calculate position based on file/rank index
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const fileIdx = flipped ? [...FILES].reverse().indexOf(file) : FILES.indexOf(file);
  const rankIdx = flipped ? [...RANKS].reverse().indexOf(rank) : RANKS.indexOf(rank);

  // Position it exactly over the promotion square, extending downwards or upwards
  const left = `${fileIdx * 12.5}%`;
  
  // A column of 4 pieces works best.
  // If we're at the top (rankIdx < 4), the modal extends down from the square.
  // If we're at the bottom (rankIdx >= 4), the modal extends up from the square.
  const isTopHalf = rankIdx < 4;

  const top = isTopHalf ? `${rankIdx * 12.5}%` : 'auto';
  const bottom = !isTopHalf ? `${(7 - rankIdx) * 12.5}%` : 'auto';

  // We want the modal to be exactly one square wide, and 4 squares tall.
  return (
    <div className="promotion-modal-overlay">
      <div 
        className="promotion-modal-container"
        style={{
          left,
          top,
          bottom,
          width: '12.5%',
          height: '50%',
          flexDirection: isTopHalf ? 'column' : 'column-reverse'
        }}
      >
        {PIECES.map(type => {
          const key = `${color}${type.toUpperCase()}`;
          const src = `${import.meta.env.BASE_URL}pieces/cburnett/${key}.svg`;
          return (
            <button
              key={type}
              className="promotion-modal-btn"
              onClick={(e) => {
                e.stopPropagation();
                handlePromotion(type);
              }}
            >
              <img src={src} alt={type} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
