export const DIFFICULTY_CONFIG = {
  1: { label: 'Beginner', elo: '400',   skill: 0,  depth: 1,  movetime: 100,  description: 'Makes random blunders' },
  2: { label: 'Easy',     elo: '800',   skill: 5,  depth: 3,  movetime: 200,  description: 'Occasional mistakes' },
  3: { label: 'Medium',   elo: '1200',  skill: 10, depth: 8,  movetime: 500,  description: 'Solid club player' },
  4: { label: 'Hard',     elo: '1800',  skill: 17, depth: 14, movetime: 1000, description: 'Strong tournament play' },
  5: { label: 'Master',   elo: '2500+', skill: 20, depth: 20, movetime: 2000, description: 'Near-perfect play' },
};

function resolveBase() {
  try {
    const envBase = import.meta?.env?.BASE_URL;
    if (envBase && envBase !== '/') return envBase;
  } catch (_) {}
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(/^(.*\/chess-master-app\/)/);
    if (m) return m[1];
  }
  return '/chess-master-app/';
}

// ✅ Pure-JS CDN sources — no CORS headers needed, GitHub Pages compatible
const STOCKFISH_SOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
  'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js',
  `${resolveBase()}stockfish-engine.js`,  // local fallback (pure-JS version in your public/)
];

let workerInstance = null;
let workerReady = false;
let initPromise = null;
let pendingResolve = null;
let pendingReject = null;

const tryCreateWorker = async (src) => {
  return new Promise((resolve) => {
    try {
      const w = new Worker(src);
      const timeout = setTimeout(() => resolve(w), 400);
      w.onerror = () => { clearTimeout(timeout); w.terminate(); resolve(null); };
    } catch (_) {
      resolve(null);
    }
  });
};

const createWorker = async () => {
  for (const src of STOCKFISH_SOURCES) {
    const w = await tryCreateWorker(src);
    if (w) {
      console.log('✅ Stockfish loaded from:', src);
      return w;
    }
    console.warn('⚠️  Stockfish source failed:', src);
  }
  return null;
};

const attachHandlers = (resolveInit) => {
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
    workerReady = false;
    if (pendingReject) { pendingReject('worker_error'); pendingResolve = null; pendingReject = null; }
    resolveInit?.(false);
  };
};

export const initStockfish = () => {
  if (workerReady) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      workerInstance = await createWorker();
      if (!workerInstance) { console.error('All Stockfish sources failed'); return false; }

      return await new Promise((resolve) => {
        attachHandlers(resolve);
        workerInstance.postMessage('uci');
        setTimeout(() => { if (!workerReady) resolve(false); }, 5000);
      });
    } catch (e) {
      console.error('Stockfish init error:', e);
      return false;
    }
  })();

  return initPromise;
};

export const getStockfishReady = () => workerReady;
export const getStockfishWorker = () => workerInstance;

export const getBestMove = (fen, level) => {
  return new Promise((resolve, reject) => {
    if (!workerInstance || !workerReady) { reject('not_ready'); return; }

    const cfg = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[3];
    pendingResolve = resolve;
    pendingReject = reject;

    workerInstance.postMessage('stop');
    workerInstance.postMessage('ucinewgame');
    workerInstance.postMessage(`setoption name Skill Level value ${cfg.skill}`);
    workerInstance.postMessage(`position fen ${fen}`);
    workerInstance.postMessage(`go depth ${cfg.depth} movetime ${cfg.movetime}`);

    setTimeout(() => {
      if (pendingReject) { pendingReject('timeout'); pendingResolve = null; pendingReject = null; }
    }, cfg.movetime + 5000);
  });
};

export const getRandomLegalMove = (game) => {
  try {
    const moves = game.moves({ verbose: true });
    if (!moves.length) return null;
    const m = moves[Math.floor(Math.random() * moves.length)];
    return m.from + m.to + (m.promotion ?? '');
  } catch { return null; }
};

export const evaluatePosition = (fen, depth = 10) => {
  return new Promise((resolve) => {
    if (!workerInstance || !workerReady) { resolve({ score: 0, bestMove: null }); return; }
    workerInstance.postMessage('stop');
    workerInstance.postMessage(`position fen ${fen}`);
    workerInstance.postMessage(`go depth ${depth}`);
    let lastScore = 0, lastBestMove = null;
    const onMsg = (event) => {
      const line = typeof event.data === 'string' ? event.data : event.data?.data;
      if (!line) return;
      if (line.includes('score cp')) {
        const parts = line.split(' '), i = parts.indexOf('cp');
        if (i !== -1) lastScore = (fen.split(' ')[1] === 'w' ? parseInt(parts[i+1]) : -parseInt(parts[i+1])) / 100;
      }
      if (line.startsWith('bestmove')) {
        lastBestMove = line.split(' ')[1];
        workerInstance.removeEventListener('message', onMsg);
        resolve({ score: lastScore, bestMove: lastBestMove !== '(none)' ? lastBestMove : null });
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
