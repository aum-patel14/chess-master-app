/**
 * StockfishEngine.js
 * A clean wrapper around Stockfish.js for ChessMaster Pro.
 * Handles difficulty levels, move calculation, and evaluation.
 *
 * Usage:
 *   const engine = new StockfishEngine();
 *   await engine.init();
 *   engine.setDifficulty('medium');
 *   const move = await engine.getBestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
 *   console.log(move); // e.g. "e7e5"
 */

class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.resolvers = new Map(); // pending promise resolvers
    this.currentEvalResolver = null;

    // Difficulty presets — depth controls how many moves ahead Stockfish thinks.
    // skillLevel (0–20) controls Stockfish's internal randomness (lower = more mistakes).
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
  }

  /**
   * Initialize the Stockfish worker.
   * Call this once before using the engine.
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Use Blob wrapper to bypass same-origin/CORS restrictions when loading the CDN script
        const workerCode = `
          try {
            importScripts("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
            var engine = typeof STOCKFISH === "function" ? STOCKFISH() : null;
            if (engine) {
              engine.onmessage = function(line) {
                self.postMessage(line);
              };
              self.onmessage = function(e) {
                engine.postMessage(e.data);
              };
            } else {
              console.error("STOCKFISH function is not defined inside worker");
            }
          } catch (err) {
            console.error("Worker importScripts failed:", err);
          }
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);
      } catch (err) {
        reject(new Error('Failed to load Stockfish worker: ' + err.message));
        return;
      }

      this.worker.onmessage = (event) => this._handleMessage(event.data);
      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
        reject(err);
      };

      // Wait for "readyok" before resolving
      this._waitForReady().then(() => {
        this.isReady = true;
        // Configure UCI options
        this._send('uci');
        this._send('setoption name Threads value 1');
        this._send('setoption name Hash value 32');
        this._applyDifficultyOptions();
        resolve(this);
      });

      // Send isready to trigger initialization
      this._send('isready');
    });
  }

  /**
   * Set difficulty level.
   * @param {'beginner'|'easy'|'medium'|'hard'|'master'} level
   */
  setDifficulty(level) {
    const preset = this.DIFFICULTY[level];
    if (!preset) throw new Error(`Unknown difficulty: ${level}. Use: ${Object.keys(this.DIFFICULTY).join(', ')}`);
    this.currentDifficulty = preset;
    if (this.isReady) this._applyDifficultyOptions();
  }

  /**
   * Get the best move for a given position.
   * @param {string} fen - FEN string of the current position
   * @param {string[]} [moves=[]] - Optional move history in UCI format (e.g. ['e2e4', 'e7e5'])
   * @returns {Promise<{move: string, from: string, to: string, promotion?: string}>}
   */
  async getBestMove(fen, moves = []) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

    return new Promise((resolve, reject) => {
      this.pendingMove = { resolve, reject };

      // Set position
      const posCmd = moves.length > 0
        ? `position fen ${fen} moves ${moves.join(' ')}`
        : `position fen ${fen}`;
      this._send(posCmd);

      const { depth, moveTime } = this.currentDifficulty;
      this._send(`go depth ${depth} movetime ${moveTime}`);

      // Safety timeout (2× the expected move time)
      setTimeout(() => {
        if (this.pendingMove) {
          this.pendingMove.reject(new Error('Engine timeout'));
          this.pendingMove = null;
        }
      }, moveTime * 3 + 5000);
    });
  }

  /**
   * Evaluate the current position (get a score in centipawens).
   * Positive = white advantage, negative = black advantage.
   * @param {string} fen - FEN string
   * @returns {Promise<{score: number, mate: number|null, depth: number}>}
   */
  async evaluate(fen) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

    return new Promise((resolve, reject) => {
      this.pendingEval = { resolve, reject, bestScore: 0, bestDepth: 0, mate: null };

      this._send(`position fen ${fen}`);
      this._send('go depth 12 movetime 300');
    });
  }

  /**
   * Stop the current calculation.
   */
  stop() {
    this._send('stop');
  }

  /**
   * Reset the engine (new game).
   */
  newGame() {
    this._send('ucinewgame');
  }

  /**
   * Terminate the worker and free resources.
   */
  destroy() {
    if (this.worker) {
      this._send('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  _send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  _getStockfishPath() {
    let baseUrl = '/chess-master-app/';
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL && import.meta.env.BASE_URL !== '/') {
        baseUrl = import.meta.env.BASE_URL;
      } else if (typeof window !== 'undefined') {
        const match = window.location.pathname.match(/^(.*\/chess-master-app\/)/);
        if (match) baseUrl = match[1];
      }
    } catch (e) {
      /* use default */
    }
    return `${baseUrl}stockfish.js`.replace(/\/+/g, '/');
  }

  _waitForReady() {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data === 'readyok') {
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
    // For lower skill levels, add some randomness
    if (skillLevel < 10) {
      const errorProb = Math.round((10 - skillLevel) * 50);
      this._send(`setoption name Move Overhead value ${errorProb}`);
    }
  }

  _handleMessage(message) {
    // "bestmove e2e4" — the engine has chosen a move
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const uciMove = parts[1]; // e.g. "e2e4" or "e7e8q" (promotion)

      if (uciMove && uciMove !== '(none)' && this.pendingMove) {
        const parsed = this._parseUCIMove(uciMove);
        this.pendingMove.resolve(parsed);
        this.pendingMove = null;
      }

      // Also resolve evaluation if pending
      if (this.pendingEval) {
        this.pendingEval.resolve({
          score: this.pendingEval.bestScore,
          mate:  this.pendingEval.mate,
          depth: this.pendingEval.bestDepth,
        });
        this.pendingEval = null;
      }
    }

    // "info depth 8 score cp 34 ..." — evaluation info
    if (message.startsWith('info') && message.includes('score') && this.pendingEval) {
      const depthMatch = message.match(/depth (\d+)/);
      const cpMatch    = message.match(/score cp (-?\d+)/);
      const mateMatch  = message.match(/score mate (-?\d+)/);

      if (depthMatch) this.pendingEval.bestDepth = parseInt(depthMatch[1]);
      if (cpMatch)    this.pendingEval.bestScore  = parseInt(cpMatch[1]);
      if (mateMatch)  this.pendingEval.mate        = parseInt(mateMatch[1]);
    }
  }

  _parseUCIMove(uciMove) {
    // UCI format: "e2e4" or "e7e8q" (promotion to queen)
    return {
      move:      uciMove,
      from:      uciMove.slice(0, 2), // "e2"
      to:        uciMove.slice(2, 4), // "e4"
      promotion: uciMove.length === 5 ? uciMove[4] : undefined, // "q", "r", "b", "n"
    };
  }
}

// Export for both ES modules and CommonJS
export default StockfishEngine;
export { StockfishEngine };

// Dynamic export for CommonJS environments to avoid bundler static analysis warning
try {
  if (typeof module !== 'undefined' && module) {
    const m = module;
    if (m.exports) {
      m.exports = StockfishEngine;
    }
  }
} catch (e) {}

if (typeof window !== 'undefined') {
  window.StockfishEngine = StockfishEngine;
}
