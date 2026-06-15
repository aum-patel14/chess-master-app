/// <reference lib="webworker" />

// Declare STOCKFISH global function for TypeScript compiler
interface StockfishEngineInstance {
  postMessage: (cmd: string) => void;
  onmessage: ((line: string) => void) | null;
}

declare function STOCKFISH(): StockfishEngineInstance;

// Load Stockfish.js from CDN
try {
  importScripts('https://cdn.jsdelivr.net/npm/stockfish/src/stockfish.js');
} catch (e) {
  console.error('Failed to load Stockfish via importScripts:', e);
}

// Create Stockfish engine instance
let engine: StockfishEngineInstance | null = null;
try {
  if (typeof STOCKFISH === 'function') {
    engine = STOCKFISH();
  } else {
    console.error('STOCKFISH is not defined in worker context.');
  }
} catch (e) {
  console.error('Error instantiating STOCKFISH:', e);
}

if (engine) {
  // Listen for messages from Stockfish engine and forward parsed events to main thread
  engine.onmessage = (line: string) => {
    if (!line) return;

    if (line === 'uciok' || line === 'readyok') {
      self.postMessage({ type: 'ready' });
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const move = parts[1]; // e.g. "e2e4"
      if (move && move !== '(none)') {
        self.postMessage({ type: 'bestmove', move });
      }
    } else if (line.startsWith('info')) {
      const depthMatch = line.match(/depth (\d+)/);
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      const pvMatch = line.match(/ pv (.+)/);

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
      let score = 0;
      if (cpMatch) {
        score = parseInt(cpMatch[1], 10);
      } else if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        score = mateIn > 0 ? 10000 : -10000;
      }
      const pv = pvMatch ? pvMatch[1] : '';

      if (depthMatch && (cpMatch || mateMatch)) {
        self.postMessage({
          type: 'info',
          depth,
          score,
          pv
        });
      }
    }
  };

  // Initialize UCI configuration on startup
  engine.postMessage('uci');
  engine.postMessage('isready');
}

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  if (!data || !engine) return;

  switch (data.type) {
    case 'setPosition':
      engine.postMessage(`position fen ${data.fen}`);
      break;

    case 'go':
      // Always send option 'setoption name Skill Level value X' before 'go' command
      engine.postMessage(`setoption name Skill Level value ${data.skill}`);
      if (data.moveTime) {
        engine.postMessage(`go depth ${data.depth} movetime ${data.moveTime}`);
      } else {
        engine.postMessage(`go depth ${data.depth}`);
      }
      break;

    case 'stop':
      engine.postMessage('stop');
      break;

    case 'quit':
      engine.postMessage('quit');
      break;

    default:
      console.warn('Unknown message type received in Stockfish Web Worker:', data.type);
  }
};
