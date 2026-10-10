import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbyResidents,visibleHouses,houseScenario,DEMO_STEPS,speechWaves} from '../dist/chat/model.js';
test('neighborhood includes every nearby on-screen person and excludes other views',()=>{
  const residents=[{residentId:'a',x:100,y:200,distance:50},{residentId:'b',x:150,y:200,distance:330},{residentId:'far',x:200,y:200,distance:350},{residentId:'off',x:-1,y:200,distance:30}];
  const scene={mode:'street',width:800,height:900,residents};
  assert.deepEqual(nearbyResidents(scene).map(r=>r.residentId),['a','b']);
  assert.deepEqual(nearbyResidents({...scene,mode:'city'}),[]);
});
test('house labels calculate scenario over the city median, including reductions',()=>{
  assert.deepEqual(houseScenario({monthlyRent:2476},{rentChangePct:10}),{base:2476,rent:2724,delta:248});
  assert.equal(houseScenario({monthlyRent:2000},{rentChangePct:-10}).rent,1800);
  assert.equal(houseScenario(null,{rentChangePct:0}),null);
  assert.equal(visibleHouses({width:375,height:900,buildings:[{x:200,y:300,distance:0},{x:100,y:200,distance:20},{x:150,y:450,distance:30}]}).length,2);
});
test('guided story compares the same rent shock with an income improvement',()=>{
  assert.equal(DEMO_STEPS.length,4);
  assert.deepEqual(DEMO_STEPS[1].scenario,{rentChangePct:10,incomeChangePct:0});
  assert.deepEqual(DEMO_STEPS[2].scenario,{rentChangePct:10,incomeChangePct:5});
});
test('every resident gets a turn, while close neighbors speak in different waves',()=>{
  const scene={width:1200,residents:[{residentId:'a',x:400,y:400},{residentId:'b',x:410,y:410},{residentId:'c',x:700,y:400}]};
  const groups=speechWaves(['a','b','c'].map(id=>({id})),scene);
  assert.equal(groups.flat().length,3);assert.equal(new Set(groups.flat()).size,3);
  assert.ok(groups.every(g=>!(g.includes('a')&&g.includes('b'))));
  assert.equal(speechWaves([{id:'a'},{id:'b'}],{width:375,residents:[{residentId:'a',x:20,y:300},{residentId:'b',x:185,y:300}]}).length,2);
});
