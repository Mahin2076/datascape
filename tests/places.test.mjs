import test from 'node:test';
import assert from 'node:assert/strict';
import {projection,contains,kind,normalizeOSM,sceneFeatures,createPlaceLoader} from '../dist/map/places.js';
const center={lat:37.767,lng:-122.455};
test('projection centers the selected place and round trips walking coordinates',()=>{
 const p=projection(center);assert.deepEqual(p.toXY([center.lng,center.lat]),[768,576]);
 const target=[-122.453,37.768],xy=p.toXY(target),ll=p.toLatLng(xy);assert.ok(xy[0]>768&&xy[1]<576);assert.ok(Math.abs(ll.lng-target[0])<1e-10&&Math.abs(ll.lat-target[1])<1e-10);
});
test('tag classification distinguishes sports, buildings, paths and water',()=>{
 for(const [tags,result] of [[{leisure:'pitch',sport:'american_football'},'pitch'],[{leisure:'pitch',sport:'soccer'},'pitch'],[{leisure:'park'},'park'],[{building:'yes'},'building'],[{natural:'water'},'water'],[{highway:'footway'},'road'],[{shop:'yes'},null]])assert.equal(kind(tags),result);
});
const fixture={elements:[{type:'node',id:1,lat:37.767,lon:-122.455},{type:'node',id:2,lat:37.768,lon:-122.455},{type:'node',id:3,lat:37.768,lon:-122.454},{type:'way',id:4,nodes:[1,2,3,1],tags:{leisure:'pitch',sport:'soccer'}},{type:'way',id:5,nodes:[1,999],tags:{building:'yes'}}]};
test('OSM node references resolve to exact geometry and incomplete ways are skipped',()=>{
 const f=normalizeOSM(fixture);assert.equal(f.length,1);assert.equal(f[0].tags.sport,'soccer');assert.deepEqual(f[0].points[0],[-122.455,37.767]);
 assert.equal(sceneFeatures(f,center).length,1);assert.equal(sceneFeatures(f,{lat:37.71,lng:-122.4}).length,0);
});
test('polygon collision identifies inside and outside',()=>{const ring=[[0,0],[100,0],[100,100],[0,100]];assert.equal(contains([50,50],ring),true);assert.equal(contains([150,50],ring),false);});
test('local data loads once, reuses coverage and surfaces failures',async()=>{
 let requests=0;const load=createPlaceLoader(async()=>{requests++;return {ok:true,json:async()=>fixture};});
 await load(center);await load(center);assert.equal(requests,1);
 await load({lat:37.71,lng:-122.4});assert.equal(requests,2);
 await assert.rejects(createPlaceLoader(async()=>({ok:false}))(center),/unavailable/);
});
test('multipolygon fragments join into closed rings',()=>{
 const data={elements:[...fixture.elements.filter(e=>e.type==='node'),{type:'way',id:10,nodes:[1,2]},{type:'way',id:11,nodes:[1,3,2]},{type:'relation',id:20,tags:{type:'multipolygon',natural:'water'},members:[{type:'way',ref:10,role:'outer'},{type:'way',ref:11,role:'outer'}]}]};
 const [f]=normalizeOSM(data);assert.equal(f.type,'water');assert.equal(f.rings.length,1);assert.deepEqual(f.points[0],f.points.at(-1));assert.equal(f.points.length,4);
});
