import { useState, useEffect, useRef, useCallback } from 'react';
import { BotConfig } from '../config/bots';
// @ts-ignore
import { initStockfish, getCustomBestMove, getStockfishReady } from '../services/stockfishService';
import { getBestMove as fallbackGetBestMove } from '../engine/customEngine';

export interface StockfishHook {
  isThinking: boolean;
  getBestMove: (fen: string, config: BotConfig) => Promise<string>;
}

export const useStockfish = (): StockfishHook => {
  const [isThinking, setIsThinking] = useState(false);
  const [useWasm, setUseWasm] = useState(false);
  const isThinkingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    initStockfish().then((ok: boolean) => {
      if (!mounted) return;
      setUseWasm(ok);
      console.log(ok ? '🚀 useStockfish: using WebAssembly Stockfish Engine' : '⚠️ useStockfish: using local fallback JS Engine');
    });
    return () => {
      mounted = false;
    };
  }, []);

  const getBestMove = useCallback(async (fen: string, config: BotConfig): Promise<string> => {
    setIsThinking(true);
    isThinkingRef.current = true;

    try {
      if (useWasm && getStockfishReady()) {
        const skill = config.skillLevel ?? 10;
        const depth = config.depth ?? 8;
        const moveTime = config.moveTimeMs ?? 500;
        const move = await getCustomBestMove(fen, skill, depth, moveTime);
        return move;
      } else {
        // Fallback to pure JS minimax Custom Engine synchronously in a brief timeout to avoid locking the UI thread
        await new Promise(r => setTimeout(r, 50));
        const skill = Math.max(1, Math.min(20, Math.round(Number(config.skillLevel) || 10)));
        const bestMove = fallbackGetBestMove(fen, skill);
        if (bestMove) {
          return bestMove.from + bestMove.to + (bestMove.promotion || '');
        }
        return '';
      }
    } catch (e) {
      console.warn('AI getBestMove calculation failed, using random fallback:', e);
      // Final emergency fallback using Chess.js
      const { Chess } = await import('chess.js');
      const game = new Chess(fen);
      const moves = game.moves({ verbose: true });
      if (moves.length > 0) {
        const m = moves[Math.floor(Math.random() * moves.length)];
        return m.from + m.to + (m.promotion ?? '');
      }
      return '';
    } finally {
      setIsThinking(false);
      isThinkingRef.current = false;
    }
  }, [useWasm]);

  return { isThinking, getBestMove };
};

export default useStockfish;
