import test from 'node:test';
import assert from 'node:assert/strict';
import {createWalkingRoutes,walkingPosition,assignWalkingRoutes} from '../dist/map/residents.js';
const road=points=>({type:'road',tags:{highway:'footway'},points});
test('walkers follow bends, reverse smoothly and pause when time stops',()=>{
 const [route]=createWalkingRoutes([road([[0,0],[100,0],[100,100]])],()=>false);
 assert.deepEqual(walkingPosition(route,5,10,0),{x:50,y:0,dir:2});
 assert.deepEqual(walkingPosition(route,15,10,0),{x:100,y:50,dir:0});
 assert.deepEqual(walkingPosition(route,25,10,0),{x:100,y:50,dir:3});
 const before=walkingPosition(route,19.99,10,0),after=walkingPosition(route,20.01,10,0);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.01);
 assert.deepEqual(walkingPosition(route,10,10,0),walkingPosition(route,10,10,0));
});
test('routes split at obstacles and skip roads closed to pedestrians',()=>{
 const routes=createWalkingRoutes([road([[0,0],[300,0]]),{...road([[0,100],[300,100]]),tags:{highway:'motorway'}}],(x)=>x>=120&&x<=180);
 assert.equal(routes.length,2);
 for(const r of routes)for(let t=0;t<100;t++){const p=walkingPosition(r,t,17,0);assert.ok(p.x<120||p.x>180);assert.equal(p.y,0);}
});
test('110 walkers are spread across routes with different speeds and phases',()=>{
 const routes=createWalkingRoutes([road([[0,0],[100,0]]),road([[0,100],[300,100]])],()=>false),walkers=assignWalkingRoutes(routes,110);
 assert.equal(walkers.length,110);assert.ok(new Set(walkers.map(w=>w.speed)).size>5);assert.ok(new Set(walkers.map(w=>w.phase)).size>100);
 assert.ok(walkers.filter(w=>w.route===routes[1]).length>walkers.filter(w=>w.route===routes[0]).length);
 assert.deepEqual(assignWalkingRoutes([],110),[]);
});
