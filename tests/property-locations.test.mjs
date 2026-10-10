import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyForBuilding} from '../dist/neighborhood/data.js';
test('property identity uses actual OSM names and addresses',()=>{
 const p=propertyForBuilding('421816061');
 assert.equal(p.name,'The Infinity II');assert.equal(p.address,'338 Spear Street');
 assert.equal(propertyForBuilding('421816058').name,'333 Main Street');
 assert.match(p.disclosure,/Simulated/);
});
test('unmapped addresses never receive invented residence numbers',()=>{
 assert.equal(propertyForBuilding('unknown').name,'Mapped building · address unavailable');
});

test('Rincon waterfront contains Bay water, preserves Spear Street land and follows OSM shore',async()=>{
 const {readFileSync}=await import('node:fs');
 const {contains,sceneFeatures}=await import('../dist/map/places.js');
 const features=JSON.parse(readFileSync(new URL('../dist/assets/rincon-map.json',import.meta.url)));
 const bay=features.find(f=>f.id==='rincon-bay');
 assert.ok(bay.shoreline.length>50);
 assert.equal(contains([-122.386,37.7905],bay.points),true);
 assert.equal(contains([-122.3908,37.7891],bay.points),false);
 assert.ok(sceneFeatures([bay],{lat:37.7891,lng:-122.3908})[0].shoreline.length>50);
});
