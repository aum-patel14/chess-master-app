import { BOTS } from '../data/bots';

const BASE_URL = import.meta.env.BASE_URL ?? '/chess-master-app/';

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

export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.failed = false; // backward compatibility
    this.isThinking = false; // backward compatibility
    this.resolvers = new Map(); // pending promise resolvers
    this.currentEvalResolver = null;

    // Difficulty presets
    this.DIFFICULTY = {
      beginner: { depth: 1,  skillLevel: 0,  moveTime: 100,  label: 'Beginner'  },
      easy:     { depth: 3,  skillLevel: 5,  moveTime: 200,  label: 'Easy'      },
      medium:   { depth: 8,  skillLevel: 10, moveTime: 500,  label: 'Medium'    },
      hard:     { depth: 14, skillLevel: 17, moveTime: 1000, label: 'Hard'      },
      master:   { depth: 20, skillLevel: 20, moveTime: 2000, label: 'Master'    },
    };

    this.currentDifficulty = this.DIFFICULTY.medium;
    this.pendingMove = null;
    this.pendingEval = null;

    // Auto-init for backward compatibility
    this.init().then(() => {
      this.isReady = true;
    }).catch(err => {
      console.warn("Stockfish auto-init failed:", err);
      this.failed = true;
    });
  }

  /**
   * Initialize the Stockfish worker.
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(this._getStockfishPath());
      } catch (err) {
        this.failed = true;
        reject(new Error('Failed to load Stockfish worker: ' + err.message));
        return;
      }

      this.worker.onmessage = (event) => this._handleMessage(event.data);
      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
        this.failed = true;
        reject(err);
      };

      this._waitForReady().then(() => {
        this.isReady = true;
        this.failed = false;
        this._send('uci');
        this._send('setoption name Threads value 1');
        this._send('setoption name Hash value 32');
        this._applyDifficultyOptions();
        resolve(this);
      });

      this._send('isready');
    });
  }

  /**
   * Set difficulty level.
   */
  setDifficulty(level) {
    if (typeof level === 'number') {
      const config = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[3];
      this.currentDifficulty = {
        depth: config.depth,
        skillLevel: config.skill,
        moveTime: config.movetime,
        label: config.label
      };
    } else {
      const preset = this.DIFFICULTY[level];
      if (!preset) throw new Error(`Unknown difficulty: ${level}. Use: ${Object.keys(this.DIFFICULTY).join(', ')}`);
      this.currentDifficulty = preset;
    }
    if (this.isReady) this._applyDifficultyOptions();
  }

  /**
   * Get the best move for a given position.
   */
  async getBestMove(fen, movesOrDifficulty = [], option2 = null) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

    let moves = [];
    if (typeof movesOrDifficulty === 'number' || typeof movesOrDifficulty === 'string') {
      this.setDifficulty(movesOrDifficulty);
    } else if (Array.isArray(movesOrDifficulty)) {
      moves = movesOrDifficulty;
    }

    this.isThinking = true;

    return new Promise((resolve, reject) => {
      this.pendingMove = { resolve, reject };

      const posCmd = moves.length > 0
        ? `position fen ${fen} moves ${moves.join(' ')}`
        : `position fen ${fen}`;
      this._send(posCmd);

      const { depth, moveTime } = this.currentDifficulty;
      this._send(`go depth ${depth} movetime ${moveTime}`);

      setTimeout(() => {
        if (this.pendingMove) {
          this.isThinking = false;
          this.pendingMove.reject(new Error('Engine timeout'));
          this.pendingMove = null;
        }
      }, moveTime * 3 + 5000);
    });
  }

  /**
   * Evaluate the current position (get a score in centipawns).
   */
  async evaluate(fen) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

    return new Promise((resolve, reject) => {
      this.pendingEval = { resolve, reject, bestScore: 0, bestDepth: 0, mate: null, bestMove: null };

      this._send(`position fen ${fen}`);
      this._send('go depth 12 movetime 300');
    });
  }

  /**
   * Evaluate position for analysis panel.
   */
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

  /**
   * Stop the calculation.
   */
  stop() {
    this._send('stop');
    this.isThinking = false;
  }

  /**
   * Reset game.
   */
  newGame() {
    this._send('ucinewgame');
  }

  /**
   * Destroy worker.
   */
  destroy() {
    if (this.worker) {
      this._send('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.isThinking = false;
    }
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  _send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  _getStockfishPath() {
    return `${BASE_URL}stockfish.js`.replace(/\/+/g, '/');
  }

  _waitForReady() {
    return new Promise((resolve) => {
      const handler = (event) => {
        const msg = typeof event.data === 'string' ? event.data : event.data?.data;
        if (msg === 'readyok') {
          this.worker.removeEventListener('message', handler);
          resolve();
        }
      };
      this.worker.addEventListener('message', handler);
    });
  }

  _applyDifficultyOptions() {
    const { skillLevel } = this.currentDifficulty;
    this._send(`setoption name Skill Level value ${skillLevel}`);
    if (skillLevel < 10) {
      const errorProb = Math.round((10 - skillLevel) * 50);
      this._send(`setoption name Move Overhead value ${errorProb}`);
    }
  }

  _handleMessage(messageData) {
    const message = typeof messageData === 'string' ? messageData : messageData?.data;
    if (!message) return;

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
        this.pendingMove.resolve(uciMove);
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

export const stockfishEngine = new StockfishEngine();

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
