import { useRef, useCallback } from 'react';

const DIFFICULTY = {
  1: { skill: 0,  depth: 1,  movetime: 100,  label: 'Beginner', elo: '~600' },
  2: { skill: 5,  depth: 3,  movetime: 300,  label: 'Easy',     elo: '~800' },
  3: { skill: 10, depth: 8,  movetime: 1000, label: 'Medium',   elo: '~1200' },
  4: { skill: 15, depth: 15, movetime: 2000, label: 'Hard',     elo: '~1600' },
  5: { skill: 20, depth: 20, movetime: 3000, label: 'Master',   elo: '~2000' },
};

export const createStockfishWorker = () => {
  const basePath = import.meta.env.BASE_URL || '/';
  const paths = [
    `${basePath}stockfish.js`.replace(/\/+/g, '/'),
    '/stockfish.js',
    '/chess-master-app/stockfish.js',  // GitHub Pages subdirectory path
    'https://cdn.jsdelivr.net/npm/stockfish@16/src/stockfish-nnue-16.js',
  ];

  for (const path of paths) {
    try {
      const worker = new Worker(path);
      return worker;
    } catch (e) {
      console.warn(`Stockfish failed at ${path}:`, e);
    }
  }
  console.error('All Stockfish paths failed — AI disabled');
  return null;
};

export const useStockfish = () => {
  const workerRef = useRef(null);

  const init = useCallback(() => {
    workerRef.current = createStockfishWorker();
  }, []);

  const getBestMove = useCallback((fen, level) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) init();
      const cfg = DIFFICULTY[Number(level)] || DIFFICULTY[3];
      const worker = workerRef.current;

      if (!worker) {
        reject('stockfish_unavailable');
        return;
      }

      // Track if we resolved or rejected to avoid duplicate responses
      let completed = false;

      const cleanup = () => {
        worker.removeEventListener('message', handler);
        worker.onerror = null;
      };

      const handler = (e) => {
        if (e.data?.startsWith('bestmove')) {
          if (!completed) {
            completed = true;
            cleanup();
            const move = e.data.split(' ')[1];
            if (move && move !== '(none)') resolve(move);
            else reject('no move');
          }
        }
      };

      worker.onerror = (err) => {
        console.warn('Local worker error, attempting CDN fallback', err);
        if (!completed) {
          completed = true;
          cleanup();
          // Attempt on-the-fly CDN fallback
          try {
            const fallbackWorker = new Worker('https://cdn.jsdelivr.net/npm/stockfish@16/src/stockfish-nnue-16.js');
            workerRef.current = fallbackWorker;
            
            const fallbackHandler = (e) => {
              if (e.data?.startsWith('bestmove')) {
                fallbackWorker.removeEventListener('message', fallbackHandler);
                const move = e.data.split(' ')[1];
                if (move && move !== '(none)') resolve(move);
                else reject('no move');
              }
            };
            fallbackWorker.addEventListener('message', fallbackHandler);
            
            fallbackWorker.postMessage('uci');
            fallbackWorker.postMessage(`setoption name Skill Level value ${cfg.skill}`);
            fallbackWorker.postMessage('ucinewgame');
            fallbackWorker.postMessage(`position fen ${fen}`);
            fallbackWorker.postMessage(`go depth ${cfg.depth} movetime ${cfg.movetime}`);
          } catch (fallbackErr) {
            reject(fallbackErr);
          }
        }
      };

      worker.addEventListener('message', handler);

      worker.postMessage('uci');
      worker.postMessage(`setoption name Skill Level value ${cfg.skill}`);
      worker.postMessage('ucinewgame');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${cfg.depth} movetime ${cfg.movetime}`);

      setTimeout(() => {
        if (!completed) {
          completed = true;
          cleanup();
          reject('timeout');
        }
      }, cfg.movetime + 2000);
    });
  }, [init]);

  return { getBestMove, init, DIFFICULTY };
};

export default useStockfish;

