import { readStats } from './chessStats'

export const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', title: 'First Victory', desc: 'Win your first game', secret: false },
  { id: 'three_streak', icon: '🔥', title: 'On Fire', desc: 'Win 3 games in a row', secret: false },
  { id: 'puzzle_10', icon: '🧩', title: 'Puzzle Enthusiast', desc: 'Solve 10 puzzles', secret: false },
  { id: 'speed_win', icon: '⚡', title: 'Speed Demon', desc: 'Win with 3+ minutes remaining', secret: false },
  { id: 'promotion', icon: '♛', title: 'Pawn Power', desc: 'Win using a pawn promotion', secret: false },
  { id: 'beat_hard', icon: '🤖', title: 'Machine Slayer', desc: 'Beat the Hard AI', secret: false },
  { id: 'games_10', icon: '🎮', title: 'Dedicated Player', desc: 'Play 10 games', secret: false },
  { id: 'games_50', icon: '🎯', title: 'Chess Veteran', desc: 'Play 50 games', secret: true },
  { id: 'perfect_puzzle', icon: '💎', title: 'Flawless', desc: 'Solve a puzzle without any hints', secret: false },
]

const STORAGE_KEY = 'chess_achievements'

export function getUnlockedAchievements() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUnlocked(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

/** @returns {string[]} newly unlocked ids */
export function checkAndUnlockAchievements(gameResult, gameData = {}) {
  const unlocked = new Set(getUnlockedAchievements())
  const newOnes = []

  const stats = readStats()

  const tryUnlock = (id, cond) => {
    if (cond && !unlocked.has(id)) {
      unlocked.add(id)
      newOnes.push(id)
    }
  }

  if (gameResult === 'game_end') {
    tryUnlock('first_win', gameData.result === 'win')
    tryUnlock('three_streak', gameData.result === 'win' && (stats.streak || 0) >= 3)
    tryUnlock('speed_win', gameData.result === 'win' && (gameData.whiteTimeLeft >= 180 || gameData.blackTimeLeft >= 180))
    tryUnlock('promotion', gameData.result === 'win' && gameData.hadPromotion)
    tryUnlock('beat_hard', gameData.result === 'win' && (gameData.difficulty || 0) >= 4)
    tryUnlock('games_10', (stats.gamesPlayed || 0) >= 10)
    tryUnlock('games_50', (stats.gamesPlayed || 0) >= 50)
  }

  if (gameResult === 'puzzle_solved') {
    tryUnlock('puzzle_10', (stats.puzzlesSolved || 0) >= 10)
    tryUnlock('perfect_puzzle', !!gameData.noHints)
  }

  if (newOnes.length) saveUnlocked([...unlocked])
  return newOnes
}

/** Legacy helper used by GameContext */
export function checkAchievements(gameData) {
  return checkAndUnlockAchievements('game_end', {
    result: gameData.result,
    hadPromotion: false,
    difficulty: gameData.difficulty,
    whiteTimeLeft: 999,
    blackTimeLeft: 999,
  })
}
