import { useRef } from 'react';

export const useStockfish = () => {
  const workerRef = useRef(null);
  
  const getBestMove = (fen, level) => {
    return new Promise((resolve) => {
      const settings = {
        1: { skill: 0,  depth: 1,  movetime: 100  },
        2: { skill: 5,  depth: 3,  movetime: 300  },
        3: { skill: 10, depth: 8,  movetime: 1000 },
        4: { skill: 15, depth: 15, movetime: 2000 },
        5: { skill: 20, depth: 20, movetime: 3000 },
      }[level] || { skill: 10, depth: 8, movetime: 1000 };
      
      if (!workerRef.current) {
        const basePath = import.meta.env.BASE_URL || '/';
        const stockfishUrl = new URL(`${basePath}stockfish.js`.replace(/\/+/g, '/'), window.location.origin).href;
        workerRef.current = new Worker(stockfishUrl);
      }
      
      const worker = workerRef.current;
      worker.postMessage(`setoption name Skill Level value ${settings.skill}`);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${settings.depth} movetime ${settings.movetime}`);
      
      worker.onmessage = (e) => {
        if (e.data.startsWith('bestmove')) {
          resolve(e.data.split(' ')[1]);
        }
      };
    });
  };
  
  return { getBestMove };
};
export default useStockfish;
