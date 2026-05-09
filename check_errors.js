const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', exception => {
    console.error(`Uncaught exception: "${exception}"`);
  });

  page.on('console', msg => {
    if(msg.type() === 'error') {
       console.error(`Console error: "${msg.text()}"`);
    }
  });

  await page.goto('http://127.0.0.1:8000/editor', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  
  await browser.close();
})();
