import { Chess, type Move } from "chess.js";

// Piece values (centipawns)
const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (from white's perspective, a8..h1 order).
// Encourages good positional play.
// prettier-ignore
const PST: Record<string, number[]> = {
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

function squareToIndex(square: string): number {
  const file = square.charCodeAt(0) - 97; // a=0
  const rank = 8 - parseInt(square[1], 10); // rank 8 -> row 0
  return rank * 8 + file;
}

// Manhattan distance of a square (row/col 0..7) from the centre of the board.
// 0 in the middle, up to 6 in a corner — used to push the losing king to the edge.
function centerDistance(row: number, col: number): number {
  const colDist = Math.max(3 - col, col - 4);
  const rowDist = Math.max(3 - row, row - 4);
  return colDist + rowDist;
}

// Static evaluation from white's perspective (positive = good for white).
// Draws are 0. Checkmate is intentionally NOT scored here — terminal mates are
// handled ply-aware inside negamax so the engine prefers the *fastest* mate.
function evaluate(game: Chess): number {
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return 0;
  }

  let score = 0;
  // Non-king material per side, used to detect endgames where one side should
  // be actively driving the enemy king toward the edge to deliver mate.
  let whiteMat = 0;
  let blackMat = 0;
  let wKing: [number, number] | null = null;
  let bKing: [number, number] | null = null;

  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const idx = r * 8 + c;
      const base = PIECE_VALUE[piece.type];
      const table = PST[piece.type];
      // Kings are scored separately below: their middlegame PST keeps the king
      // tucked on the back rank, which is exactly wrong when it must march up
      // to help deliver mate in a bare endgame.
      if (piece.type === "k") {
        if (piece.color === "w") wKing = [r, c];
        else bKing = [r, c];
        continue;
      }
      if (piece.color === "w") {
        score += base + table[idx];
        whiteMat += base;
      } else {
        // Mirror the table vertically for black.
        const mirrored = (7 - r) * 8 + c;
        score -= base + table[mirrored];
        blackMat += base;
      }
    }
  }

  // Is exactly one side reduced to a lone king? That's the classic "convert the
  // win" situation (K+Q vs K, K+R vs K, K+2B vs K, K+B+N vs K, ...).
  const loneKingEndgame = wKing && bKing && (whiteMat === 0) !== (blackMat === 0);

  if (loneKingEndgame) {
    // ===== Tablebase-style mop-up: force the mate, never shuffle to a draw. =====
    // The winning king MUST approach and the losing king MUST be driven to the
    // edge/corner. With the king PST removed above, this small gradient is the
    // dominant positional signal, so the engine actually walks its king in.
    const winningWhite = whiteMat > blackMat;
    const losing = (winningWhite ? bKing : wKing) as [number, number];
    const winning = (winningWhite ? wKing : bKing) as [number, number];
    const kingDist =
      Math.abs(winning[0] - losing[0]) + Math.abs(winning[1] - losing[1]);
    // Drive the losing king toward the edge, keep our king close behind it.
    const mop = centerDistance(losing[0], losing[1]) * 16 + (14 - kingDist) * 20;
    score += (winningWhite ? 1 : -1) * mop;
  } else {
    // Normal game: apply the king PST for king safety (mirror for black).
    const kPst = PST.k;
    if (wKing) score += kPst[wKing[0] * 8 + wKing[1]];
    if (bKing) score -= kPst[(7 - bKing[0]) * 8 + bKing[1]];

    // Lighter mop-up for non-bare-king endgames with a decisive material edge.
    const materialDiff = whiteMat - blackMat;
    const totalMat = whiteMat + blackMat;
    if (wKing && bKing && Math.abs(materialDiff) >= PIECE_VALUE.r) {
      const endgameWeight = Math.max(0, Math.min(1, (3200 - totalMat) / 3200));
      const winningWhite = materialDiff > 0;
      const losing = winningWhite ? bKing : wKing;
      const winning = winningWhite ? wKing : bKing;
      const kingDist =
        Math.abs(winning[0] - losing[0]) + Math.abs(winning[1] - losing[1]);
      const mop = centerDistance(losing[0], losing[1]) * 14 + (14 - kingDist) * 18;
      score += (winningWhite ? 1 : -1) * mop * endgameWeight;
    }
  }

  return score;
}

// Per-level aggression multiplier applied to capture ordering. Set by
// getBestMove from the current level's profile; defaults to 1 (neutral) so
// other callers (e.g. searchEval) are unaffected. Higher = sharper, more
// capture-hungry move ordering and search.
let searchAggression = 1;

function orderMoves(moves: Move[]): Move[] {
  // Search captures and promotions first for better alpha-beta pruning.
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
}

function scoreMove(m: Move): number {
  let s = 0;
  if (m.captured) s += searchAggression * (10 * PIECE_VALUE[m.captured] - PIECE_VALUE[m.piece]);
  if (m.promotion) s += PIECE_VALUE[m.promotion];
  return s;
}

// A deadline (performance.now() timestamp) for the current search. While the
// engine is "thinking" it bails out of deeper search once this is exceeded so a
// move never takes too long. Defaults to Infinity so non-time-bounded callers
// (e.g. the post-game review via searchEval) are unaffected.
let searchDeadline = Infinity;

function timeUp(): boolean {
  return performance.now() >= searchDeadline;
}

// Quiescence search: keep searching captures past the depth horizon so the
// engine doesn't blunder material right at the edge of its search.
function quiesce(game: Chess, alpha: number, beta: number, color: number): number {
  if (game.isCheckmate()) return -MATE_SCORE;
  const standPat = color * evaluate(game);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (timeUp()) return alpha;

  const captures = orderMoves(
    (game.moves({ verbose: true }) as Move[]).filter((m) => m.captured || m.promotion),
  );
  for (const move of captures) {
    game.move(move);
    const value = -quiesce(game, -beta, -alpha, -color);
    game.undo();
    if (value >= beta) return beta;
    if (value > alpha) alpha = value;
    if (timeUp()) break;
  }
  return alpha;
}

// Large value used for forced mates. Distance-to-mate (ply) is subtracted so a
// mate-in-2 scores higher than a mate-in-6 and the engine actually converts.
const MATE_SCORE = 1_000_000;

function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  color: number,
  ply = 0,
): number {
  // Terminal nodes: prefer faster mates, treat all draws as 0.
  if (game.isCheckmate()) {
    // Side to move is mated — worst possible, but nearer mates are "less bad".
    return -(MATE_SCORE - ply);
  }
  if (game.isGameOver()) {
    return 0;
  }
  if (depth === 0) {
    return quiesce(game, alpha, beta, color);
  }
  // Out of time — fall back to a static evaluation instead of searching deeper.
  if (timeUp()) {
    return color * evaluate(game);
  }

  let best = -Infinity;
  const moves = orderMoves(game.moves({ verbose: true }) as Move[]);
  for (const move of moves) {
    game.move(move);
    const value = -negamax(game, depth - 1, -beta, -alpha, -color, ply + 1);
    game.undo();
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
    if (timeUp()) break;
  }
  return best;
}

// Engine strength is a level from 1 (very weak / beginner) to 16 (strongest).
// IMPORTANT: every level has its OWN hand-defined profile (see LEVEL_TABLE
// below) rather than a single interpolation formula. The core search engine is
// shared (so all levels play legal, sensible chess), but each level's depth,
// think-time, noise, blunder behaviour, contempt and aggression are chosen
// independently per level.
export type Difficulty = number;

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 16;

// How a level makes a "mistake" when one triggers:
//  - "full"      : play a completely random legal move (true beginner chaos)
//  - "top3worst" : pick from the 3 worst of the candidate moves (bad but not insane)
//  - "top2worst" : pick from the 2 worst candidate moves (a clear inaccuracy)
//  - "soft"      : pick the 2nd/3rd best move instead of the best (a slip)
//  - "none"      : never deliberately make a mistake
export type BlunderSeverity = "full" | "top3worst" | "top2worst" | "soft" | "none";

export interface LevelParams {
  depth: number; // max search depth (iterative deepening cap)
  timeBudget: number; // ms the engine may "think" before returning a move
  noise: number; // centipawns of random eval noise (variety + weakness)
  randomMoveChance: number; // chance to trigger a mistake on a given move
  blunderSeverity: BlunderSeverity; // how bad a triggered mistake is
  contempt: number; // centipawn bias against draws (negative = happy to draw)
  aggression: number; // capture-ordering multiplier (>1 sharper, <1 quieter)
}

// ===== Explicit per-level profiles =====
// Each of the 16 levels is its own independently tuned row. Editing one level
// never affects another. The strength climbs smoothly from a blundering
// beginner (1) to a clean deep-searching master (16).
const LEVEL_TABLE: Record<number, LevelParams> = {
  1:  { depth: 1, timeBudget: 80,   noise: 220, randomMoveChance: 0.60, blunderSeverity: "full",      contempt: -30, aggression: 0.6 },
  2:  { depth: 1, timeBudget: 120,  noise: 190, randomMoveChance: 0.50, blunderSeverity: "full",      contempt: -25, aggression: 0.6 },
  3:  { depth: 1, timeBudget: 170,  noise: 160, randomMoveChance: 0.42, blunderSeverity: "top3worst", contempt: -20, aggression: 0.7 },
  4:  { depth: 2, timeBudget: 230,  noise: 130, randomMoveChance: 0.34, blunderSeverity: "top3worst", contempt: -15, aggression: 0.7 },
  5:  { depth: 2, timeBudget: 300,  noise: 110, randomMoveChance: 0.27, blunderSeverity: "top3worst", contempt: -10, aggression: 0.8 },
  6:  { depth: 2, timeBudget: 380,  noise: 90,  randomMoveChance: 0.20, blunderSeverity: "top2worst", contempt: -5,  aggression: 0.8 },
  7:  { depth: 3, timeBudget: 470,  noise: 70,  randomMoveChance: 0.14, blunderSeverity: "top2worst", contempt: 0,   aggression: 0.9 },
  8:  { depth: 3, timeBudget: 560,  noise: 55,  randomMoveChance: 0.09, blunderSeverity: "top2worst", contempt: 0,   aggression: 0.9 },
  9:  { depth: 3, timeBudget: 660,  noise: 42,  randomMoveChance: 0.05, blunderSeverity: "soft",      contempt: 0,   aggression: 1.0 },
  10: { depth: 4, timeBudget: 770,  noise: 30,  randomMoveChance: 0.02, blunderSeverity: "soft",      contempt: 5,   aggression: 1.0 },
  11: { depth: 4, timeBudget: 900,  noise: 22,  randomMoveChance: 0.00, blunderSeverity: "none",      contempt: 5,   aggression: 1.1 },
  12: { depth: 4, timeBudget: 1050, noise: 15,  randomMoveChance: 0.00, blunderSeverity: "none",      contempt: 10,  aggression: 1.1 },
  13: { depth: 4, timeBudget: 1200, noise: 9,   randomMoveChance: 0.00, blunderSeverity: "none",      contempt: 12,  aggression: 1.2 },
  14: { depth: 5, timeBudget: 1350, noise: 5,   randomMoveChance: 0.00, blunderSeverity: "none",      contempt: 15,  aggression: 1.2 },
  15: { depth: 5, timeBudget: 1500, noise: 2,   randomMoveChance: 0.00, blunderSeverity: "none",      contempt: 18,  aggression: 1.3 },
  16: { depth: 5, timeBudget: 1700, noise: 0,   randomMoveChance: 0.00, blunderSeverity: "none",      contempt: 20,  aggression: 1.3 },
};

/** Clamp any incoming value to a valid 1..16 integer level. */
export function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
}

/** A short human-friendly band name for a level (used by the UI). */
export function levelLabel(level: number): string {
  const lvl = clampLevel(level);
  if (lvl <= 3) return "Beginner";
  if (lvl <= 6) return "Casual";
  if (lvl <= 9) return "Intermediate";
  if (lvl <= 12) return "Advanced";
  if (lvl <= 14) return "Expert";
  return "Master";
}

/** Look up the concrete engine profile for a 1..16 level. */
export function levelParams(level: number): LevelParams {
  return LEVEL_TABLE[clampLevel(level)];
}

function randSign(amount: number): number {
  return (Math.random() * 2 - 1) * amount;
}

// Lightweight "tablebase fallback": detect simple, theoretically-won endgames
// where the side to move owns mating material against a lone enemy king
// (K+Q vs K, K+R vs K, K+QQ/RR vs K, K+2B vs K, K+B+N vs K).
//
// In these positions the board is so sparse that we can afford a much deeper,
// noise-free, mate-seeking search. Combined with the endgame mop-up term in
// evaluate(), this guarantees the engine drives the enemy king to the edge and
// converts the win instead of shuffling into a draw.
function isSimpleWinningEndgameForSideToMove(game: Chess): boolean {
  const us = game.turn();
  const board = game.board();

  let theirPieces = 0; // enemy non-king material
  let queens = 0;
  let rooks = 0;
  let bishops = 0;
  let knights = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.type === "k") continue;
      if (piece.color === us) {
        if (piece.type === "q") queens++;
        else if (piece.type === "r") rooks++;
        else if (piece.type === "b") bishops++;
        else if (piece.type === "n") knights++;
        else return false; // a pawn -> not a "simple" mating endgame, search normally
      } else {
        theirPieces++;
      }
    }
  }

  // Enemy must be a lone king.
  if (theirPieces > 0) return false;

  // We must hold material that can force mate against a lone king.
  const hasMatingMaterial =
    queens > 0 || rooks > 0 || bishops >= 2 || (bishops >= 1 && knights >= 1);
  return hasMatingMaterial;
}

/**
 * Pick the best move for the side to move.
 *
 * Real-engine behaviour:
 *  - alpha-beta negamax with a quiescence search for tactical soundness,
 *  - iterative deepening bounded by a per-difficulty time budget so moves are fast,
 *  - per-difficulty evaluation noise so openings and near-equal positions vary,
 *  - a penalty for moves that repeat the current position (no shuffling),
 *  - easy occasionally plays a random move so it stays beatable.
 */
export function getBestMove(fen: string, difficulty: Difficulty): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  const color = game.turn() === "w" ? 1 : -1;

  // Resolve the concrete engine knobs for this strength level.
  const params = levelParams(difficulty);

  // Tablebase-style fallback: in a simple won endgame, search far deeper with no
  // noise so the engine reliably forces mate instead of drawing.
  const endgameSolve = isSimpleWinningEndgameForSideToMove(game);
  const maxDepth = endgameSolve ? 20 : params.depth;
  const budget = endgameSolve ? 1800 : params.timeBudget;
  const noise = endgameSolve ? 0 : params.noise;
  const randomMoveChance = endgameSolve ? 0 : params.randomMoveChance;
  const contempt = endgameSolve ? 0 : params.contempt;
  const blunderSeverity: BlunderSeverity = endgameSolve ? "none" : params.blunderSeverity;

  // Per-level sharpness: bias capture ordering/search by this level's aggression.
  searchAggression = endgameSolve ? 1 : params.aggression;

  // Position keys already seen in this game — used to discourage repetition.
  const seen = new Set(
    game.history({ verbose: true }).map((m) => (m as Move & { after?: string }).after ?? ""),
  );

  const ordered = orderMoves(moves);
  let bestMove: Move = ordered[0];
  // Scored candidates from the last completed search depth, used by the
  // per-level "mistake" model so weak levels blunder in a human-like way.
  let scored: { move: Move; value: number }[] = ordered.map((move) => ({ move, value: 0 }));

  // Iterative deepening within the time budget.
  searchDeadline = performance.now() + budget;
  try {
    for (let depth = 1; depth <= maxDepth; depth++) {
      let bestValue = -Infinity;
      let depthBest: Move | null = null;
      const depthScores: { move: Move; value: number }[] = [];
      for (const move of ordered) {
        game.move(move);
        let value = -negamax(game, depth - 1, -Infinity, Infinity, -color, 1);
        const afterKey = game.fen().split(" ").slice(0, 4).join(" ");
        const drawish =
          game.isDraw() || game.isStalemate() || game.isThreefoldRepetition();
        game.undo();

        // Only apply repetition penalty, contempt and random noise to
        // non-decisive moves. A forced mate must never be passed over.
        const isMate = Math.abs(value) >= MATE_SCORE - 1000;
        if (!isMate) {
          // Discourage repeating a position we've already reached. In a won
          // endgame this is heavy so the engine never shuffles into a threefold
          // draw — it must keep making progress toward mate.
          if (seen.has(afterKey)) value -= endgameSolve ? 100000 : 80;
          // Contempt: positive => avoid draws, negative => happy to draw.
          if (drawish) value -= contempt;
          // Add small random noise so equal-ish moves are chosen with variety.
          value += randSign(noise);
        }

        depthScores.push({ move, value });
        if (value > bestValue) {
          bestValue = value;
          depthBest = move;
        }
        if (timeUp()) break;
      }
      // Keep the best move + full scoring from the deepest meaningful iteration.
      if (depthBest) bestMove = depthBest;
      if (depthScores.length === ordered.length) scored = depthScores;
      if (timeUp()) break;
    }
  } finally {
    searchDeadline = Infinity;
    searchAggression = 1;
  }

  // Per-level mistake model. When a mistake triggers, how bad it is depends on
  // the level's blunderSeverity, so beginners err like beginners (not randomly
  // insane) and strong levels never throw the game.
  const mistakeTriggered =
    randomMoveChance > 0 && blunderSeverity !== "none" && Math.random() < randomMoveChance;

  if (mistakeTriggered) {
    if (blunderSeverity === "full") {
      // True beginner: a completely random legal move.
      return moves[Math.floor(Math.random() * moves.length)];
    }
    // Rank candidates best -> worst.
    const ranked = [...scored].sort((a, b) => b.value - a.value);
    // Never deliberately discard a forced mate.
    const hasMate = ranked[0] && ranked[0].value >= MATE_SCORE - 1000;
    if (!hasMate && ranked.length > 1) {
      if (blunderSeverity === "soft") {
        // A slip: pick the 2nd or 3rd best move.
        const pool = ranked.slice(1, 3);
        return pool[Math.floor(Math.random() * pool.length)].move;
      }
      const worstN = blunderSeverity === "top3worst" ? 3 : 2;
      const pool = ranked.slice(Math.max(1, ranked.length - worstN));
      return pool[Math.floor(Math.random() * pool.length)].move;
    }
  }

  return bestMove;
}

const MATE = 100000;

/**
 * Evaluate a position in centipawns from the side-to-move's perspective.
 * Used by the post-game review to score how good each move was.
 */
export function searchEval(fen: string, depth: number): number {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) {
    if (game.isCheckmate()) return -MATE; // side to move is checkmated
    return 0; // stalemate / no moves = draw
  }
  const color = game.turn() === "w" ? 1 : -1;
  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    game.move(move);
    const value = -negamax(game, depth - 1, -Infinity, Infinity, -color);
    game.undo();
    if (value > best) best = value;
  }
  if (!Number.isFinite(best)) return best > 0 ? MATE : -MATE;
  return Math.max(-MATE, Math.min(MATE, best));
}

export { squareToIndex, MATE };
