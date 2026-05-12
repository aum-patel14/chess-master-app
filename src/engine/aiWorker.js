import { Chess } from 'chess.js';
import { getBestMove } from './chessEngine';

self.onmessage = function(e) {
  const { fen, difficulty, id } = e.data;
  
  if (!fen) return;
  
  try {
    // Reconstruct the chess board from FEN
    const chess = new Chess(fen);
    
    // Calculate best move (this is synchronous but runs in the background thread!)
    const bestMove = getBestMove(chess, difficulty);
    
    // Send the result back
    self.postMessage({
      id,
      success: true,
      bestMove,
      fen
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};
