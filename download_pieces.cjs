const https = require('https');
const fs = require('fs');
const path = require('path');

const pieces = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const dir = path.join(__dirname, 'public', 'pieces', 'cburnett');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

pieces.forEach(piece => {
    const url = `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/${piece}.svg`;
    const dest = path.join(dir, `${piece}.svg`);
    
    https.get(url, (response) => {
        if (response.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${piece}.svg`);
            });
        } else {
            console.error(`Failed to download ${piece}.svg: ${response.statusCode}`);
        }
    }).on('error', (err) => {
        console.error(`Error downloading ${piece}.svg: ${err.message}`);
    });
});
