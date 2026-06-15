import { useState, useEffect, useRef, useCallback } from 'react';
import StockfishWorker from '../workers/stockfish.worker?worker';
import { BotConfig } from '../config/bots';

export interface StockfishHook {
  isThinking: boolean;
  getBestMove: (fen: string, config: BotConfig) => Promise<string>;
}

export const useStockfish = (): StockfishHook => {
  const [isThinking, setIsThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const rejectRef = useRef<((reason: any) => void) | null>(null);

  // Spawn the worker once on mount, terminate it on unmount
  useEffect(() => {
    let worker: Worker;
    try {
      worker = new StockfishWorker();
      workerRef.current = worker;
    } catch (e) {
      console.error('Failed to spawn Stockfish Web Worker:', e);
      return;
    }

    worker.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'bestmove') {
        setIsThinking(false);
        if (resolveRef.current) {
          resolveRef.current(data.move);
          resolveRef.current = null;
          rejectRef.current = null;
        }
      }
    };

    worker.onerror = (err) => {
      console.error('Stockfish worker error:', err);
      setIsThinking(false);
      if (rejectRef.current) {
        rejectRef.current(err);
        resolveRef.current = null;
        rejectRef.current = null;
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const getBestMove = useCallback((fen: string, config: BotConfig): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Stockfish worker is not initialized.'));
        return;
      }

      // Cancel any in-flight calculation if a new getBestMove call arrives (send 'stop' first)
      if (isThinking) {
        workerRef.current.postMessage({ type: 'stop' });
        if (rejectRef.current) {
          rejectRef.current(new Error('AI calculation aborted by a new request.'));
        }
      }

      setIsThinking(true);
      resolveRef.current = resolve;
      rejectRef.current = reject;

      // Send FEN position to the worker
      workerRef.current.postMessage({ type: 'setPosition', fen });

      // Trigger the calculation
      workerRef.current.postMessage({
        type: 'go',
        depth: config.depth,
        skill: config.skillLevel,
        moveTime: config.moveTimeMs,
      });
    });
  }, [isThinking]);

  return {
    isThinking,
    getBestMove,
  };
};

export default useStockfish;
