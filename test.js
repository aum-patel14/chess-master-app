import puppeteer from 'puppeteer';

async function test() {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/');
  console.log('Page loaded');
  
  // Wait for React to render
  await page.waitForSelector('.mode-card.vs-ai');
  
  // Click vs AI
  console.log('Clicking vs AI mode...');
  await page.click('.mode-card.vs-ai');
  
  // Wait for config panel
  try {
    await page.waitForSelector('.start-game-btn', { timeout: 2000 });
    console.log('Config panel appeared.');
    
    // Click start game
    console.log('Clicking start game...');
    await page.click('.start-game-btn');
    
    // Wait a bit to see if there are any errors or if GameScreen loads
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if GameScreen is visible by looking for chessboard
    const hasBoard = await page.evaluate(() => !!document.querySelector('.chessboard-container'));
    console.log('Is GameScreen rendering chessboard?', hasBoard);
  } catch (e) {
    console.log('Could not find start game button:', e.message);
    const html = await page.content();
    console.log('HTML Dump length:', html.length);
  }
  
  await browser.close();
}

test().catch(console.error);
