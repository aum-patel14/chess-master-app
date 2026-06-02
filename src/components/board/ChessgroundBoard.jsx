import { useEffect, useRef, useMemo, useState } from 'react';
import { Chessground } from 'chessground';
import { Chess } from 'chess.js';
import { useGame } from '../../context/GameContext';
import 'chessground/assets/chessground.base.css';
import './ChessgroundBoard.css';

export default function ChessgroundBoard({ bestMoveArrow, analysisResults, currentReviewIndex, onMoveMade }) {
  const { state, handleSquareClick, currentTheme } = useGame();
  const {
    fen, selectedSquare, lastMove,
    checkSquare, playerColor, boardFlipped,
    isAIThinking, animationsEnabled
  } = state;

  const boardRef = useRef(null);
  const cgRef = useRef(null);
  const [promotionPending, setPromotionPending] = useState(null);

  // Initialize chess.js for legal destination calculation
  const chess = useMemo(() => new Chess(fen), [fen]);
  const flippedView = (playerColor === 'b') !== !!boardFlipped;

  // 1. Calculate chess.js legal destinations map for Chessground
  const legalDests = useMemo(() => {
    const dests = new Map();
    if (chess.isGameOver()) return dests;

    const moves = chess.moves({ verbose: true });
    moves.forEach((m) => {
      if (!dests.has(m.from)) {
        dests.set(m.from, []);
      }
      dests.get(m.from).push(m.to);
    });
    return dests;
  }, [chess]);

  // 2. Handle move completed inside Chessground
  const onMove = (from, to) => {
    const piece = chess.get(from);
    
    // Check if move is pawn promotion
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1')) {
      // Trigger promotion modal
      setPromotionPending({ from, to });
      return;
    }

    // Normal move
    if (onMoveMade) {
      onMoveMade({ from, to });
    } else {
      // Compatibility fallback to custom board click handler
      handleSquareClick(from);
      handleSquareClick(to);
    }
  };

  const handlePromotePiece = (choice) => {
    if (promotionPending) {
      if (onMoveMade) {
        onMoveMade({ from: promotionPending.from, to: promotionPending.to, promotion: choice });
      } else {
        handleSquareClick(promotionPending.from);
        handleSquareClick(promotionPending.to);
        // Dispatch promotion choices inside game contexts...
      }
      setPromotionPending(null);
    }
  };

  // 3. Initialize & Sync Chessground config
  useEffect(() => {
    if (!boardRef.current) return;

    const config = {
      fen: fen,
      orientation: flippedView ? 'black' : 'white',
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      coordinates: true,
      autoCastle: true,
      animation: {
        enabled: animationsEnabled !== false,
        duration: 200
      },
      movable: {
        free: false,
        color: isAIThinking ? 'none' : (playerColor === 'b' ? 'black' : 'white'),
        dests: legalDests,
        events: { after: onMove }
      },
      highlight: {
        lastMove: true,
        check: true
      },
      drawable: {
        enabled: true
      }
    };

    if (!cgRef.current) {
      cgRef.current = Chessground(boardRef.current, config);
    } else {
      cgRef.current.set(config);
    }
  }, [fen, flippedView, legalDests, isAIThinking, animationsEnabled, playerColor]);

  // Clean up
  useEffect(() => {
    return () => {
      if (cgRef.current) {
        cgRef.current.destroy();
        cgRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Chessground Board wrapper */}
      <div 
        ref={boardRef} 
        className={`chessground-board cg-midnight-gold ${currentTheme.name === 'Neon' ? 'cg-neon' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          aspectRatio: '1 / 1'
        }}
      />

      {/* Pawn Promotion Modal Layer */}
      {promotionPending && (
        <div className="cg-promotion-overlay">
          <div className="cg-promotion-dialog font-cinzel">
            <h3>Promote Pawn</h3>
            <div className="cg-promotion-options">
              {['q', 'r', 'b', 'n'].map((p) => {
                const labels = { q: '♛ Queen', r: '♜ Rook', b: '♝ Bishop', n: '♞ Knight' };
                return (
                  <button 
                    key={p} 
                    onClick={() => handlePromotePiece(p)}
                    className="cg-promo-btn"
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
