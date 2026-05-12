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

  const left = `${fileIdx * 12.5}%`;
  // If white promotes on rank 8, rankIdx is 0. 
  // If it's a bottom-aligned promotion, we might want to offset so it doesn't clip off the bottom.
  // The user says "directly on the board at the promotion square".
  
  // 4 pieces stacked vertically or horizontally? 
  // "Display 4 piece options in a row (queen, rook, bishop, knight)" -> Row!
  const top = `${rankIdx * 12.5}%`;

  return (
    <div className="promotion-modal-overlay">
      <div 
        className="promotion-modal-container"
        style={{
          left,
          top: rank === '8' || rank === '1' ? (rankIdx < 4 ? top : 'auto') : top,
          bottom: rankIdx >= 4 ? `${(7 - rankIdx) * 12.5}%` : 'auto',
          transform: fileIdx > 4 ? 'translateX(-75%)' : 'none' // shift left if on right edge
        }}
      >
        {PIECES.map(type => (
          <button
            key={type}
            className="promotion-modal-btn"
            onClick={() => handlePromotion(type)}
          >
            {PIECE_SYMBOLS[color][type]}
          </button>
        ))}
      </div>
    </div>
  );
}
