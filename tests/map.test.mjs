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

function setup(animated=false){
 let errors=0,entered=0,returned=0,zoom=12;const events={};const queue=new Map();let next=0;const overlay={hidden:true};
 const element={hidden:true,dataset:{}};
 globalThis.ResizeObserver=class{observe(){}};
 const map={getCenter(){return [37.76,-122.435];},flyTo(center,z){zoom=z;events.zoomend?.();},stop(){},on(event,fn){events[event]=fn;return this;},setView(center,z){zoom=z;events.zoomend?.();return this;},invalidateSize(){},setZoom(z){zoom=z;events.zoomend?.();},getZoom(){return zoom;},panBy(){}};
 const layer={on(){return this;},addTo(){return this;}};
 const leaflet={map:()=>map,tileLayer:()=>layer};
 const controller=createCityOverview({element,leaflet,overlay,reducedMotion:!animated,schedule:(fn,ms)=>{queue.set(++next,{fn,ms});return next;},unschedule:id=>queue.delete(id),onReturn:()=>returned++,onEnter:()=>entered++,onError:()=>errors++});
 return {controller,element,overlay,advance(ms){for(const [id,job] of [...queue])if(job.ms<=ms){queue.delete(id);job.fn();}},returned:()=>returned,click:()=>events.click({latlng:{lat:37.77,lng:-122.42}}),entered:()=>entered,zoom:()=>zoom};
}
test('live map opens, zooms without entering, clicks enter once, and reopens',()=>{
 const s=setup();assert.equal(s.controller.open(),true);assert.equal(s.element.hidden,false);
 s.controller.changeZoom(1);assert.equal(s.zoom(),13);assert.equal(s.entered(),0);
 s.click();assert.equal(s.entered(),1);assert.equal(s.element.hidden,true);assert.equal(s.controller.click(),false);
 s.controller.open();assert.equal(s.element.hidden,false);s.controller.enter();assert.equal(s.entered(),2);
});
test('missing map library falls back without blocking the app',()=>{
 let errors=0;const map=createCityOverview({element:{hidden:true},leaflet:null,onEnter(){},onError(){errors++;}});
 assert.equal(map.open(),false);assert.equal(map.active,false);assert.equal(errors,1);
});

test('street camera cannot expose empty space at world edges on mobile or desktop',async()=>{
 const {streetCamera}=await import('../dist/map/geometry.js');
 for(const [width,height] of [[390,700],[1440,800],[2400,1600]])for(const [x,y] of [[40,50],[1490,1090],[768,576]]){
  const c=streetCamera({width,height,worldWidth:1536,worldHeight:1152,x,y,zoom:.85});
  assert.ok(c.x-width/(2*c.z)>=-1e-9);assert.ok(c.x+width/(2*c.z)<=1536+1e-9);
  assert.ok(c.y-height/(2*c.z)>=-1e-9);assert.ok(c.y+height/(2*c.z)<=1152+1e-9);
 }
});


test('cinematic transition enters only at handoff, blocks repeat clicks, and can be canceled',()=>{
 const s=setup(true);s.controller.open();s.click();assert.equal(s.entered(),0);assert.equal(s.controller.transitioning,true);assert.equal(s.overlay.hidden,false);
 assert.equal(s.controller.click(),false);s.advance(650);assert.equal(s.entered(),0);
 s.advance(1000);assert.equal(s.entered(),1);s.advance(1800);assert.equal(s.controller.transitioning,false);assert.equal(s.overlay.hidden,true);
 s.controller.open();s.click();s.controller.close();s.advance(2000);assert.equal(s.entered(),1);assert.equal(s.overlay.hidden,true);
});

for(const animated of [false,true])test(`scroll threshold round trip preserves hysteresis (animated=${animated})`,()=>{
 const s=setup(animated);s.controller.open();
 for(let i=0;i<4;i++)s.controller.changeZoom(1);
 assert.equal(s.entered(),0);
 s.controller.changeZoom(1);s.advance(0);assert.equal(s.entered(),1);
 s.advance(800);assert.equal(s.controller.active,false);
 s.controller.exit();if(animated){assert.equal(s.controller.active,false);assert.equal(s.overlay.hidden,false);}
 s.advance(800);assert.equal(s.controller.active,true);assert.equal(s.returned(),1);assert.equal(s.zoom(),15);
 s.controller.changeZoom(1);assert.equal(s.entered(),1);
 s.controller.changeZoom(1);s.advance(0);assert.equal(s.entered(),2);
});
test('canceling a return leaves the satellite map usable',()=>{
 const s=setup(true);s.controller.open();s.click();s.advance(1800);
 s.controller.exit();s.controller.cancelTransition();s.advance(800);
 assert.equal(s.controller.active,true);assert.equal(s.controller.transitioning,false);assert.equal(s.returned(),1);
});

test('preparation completes before entry and cancellation ignores stale results',async()=>{
 let resolve,entered=0,loading=false;const events={};let zoom=12;
 const map={getCenter:()=>({lat:37.768,lng:-122.509}),getZoom:()=>zoom,on(e,fn){events[e]=fn;return this;},setView(c,z){zoom=z;return this;},invalidateSize(){},stop(){}};
 const layer={on(){return this;},addTo(){return this;}};
 const c=createCityOverview({element:{hidden:true,dataset:{}},leaflet:{map:()=>map,tileLayer:()=>layer},reducedMotion:true,prepare:()=>new Promise(r=>resolve=r),onPrepare:v=>loading=v,onEnter:o=>{assert.equal(o.latlng.lng,-122.509);entered++;},onError(){}});
 c.open();c.enter();await Promise.resolve();assert.equal(loading,true);assert.equal(entered,0);
 c.close();resolve();await new Promise(r=>setImmediate(r));assert.equal(entered,0);assert.equal(loading,false);
 c.open();c.enter();await Promise.resolve();resolve();await new Promise(r=>setImmediate(r));assert.equal(entered,1);
});

test('failed map details keep the satellite view available to retry',async()=>{
 let errors=0;const map={getCenter:()=>({lat:37.76,lng:-122.43}),getZoom:()=>12,on(){return this;},setView(){return this;},invalidateSize(){},stop(){}};
 const layer={on(){return this;},addTo(){return this;}};
 const c=createCityOverview({element:{hidden:true,dataset:{}},leaflet:{map:()=>map,tileLayer:()=>layer},prepare:async()=>{throw Error('network');},onPrepareError:()=>errors++,onEnter(){assert.fail('must not enter a fake fallback');},onError(){}});
 c.open();c.enter();await new Promise(r=>setImmediate(r));assert.equal(c.active,true);assert.equal(c.transitioning,false);assert.equal(errors,1);
});
