import './CapturedPieces.css';

const PIECE_UNICODE = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };

export default function CapturedPieces({ pieces, color }) {
  if (!pieces || pieces.length === 0) return null;

  const sorted = [...pieces].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
  const advantage = pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);

  return (
    <div className={`captured-row captured-${color}`}>
      <div className="captured-pieces">
        {sorted.map((p, i) => (
          <span key={i} className={`cap-piece cap-${color}`}>
            {PIECE_UNICODE[p]}
          </span>
        ))}
      </div>
      {advantage > 0 && (
        <span className="advantage">+{advantage}</span>
      )}
    </div>
  );
}
