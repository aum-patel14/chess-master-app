import './PromotionDialog.css';
import { useGame } from '../../context/GameContext';

const PIECES = [
  { type: 'q', label: 'Queen' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
];

const PIECE_UNICODE = {
  wq: '♛', wr: '♜', wb: '♝', wn: '♞',
  bq: '♛', br: '♜', bb: '♝', bn: '♞',
};

export default function PromotionDialog({ color }) {
  const { handlePromotion } = useGame();

  return (
    <div className="promotion-overlay">
      <div className="promotion-dialog animate-scaleIn">
        <h3 className="promotion-title">Promote Pawn</h3>
        <p className="promotion-subtitle">Choose your piece</p>
        <div className="promotion-choices">
          {PIECES.map(({ type, label }) => (
            <button
              key={type}
              className="promotion-btn"
              onClick={() => handlePromotion(type)}
              title={label}
              id={`promote-${type}`}
            >
              <span className="promotion-icon">
                {PIECE_UNICODE[`${color}${type}`]}
              </span>
              <span className="promotion-label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
