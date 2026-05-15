export class StockfishService {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.pendingResolve = null;
    this.isThinking = false;
    this.timeoutId = null;
    this._init();
  }

  _init() {
    try {
      const stockfishUrl = new URL('/chess-master-app/stockfish.js', window.location.origin).href;
      this.worker = new Worker(stockfishUrl);
    } catch (e) {
      console.error('Stockfish worker failed to load:', e);
      return;
    }

    // Set a fallback timeout in case Stockfish never responds (e.g., WASM blocked)
    this.initTimeout = setTimeout(() => {
      if (!this.isReady) {
        console.warn('Stockfish failed to initialize within 4 seconds. Falling back.');
        this.failed = true;
      }
    }, 4000);

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
        clearTimeout(this.initTimeout);
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
      console.error('Stockfish error:', e);
      this.isReady = false;
      this.failed = true;
      clearTimeout(this.initTimeout);
      if (this.pendingResolve) {
        this.pendingResolve(null);
        this.pendingResolve = null;
      }
    };

    // Initialize ONCE
    this.worker.postMessage('uci');
  }

  get difficultySettings() {
    return {
      1: { depth: 1, movetime: 150,  skillLevel: 0  },
      2: { depth: 2, movetime: 400,  skillLevel: 5  },
      3: { depth: 4, movetime: 800,  skillLevel: 10 },
      4: { depth: 6, movetime: 1500, skillLevel: 15 },
      5: { depth: 8, movetime: 2500, skillLevel: 20 },
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

  terminate() {
    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const stockfishEngine = new StockfishService();
