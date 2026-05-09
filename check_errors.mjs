import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', exception => {
    console.error(`PAGE ERROR: ${exception}`);
  });

  page.on('console', msg => {
    if(msg.type() === 'error') {
       console.error(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  console.log("Navigating to http://127.0.0.1:8000/editor ...");
  try {
    await page.goto('http://127.0.0.1:8000/editor', { waitUntil: 'networkidle' });
  } catch(e) {
    console.error("Navigation error:", e);
  }
  
  await page.waitForTimeout(2000);
  console.log("Done checking.");
  
  await browser.close();
})();
