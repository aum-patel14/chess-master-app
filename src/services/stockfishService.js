const BASE_URL = import.meta.env.BASE_URL ?? '/chess-master-app/';

export const DIFFICULTY_CONFIG = {
  1: { label: 'Beginner', elo: '~600', skill: 0, depth: 1, movetime: 100, description: 'Makes random blunders' },
  2: { label: 'Easy', elo: '~800', skill: 5, depth: 3, movetime: 300, description: 'Occasional mistakes' },
  3: { label: 'Medium', elo: '~1200', skill: 10, depth: 8, movetime: 1000, description: 'Solid club player' },
  4: { label: 'Hard', elo: '~1600', skill: 15, depth: 15, movetime: 2000, description: 'Strong tournament play' },
  5: { label: 'Master', elo: '~2000', skill: 20, depth: 20, movetime: 3000, description: 'Near-perfect play' },
};

const STOCKFISH_PATHS = [
  `${BASE_URL}stockfish.js`.replace(/\/+/g, '/'),
  '/chess-master-app/stockfish.js',
  '/stockfish.js',
  'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js',
];

let workerInstance = null;
let workerReady = false;
let initPromise = null;
let pendingResolve = null;
let pendingReject = null;

const createWorker = () => {
  for (const workerPath of STOCKFISH_PATHS) {
    try {
      const w = new Worker(workerPath);
      console.log(`Stockfish loaded from: ${workerPath}`);
      return w;
    } catch (e) {
      console.warn(`Failed: ${workerPath}`, e);
    }
  }
  return null;
};

const attachWorkerHandlers = (resolveInit) => {
  if (!workerInstance) return;

  workerInstance.onmessage = (e) => {
    const msg = typeof e.data === 'string' ? e.data : e.data?.data;
    if (!msg) return;

    if (msg === 'uciok') {
      workerInstance.postMessage('setoption name Hash value 16');
      workerInstance.postMessage('setoption name Threads value 1');
      workerInstance.postMessage('isready');
      return;
    }

    if (msg === 'readyok') {
      workerReady = true;
      resolveInit?.(true);
      return;
    }

    if (msg.startsWith('bestmove')) {
      const move = msg.split(' ')[1];
      if (pendingResolve) {
        pendingResolve(move && move !== '(none)' ? move : '');
        pendingResolve = null;
        pendingReject = null;
      }
    }
  };

  workerInstance.onerror = (e) => {
    console.error('Stockfish worker error:', e);
    if (pendingReject) {
      pendingReject('worker_error');
      pendingReject = null;
      pendingResolve = null;
    }
    resolveInit?.(false);
  };
};

export const initStockfish = () => {
  if (workerReady) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    try {
      workerInstance = createWorker();
      if (!workerInstance) {
        resolve(false);
        return;
      }

      attachWorkerHandlers(resolve);
      workerInstance.postMessage('uci');
      setTimeout(() => {
        if (!workerReady) resolve(false);
      }, 3000);
    } catch (e) {
      console.error('Stockfish init failed:', e);
      resolve(false);
    }
  });

  return initPromise;
};

export const getStockfishReady = () => workerReady;
export const getStockfishWorker = () => workerInstance;

export const getBestMove = (fen, level) => {
  return new Promise((resolve, reject) => {
    if (!workerInstance || !workerReady) {
      reject('not_ready');
      return;
    }

    const cfg = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[3];
    pendingResolve = resolve;
    pendingReject = reject;

    workerInstance.postMessage('stop');
    workerInstance.postMessage('ucinewgame');
    workerInstance.postMessage(`setoption name Skill Level value ${cfg.skill}`);
    workerInstance.postMessage(`position fen ${fen}`);
    workerInstance.postMessage(`go depth ${cfg.depth} movetime ${cfg.movetime}`);

    setTimeout(() => {
      if (pendingReject) {
        pendingReject('timeout');
        pendingResolve = null;
        pendingReject = null;
      }
    }, cfg.movetime + 5000);
  });
};

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

export const evaluatePosition = (fen, depth = 10) => {
  return new Promise((resolve) => {
    if (!workerInstance || !workerReady) {
      resolve({ score: 0, bestMove: null });
      return;
    }

    workerInstance.postMessage('stop');
    workerInstance.postMessage(`position fen ${fen}`);
    workerInstance.postMessage(`go depth ${depth}`);

    let lastScore = 0;
    let lastBestMove = null;

    const onMsg = (event) => {
      const line = typeof event.data === 'string' ? event.data : event.data?.data;
      if (!line) return;

      if (line.includes('score cp')) {
        const parts = line.split(' ');
        const cpIndex = parts.indexOf('cp');
        if (cpIndex !== -1) {
          const rawScore = parseInt(parts[cpIndex + 1], 10);
          const activeTurn = fen.split(' ')[1];
          lastScore = (activeTurn === 'w' ? rawScore : -rawScore) / 100.0;
        }
      } else if (line.includes('score mate')) {
        const parts = line.split(' ');
        const mateIndex = parts.indexOf('mate');
        if (mateIndex !== -1) {
          const mateIn = parseInt(parts[mateIndex + 1], 10);
          const activeTurn = fen.split(' ')[1];
          lastScore =
            activeTurn === 'w'
              ? mateIn > 0
                ? 100
                : -100
              : mateIn > 0
                ? -100
                : 100;
        }
      }

      if (line.startsWith('bestmove')) {
        lastBestMove = line.split(' ')[1];
        workerInstance.removeEventListener('message', onMsg);
        resolve({
          score: lastScore,
          bestMove: lastBestMove !== '(none)' ? lastBestMove : null,
        });
      }
    };

    workerInstance.addEventListener('message', onMsg);
  });
};

export const destroyStockfish = () => {
  workerInstance?.terminate();
  workerInstance = null;
  workerReady = false;
  initPromise = null;
};
