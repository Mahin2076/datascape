import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateBudget,createHousingData} from '../dist/data/index.js';
import {profilesForSprites} from '../dist/residents/map-profiles.js';
import {resolveHousehold,computeBudgets} from '../dist/residents/budget.js';
import {RESIDENTS} from '../dist/residents/fixtures.js';
const db=JSON.parse(await readFile(new URL('../dist/assets/data.json',import.meta.url),'utf8'));
const data=createHousingData(db);

test('monthly units, fractional ratio, combined scenario and negative remainder',()=>{
  assert.deepEqual(calculateBudget({monthlyRent:2000,annualIncome:60000,rentChangePct:10,incomeChangePct:5}),
    {status:'ok',monthlyIncome:5250,adjustedRent:2200,remainingAfterRent:3050,rentToIncomeRatio:2200/5250});
  assert.equal(calculateBudget({monthlyRent:2000,annualIncome:12000}).remainingAfterRent,-1000);
  assert.equal(calculateBudget({monthlyRent:2000,annualIncome:60000,rentChangePct:-100}).adjustedRent,0);
});
test('unavailable and invalid values never become invented income or Infinity',()=>{
  for(const annualIncome of [null,undefined,NaN,Infinity,0,-1,'60000']) {
    const b=calculateBudget({monthlyRent:1000,annualIncome});
    assert.equal(b.status,'income_unavailable');assert.equal(b.rentToIncomeRatio,null);
  }
  assert.equal(calculateBudget({monthlyRent:1000,annualIncome:60000,incomeChangePct:-100}).status,'income_unavailable');
  for(const monthlyRent of [null,undefined,-1,Infinity,'1000']) assert.equal(calculateBudget({monthlyRent,annualIncome:60000}).status,'rent_unavailable');
  for(const rentChangePct of [-101,NaN,Infinity,'10']) assert.equal(calculateBudget({monthlyRent:1000,annualIncome:60000,rentChangePct}).status,'invalid');
  assert.equal(calculateBudget({monthlyRent:Number.MAX_VALUE,annualIncome:1,rentChangePct:100}).status,'invalid');
});
test('all 20 observations retain exact values, period, MOE and Census provenance',()=>{
  for(const city of db.cities) for(const row of city.data){
    const h=data.getHousing(city.id,row.year);
    assert.equal(h.monthlyRent,row.rent);assert.equal(h.annualIncome,row.income);
    assert.equal(h.rentMoe,row.rentMoe);assert.equal(h.incomeMoe,row.incomeMoe);
    assert.equal(h.period,row.period);assert.equal(h.geoid,city.geoid);
    assert.equal(h.sources[0].url,row.sources.b25064);assert.ok(h.caveats.length>0);
  }
  assert.equal(data.getHousing('sf',2020),null);assert.equal(data.getHousing('missing',2024),null);
  const copy=data.getHousing('sf',2024);copy.sources[0].url='broken';
  assert.match(data.getHousing('sf',2024).sources[0].url,/census.gov/);
  assert.equal(data.getTimeline('sf').length,4);
});
test('untrusted source links fail closed',()=>{
  const bad=structuredClone(db);bad.cities[0].data[0].sources.b25064='https://census.gov.attacker.example/';
  assert.equal(createHousingData(bad).getHousing('sf',2021),null);
});
test('fastest growth ranks all cities, lowest rent differs from widest gap, baseline is zero',()=>{
  const fixture={years:[2021,2024],notes:[],cities:[['fast',100,200,1000,3000],['gap',50,75,1000,1000]].map(([id,r1,r2,i1,i2])=>({id,name:id,data:[{year:2021,rent:r1,income:i1},{year:2024,rent:r2,income:i2}].map(r=>({...r,sources:{b25064:'https://census.gov/rent',b19013:'https://census.gov/income'}}))}))};
  const d=createHousingData(fixture);
  assert.equal(d.compareCities(2024,{sortBy:'rentGrowth'})[0].cityId,'fast');
  assert.equal(d.compareCities(2024,{sortBy:'gap'})[0].cityId,'gap');
  assert.equal(d.compareCities(2024,{sortBy:'monthlyRent'})[0].monthlyRent,75);
  assert.ok(d.compareCities(2021).every(r=>r.rentGrowth===0&&r.incomeGrowth===0));
});
test('every household/year/preset uses the production calculator with consistent arithmetic',()=>{
  for(const resident of RESIDENTS)for(const year of db.years)for(const [rentChangePct,incomeChangePct] of [[0,0],[10,0],[0,5],[10,5]]){
    const household=resolveHousehold(resident,data.getHousing(resident.cityId,year));
    const budgets=computeBudgets(household,{rentChangePct,incomeChangePct},calculateBudget);
    assert.equal(budgets.after.status,'ok');
    assert.equal(budgets.after.adjustedRent,Math.round(household.monthlyRent*(1+rentChangePct/100)));
    assert.equal(budgets.after.remainingAfterRent,budgets.after.monthlyIncome-budgets.after.adjustedRent);
  }
});
test('map sprite IDs resolve stable fictional profiles for every city',()=>{
  const sprites=db.cities.flatMap(c=>Array.from({length:c.id==='sf'?110:55},(_,i)=>({residentId:`${c.id}-resident-${i+1}`,cityId:c.id,spriteIndex:i%10})));
  const profiles=profilesForSprites(sprites);
  assert.equal(profiles.length,330);assert.equal(new Set(profiles.map(p=>p.id)).size,330);
  for(let i=0;i<profiles.length;i++){assert.equal(profiles[i].id,sprites[i].residentId);assert.equal(profiles[i].cityId,sprites[i].cityId);}
});
