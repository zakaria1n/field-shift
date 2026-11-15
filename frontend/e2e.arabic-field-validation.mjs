/** Verify the actual Arabic message on the saved user's location; no field is saved. */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve(import.meta.dirname,'..')
const out=path.join(root,'docs/verification/field-validation')
const probe=JSON.parse(await fs.readFile(path.join(out,'user_field_probe.json'),'utf8'))
const ar=JSON.parse(await fs.readFile(path.join(root,'frontend/src/i18n/ar.json'),'utf8'))
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const context=await browser.createBrowserContext()
const origin='http://localhost:5173'
await context.overridePermissions(origin,['geolocation'])
const page=await context.newPage()
await page.setViewport({width:1600,height:1100,deviceScaleFactor:1})
await page.setGeolocation({latitude:probe.lat,longitude:probe.lon,accuracy:5})
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let response
page.on('response',async r=>{if(r.url().endsWith('/fields/validate'))response={status:r.status(),body:await r.json()}})
try{
  await page.goto(origin+'/fields/new',{waitUntil:'networkidle2'})
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='العربية').click())
  await page.waitForFunction(()=>document.documentElement.dir==='rtl')
  await page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text).click(),ar['field.useMyLocation'])
  await pause(2000)
  const box=await page.$eval('.leaflet-container',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
  await page.click('.leaflet-pm-icon-polygon')
  for(const[x,y] of [[-30,-30],[30,-30],[30,30],[-30,30],[-30,-30]]){await page.mouse.click(box.x+x,box.y+y);await pause(150)}
  await page.waitForFunction(({checking,confirm})=>{const e=document.querySelector('[data-testid="field-validation"]');const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===confirm);return b&&!b.disabled||e&&!e.textContent.includes(checking)},{timeout:180000},{checking:ar['field.validation.checking'],confirm:ar['field.confirm']})
  const text=await page.evaluate(()=>document.querySelector('[data-testid="field-validation"]')?.textContent ?? '')
  assert.equal(text,'','Valid fields must not display a validation notice')
  const enabled=await page.evaluate(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text&&!b.disabled),ar['field.confirm'])
  assert(enabled)
  await page.screenshot({path:path.join(out,'runtime_user_land_ar.png'),fullPage:true})
  await fs.writeFile(path.join(out,'runtime_user_land_ar.json'),JSON.stringify({origin,pass:true,text,enabled,response},null,2))
  console.log('Arabic terrestrial validation: PASS; confirm enabled; HTTP',response?.status)
}finally{await browser.close()}
