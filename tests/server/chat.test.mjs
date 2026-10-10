import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContext,validateReplies,InputError} from '../../server/context.js';
import {neighborhoodChat} from '../../server/chat.js';
import {createApp} from '../../server/index.js';
const input={cityId:'sf',year:2024,question:'Could you stay?',scenario:{rentChangePct:10,incomeChangePct:0},residentIds:['sf-resident-1','sf-resident-2']};

test('server reconstructs budgets and sources instead of trusting client-provided numbers',()=>{
  const context=buildContext({...input,housing:{monthlyRent:1},residents:[{name:'forged',after:{adjustedRent:0}}]});
  assert.equal(context.housing.monthlyRent,2476);
  assert.equal(context.residents[0].name,'Inés');
  assert.equal(context.residents[0].after.adjustedRent,2179);
  // Inés: round(140970 × .42) annual income / 12, then round at presentation.
  assert.equal(context.residents[0].after.remainingAfterRent,2755);
  assert.match(context.housing.sources[0].url,/census.gov/);
});
test('malformed selection and cross-city residents cannot reach a model',()=>{
  for(const patch of [{residentIds:[]},{residentIds:['nyc-resident-1']},{residentIds:['sf-resident-111']},{residentIds:['sf-resident-1','sf-resident-1']},{year:2030},{scenario:{rentChangePct:NaN}},{scenario:{incomeChangePct:-100}},{question:'x'.repeat(601)}]) assert.throws(()=>buildContext({...input,...patch}),InputError);
});
test('model output must cover exactly every requested resident and cannot override budget facts',()=>{
  const context=buildContext(input),valid={replies:input.residentIds.map(id=>({id,text:'I would need to rethink my budget.',mood:'concerned',budget:{rent:0}}))};
  assert.equal(validateReplies(valid,context)[0].budget.rent,2179);
  assert.throws(()=>validateReplies({replies:valid.replies.slice(0,1)},context));
  assert.throws(()=>validateReplies({replies:[valid.replies[0],valid.replies[0]]},context));
});
test('identical requests reuse replies; a changed scenario requires a fresh generation',async()=>{
  let calls=0;
  const generate=async options=>{calls++;const c=JSON.parse(options.prompt);assert.equal(options.providerOptions.openai.store,false);return {output:{replies:c.residents.map(r=>({id:r.id,text:'I would adjust my spending.',mood:'steady'}))}};};
  assert.equal((await neighborhoodChat(input,{generate})).cached,false);
  assert.equal((await neighborhoodChat(input,{generate})).cached,true);
  await neighborhoodChat({...input,scenario:{rentChangePct:0,incomeChangePct:5}},{generate});assert.equal(calls,2);
});

test('HTTP boundary protects secrets, rejects cross-origin calls and reports provider failures honestly',async()=>{
  const app=createApp({configured:true,chat:async()=>{throw new Error('private provider detail');}});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.address().port}`;
  try{
    for(const file of ['/.env.local','/server/chat.js','/%2eenv.local','/../package.json'])assert.equal((await fetch(base+file)).status,404);
    assert.equal((await fetch(base+'/')).status,200);
    const post=(headers,body='{}')=>fetch(base+'/api/neighborhood-chat',{method:'POST',headers,body});
    assert.equal((await post({'Content-Type':'application/json',Origin:'https://elsewhere.example'})).status,403);
    assert.equal((await post({'Content-Type':'text/plain'})).status,415);
    assert.equal((await post({'Content-Type':'application/json'},'bad-json')).status,400);
    assert.equal((await post({'Content-Type':'application/json'},'x'.repeat(21000))).status,413);
    const response=await post({'Content-Type':'application/json'},JSON.stringify(input));
    assert.equal(response.status,502);const result=await response.text();assert.ok(!result.includes('private provider detail'));assert.ok(result.includes('no simulated answer'));
  }finally{await new Promise(resolve=>app.close(resolve));}
});
