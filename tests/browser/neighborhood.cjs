const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdir}=require('node:fs/promises');
const base=process.env.DEMO_URL||'http://127.0.0.1:8124';
const live=process.env.LIVE_CHAT_TEST==='1';
const api='**/api/neighborhood-chat';
async function mockReply(route){
  const input=route.request().postDataJSON();
  await route.fulfill({json:{method:'ai',model:'test-double',cached:false,replies:input.residentIds.map(id=>({id,name:'Test resident',text:'A higher rent would leave less room in my budget.',mood:'concerned',budget:{rent:2000,remaining:2500,delta:-200}}))}});
}
(async()=>{
  await mkdir('test-results',{recursive:true});
  const browser=await chromium.launch();
  try{
    for(const width of [1440,375]){
      const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      if(!live||width===375)await page.route(api,mockReply);
      await page.goto(base);
      await page.waitForSelector('#loading',{state:'hidden'});
      assert.equal(await page.locator('.nc-input').isVisible(),true);
      assert.equal(await page.locator('#compareView').isVisible(),false);
      assert.equal(await page.locator('#housingYear').isVisible(),false);
      await page.screenshot({path:`test-results/simplified-${width}.png`});
      await page.locator('.nc-input').fill('What is housing like here?');
      await page.locator('.nc-send').click();
      await page.waitForSelector('.nc-shell[data-method=ai]:not([aria-busy])',{timeout:60000});
      assert.equal(await page.locator('.nc-demo,.nc-demo-launcher,.nc-house').count(),0);
      const shellBox=await page.locator('.nc-shell').boundingBox();
      assert.ok(shellBox.y>700,'Question bubble should sit at the bottom');
      const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/neighborhood-chat')&&r.request().method()==='POST');
      await page.locator('.nc-input').fill('What would help you afford housing here?');await page.locator('.nc-send').click();
      const response=await responsePromise;assert.equal(response.status(),200);const result=await response.json();
      await page.waitForSelector('.nc-shell[data-method=ai]:not([aria-busy])');
      assert.equal(await page.locator('.nc-bubble').count(),result.replies.length);
      assert.ok(result.replies.length>0);assert.equal(await page.locator('.nc-reply').count(),result.replies.length);
      const boxes=await page.locator('.nc-bubble.is-speaking').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
      for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++)assert.ok(boxes[a].right<=boxes[b].left||boxes[b].right<=boxes[a].left||boxes[a].bottom<=boxes[b].top||boxes[b].bottom<=boxes[a].top,'Speech bubbles must not overlap');
      await page.screenshot({path:`test-results/neighborhood-${width}.png`});
      await page.getByRole('button',{name:'Read all replies',exact:true}).click();
      assert.equal(await page.locator('.nc-transcript').isVisible(),true);
      await page.locator('.nc-transcript-head button').click();
      // A changed city clears the old residents.
      await page.locator('#citySelect').selectOption('1');
      await page.waitForFunction(()=>document.querySelectorAll('.nc-bubble').length===0);
      assert.equal(await page.locator('.nc-demo').count(),0);
      // An API failure must be visible; no mock dialogue is substituted.
      await page.unroute(api);await page.route(api,route=>route.fulfill({status:502,json:{error:'Live replies could not be generated. Please retry.'}}));
      if(await page.locator('#game').getAttribute('data-view')!=='street')await page.locator('#mapToggle').click();await page.waitForSelector('#game[data-view=street]');
      await page.locator('.nc-input').fill('How does housing feel here?');
      await page.locator('.nc-form').evaluate(form=>form.requestSubmit());
      await page.waitForFunction(()=>document.querySelector('.nc-status').textContent.includes('could not be generated'));
      assert.equal(await page.locator('.nc-bubble').count(),0);
      // A slow answer for a previous year must never reappear in the new context.
      await page.unroute(api);await page.route(api,async route=>{await new Promise(r=>setTimeout(r,500));try{await mockReply(route);}catch{/* The browser deliberately canceled this request. */}});
      const pending=page.waitForRequest(r=>r.url().endsWith('/api/neighborhood-chat'));
      await page.locator('.nc-input').fill('Could you stay after another increase?');
      await page.locator('.nc-form').evaluate(form=>form.requestSubmit());await pending;
      await page.locator('.explore-menu summary').click();await page.locator('#housingYear').selectOption('2024');await page.waitForTimeout(700);
      assert.equal(await page.locator('.nc-bubble').count(),0);
      assert.equal(await page.locator('.nc-shell').getAttribute('data-method'),null);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,replies:result.replies.length,mode:live&&width===1440?'LIVE OPENAI':'mocked API',status:'PASS'}));
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
