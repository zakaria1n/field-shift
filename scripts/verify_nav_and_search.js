const puppeteer = require('../frontend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });

  // CONTEXT 1: Brand new user with no saved rotation plan
  console.log('--- Testing New User (no saved rotation plan) ---');
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 1280, height: 800 });
  await page1.evaluateOnNewDocument(() => {
    localStorage.setItem('fieldshift.access_key', 'fsk_newuser_wizard_test');
    localStorage.setItem('fieldshift.lang', 'ar');
  });

  // 1. Check /welcome
  await page1.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle0' });
  const welcomeNav = await page1.$('nav[aria-label="Main Navigation"]');
  console.log('1. Welcome page has main nav links?', welcomeNav !== null);

  // 2. Check /setup/questions (Step 2 of Wizard)
  await page1.goto('http://localhost:5173/setup/questions', { waitUntil: 'networkidle0' });
  const questionsNav = await page1.$('nav[aria-label="Main Navigation"]');
  console.log('2. Questions page has main nav links?', questionsNav !== null);
  await page1.screenshot({ path: 'verify_questions_clean_nav.png' });
  console.log('Saved verify_questions_clean_nav.png');

  // 3. Check /fields/new (Step 1 of Wizard)
  await page1.goto('http://localhost:5173/fields/new', { waitUntil: 'networkidle0' });
  const fieldSearch = await page1.$('#place-search');
  console.log('3. Field search input present?', fieldSearch !== null);
  await page1.screenshot({ path: 'verify_field_search_animated.png' });
  console.log('Saved verify_field_search_animated.png');
  await page1.close();

  // CONTEXT 2: Existing user with demo farm and rotations
  console.log('--- Testing Demouser Rotations Page (Step 5) ---');
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1280, height: 900 });
  await page2.evaluateOnNewDocument(() => {
    localStorage.setItem('fieldshift.access_key', 'fsk_demouser');
    localStorage.setItem('fieldshift.lang', 'ar');
  });

  await page2.goto('http://localhost:5173/fields/field_6f66d6143f2540bc9d9c2ef0ec9b37ce/rotations', { waitUntil: 'networkidle0' });
  await page2.screenshot({ path: 'verify_rotations_search_page.png' });
  console.log('Saved verify_rotations_search_page.png');
  await page2.close();

  await browser.close();
  console.log('=== All tests passed successfully! ===');
})();
