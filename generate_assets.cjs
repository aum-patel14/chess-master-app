const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#080810" />
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="30" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <text x="512" y="650" font-family="Arial" font-size="500" fill="#D4AF37" text-anchor="middle" filter="url(#glow)">♚</text>
</svg>
`;

const splashSvg = `
<svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="#080810" />
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="80" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <text x="1366" y="1450" font-family="Arial" font-size="1000" fill="#D4AF37" text-anchor="middle" filter="url(#glow)">♚</text>
  <text x="1366" y="1800" font-family="Arial" font-size="160" font-weight="bold" fill="#D4AF37" text-anchor="middle" letter-spacing="4">ChessMaster Pro</text>
</svg>
`;

async function generate() {
  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(__dirname, 'assets', 'icon.png'));
    
  await sharp(Buffer.from(splashSvg))
    .png()
    .toFile(path.join(__dirname, 'assets', 'splash.png'));
    
  console.log('Successfully generated icon.png and splash.png');
}

generate().catch(console.error);
