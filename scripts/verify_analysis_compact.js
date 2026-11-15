const puppeteer = require('../frontend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Desktop viewport 1280x800
  await page.setViewport({ width: 1280, height: 800 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('fieldshift.access_key', 'fsk_demouser');
    localStorage.setItem('fieldshift.lang', 'en');
  });

  // Enable request interception to simulate active running analysis stages
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/analyses/job_simulation')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'job_simulation_12345',
          field_id: 'field_6f66d6143f2540bc9d9c2ef0ec9b37ce',
          status: 'running',
          stages: [
            { key: 'geometry', status: 'complete', detail: 'Closure verified, geodesic area 1.15 ha' },
            { key: 'climate', status: 'complete', detail: 'NASA POWER 30-year climatology retrieved' },
            { key: 'soil', status: 'running', detail: 'Sampling SoilGrids ISRIC 250m topsoil properties...' },
            { key: 'yield_reference', status: 'pending', detail: null },
            { key: 'suitability', status: 'pending', detail: null },
            { key: 'rotation', status: 'pending', detail: null }
          ],
          sources: [
            { source_id: 'nasa_power', status: 'live', detail: null, fetched_at: '2026-11-15T02:00:00Z', data_period: null },
            { source_id: 'soilgrids', status: 'running', detail: null, fetched_at: null, data_period: null },
            { source_id: 'gaez_v5', status: 'pending', detail: null, fetched_at: null, data_period: null }
          ],
          error: null,
          started_at: '2026-11-15T02:00:00Z',
          finished_at: null
        })
      });
    } else {
      req.continue();
    }
  });

  console.log('1. Navigating to simulated running analysis on desktop (1280x800)...');
  await page.goto('http://localhost:5173/analyses/job_simulation/progress', { waitUntil: 'networkidle0' });

  // Measure card height and check if scrolling is required on 800px viewport
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('[role="status"]');
    const main = document.querySelector('main');
    return {
      windowHeight: window.innerHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      cardHeight: card ? card.offsetHeight : 0,
      mainHeight: main ? main.offsetHeight : 0,
      activeSpinnerPresent: Boolean(document.querySelector('.animate-spin')),
      checkmarksCount: document.querySelectorAll('.lucide-check-circle-2').length
    };
  });

  console.log('Desktop Metrics:', metrics);
  console.log('Fits in 800px window without document scroll?', metrics.documentScrollHeight <= metrics.windowHeight);

  await page.screenshot({ path: 'verify_analysis_desktop.png' });
  console.log('Saved verify_analysis_desktop.png');

  // Check mobile viewport 390x844 (iPhone 14)
  console.log('2. Testing mobile viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: 'verify_analysis_mobile.png' });
  console.log('Saved verify_analysis_mobile.png');

  // Test Arabic on desktop
  console.log('3. Testing Arabic RTL on desktop (1280x800)...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => {
    localStorage.setItem('fieldshift.lang', 'ar');
  });
  await page.goto('http://localhost:5173/analyses/job_simulation/progress', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'verify_analysis_arabic.png' });
  console.log('Saved verify_analysis_arabic.png');

  await browser.close();
  console.log('All tests completed successfully!');
})();
