import { useEffect, useRef } from 'react';
import { useToast } from '../../hooks/useToast';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Copy } from 'lucide-react';
import './MoveHistoryPanel.css';

export default function MoveHistoryPanel({ history, activeReviewFen, onJumpToMove }) {
  const { showToast } = useToast();
  const bottomRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to latest move or selected move
    const el = latestRef.current || bottomRef.current;
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [history, activeReviewFen]);

  // Determine current move index in history array
  const currentIndex = activeReviewFen 
    ? history.findIndex(h => h.fen === activeReviewFen) 
    : history.length - 1;

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

  // Navigation Playback actions
  const handleFirst = () => {
    if (history.length === 0) return;
    onJumpToMove(-1); // starting board
  };

  const handlePrev = () => {
    if (history.length === 0) return;
    if (currentIndex > -1) {
      onJumpToMove(currentIndex - 1);
    } else if (currentIndex === -1) {
      onJumpToMove(-1);
    }
  };

  const handleNext = () => {
    if (history.length === 0 || currentIndex === history.length - 1) return;
    onJumpToMove(currentIndex + 1);
  };

  const handleLast = () => {
    if (history.length === 0) return;
    onJumpToMove(history.length - 1);
  };

  // PGN Game Export Downloader
  const handleExportPgn = () => {
    let pgn = `[Event "ChessMaster Pro Arena Match"]\n`;
    pgn += `[Site "ChessMaster Pro Arena"]\n`;
    pgn += `[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]\n`;
    pgn += `[White "${localStorage.getItem('chess_display_name') || 'White Player'}"]\n`;
    pgn += `[Black "AI Opponent"]\n`;
    pgn += `[Result "*"]\n\n`;

    let moveNum = 1;
    for (let i = 0; i < history.length; i += 2) {
      const w = history[i]?.san || '';
      const b = history[i + 1]?.san || '';
      pgn += `${moveNum}. ${w} ${b} `;
      moveNum++;
    }

    pgn += `*`;

    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chessmaster-game-${Date.now()}.pgn`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('PGN File exported successfully! 📝', 'success');
  };

  // Copy FEN to clipboard
  const currentFen = activeReviewFen || (history[history.length - 1]?.fen) || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentFen);
    showToast('FEN copied to clipboard! 📋', 'success');
  };

  return (
    <div className="move-history-outer-wrap">
      {/* 1. SCROLLABLE MOVES LIST */}
      <div className="move-history-scroll-container">
        {pairs.length === 0 ? (
          <div className="move-history-empty font-cinzel">No moves yet</div>
        ) : (
          <div className="move-history-table">
            {pairs.map((pair, i) => {
              const isWhiteActive = currentIndex === pair.whiteIndex;
              const isBlackActive = pair.black && currentIndex === pair.blackIndex;
              const isLastPair = i === pairs.length - 1;

              return (
                <div 
                  key={i} 
                  className={`move-history-row ${i % 2 === 0 ? 'even-row' : 'odd-row'}`}
                  ref={isLastPair ? latestRef : null}
                >
                  <div className="move-col move-num-col">{pair.num}.</div>
                  
                  <div 
                    className={`move-col move-san-col white-san ${isWhiteActive ? 'active-move' : ''}`}
                    onClick={() => onJumpToMove(pair.whiteIndex)}
                  >
                    {pair.white.san}
                  </div>

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

      {/* 2. PLAYBACK CONTROLS */}
      <div className="history-playback-controls">
        <button onClick={handleFirst} disabled={history.length === 0} title="First Move">
          <ChevronsLeft size={16} />
        </button>
        <button onClick={handlePrev} disabled={history.length === 0} title="Previous Move">
          <ChevronLeft size={16} />
        </button>
        <button onClick={handleNext} disabled={history.length === 0 || currentIndex === history.length - 1} title="Next Move">
          <ChevronRight size={16} />
        </button>
        <button onClick={handleLast} disabled={history.length === 0} title="Last Move">
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* 3. FEN DISPLAY WITH CLICK TO COPY */}
      <div className="history-fen-display" onClick={handleCopyFen} title="Click to copy FEN">
        <span className="fen-label">FEN:</span>
        <span className="fen-text">{currentFen}</span>
        <Copy size={12} className="fen-copy-icon" />
      </div>

      {/* 4. PGN EXPORT BUTTON */}
      <div className="history-export-row">
        <button className="export-pgn-btn font-cinzel" onClick={handleExportPgn} disabled={history.length === 0}>
          <Download size={14} /> Export PGN (.pgn)
        </button>
      </div>
    </div>
  );
}
