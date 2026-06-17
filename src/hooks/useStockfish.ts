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
  // ✅ TRACK: Track isThinking in a ref so useCallback never goes stale
  const isThinkingRef = useRef(false);

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

      // ✅ IGNORE: Ignore the 'ready' message — don't treat it as a bestmove
      if (data.type === 'ready') return;

      if (data.type === 'bestmove') {
        setIsThinking(false);
        isThinkingRef.current = false;

        if (resolveRef.current) {
          // ✅ RESOLVE: Resolve with empty string (not null) so caller gets a string
          resolveRef.current(data.move ?? '');
          resolveRef.current = null;
          rejectRef.current = null;
        }
      }
    };

    worker.onerror = (err) => {
      console.error('Stockfish worker error:', err);
      setIsThinking(false);
      isThinkingRef.current = false;
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

  // ✅ CALLBACK: Empty dependency array [] — this function NEVER changes reference.
  // We use isThinkingRef.current instead of the isThinking state variable
  // so the callback is always fresh without needing to be recreated.
  const getBestMove = useCallback((fen: string, config: BotConfig): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Stockfish worker is not initialized.'));
        return;
      }

      // Cancel any in-flight calculation
      if (isThinkingRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        if (rejectRef.current) {
          rejectRef.current(new Error('AI calculation aborted by a new request.'));
          resolveRef.current = null;
          rejectRef.current = null;
        }
      }

      setIsThinking(true);
      isThinkingRef.current = true;
      resolveRef.current = resolve;
      rejectRef.current = reject;

      // Send position
      workerRef.current.postMessage({ type: 'setPosition', fen });

      // Trigger calculation
      workerRef.current.postMessage({
        type: 'go',
        depth: config.depth,
        skill: config.skillLevel,
        moveTime: config.moveTimeMs,
      });

      // ✅ TIMEOUT: Safety timeout — if worker hangs, reject cleanly
      const timeout = setTimeout(() => {
        if (rejectRef.current === reject) {
          rejectRef.current(new Error('AI move timeout'));
          resolveRef.current = null;
          rejectRef.current = null;
          setIsThinking(false);
          isThinkingRef.current = false;
        }
      }, (config.moveTimeMs || 1000) + 3000);

      // Clear timeout if promise resolves before it fires
      const originalResolve = resolve;
      resolveRef.current = (val: string) => {
        clearTimeout(timeout);
        originalResolve(val);
      };
    });
  }, []); // ✅ Empty deps — stable reference forever

  return { isThinking, getBestMove };
};

export default useStockfish;
