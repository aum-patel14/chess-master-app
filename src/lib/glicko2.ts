import { glicko2 } from 'glicko2-lite';

/**
 * Calculates a new Glicko-2 rating after a puzzle outcome.
 *
 * @param playerRating Current rating of the player.
 * @param playerRD Current rating deviation (RD) of the player.
 * @param playerVolatility Current volatility of the player.
 * @param puzzleRating Rating of the puzzle.
 * @param puzzleRD Rating deviation (RD) of the puzzle.
 * @param outcome 1 for solved, 0 for failed.
 * @returns Object with the updated rating, RD, and volatility.
 */
export function calculateNewRating(
  playerRating: number,
  playerRD: number,
  playerVolatility: number,
  puzzleRating: number,
  puzzleRD: number,
  outcome: number
): { newRating: number; newRD: number; newVolatility: number } {
  // Use defaults if not provided
  const rd = playerRD ?? 350;
  const vol = playerVolatility ?? 0.06;
  const pRating = puzzleRating ?? 1500;
  const pRD = puzzleRD ?? 350;

  const opponents: [number, number, number][] = [[pRating, pRD, outcome]];
  const result = glicko2(playerRating, rd, vol, opponents, { tau: 0.5 });

  return {
    newRating: result.rating,
    newRD: result.rd,
    newVolatility: result.vol
  };
}
