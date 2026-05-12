const K = 32;

export function calculateElo(playerElo, opponentElo, result) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(playerElo + K * (score - expected));
}

const AI_ELO = { 1: 400, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

export function getAIElo(difficulty) { 
  return AI_ELO[difficulty] || 1200; 
}
