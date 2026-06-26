import { useState, useEffect, useRef, useCallback } from 'react';
import { BotConfig } from '../config/bots';
// @ts-ignore
import { initStockfish, getCustomBestMove, getStockfishReady } from '../services/stockfishService';
import { getBestMove as fallbackGetBestMove } from '../engine/customEngine';

export interface StockfishHook {
  isThinking: boolean;
  getBestMove: (fen: string, config: BotConfig) => Promise<string>;
}

const fetchOnlineBestMove = async (fen: string, config: BotConfig): Promise<string> => {
  const depth = config.depth ?? 10;
  const response = await fetch('https://chess-api.com/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, depth }),
  });
  if (!response.ok) {
    throw new Error(`chess-api.com HTTP error ${response.status}`);
  }
  const data = await response.json();
  if (data && data.bestMove) {
    return data.bestMove;
  }
  throw new Error('No bestMove returned from chess-api.com');
};

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

    const engineType = localStorage.getItem('chess_engine_type') || 'local';

    try {
      if (engineType === 'online') {
        try {
          return await fetchOnlineBestMove(fen, config);
        } catch (onlineErr) {
          console.warn('Online engine failed, falling back to local WASM:', onlineErr);
          // Fall through to local WASM
        }
      }

      if (engineType === 'local' || engineType === 'online') {
        if (useWasm && getStockfishReady()) {
          const skill = config.skillLevel ?? 10;
          const depth = config.depth ?? 8;
          const moveTime = config.moveTimeMs ?? 500;
          return await getCustomBestMove(fen, skill, depth, moveTime);
        }
      }

      // Fallback to pure JS minimax Custom Engine synchronously in a brief timeout to avoid locking the UI thread
      await new Promise(r => setTimeout(r, 50));
      const skill = Math.max(1, Math.min(20, Math.round(Number(config.skillLevel) || 10)));
      const bestMove = fallbackGetBestMove(fen, skill);
      if (bestMove) {
        return bestMove.from + bestMove.to + (bestMove.promotion || '');
      }
      return '';
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
