// Rendu PNG (x2) et PDF vectoriel de la cartographie.
// Usage : NODE_PATH=$(npm root -g) node render.cjs
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2000, height: 1470 }, deviceScaleFactor: 2 });
  page.on('console', m => console.log(m.text()));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForSelector('html[data-ready="1"]');
  await page.locator('#map').screenshot({ path: path.join(__dirname, 'cartographie-ihu.png') });
  await page.pdf({ path: path.join(__dirname, 'cartographie-ihu.pdf'), width: '2000px', height: '1470px', printBackground: true, pageRanges: '1' });
  await browser.close();
})();
