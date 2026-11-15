const puppeteer = require('../frontend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('fieldshift.access_key', 'fsk_demouser');
    localStorage.setItem('fieldshift.lang', 'ar');
  });

  // 1. Insights with hover on Feb
  await page.goto('http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/insights', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const bars = await page.$$('[aria-label="Monthly Precipitation Chart"] > div');
  if (bars.length > 1) {
    await bars[1].hover();
    await new Promise(r => setTimeout(r, 500));
  }
  await page.screenshot({ path: 'screenshots/insights_hover_feb.png' });

  // 2. Field select with Taroudant and presets
  await page.goto('http://localhost:5173/fields/new', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshots/field_select_presets_taroudant.png' });

  // 3. Welcome Stage 4 in Arabic
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('خصص خطتك') || text.includes('٤. خصص')) {
      await b.click();
      await new Promise(r => setTimeout(r, 600));
      break;
    }
  }
  await page.screenshot({ path: 'screenshots/welcome_stage4_arabic.png', fullPage: true });

  await browser.close();
  console.log('Verification screenshots successfully captured!');
})();
