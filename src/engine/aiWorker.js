import StockfishEngine from './StockfishEngine.js';

const stockfish = new StockfishEngine();
let initPromise = null;

self.onmessage = async (e) => {
  const { fen, difficulty } = e.data;
  try {
    if (!initPromise) {
      initPromise = stockfish.init();
    }
    await initPromise;

    if (difficulty) {
      stockfish.setDifficulty(difficulty);
    }
    const moveResult = await stockfish.getBestMove(fen);
    if (moveResult && moveResult.move) {
      self.postMessage({ success: true, bestMove: moveResult.move, fen });
    } else {
      self.postMessage({ success: false, error: 'No move returned' });
    }
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
