export class StockfishService {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.failed = false;
    this.pendingResolve = null;
    this.isThinking = false;
    this.timeoutId = null;
    this.initTimeout = null;
    this.fallbackTimeout = null;
    this._init();
  }

  _init() {
    this.failed = false;
    this.isReady = false;
    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const stockfishUrl = new URL(`${basePath}stockfish.js`.replace(/\/+/g, '/'), window.location.origin).href;
      this.worker = new Worker(stockfishUrl);
      this._setupWorkerEvents();
      this.worker.postMessage('uci');
    } catch (e) {
      console.error('Stockfish worker failed to load locally:', e);
      this._loadFallback();
      return;
    }

    // Set a fallback timeout in case Stockfish never responds (e.g., WASM blocked or 404)
    this.initTimeout = setTimeout(() => {
      if (!this.isReady) {
        console.warn('Stockfish failed to initialize locally within 4 seconds. Falling back to CDN.');
        this._loadFallback();
      }
    }, 4000);
  }

  _setupWorkerEvents() {
    this.worker.onmessage = (event) => {
      const line = typeof event.data === 'string'
        ? event.data
        : event.data?.data;
      if (!line) return;

      if (line === 'uciok') {
        // One-time setup ONLY
        this.worker.postMessage('setoption name Hash value 16');
        this.worker.postMessage('setoption name Threads value 1');
        this.worker.postMessage('isready');
      }

      if (line === 'readyok') {
        this.isReady = true;
        this.failed = false;
        clearTimeout(this.initTimeout);
        clearTimeout(this.fallbackTimeout);
      }

      if (line.startsWith('bestmove')) {
        clearTimeout(this.timeoutId);
        this.isThinking = false;

        const move = line.split(' ')[1];
        if (this.pendingResolve) {
          const resolve = this.pendingResolve;
          this.pendingResolve = null;
          resolve(move && move !== '(none)' ? move : null);
        }
      }
    };

    this.worker.onerror = (e) => {
      console.error('Stockfish worker error:', e);
      // If the local worker failed and we haven't failed already, try fallback
      if (!this.failed && !this.isReady) {
        clearTimeout(this.initTimeout);
        this._loadFallback();
      } else {
        this.isReady = false;
        this.failed = true;
        if (this.pendingResolve) {
          this.pendingResolve(null);
          this.pendingResolve = null;
        }
      }
    };
  }

  _loadFallback() {
    if (this.isReady) return; // If already succeeded somehow
    console.warn('Attempting Stockfish CDN fallback...');

    if (this.worker) {
      try { this.worker.terminate(); } catch (e) {}
    }

    try {
      const blobCode = `importScripts("https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js");`;
      const blob = new Blob([blobCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      this._setupWorkerEvents();

      // Set a fallback timeout for the CDN as well
      this.fallbackTimeout = setTimeout(() => {
        if (!this.isReady) {
          console.error('Stockfish CDN fallback also failed to initialize.');
          this.isReady = false;
          this.failed = true;
        }
      }, 5000);

      this.worker.postMessage('uci');
    } catch (err) {
      console.error('Failed to create Stockfish CDN worker:', err);
      this.isReady = false;
      this.failed = true;
    }
  }

  get difficultySettings() {
    return {
      1: { depth: 1,  movetime: 100,  skillLevel: 0  },
      2: { depth: 3,  movetime: 300,  skillLevel: 5  },
      3: { depth: 8,  movetime: 1000, skillLevel: 10 },
      4: { depth: 15, movetime: 2000, skillLevel: 15 },
      5: { depth: 20, movetime: 3000, skillLevel: 20 },
    };
  }

  getBestMove(fen, difficultyLevel) {
    return new Promise((resolve) => {
      // If worker not available, resolve null immediately
      if (!this.worker) {
        resolve(null);
        return;
      }

      // Wait for engine to be ready (max 3 seconds)
      if (!this.isReady) {
        let waited = 0;
        const waitInterval = setInterval(() => {
          waited += 100;
          if (this.isReady) {
            clearInterval(waitInterval);
            this.getBestMove(fen, difficultyLevel).then(resolve);
          } else if (waited >= 3000) {
            clearInterval(waitInterval);
            console.error('Stockfish not ready after 3s');
            resolve(null);
          }
        }, 100);
        return;
      }

      // Stop any previous search
      if (this.isThinking) {
        this.worker.postMessage('stop');
        clearTimeout(this.timeoutId);
        // Give it 50ms to stop cleanly
        setTimeout(() => this._sendMove(fen, difficultyLevel, resolve), 50);
        return;
      }

      this._sendMove(fen, difficultyLevel, resolve);
    });
  }

  _sendMove(fen, difficultyLevel, resolve) {
    const settings = this.difficultySettings[difficultyLevel]
      || this.difficultySettings[3];

    this.pendingResolve = resolve;
    this.isThinking = true;

    // Set skill level
    this.worker.postMessage(
      `setoption name Skill Level value ${settings.skillLevel}`
    );

    // Limit strength for weaker levels
    if (settings.skillLevel < 15) {
      this.worker.postMessage('setoption name UCI_LimitStrength value true');
      this.worker.postMessage(
        `setoption name UCI_Elo value ${400 + settings.skillLevel * 80}`
      );
    } else {
      this.worker.postMessage('setoption name UCI_LimitStrength value false');
    }

    // Set position and search
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(
      `go depth ${settings.depth} movetime ${settings.movetime}`
    );

    this.timeoutId = setTimeout(() => {
      if (this.isThinking) {
        this.worker.postMessage('stop');
      }
    }, settings.movetime + 1000);
  }

  evaluatePosition(fen, depth = 10) {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve({ score: 0, bestMove: null });
        return;
      }

      // Ensure worker is ready
      if (!this.isReady) {
        resolve({ score: 0, bestMove: null });
        return;
      }

      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
      
      let lastScore = 0;
      let lastBestMove = null;

      const onMsg = (event) => {
        const line = typeof event.data === 'string'
          ? event.data
          : event.data?.data;
        if (!line) return;

        if (line.includes('score cp')) {
          const parts = line.split(' ');
          const cpIndex = parts.indexOf('cp');
          if (cpIndex !== -1) {
            const rawScore = parseInt(parts[cpIndex + 1]);
            const activeTurn = fen.split(' ')[1];
            // Normalize so white positive, black negative
            lastScore = (activeTurn === 'w' ? rawScore : -rawScore) / 100.0;
          }
        } else if (line.includes('score mate')) {
          const parts = line.split(' ');
          const mateIndex = parts.indexOf('mate');
          if (mateIndex !== -1) {
            const mateIn = parseInt(parts[mateIndex + 1]);
            const activeTurn = fen.split(' ')[1];
            lastScore = activeTurn === 'w' ? (mateIn > 0 ? 100 : -100) : (mateIn > 0 ? -100 : 100);
          }
        }

        if (line.startsWith('bestmove')) {
          lastBestMove = line.split(' ')[1];
          this.worker.removeEventListener('message', onMsg);
          resolve({
            score: lastScore,
            bestMove: lastBestMove !== '(none)' ? lastBestMove : null
          });
        }
      };

      this.worker.addEventListener('message', onMsg);
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const stockfishEngine = new StockfishService();
