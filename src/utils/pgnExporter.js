/**
 * PGN Exporter Utility for ChessMaster Pro
 * Formats a list of moves and game metadata into standard PGN string
 * and triggers a browser download or copies to clipboard.
 */

export function generatePgnString(history, playerColor, gameMode, opponentName, status) {
  let result = '*';
  if (status) {
    if (status.winner === 'White') {
      result = '1-0';
    } else if (status.winner === 'Black') {
      result = '0-1';
    } else if (
      status.type === 'draw' || 
      status.type === 'stalemate' || 
      status.type === 'repetition' || 
      status.type === 'insufficient'
    ) {
      result = '1/2-1/2';
    }
  }

  const whiteName = playerColor === 'w' ? 'You' : (opponentName || 'AI');
  const blackName = playerColor === 'b' ? 'You' : (opponentName || 'AI');
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');

  let pgn = `[Event "ChessMaster Pro Match"]\n`;
  pgn += `[Site "ChessMaster Pro"]\n`;
  pgn += `[Date "${dateStr}"]\n`;
  pgn += `[Round "1"]\n`;
  pgn += `[White "${whiteName}"]\n`;
  pgn += `[Black "${blackName}"]\n`;
  pgn += `[Result "${result}"]\n`;
  pgn += `[Mode "${gameMode}"]\n\n`;

  let movesText = '';
  for (let i = 0; i < history.length; i++) {
    if (i % 2 === 0) {
      movesText += `${Math.floor(i / 2) + 1}. `;
    }
    movesText += `${history[i].san} `;
  }
  
  pgn += movesText.trim() + ` ${result}`;
  return pgn;
}

export function downloadPgn(history, playerColor, gameMode, opponentName, status) {
  try {
    const pgn = generatePgnString(history, playerColor, gameMode, opponentName, status);
    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chess_game_${Date.now()}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error("Failed to download PGN:", e);
    return false;
  }
}
