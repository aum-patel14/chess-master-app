import { StockfishService } from './StockfishService.js';

const stockfish = new StockfishService();

self.onmessage = async (e) => {
  const { fen, difficulty } = e.data;
  try {
    const bestMove = await stockfish.getBestMove(fen, difficulty);
    if (bestMove) {
      self.postMessage({ success: true, bestMove, fen });
    } else {
      self.postMessage({ success: false, error: 'No move returned' });
    }
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
