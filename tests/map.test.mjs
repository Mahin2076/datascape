import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelectionStore} from '../dist/map/selection.js';
import {createCityOverview} from '../dist/map/city-overview.js';

test('selection preserves scenarios across city/year changes and prevents external mutation',()=>{
 const store=createSelectionStore({cityIds:['sf','nyc'],years:[2021,2024]});
 let calls=0;const stop=store.subscribe(()=>calls++);
 store.set({scenario:{rentChangePct:10}});store.set({cityId:'nyc',year:2024});
 assert.deepEqual(store.get(),{cityId:'nyc',year:2024,scenario:{rentChangePct:10,incomeChangePct:0}});
 const copy=store.get();copy.scenario.rentChangePct=999;
 assert.equal(store.get().scenario.rentChangePct,10);
 assert.throws(()=>store.set({cityId:'missing'}),RangeError);
 assert.throws(()=>store.set({scenario:{incomeChangePct:NaN}}),RangeError);
 assert.throws(()=>store.set({scenario:{rentChangePct:-101}}),RangeError);
 assert.equal(calls,2);stop();store.set({year:2021});assert.equal(calls,2);
});

const ctx=new Proxy({}, {get:(obj,key)=>obj[key]??(()=>{}),set:(obj,key,value)=>(obj[key]=value,true)});
function setup(reducedMotion=false){
 let instance;globalThis.Image=class{constructor(){instance=this;}};
 let entered=0,failed=0;
 const map=createCityOverview({reducedMotion,onEnter:()=>entered++,onError:()=>failed++});
 return {map,load:()=>instance.onload(),fail:()=>instance.onerror(),entered:()=>entered,failed:()=>failed};
}
function settle(map){for(let i=0;i<140;i++)map.draw(ctx,1200,800,180,.016,i*16);}
test('zoom threshold enters once, return resets to overview, and zoom-out stays on the city',()=>{
 const s=setup();s.load();s.map.open();
 s.map.changeZoom(1);s.map.changeZoom(1);s.map.changeZoom(1);settle(s.map);assert.equal(s.entered(),0);
 s.map.changeZoom(1);settle(s.map);assert.equal(s.entered(),1);assert.equal(s.map.active,false);
 s.map.open();settle(s.map);s.map.changeZoom(-1);settle(s.map);assert.equal(s.entered(),1);assert.equal(s.map.active,true);
});
test('reduced motion entry and image failure have deterministic fallbacks',()=>{
 const s=setup(true);s.load();s.map.open();s.map.enter();s.map.draw(ctx,390,844,220,.016,0);assert.equal(s.entered(),1);
 const broken=setup();broken.map.open();broken.fail();assert.equal(broken.map.active,false);assert.equal(broken.failed(),1);assert.equal(broken.map.open(),false);
});
