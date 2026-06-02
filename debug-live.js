import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: "C:\\Users\\aumpa\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe"
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  console.log('Navigating to live URL...');
  await page.goto('https://aum-patel14.github.io/chess-master-app/', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  console.log('Done.');
  await browser.close();
})();
