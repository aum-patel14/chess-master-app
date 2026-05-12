export const ACHIEVEMENTS = [
  { id: 'first_win', title: 'First Victory', desc: 'Win your first game', icon: '🏆' },
  { id: 'ten_games', title: 'Dedicated Player', desc: 'Play 10 games', icon: '🎯' },
  { id: 'beat_expert', title: 'Grandmaster', desc: 'Beat Expert AI', icon: '👑' },
  { id: 'quick_win', title: 'Speed Chess', desc: 'Win in under 20 moves', icon: '⚡' },
  { id: 'comeback', title: 'Comeback King', desc: 'Win after losing your queen', icon: '♛' },
];

export function checkAchievements(gameData) {
  const unlocked = JSON.parse(localStorage.getItem('achievements') || '[]');
  const newUnlocks = [];
  
  if (gameData.result === 'win' && !unlocked.includes('first_win')) newUnlocks.push('first_win');
  if (gameData.totalGames >= 10 && !unlocked.includes('ten_games')) newUnlocks.push('ten_games');
  if (gameData.result === 'win' && gameData.difficulty === 5 && !unlocked.includes('beat_expert')) newUnlocks.push('beat_expert');
  if (gameData.result === 'win' && gameData.moveCount < 20 && !unlocked.includes('quick_win')) newUnlocks.push('quick_win');
  if (gameData.result === 'win' && gameData.lostQueen && !unlocked.includes('comeback')) newUnlocks.push('comeback');
  
  if (newUnlocks.length > 0) {
    localStorage.setItem('achievements', JSON.stringify([...unlocked, ...newUnlocks]));
  }
  return newUnlocks;
}

export function getUnlockedAchievements() {
  return JSON.parse(localStorage.getItem('achievements') || '[]');
}
