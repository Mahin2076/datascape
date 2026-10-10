// Start the static server before running. Requires Playwright + Chromium.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdir}=require('node:fs/promises');
const base=process.env.DEMO_URL||'http://127.0.0.1:8123';
const waitReady=page=>page.waitForSelector('#game[data-stories-ready="true"]');
const waitReaction=page=>page.waitForSelector('.rs-reaction[aria-busy="false"]');
async function checkScenario(page){
  await page.locator('[data-preset="rent10"]').click();
  await waitReaction(page);
  const rows=await page.locator('.rs-row').evaluateAll(rows=>rows.map(row=>({label:row.querySelector('dt').textContent,values:[...row.querySelectorAll('.rs-before,strong')].map(e=>Number(e.textContent.replace(/[^\d.-]/g,'')))})));
  const income=rows.find(r=>r.label==='Income').values;
  const rent=rows.find(r=>r.label==='Rent').values;
  const remaining=rows.find(r=>r.label==='Left after rent').values;
  assert.equal(income[0],income[1]);assert.ok(Math.abs(rent[1]-rent[0]*1.1)<=1);
  assert.equal(remaining[1],income[1]-rent[1]);
  assert.match(await page.locator('.rs-reaction').innerText(),/Scripted · not live AI/i);
  assert.ok(!(await page.locator('.rs-panel').innerText()).includes('\nnull\n'));
  return {income,rent,remaining};
}
(async()=>{
  await mkdir('test-results',{recursive:true});
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [1440,768,375]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:width===1440?'no-preference':'reduce'});
      const page=await context.newPage();const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+'/#map=16/37.7641/-122.4429');await waitReady(page);
      await page.locator('#housingYear').selectOption('2024');
      // Scroll zoom enters the map at the selected coordinate using live OSM data.
      await page.locator('#zoomIn').click();
      await page.waitForSelector('#game[data-view="street"]',{timeout:45000});
      await page.waitForSelector('#mapDive[hidden]',{state:'attached'});
      if(width===1440) await page.locator('#ambient').click();
      const target=await page.evaluate(async()=>{
        const {mapIntegration}=await import('/app.js');
        return mapIntegration.getResidentTargets().find(p=>p.x>30&&p.x<innerWidth-60&&p.y>160&&p.y<innerHeight-160);
      });
      assert.ok(target,'A clickable resident should be visible');
      await page.mouse.click(target.x,target.y);await waitReaction(page);
      assert.equal(await page.locator('.rs-panel').getAttribute('data-resident-id'),target.residentId);
      const numbers=await checkScenario(page);
      await page.locator('.rs-provenance summary').click();
      const links=await page.locator('.rs-provenance a').evaluateAll(a=>a.map(a=>a.href));
      assert.ok(links.every(url=>new URL(url).hostname.endsWith('.census.gov')));
      if(!links.length) assert.match(await page.locator('.rs-provenance').innerText(),/fixed amount chosen/);
      await page.locator('#housingYear').selectOption('2022');await waitReaction(page);
      assert.match(await page.locator('.rs-scenario-label').innerText(),/2022 baseline/);
      assert.equal(await page.locator('[data-preset="rent10"]').getAttribute('aria-pressed'),'true');
      // Keyboard controls in a profile must not move the player or the map.
      const before=await page.locator('#world').getAttribute('data-player-x');
      await page.locator('.rs-name').focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#world').getAttribute('data-player-x'),before);
      await page.screenshot({path:`test-results/demo-${width}.png`});
      await page.locator('.rs-close').click();
      await page.locator('#world').focus();
      const start=await page.locator('#world').getAttribute('data-player-y');
      await page.keyboard.down('ArrowDown');await page.waitForTimeout(200);await page.keyboard.up('ArrowDown');
      assert.notEqual(await page.locator('#world').getAttribute('data-player-y'),start);
      await page.locator('#cityView').click();
      await page.waitForSelector('#game[data-view="city"]');
      const selection=await page.evaluate(async()=>(await import('/app.js')).mapIntegration.selection.get());
      assert.equal(selection.year,2022);assert.equal(selection.scenario.rentChangePct,10);
      // Block external services after warm-up. Core budgets and sources remain local.
      await page.route('https://**/*',route=>route.abort());
      await page.locator('#compareView').click();
      await page.waitForSelector('#game[data-view="compare"]');
      for(const [index,cityId] of ['sf','nyc','austin','chicago','seattle'].entries()){
        await page.locator('#citySelect').selectOption(String(index));
        await page.locator('#residentPicker').selectOption(`${cityId}-resident-1`);
        await waitReaction(page);await checkScenario(page);
        await page.locator('.rs-close').click();
      }
      await page.locator('#housingYear').selectOption('2024');
      await page.locator('#askToggle').click();
      await page.locator('#question').fill('Where did rent rise fastest?');
      await page.locator('#askform').evaluate(form=>form.requestSubmit());
      assert.match(await page.locator('#answer').innerText(),/rent rise fastest/);
      assert.equal(await page.locator('.ranking tbody tr').count(),5);
      await page.locator('#answerSources').click();
      assert.match(await page.locator('#sourceDetails').innerText(),/Margins of error at 90%/);
      await page.locator('#closeSources').click();
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,status:'PASS',resident:target.residentId,numbers,checked:'live map → sprite click → scenario → year → sources → return → five cities with external requests blocked'}));
      await context.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
