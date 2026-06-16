/// <reference lib="webworker" />

// Declare Stockfish global functions for TypeScript compiler
interface StockfishEngineInstance {
  postMessage: (cmd: string) => void;
  onmessage: ((line: string) => void) | null;
}

declare function Stockfish(): Promise<StockfishEngineInstance> | StockfishEngineInstance;
declare function STOCKFISH(): StockfishEngineInstance;

// Load Stockfish.js from local public folder
try {
  const stockfishUrl = `${import.meta.env.BASE_URL}stockfish.js`;
  importScripts(stockfishUrl);
} catch (e) {
  console.error('Failed to load Stockfish via importScripts:', e);
}

let engine: StockfishEngineInstance | null = null;
let messageQueue: any[] = [];

function setupEngine(e: StockfishEngineInstance) {
  engine = e;

  engine.onmessage = (line: string) => {
    if (!line) return;

    if (line === 'uciok' || line === 'readyok') {
      self.postMessage({ type: 'ready' });
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const move = parts[1];
      if (move && move !== '(none)') {
        self.postMessage({ type: 'bestmove', move });
      } else {
        // Fallback if stockfish returns (none)
        self.postMessage({ type: 'bestmove', move: null });
      }
    } else if (line.startsWith('info')) {
      const depthMatch = line.match(/depth (\d+)/);
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      const pvMatch = line.match(/ pv (.+)/);

      if (depthMatch && (cpMatch || mateMatch)) {
        self.postMessage({
          type: 'info',
          depth: parseInt(depthMatch[1], 10),
          score: cpMatch ? parseInt(cpMatch[1], 10) : (parseInt(mateMatch![1], 10) > 0 ? 10000 : -10000),
          pv: pvMatch ? pvMatch[1] : ''
        });
      }
    }
  };

  engine.postMessage('uci');
  engine.postMessage('isready');

  while (messageQueue.length > 0) {
    processMessage(messageQueue.shift());
  }
}

try {
  if (typeof (globalThis as any).Stockfish === 'function') {
    const result = (globalThis as any).Stockfish();
    if (result && typeof result.then === 'function') {
      result.then(setupEngine);
    } else {
      setupEngine(result);
    }
  } else if (typeof (globalThis as any).STOCKFISH === 'function') {
    setupEngine((globalThis as any).STOCKFISH());
  } else {
    console.error('Stockfish is not defined in worker context.');
  }
} catch (e) {
  console.error('Error instantiating Stockfish:', e);
}

function processMessage(data: any) {
  if (!engine) return;
  switch (data.type) {
    case 'setPosition':
      engine.postMessage(`position fen ${data.fen}`);
      break;
    case 'go':
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
  }
}

self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  if (!data) return;
  if (!engine) {
    messageQueue.push(data);
  } else {
    processMessage(data);
  }
};
