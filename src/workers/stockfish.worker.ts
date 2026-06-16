/// <reference lib="webworker" />
import { getBestMove } from '../engine/customEngine';

let currentFen = '';

self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  if (!data) return;

  switch (data.type) {
    case 'setPosition':
      currentFen = data.fen;
      break;

    case 'go':
      // Map 0-20 stockfish skill to 1-16 custom engine difficulty
      const skillLevel = data.skill || 0;
      const difficulty = Math.max(1, Math.min(16, Math.round((skillLevel / 20) * 16)));
      
      try {
        const bestMove = getBestMove(currentFen, difficulty);
        if (bestMove) {
          const moveStr = bestMove.from + bestMove.to + (bestMove.promotion || '');
          self.postMessage({ type: 'bestmove', move: moveStr });
        } else {
          self.postMessage({ type: 'bestmove', move: null });
        }
      } catch (err) {
        console.error('Error calculating custom engine best move:', err);
        self.postMessage({ type: 'bestmove', move: null });
      }
      break;

    case 'stop':
      // Custom engine operates synchronously, stop is a no-op but handled here
      break;

    case 'quit':
      self.close();
      break;

    default:
      console.warn('Unknown message type received in Custom AI Worker:', data.type);
  }
};

// Immediately signal that the worker is ready since it's just pure JS
self.postMessage({ type: 'ready' });
