import { useEffect, useState, useRef } from 'react';
import { Chess } from 'chess.js';

let nextId = 1;

export function usePiecePositions(fen) {
  const [pieces, setPieces] = useState([]);
  const prevFen = useRef(null);

  useEffect(() => {
    if (fen === prevFen.current) return;
    prevFen.current = fen;

    const chess = new Chess(fen);
    const board = chess.board();
    
    setPieces(currentPieces => {
      const newPieces = [];
      const boardList = [];
      
      // Flatten board
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]) {
            boardList.push({ ...board[r][c], square: `${String.fromCharCode(97 + c)}${8 - r}` });
          }
        }
      }

      // If initializing or complete mismatch, generate fresh
      if (currentPieces.length === 0 || Math.abs(currentPieces.length - boardList.length) > 5) {
        return boardList.map(p => ({ ...p, id: `p_${nextId++}` }));
      }

      // 1. Match exact same square and type/color
      const unmatchedBoard = [];
      const unmatchedCurrent = [...currentPieces];
      
      boardList.forEach(bp => {
        const exactMatchIdx = unmatchedCurrent.findIndex(cp => cp.square === bp.square && cp.type === bp.type && cp.color === bp.color);
        if (exactMatchIdx !== -1) {
          newPieces.push({ ...unmatchedCurrent[exactMatchIdx] });
          unmatchedCurrent.splice(exactMatchIdx, 1);
        } else {
          unmatchedBoard.push(bp);
        }
      });

      // 2. Match remaining by type and color (handles moves)
      unmatchedBoard.forEach(bp => {
        // If it's a promotion, the type changes. So we first try exact type/color.
        let matchIdx = unmatchedCurrent.findIndex(cp => cp.type === bp.type && cp.color === bp.color);
        
        // If not found, maybe it was a pawn promotion? Just find any same color piece that could be it
        if (matchIdx === -1) {
          matchIdx = unmatchedCurrent.findIndex(cp => cp.color === bp.color);
        }

        if (matchIdx !== -1) {
          newPieces.push({ ...unmatchedCurrent[matchIdx], square: bp.square, type: bp.type });
          unmatchedCurrent.splice(matchIdx, 1);
        } else {
          // completely new piece?
          newPieces.push({ ...bp, id: `p_${nextId++}` });
        }
      });

      return newPieces;
    });

  }, [fen]);

  return pieces;
}
