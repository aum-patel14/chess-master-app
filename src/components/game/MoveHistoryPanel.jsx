import './MoveHistoryPanel.css';
import { useEffect, useRef } from 'react';

export default function MoveHistoryPanel({ history, activeReviewFen, onJumpToMove }) {
  const bottomRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to latest move or selected move
    const el = latestRef.current || bottomRef.current;
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [history, activeReviewFen]);

  // Build move pairs: [{ white: move, black: move, num: index + 1 }]
  const pairs = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
      whiteIndex: i,
      blackIndex: i + 1
    });
  }

  return (
    <div className="move-history-scroll-container">
      {pairs.length === 0 ? (
        <div className="move-history-empty">Game started</div>
      ) : (
        <div className="move-history-table">
          {pairs.map((pair, i) => {
            const isWhiteActive = activeReviewFen === pair.white.fen;
            const isBlackActive = pair.black && activeReviewFen === pair.black.fen;
            const isLastPair = i === pairs.length - 1;

            return (
              <div 
                key={i} 
                className={`move-history-row ${i % 2 === 0 ? 'even-row' : 'odd-row'}`}
                ref={isLastPair ? latestRef : null}
              >
                {/* Column 1: Move Number */}
                <div className="move-col move-num-col">{pair.num}.</div>
                
                {/* Column 2: White Move */}
                <div 
                  className={`move-col move-san-col white-san ${isWhiteActive ? 'active-move' : ''}`}
                  onClick={() => onJumpToMove(pair.whiteIndex)}
                >
                  {pair.white.san}
                </div>

                {/* Column 3: Black Move */}
                <div 
                  className={`move-col move-san-col black-san ${isBlackActive ? 'active-move' : ''}`}
                  onClick={() => pair.black && onJumpToMove(pair.blackIndex)}
                >
                  {pair.black ? pair.black.san : ''}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
