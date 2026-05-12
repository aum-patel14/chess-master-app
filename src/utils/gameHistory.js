export function saveGame(gameData) {
  const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
  history.unshift({
    id: Date.now(),
    date: new Date().toLocaleDateString(),
    result: gameData.result,
    opponent: gameData.opponent,
    difficulty: gameData.difficulty,
    moves: gameData.moveCount,
    duration: gameData.duration,
    playerColor: gameData.playerColor,
  });
  localStorage.setItem('gameHistory', JSON.stringify(history.slice(0, 10)));
}

export function getHistory() {
  return JSON.parse(localStorage.getItem('gameHistory') || '[]');
}
