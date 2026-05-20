import './CapturedPieces.css';

const PIECE_UNICODE = {
  q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  // White pieces (inverted)
  Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
};

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };

/**
 * pieces: array of { type, color } or just type strings, from the chess history
 * color: 'w' or 'b' — the CAPTURING side (what they've taken)
 */
export default function CapturedPieces({ pieces, color }) {
  if (!pieces || pieces.length === 0) return (
    <div className="captured-row-empty" />
  );

  const getType = (p) => {
    if (!p) return '';
    const t = typeof p === 'string' ? p : p.type;
    return t ? t.toLowerCase() : '';
  };

  const sorted = [...pieces].sort((a, b) =>
    (PIECE_VALUES[getType(b)] || 0) - (PIECE_VALUES[getType(a)] || 0)
  );

  return (
    <div className={`captured-row captured-${color}`}>
      {sorted.map((p, i) => {
        const type = getType(p);
        // captured pieces are the opponent's color
        const pieceColor = color === 'w' ? 'b' : 'w'; // captured piece color
        const src = `/chess-master-app/pieces/cburnett/${pieceColor}${type.toUpperCase()}.svg`;
        return (
          <img
            key={i}
            src={src}
            alt={type}
            className="cap-piece-img"
            title={type}
          />
        );
      })}
    </div>
  );
}
