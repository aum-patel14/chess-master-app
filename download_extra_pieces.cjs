const https = require('https');
const fs = require('fs');
const path = require('path');

const pieces = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const themes = ['alpha', 'merida'];

async function downloadPiece(theme, piece) {
  const dir = path.join(__dirname, 'public', 'pieces', theme);
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  const url = `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${theme}/${piece}.svg`;
  const dest = path.join(dir, `${piece}.svg`);

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded pieces/${theme}/${piece}.svg`);
          resolve();
        });
      } else {
        reject(new Error(`Failed to download ${theme}/${piece}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting download of extra chess piece sets (alpha & merida)...');
  for (const theme of themes) {
    for (const piece of pieces) {
      try {
        await downloadPiece(theme, piece);
      } catch (err) {
        console.error(`Error downloading ${theme}/${piece}: ${err.message}`);
      }
    }
  }
  console.log('Extra piece sets download process completed!');
}

run();
