import './MoveHistoryPanel.css';
import { useEffect, useRef } from 'react';

export default function MoveHistoryPanel({ history }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, [history]);

  const pairs = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ white: history[i], black: history[i + 1] });
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <span>📋 Move History</span>
        <span className="history-count">{history.length} moves</span>
      </div>
      <div className="history-list">
        {pairs.length === 0 ? (
          <p className="history-empty">No moves yet</p>
        ) : (
          pairs.map((pair, i) => (
            <div key={i} className="history-row">
              <span className="move-num">{i + 1}.</span>
              <span className={`move-san move-white ${!pair.black ? 'move-latest' : ''}`}>
                {pair.white?.san}
              </span>
              <span className={`move-san move-black ${pair.black ? 'move-latest' : ''}`}>
                {pair.black?.san || ''}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
