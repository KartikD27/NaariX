const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:3000/app', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Click on the Route tab to reveal the route planner
  await page.evaluate(() => {
    const routeTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Route'));
    if (routeTab) routeTab.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // type in destination
  await page.type('input[placeholder="Search destination"]', 'mumbai');
  
  await new Promise(r => setTimeout(r, 4000)); // wait for debounce and network
  
  await browser.close();
})();
