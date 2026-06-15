import StockfishEngine from './StockfishEngine.js';
import { BOTS } from '../data/bots';

export const DIFFICULTY_CONFIG = {
  1: { label: 'Level 1', elo: '~400', skill: 0, depth: 1, movetime: 150, description: 'Rookie strength' },
  2: { label: 'Level 2', elo: '~600', skill: 2, depth: 2, movetime: 300, description: 'Beginner strength' },
  3: { label: 'Level 3', elo: '~800', skill: 4, depth: 3, movetime: 450, description: 'Casual strength' },
  4: { label: 'Level 4', elo: '~1000', skill: 6, depth: 4, movetime: 600, description: 'Novice strength' },
  5: { label: 'Level 5', elo: '~1200', skill: 8, depth: 5, movetime: 800, description: 'Club Player strength' },
  6: { label: 'Level 6', elo: '~1400', skill: 10, depth: 7, movetime: 1000, description: 'Solid club strength' },
  7: { label: 'Level 7', elo: '~1600', skill: 12, depth: 9, movetime: 1200, description: 'Strong intermediate strength' },
  8: { label: 'Level 8', elo: '~1800', skill: 15, depth: 11, movetime: 1500, description: 'Advanced strength' },
  9: { label: 'Level 9', elo: '~2100', skill: 18, depth: 13, movetime: 1800, description: 'Expert strength' },
  10: { label: 'Level 10', elo: '~2400+', skill: 20, depth: 15, movetime: 2000, description: 'Master strength' },
};

class CompatibleStockfishEngine extends StockfishEngine {
  constructor() {
    super();
    this.failed = false;
    this.isThinking = false;

    // Auto-init for backward compatibility
    this.init().then(() => {
      this.isReady = true;
    }).catch(err => {
      console.warn("Stockfish auto-init failed:", err);
      this.failed = true;
    });
  }

  async init() {
    try {
      const res = await super.init();
      this.failed = false;
      return res;
    } catch (err) {
      this.failed = true;
      throw err;
    }
  }

  setDifficulty(level) {
    if (typeof level === 'number') {
      const config = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[3];
      this.currentDifficulty = {
        depth: config.depth,
        skillLevel: config.skill,
        moveTime: config.movetime,
        label: config.label
      };
      if (this.isReady) this._applyDifficultyOptions();
    } else {
      super.setDifficulty(level);
    }
  }

  async getBestMove(fen, movesOrDifficulty = [], option2 = null) {
    let moves = [];
    if (typeof movesOrDifficulty === 'number' || typeof movesOrDifficulty === 'string') {
      this.setDifficulty(movesOrDifficulty);
    } else if (Array.isArray(movesOrDifficulty)) {
      moves = movesOrDifficulty;
    } else if (movesOrDifficulty && typeof movesOrDifficulty.history === 'function') {
      moves = movesOrDifficulty.history({ verbose: true }).map(
        (m) => m.from + m.to + (m.promotion || '')
      );
    }

    this.isThinking = true;

    try {
      const parsedMove = await super.getBestMove(fen, moves);
      return parsedMove.move; // resolves to a string (e.g. "e2e4")
    } catch (err) {
      console.error("CompatibleStockfishEngine getBestMove error:", err);
      throw err;
    } finally {
      this.isThinking = false;
    }
  }

  async evaluate(fen) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

    return new Promise((resolve, reject) => {
      this.pendingEval = { resolve, reject, bestScore: 0, bestDepth: 0, mate: null, bestMove: null };

      this._send(`position fen ${fen}`);
      this._send('go depth 12 movetime 300');
    });
  }

  async evaluatePosition(fen, depth = 10) {
    try {
      const res = await this.evaluate(fen);
      return {
        score: res.score / 100.0, // convert centipawns to pawn units
        bestMove: res.bestMove || null
      };
    } catch (e) {
      console.warn("Evaluation failed:", e);
      return { score: 0, bestMove: null };
    }
  }

  _handleMessage(message) {
    // We override handle message to intercept bestMove and mate score configuration
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const uciMove = parts[1];

      this.isThinking = false;

      if (this.pendingEval) {
        this.pendingEval.bestMove = uciMove && uciMove !== '(none)' ? uciMove : null;
        this.pendingEval.resolve({
          score: this.pendingEval.bestScore,
          mate:  this.pendingEval.mate,
          depth: this.pendingEval.bestDepth,
          bestMove: this.pendingEval.bestMove
        });
        this.pendingEval = null;
      }

      if (uciMove && uciMove !== '(none)' && this.pendingMove) {
        const parsed = this._parseUCIMove(uciMove);
        this.pendingMove.resolve(parsed);
        this.pendingMove = null;
      }
    }

    if (message.startsWith('info') && message.includes('score') && this.pendingEval) {
      const depthMatch = message.match(/depth (\d+)/);
      const cpMatch    = message.match(/score cp (-?\d+)/);
      const mateMatch  = message.match(/score mate (-?\d+)/);

      if (depthMatch) this.pendingEval.bestDepth = parseInt(depthMatch[1]);
      if (cpMatch) {
        this.pendingEval.bestScore = parseInt(cpMatch[1]);
      }
      if (mateMatch) {
        this.pendingEval.mate = parseInt(mateMatch[1]);
        this.pendingEval.bestScore = this.pendingEval.mate > 0 ? 10000 : -10000;
      }
    }
  }
}

export { CompatibleStockfishEngine as StockfishEngine };
export const stockfishEngine = new CompatibleStockfishEngine();

export const initStockfish = () => {
  if (stockfishEngine.isReady) return Promise.resolve(true);
  return stockfishEngine.init().then(() => true).catch(() => false);
};

export const getStockfishReady = () => stockfishEngine.isReady;

export const getRandomLegalMove = (game) => {
  try {
    const moves = game.moves({ verbose: true });
    if (!moves.length) return null;
    const m = moves[Math.floor(Math.random() * moves.length)];
    return m.from + m.to + (m.promotion ?? '');
  } catch {
    return null;
  }
};
