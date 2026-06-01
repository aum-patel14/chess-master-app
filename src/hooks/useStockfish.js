import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  initStockfish,
  getBestMove,
  getRandomLegalMove,
  destroyStockfish,
  DIFFICULTY_CONFIG,
  getStockfishReady,
} from '../services/stockfishService';

export const useStockfish = (initialDifficulty = 3) => {
  const [isReady, setIsReady] = useState(() => getStockfishReady());
  const [isThinking, setIsThinking] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const abortRef = useRef(false);

  useEffect(() => {
    setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  useEffect(() => {
    let mounted = true;
    initStockfish().then((ok) => {
      if (!mounted) return;
      setIsReady(ok);
      setIsSimpleMode(!ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const makeAiMove = useCallback(
    async (game) => {
      if (game.isGameOver()) return null;
      abortRef.current = false;
      setIsThinking(true);

      try {
        let uciMove = null;

        if (isReady && !isSimpleMode) {
          try {
            uciMove = await getBestMove(game.fen(), difficulty);
          } catch (e) {
            console.warn('Stockfish failed, using random move:', e);
            uciMove = getRandomLegalMove(game);
          }
        } else {
          await new Promise((r) => setTimeout(r, 400));
          uciMove = getRandomLegalMove(game);
        }

        if (!uciMove || abortRef.current) return null;

        const result = game.move({
          from: uciMove.slice(0, 2),
          to: uciMove.slice(2, 4),
          promotion: uciMove[4] ?? 'q',
        });

        return result ? uciMove : null;
      } catch (e) {
        console.error('makeAiMove error:', e);
        return null;
      } finally {
        setIsThinking(false);
      }
    },
    [isReady, isSimpleMode, difficulty]
  );

  return {
    isReady,
    isThinking,
    isSimpleMode,
    difficulty,
    setDifficulty,
    makeAiMove,
    DIFFICULTY_CONFIG,
  };
};

export default useStockfish;
