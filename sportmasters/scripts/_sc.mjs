import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.locator('.showcase').screenshot({ path: out });
const info = await page.locator('.showcase .card').evaluateAll((els) => els.map((e) => {
  const holo = e.querySelector('.card__holo'); const s = getComputedStyle(holo); const b = getComputedStyle(e.querySelector('.card__body'));
  return { cls: e.className, holoOpacity: s.opacity, holoBlend: s.mixBlendMode, bodyVis: b.visibility, bodyOpacity: b.opacity };
}));
console.log(JSON.stringify(info, null, 1));
await browser.close();
