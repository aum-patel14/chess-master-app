/** Local stats / ELO keys used across Home, Game, Stats, Leaderboard (Phase 3–7). */

const STATS_KEY = 'chess_stats'
const ELO_KEY = 'chess_elo_rating'
const HISTORY_KEY = 'chess_game_history'

export function readStats() {
  try {
    return JSON.parse(
      localStorage.getItem(STATS_KEY) ||
        '{"wins":0,"losses":0,"draws":0,"streak":0,"bestStreak":0,"gamesPlayed":0,"puzzlesSolved":0}'
    )
  } catch {
    return { wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, gamesPlayed: 0, puzzlesSolved: 0 }
  }
}

export function writeStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function readElo() {
  const v = parseInt(localStorage.getItem(ELO_KEY) || localStorage.getItem('playerElo') || '800', 10)
  return Number.isFinite(v) ? v : 800
}

export function writeElo(n) {
  localStorage.setItem(ELO_KEY, String(n))
  localStorage.setItem('playerElo', String(n))
}

/** Map aiDifficulty 1–5 to phase string */
export function difficultyTier(aiDifficulty) {
  const diff = Number(aiDifficulty);
  if (diff <= 2) return 'easy';
  if (diff <= 6) return 'medium';
  return 'hard';
}

const ELO_DELTA = { easy: { win: 8, loss: -8, draw: 4 }, medium: { win: 15, loss: -15, draw: 4 }, hard: { win: 25, loss: -25, draw: 4 } }

export function updateStats(result) {
  const stats = readStats()
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1
  
  if (!stats.winStreak) stats.winStreak = 0;
  if (!stats.lossStreak) stats.lossStreak = 0;
  if (!stats.drawStreak) stats.drawStreak = 0;

  if (result === 'win') {
    stats.wins = (stats.wins || 0) + 1
    stats.winStreak = (stats.winStreak || 0) + 1
    stats.lossStreak = 0
    stats.drawStreak = 0
    stats.streak = stats.winStreak
    stats.bestStreak = Math.max(stats.winStreak, stats.bestStreak || 0)
  } else if (result === 'loss') {
    stats.losses = (stats.losses || 0) + 1
    stats.winStreak = 0
    stats.lossStreak = (stats.lossStreak || 0) + 1
    stats.drawStreak = 0
    stats.streak = -stats.lossStreak
  } else if (result === 'draw') {
    stats.draws = (stats.draws || 0) + 1
    stats.winStreak = 0
    stats.lossStreak = 0
    stats.drawStreak = (stats.drawStreak || 0) + 1
    stats.streak = 0
  }
  writeStats(stats)
  return stats
}

export function updateEloForResult(result, aiDifficulty) {
  const tier = difficultyTier(aiDifficulty)
  const d = ELO_DELTA[tier] || ELO_DELTA.medium
  let elo = readElo()
  if (result === 'win') elo += d.win
  else if (result === 'loss') elo += d.loss
  else if (result === 'draw') elo += Math.random() < 0.5 ? d.draw : -d.draw
  elo = Math.max(100, elo)
  writeElo(elo)
  return elo
}

export function incrementPuzzlesSolved() {
  const stats = readStats()
  stats.puzzlesSolved = (stats.puzzlesSolved || 0) + 1
  writeStats(stats)
  return stats
}

export function appendGameHistory(entry) {
  try {
    const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    const next = [{ ...entry, at: entry.at || Date.now() }, ...prev].slice(0, 50)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry]))
  }
}

export { STATS_KEY, ELO_KEY, HISTORY_KEY }
