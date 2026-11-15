/** Real browser E2E. Uses actual Leaflet drawing and backend/network providers.
 * API failures can be exercised separately against the explicit outage server.
 * Run: node frontend/e2e.field-validation.mjs [outage]
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve(import.meta.dirname,'..')
const out=path.join(root,'docs','verification','field-validation')
await fs.mkdir(out,{recursive:true})
const outage=process.argv.includes('outage'),origin=process.env.E2E_ORIGIN || `http://127.0.0.1:${outage?5175:5174}`
const mode=process.env.E2E_ARTIFACT_PREFIX || (outage?'outage':'live')
const manifest=JSON.parse(await fs.readFile(path.join(root,'backend/tests/fixtures/landcover/manifest.json'),'utf8'))
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
  args:['--no-first-run','--disable-dev-shm-usage']})
const context=await browser.createBrowserContext()
await context.overridePermissions(origin,['geolocation'])
const page=await context.newPage()
await page.setViewport({width:1600,height:1100,deviceScaleFactor:1})
const network=[],consoleErrors=[],validations=[]
page.on('request',r=>{if(r.url().includes('/api/'))network.push({method:r.method(),url:r.url()})})
page.on('response',async r=>{
  if(r.url().endsWith('/fields/validate')){try{validations.push({status:r.status(),body:await r.json()})}catch{}}
})
page.on('pageerror',e=>consoleErrors.push(String(e)))
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function button(text){
  const clicked=await page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===text);if(!b||b.disabled)return false;b.click();return true},text)
  assert(clicked,`enabled button missing: ${text}`)
}
async function draw(name,expectAllowed){
  const [w,s,e,n]=manifest[name].bounds
  await page.setGeolocation({latitude:(s+n)/2,longitude:(w+e)/2,accuracy:5})
  await page.goto(origin+'/fields/new',{waitUntil:'networkidle2'})
  await button('Use my location');await pause(1800)
  const box=await page.$eval('.leaflet-container',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})
  await page.click('.leaflet-pm-icon-polygon')
  const cx=box.x+box.w/2,cy=box.y+box.h/2,half=30
  for(const [x,y] of [[cx-half,cy-half],[cx+half,cy-half],[cx+half,cy+half],[cx-half,cy+half],[cx-half,cy-half]]){
    await page.mouse.click(x,y);await pause(140)
  }
  await page.waitForFunction(()=>{const e=document.querySelector('[data-testid="field-validation"]');const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Confirm field');return b&&!b.disabled||e&&!e.textContent.includes('Checking')},{timeout:180000})
  const state=await page.evaluate(()=>document.querySelector('[data-testid="field-validation"]')?.textContent ?? '')
  const enabled=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Confirm field');return Boolean(b&&!b.disabled)})
  assert.equal(enabled,expectAllowed,`${name}: ${state}`)
  if(expectAllowed)assert.equal(state,'','A valid field should not display a validation notice')
  await page.screenshot({path:path.join(out,`${mode}_${name}.png`),fullPage:true})
  console.log(mode,name,state)
  return state
}
let summary={mode,origin,network,consoleErrors,validations}
try{
  if(!outage){
    summary.ocean=await draw('atlantic',false)
    assert(!network.some(r=>r.method==='POST'&&r.url.endsWith('/analyses')))
  }
  summary.land=await draw('saiss_farmland',true)
  await button('Confirm field')
  await page.waitForFunction(()=>location.pathname==='/setup/questions')
  const fid=new URL(page.url()).searchParams.get('field')
  summary.field_id=fid
  for(let i=0;i<3;i++){await button('Continue');await pause(350)}
  await button('Set your priorities')
  await page.waitForFunction(()=>location.pathname==='/setup/priorities')
  await button('Analyze my field')
  await page.waitForFunction(()=>location.pathname.includes('/analyses/'),{timeout:30000})
  const job=page.url().split('/analyses/')[1].split('/')[0]
  summary.job_id=job
  const get=async url=>page.evaluate(async url=>{const key=localStorage.getItem('fieldshift.access_key');const r=await fetch(url,{headers:{'X-FieldShift-Access-Key':key}});return {status:r.status,body:await r.json()}},url)
  for(let i=0;i<180;i++){
    const current=await get('/api/v1/analyses/'+job)
    if(['complete','partial','failed'].includes(current.body.status)){summary.analysis=current;break}
    await pause(1500)
  }
  assert(summary.analysis, 'analysis timed out')
  assert.notEqual(summary.analysis.body.status,'failed',JSON.stringify(summary.analysis))
  summary.rotations=await get(`/api/v1/fields/${fid}/rotations`)
  assert(summary.rotations.body.rotations.length>0)
  await page.goto(origin+`/fields/${fid}/rotations`,{waitUntil:'networkidle2'})
  await page.waitForSelector('[data-testid="score-evidence"]')
  summary.score_evidence=await page.$$eval('[data-testid="score-evidence"]',nodes=>nodes.map(e=>e.textContent))
  if(outage){
    for(const plan of summary.rotations.body.rotations){
      assert.equal(plan.score.indicators.find(i=>i.key==='yield').value,null)
      assert(!('yield' in plan.score.weights_applied))
      assert(plan.score.weight_redistribution_note)
    }
  }
  await page.screenshot({path:path.join(out,`${mode}_recommendations.png`),fullPage:true})
  summary.insights=await get(`/api/v1/fields/${fid}/insights`)
  await page.goto(origin+`/fields/${fid}/insights`,{waitUntil:'networkidle2'})
  await page.waitForFunction(()=>document.body.textContent.includes('ISRIC SoilGrids'))
  await page.screenshot({path:path.join(out,`${mode}_soil_estimates.png`),fullPage:true})
  if(outage)assert(!summary.insights.body.soil.some(o=>o.value!==null))
  console.log(mode,summary.analysis.body.status,summary.insights.body.soil.map(o=>[o.indicator,o.value]))
  summary.pass=true
}catch(error){summary.error=String(error);await page.screenshot({path:path.join(out,`${mode}_failure.png`),fullPage:true}).catch(()=>{});throw error}
finally{
  if(process.env.E2E_CLEANUP==='1' && summary.field_id){
    summary.cleanup_status=await page.evaluate(async fid=>{
      const r=await fetch(`/api/v1/fields/${fid}`,{method:'DELETE',headers:{'X-FieldShift-Access-Key':localStorage.getItem('fieldshift.access_key')}})
      return r.status
    },summary.field_id).catch(()=>null)
  }
  await fs.writeFile(path.join(out,`${mode}_browser_e2e.json`),JSON.stringify(summary,null,2))
  await browser.close()
}
