import './CapturedPieces.css';

const PIECE_UNICODE = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };

export default function CapturedPieces({ pieces, color }) {
  if (!pieces || pieces.length === 0) return null;

  const getType = (p) => {
    if (!p) return '';
    const t = typeof p === 'string' ? p : p.type;
    return t ? t.toLowerCase() : '';
  };

  const sorted = [...pieces].sort((a, b) => (PIECE_VALUES[getType(b)] || 0) - (PIECE_VALUES[getType(a)] || 0));
  const advantage = pieces.reduce((sum, p) => sum + (PIECE_VALUES[getType(p)] || 0), 0);

  return (
    <div className={`captured-row captured-${color}`}>
      <div className="captured-pieces">
        {sorted.map((p, i) => (
          <span key={i} className={`cap-piece cap-${color}`}>
            {PIECE_UNICODE[getType(p)]}
          </span>
        ))}
      </div>
      {/* We don't need to show advantage here, it's shown in eval bar or player card! */}
    </div>
  );
}
