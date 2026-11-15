const puppeteer = require('../frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEMO_KEY = 'fsk_demouser';

const TARGETS = [
  // First-time visitor Welcome captures (no saved farm key)
  { url: 'http://localhost:5173/welcome', name: 'welcome_first_time_desktop.png', isMobile: false, lang: 'en', noKey: true },
  { url: 'http://localhost:5173/welcome', name: 'welcome_first_time_mobile.png', isMobile: true, lang: 'en', noKey: true },
  { url: 'http://localhost:5173/welcome', name: 'welcome_first_time_arabic.png', isMobile: false, lang: 'ar', noKey: true },
  // Returning-user Welcome (shows active farm reprise banner)
  { url: 'http://localhost:5173/welcome', name: 'welcome_returning_desktop.png', isMobile: false, lang: 'en', noKey: false },
  // Returning-user operational hub screens
  { url: 'http://localhost:5173/home', name: 'dashboard_desktop.png', isMobile: false, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/home', name: 'dashboard_mobile.png', isMobile: true, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/fields/list', name: 'fields_list_desktop.png', isMobile: false, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/timeline', name: 'timeline_desktop.png', isMobile: false, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/timeline', name: 'timeline_mobile.png', isMobile: true, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/insights', name: 'insights_desktop.png', isMobile: false, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/insights', name: 'insights_mobile.png', isMobile: true, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/plans', name: 'plans_management_desktop.png', isMobile: false, lang: 'en', noKey: false },
  { url: 'http://localhost:5173/settings', name: 'settings_desktop.png', isMobile: false, lang: 'en', noKey: false },
  // Arabic RTL visual captures
  { url: 'http://localhost:5173/home', name: 'dashboard_arabic_desktop.png', isMobile: false, lang: 'ar', noKey: false },
  { url: 'http://localhost:5173/fields/field_7dd9394f30204606a5a7208d985e8b9f/timeline', name: 'timeline_arabic_desktop.png', isMobile: false, lang: 'ar', noKey: false },
  { url: 'http://localhost:5173/fields/field_7dd9394f30204606a5a7208d985e8b9f/insights', name: 'insights_arabic_desktop.png', isMobile: false, lang: 'ar', noKey: false },
];

async function run() {
  const outDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of TARGETS) {
    const page = await browser.newPage();
    const width = item.isMobile ? 390 : 1280;
    const height = item.isMobile ? 844 : 800;
    await page.setViewport({ width, height, isMobile: item.isMobile });

    // Set localStorage before navigation
    await page.evaluateOnNewDocument((key, lang, noKey) => {
      if (!noKey) {
        localStorage.setItem('fieldshift.access_key', key);
      } else {
        localStorage.removeItem('fieldshift.access_key');
      }
      localStorage.setItem('fieldshift.lang', lang);
    }, DEMO_KEY, item.lang, item.noKey);

    try {
      await page.goto(item.url, { waitUntil: 'networkidle0', timeout: 15000 });
      // Allow react-query and any transitions to settle
      await new Promise(r => setTimeout(r, 1200));

      const outPath = path.join(outDir, item.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`[OK] Captured: ${item.name}`);
    } catch (err) {
      console.error(`[ERR] Failed ${item.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Finished capturing all target screenshots!');
}

run().catch(console.error);
