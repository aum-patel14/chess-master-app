// Chess Engine Service — wraps chess.js with AI using minimax + alpha-beta pruning
import { Chess } from 'chess.js';

// Piece values for evaluation
const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Piece-square tables for positional bonuses (white's perspective)
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function squareToIndex(square) {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  return rank * 8 + file;
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -99999 : 99999;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();

  board.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (!cell) return;
      const idx = ri * 8 + ci;
      const pstIdx = cell.color === 'w' ? idx : 63 - idx;
      const baseVal = PIECE_VALUES[cell.type] || 0;
      const pstVal = PST[cell.type] ? PST[cell.type][pstIdx] : 0;
      const pieceScore = baseVal + pstVal;
      score += cell.color === 'w' ? pieceScore : -pieceScore;
    });
  });

  return score;
}

let searchStartTime = 0;
let searchTimeLimit = 2000;

function minimax(chess, depth, alpha, beta, maximizing) {
  // TIME LIMIT CHECK — stop searching if taking too long
  if (Date.now() - searchStartTime > searchTimeLimit) {
    return evaluateBoard(chess);
  }

  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  // MOVE ORDERING — check captures first (makes alpha-beta 3x faster)
  let moves = chess.moves({ verbose: true });
  moves.sort((a, b) => {
    const aScore = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
    const bScore = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
    return bScore - aScore;
  });
  const moveStrings = moves.map(m => m.san);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moveStrings) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moveStrings) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

const DIFFICULTY = {
  1: { depth: 1, random: 0.9, timeLimit: 100  },
  2: { depth: 2, random: 0.5, timeLimit: 300  },
  3: { depth: 2, random: 0.1, timeLimit: 600  },
  4: { depth: 3, random: 0.0, timeLimit: 1200 },
  5: { depth: 3, random: 0.0, timeLimit: 2000 },
};

export function getBestMove(chess, difficulty = 3) {
  const config = DIFFICULTY[difficulty] || DIFFICULTY[3];
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;

  // Random move for lower difficulties
  if (Math.random() < config.random) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Set time limit for this search
  searchStartTime = Date.now();
  searchTimeLimit = config.timeLimit;

  // Sort moves — captures first for faster alpha-beta pruning
  moves.sort((a, b) => {
    const aScore = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
    const bScore = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
    return bScore - aScore;
  });

  let bestMove = null;
  let bestScore = -Infinity;
  const isWhite = chess.turn() === 'w';

  for (const move of moves) {
    // Stop if time limit exceeded
    if (Date.now() - searchStartTime > searchTimeLimit) {
      console.log('Time limit reached, using best move found so far');
      break;
    }

    chess.move(move);
    const score = minimax(chess, config.depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();

    const adjustedScore = isWhite ? score : -score;
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestMove = move;
    }
  }

  // Fallback to first move if nothing found
  return bestMove || moves[0];
}

export function getGameStatus(chess) {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    return { type: 'checkmate', message: `${winner} wins by checkmate!`, winner };
  }
  if (chess.isStalemate()) return { type: 'stalemate', message: 'Draw by stalemate', winner: null };
  if (chess.isThreefoldRepetition()) return { type: 'repetition', message: 'Draw by threefold repetition', winner: null };
  if (chess.isInsufficientMaterial()) return { type: 'insufficient', message: 'Draw — insufficient material', winner: null };
  if (chess.isDraw()) return { type: 'draw', message: 'Draw by 50-move rule', winner: null };
  if (chess.inCheck()) return { type: 'check', message: 'Check!', winner: null };
  return { type: 'playing', message: '', winner: null };
}
