import './MoveHistoryPanel.css';
import { useEffect, useRef } from 'react';

export default function MoveHistoryPanel({ history }) {
  const bottomRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to latest move
    const el = latestRef.current || bottomRef.current;
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [history]);

  // Build move pairs: [{ white, black }]
  const pairs = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ white: history[i], black: history[i + 1] });
  }

  const lastIdx = pairs.length - 1;
  const isLastWhite = history.length % 2 === 1; // last move is white's

  return (
    <div className="history-panel">
      <div className="history-list">
        {pairs.length === 0 ? (
          <p className="history-empty">No moves yet</p>
        ) : (
          pairs.map((pair, i) => {
            const isLastPair = i === lastIdx;
            return (
              <div
                key={i}
                className={`history-row ${isLastPair ? 'history-row-latest' : ''}`}
                ref={isLastPair ? latestRef : null}
              >
                <span className="move-num">{i + 1}.</span>
                <span className={`move-san move-white ${isLastPair && isLastWhite ? 'move-latest' : ''}`}>
                  {pair.white?.san}
                </span>
                <span className={`move-san move-black ${isLastPair && !isLastWhite && pair.black ? 'move-latest' : ''}`}>
                  {pair.black?.san || ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
