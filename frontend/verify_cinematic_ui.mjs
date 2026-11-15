import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('.')
const outDir = path.join(root, 'screenshots', 'cinematic_upgrade')
await fs.mkdir(outDir, { recursive: true })

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORIGIN = 'http://localhost:5173'

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
]

console.log('Launching Chrome for cinematic UI verification...')
const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-first-run', '--disable-dev-shm-usage'],
})

const consoleErrors = []
const networkErrors = []

async function createPage(vp) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  page.on('pageerror', (err) => consoleErrors.push(`[${vp.name}] PageError: ${err.message}`))
  page.on('requestfailed', (req) => networkErrors.push(`[${vp.name}] Failed request: ${req.url()}`))
  return page
}

try {
  // Test each viewport size
  for (const vp of viewports) {
    console.log(`\n=== Verifying Viewport ${vp.name} ===`)
    const page = await createPage(vp)

    // 1. Welcome Page (Hero & Storytelling)
    console.log(`[${vp.name}] Navigating to /welcome...`)
    await page.goto(`${ORIGIN}/welcome`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2600)) // allow polygon stroke animation to complete

    await page.screenshot({
      path: path.join(outDir, `01_welcome_hero_${vp.name}.png`),
    })
    console.log(`[${vp.name}] Captured 01_welcome_hero_${vp.name}.png`)

    // Scroll to storytelling section
    await page.evaluate(() => {
      window.scrollTo({ top: 900, behavior: 'instant' })
    })
    await new Promise((r) => setTimeout(r, 600))
    await page.screenshot({
      path: path.join(outDir, `02_welcome_storytelling_${vp.name}.png`),
    })
    console.log(`[${vp.name}] Captured 02_welcome_storytelling_${vp.name}.png`)

    // 2. Earth Observatory (/fields/new)
    console.log(`[${vp.name}] Navigating to /fields/new (Earth Observatory)...`)
    await page.goto(`${ORIGIN}/fields/new`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 1000))

    await page.screenshot({
      path: path.join(outDir, `03_earth_observatory_globe_${vp.name}.png`),
    })
    console.log(`[${vp.name}] Captured 03_earth_observatory_globe_${vp.name}.png`)

    // Click "Enter Map Directly" to view satellite map & field drawing
    const mapBtn = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        x.textContent.includes('Enter Map Directly') || x.textContent.includes('Satellite Map')
      )
      if (b) {
        b.click()
        return true
      }
      return false
    })
    if (mapBtn) {
      await new Promise((r) => setTimeout(r, 1200))
      await page.screenshot({
        path: path.join(outDir, `04_earth_observatory_map_${vp.name}.png`),
      })
      console.log(`[${vp.name}] Captured 04_earth_observatory_map_${vp.name}.png`)
    }

    // 3. Farm Profile Steps (/setup/questions)
    console.log(`[${vp.name}] Navigating to /setup/questions...`)
    await page.goto(`${ORIGIN}/setup/questions`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 1000))

    await page.screenshot({
      path: path.join(outDir, `05_farm_profile_step1_irrigation_${vp.name}.png`),
    })
    console.log(`[${vp.name}] Captured 05_farm_profile_step1_irrigation_${vp.name}.png`)

    // Advance to Step 2 (Crop History)
    await page.evaluate(() => {
      const nextBtn = [...document.querySelectorAll('button')].find((x) =>
        x.textContent.includes('Continue') || x.textContent.includes('Next')
      )
      if (nextBtn) nextBtn.click()
    })
    await new Promise((r) => setTimeout(r, 600))
    await page.screenshot({
      path: path.join(outDir, `06_farm_profile_step2_history_${vp.name}.png`),
    })
    console.log(`[${vp.name}] Captured 06_farm_profile_step2_history_${vp.name}.png`)

    // 4. Priorities (/setup/priorities)
    console.log(`[${vp.name}] Navigating to /setup/priorities...`)
    await page.goto(`${ORIGIN}/setup/priorities`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 1000))

    await page.screenshot({
      path: path.join(outDir, `07_priorities_canonical_${vp.name}.png`),
    })
    console.log(`[${vp.name}] Captured 07_priorities_canonical_${vp.name}.png`)

    await page.close()
  }

  // 5. Arabic RTL Mode Verification (at 1440x900)
  console.log(`\n=== Verifying Arabic RTL Mode ===`)
  const arPage = await createPage({ name: 'Arabic_1440x900', width: 1440, height: 900 })
  await arPage.goto(`${ORIGIN}/welcome`, { waitUntil: 'domcontentloaded' })

  // Switch language to Arabic
  await arPage.evaluate(() => {
    const arBtn = [...document.querySelectorAll('button')].find((x) =>
      x.textContent.includes('العربية')
    )
    if (arBtn) arBtn.click()
  })
  await new Promise((r) => setTimeout(r, 1500))

  await arPage.screenshot({
    path: path.join(outDir, '08_welcome_arabic_rtl.png'),
  })
  console.log('Captured 08_welcome_arabic_rtl.png')

  // Arabic Priorities
  await arPage.goto(`${ORIGIN}/setup/priorities`, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 1000))
  await arPage.screenshot({
    path: path.join(outDir, '09_priorities_arabic_rtl.png'),
  })
  console.log('Captured 09_priorities_arabic_rtl.png')

  await arPage.close()

  console.log('\nAll browser verification screenshots captured successfully!')
  console.log(`Console errors count: ${consoleErrors.length}`)
  console.log(`Network errors count: ${networkErrors.length}`)
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors)
  }
} catch (err) {
  console.error('Error during verification:', err)
} finally {
  await browser.close()
}
