class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.resolvers = new Map();
    this.currentEvalResolver = null;

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

  async init() {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(this._getStockfishPath());
      } catch (err) {
        reject(new Error('Failed to load Stockfish worker: ' + err.message));
        return;
      }

      this.worker.onmessage = (event) => this._handleMessage(event.data);
      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
        reject(err);
      };

      this._waitForReady().then(() => {
        this.isReady = true;
        this._send('uci');
        this._send('setoption name Threads value 1');
        this._send('setoption name Hash value 32');
        this._applyDifficultyOptions();
        resolve(this);
      });

      this._send('isready');
    });
  }

  setDifficulty(level) {
    const preset = this.DIFFICULTY[level];
    if (!preset) throw new Error(`Unknown difficulty: ${level}. Use: ${Object.keys(this.DIFFICULTY).join(', ')}`);
    this.currentDifficulty = preset;
    if (this.isReady) this._applyDifficultyOptions();
  }

  async getBestMove(fen, moves = []) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

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
          this.pendingMove.reject(new Error('Engine timeout'));
          this.pendingMove = null;
        }
      }, moveTime * 3 + 5000);
    });
  }

  async evaluate(fen) {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.');

    return new Promise((resolve, reject) => {
      this.pendingEval = { resolve, reject, bestScore: 0, bestDepth: 0, mate: null };

      this._send(`position fen ${fen}`);
      this._send('go depth 12 movetime 300');
    });
  }

  stop() {
    this._send('stop');
  }

  newGame() {
    this._send('ucinewgame');
  }

  destroy() {
    if (this.worker) {
      this._send('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  _send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  _getStockfishPath() {
    let baseUrl = '/chess-master-app/';
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^(.*\/chess-master-app\/)/);
      if (match) baseUrl = match[1];
      else if (!window.location.pathname.includes('chess-master-app')) baseUrl = '/';
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
    if (skillLevel < 10) {
      const errorProb = Math.round((10 - skillLevel) * 50);
      this._send(`setoption name Move Overhead value ${errorProb}`);
    }
  }

  _handleMessage(message) {
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const uciMove = parts[1];

      if (uciMove && uciMove !== '(none)' && this.pendingMove) {
        const parsed = this._parseUCIMove(uciMove);
        this.pendingMove.resolve(parsed);
        this.pendingMove = null;
      }

      if (this.pendingEval) {
        this.pendingEval.resolve({
          score: this.pendingEval.bestScore,
          mate:  this.pendingEval.mate,
          depth: this.pendingEval.bestDepth,
        });
        this.pendingEval = null;
      }
    }

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
    return {
      move:      uciMove,
      from:      uciMove.slice(0, 2),
      to:        uciMove.slice(2, 4),
      promotion: uciMove.length === 5 ? uciMove[4] : undefined,
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StockfishEngine;
} else {
  window.StockfishEngine = StockfishEngine;
}
