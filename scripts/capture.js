const puppeteer = require('../frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture(url, outName, options = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const width = options.width || 1280;
  const height = options.height || 800;
  await page.setViewport({ width, height, isMobile: !!options.isMobile });
  
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.warn('Nav timeout:', e.message));
  await new Promise(r => setTimeout(r, 1000)); // wait for animations/react query
  
  const outDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const outPath = path.join(outDir, outName);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved screenshot to: ${outPath}`);
  
  await browser.close();
  return outPath;
}

if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:5173/welcome';
  const name = process.argv[3] || 'welcome_desktop.png';
  const isMobile = process.argv[4] === 'mobile';
  capture(url, name, {
    width: isMobile ? 390 : 1280,
    height: isMobile ? 844 : 800,
    isMobile
  }).then(p => console.log('Done:', p)).catch(console.error);
}

module.exports = { capture };
