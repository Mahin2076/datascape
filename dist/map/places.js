// OSM geometry owns positions; artwork only supplies the visual treatment.
export const WIDTH=1536,HEIGHT=1152,SCALE=2;
const METERS=111320;
export function projection(center){
 const xscale=METERS*Math.cos(center.lat*Math.PI/180)*SCALE;
 return {toXY:([lng,lat])=>[WIDTH/2+(lng-center.lng)*xscale,HEIGHT/2-(lat-center.lat)*METERS*SCALE],
 toLatLng:([x,y])=>({lng:center.lng+(x-WIDTH/2)/xscale,lat:center.lat-(y-HEIGHT/2)/(METERS*SCALE)})};
}
export function contains(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
export function kind(tags){
 if(tags.building&&tags.building!=='no')return 'building';
 if(tags.leisure==='pitch')return 'pitch';
 if(tags.leisure==='swimming_pool'||tags.natural==='water'||tags.water)return 'water';
 if(tags.highway)return 'road';
 if(['park','garden','recreation_ground','golf_course','nature_reserve'].includes(tags.leisure)||['grass','forest','recreation_ground','meadow'].includes(tags.landuse)||['wood','grassland','scrub'].includes(tags.natural))return 'park';
 if(tags.leisure==='track')return 'track';
 if(tags.natural==='beach')return 'beach';
 return null;
}
export function normalizeOSM(data){
 const nodes=new Map(data.elements.filter(e=>e.type==='node').map(n=>[n.id,[n.lon,n.lat]]));
 const ways=new Map(data.elements.filter(e=>e.type==='way').map(w=>[w.id,w]));
 const features=[];
 for(const w of ways.values()){
  const type=kind(w.tags||{});if(!type)continue;
  const points=w.nodes.map(n=>nodes.get(n));if(points.length<2||points.some(p=>!p))continue;
  features.push({id:w.id,type,tags:w.tags,points});
 }
 // Join fragmented outer/inner rings instead of drawing each member as a polygon.
 for(const r of data.elements.filter(e=>e.type==='relation'&&e.tags?.type==='multipolygon')){
  const type=kind(r.tags);if(!type)continue;const rings=[];
  for(const role of ['outer','inner']){
   const parts=r.members.filter(m=>m.type==='way'&&(m.role||'outer')===role).map(m=>ways.get(m.ref)?.nodes.slice()).filter(Boolean);
   while(parts.length){let ids=parts.pop(),found=true;while(ids[0]!==ids.at(-1)&&found){found=false;for(let i=0;i<parts.length;i++){let p=parts[i];if(p[0]===ids.at(-1)||p.at(-1)===ids.at(-1)){if(p.at(-1)===ids.at(-1))p.reverse();ids.push(...p.slice(1));parts.splice(i,1);found=true;break;}}}
    const points=ids.map(n=>nodes.get(n));if(ids[0]===ids.at(-1)&&points.every(Boolean))rings.push(points);
   }
  }
  if(rings.length)features.push({id:'r'+r.id,type,tags:r.tags,points:rings[0],rings});
 }
 return features;
}
export function sceneFeatures(features,center){const project=projection(center);return features.map(f=>({...f,points:f.points.map(project.toXY),rings:f.rings?.map(r=>r.map(project.toXY))})).filter(f=>{
 const xs=f.points.map(p=>p[0]),ys=f.points.map(p=>p[1]);return Math.max(...xs)>=0&&Math.min(...xs)<=WIDTH&&Math.max(...ys)>=0&&Math.min(...ys)<=HEIGHT;
});}
export function createPlaceLoader(fetcher=fetch){
 const cache=[];
 return async center=>{
  const dx=WIDTH/(2*SCALE*METERS*Math.cos(center.lat*Math.PI/180)),dy=HEIGHT/(2*SCALE*METERS);
  const hit=cache.find(c=>center.lng-dx>=c.bounds[0]&&center.lat-dy>=c.bounds[1]&&center.lng+dx<=c.bounds[2]&&center.lat+dy<=c.bounds[3]);if(hit)return hit.features;
  // Bounded local-area request, never the entire planet or bulk tile harvesting.
  const bounds=[center.lng-dx*1.35,center.lat-dy*1.35,center.lng+dx*1.35,center.lat+dy*1.35];
  const response=await fetcher('https://api.openstreetmap.org/api/0.6/map.json?bbox='+bounds.join(','),{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Map details unavailable');const data=await response.json();
  const features=normalizeOSM(data);if(!features.length)throw Error('No mapped features here');
  cache.unshift({bounds,features});if(cache.length>8)cache.pop();return features;
 };
}
function trace(ctx,rings){ctx.beginPath();for(const ring of rings){ring.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}}
function fieldFrame(points){
 let best=null;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!best||length>best.length)best={length,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}
 const angle=best?.angle||0,c=Math.cos(angle),s=Math.sin(angle),p=points.map(([x,y])=>[x*c+y*s,-x*s+y*c]);
 const x=Math.min(...p.map(p=>p[0])),y=Math.min(...p.map(p=>p[1]));return {angle,x,y,w:Math.max(...p.map(p=>p[0]))-x,h:Math.max(...p.map(p=>p[1]))-y};
}
// Buildings are neighborhood illustrations: fixed-size, intact sprites rather than footprint skins.
export function layoutBuildings(features,atlas){
 const result=[],variants=['houseSmall','houseMedium','townhouse','brownstone','apartmentTeal','apartmentGold'];
 const roads=features.filter(f=>f.type==='road');
 const overlaps=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
 function crosses(a,b,r){
  let lo=0,hi=1;
  for(let k=0;k<2;k++){const min=k?r.y:r.x,max=min+(k?r.h:r.w),d=b[k]-a[k];
   if(Math.abs(d)<1e-9){if(a[k]<min||a[k]>max)return false;continue;}
   const t1=(min-a[k])/d,t2=(max-a[k])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;
  }return true;
 }
 for(const f of features.filter(f=>f.type==='building').sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
  const xs=f.points.map(p=>p[0]),ys=f.points.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const n=variants[Math.abs(Number(f.id)||0)%variants.length],scale=.7,w=atlas[n][2]*scale,h=atlas[n][3]*scale;
  for(const [dx,dy] of [[0,0],[24,0],[-24,0],[0,24],[0,-24]]){
   const x=cx-w/2+dx,foot=cy+18+dy,y=foot-h,rect={x,y,w,h},base={x:x+4,y:foot-24,w:w-8,h:24};
   if(x<20||y<20||x+w>WIDTH-20||foot>HEIGHT-20||result.some(b=>overlaps(rect,b,8)))continue;
   if(roads.some(r=>r.points.slice(1).some((p,i)=>crosses(r.points[i],p,{x:base.x-10,y:base.y-10,w:base.w+20,h:base.h+20}))))continue;
   if(features.some(f=>['pitch','water','park'].includes(f.type)&&[[base.x,base.y],[base.x+base.w,base.y+base.h],[cx+dx,foot]].some(p=>contains(p,f.points))))continue;
   result.push({id:f.id,title:f.tags.name||f.tags['addr:street']||'Neighborhood home',city:0,n,scale,x,y,w,h,foot,base,doorX:x+w/2,doorY:foot+10,mapped:true});break;
  }
 }
 return result;
}
export function buildPlaceScene(features,center,{patterns,sports,sprite,atlas}){
 const local=sceneFeatures(features,center),ground=document.createElement('canvas');ground.width=WIDTH;ground.height=HEIGHT;
 const ctx=ground.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle=patterns.pavement;ctx.fillRect(0,0,WIDTH,HEIGHT);
 const order={park:0,beach:1,water:2,road:3,track:4,pitch:5,building:6};local.sort((a,b)=>order[a.type]-order[b.type]);
 const buildings=layoutBuildings(local,atlas),trees=[],blockedShapes=[];
 for(const f of local){const rings=f.rings||[f.points];
  if(f.type==='road'||f.type==='track'){
   ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.lineJoin='round';ctx.lineCap='round';
   const path=['footway','path','steps','cycleway','pedestrian'].includes(f.tags.highway),width=f.type==='track'?7:path?6:['motorway','trunk','primary'].includes(f.tags.highway)?30:18;
   ctx.strokeStyle='#b8b6a1';ctx.lineWidth=width+6;ctx.stroke();ctx.strokeStyle=f.type==='track'?'#b87866':path?patterns.cobble:patterns.asphalt;ctx.lineWidth=width;ctx.stroke();continue;
  }
  if(f.type==='building')continue;
  trace(ctx,rings);ctx.fillStyle=f.type==='water'?'#548fad':f.type==='beach'?'#ddcd9a':patterns.grass;ctx.fill('evenodd');
  if(f.type==='water')blockedShapes.push(rings);
  if(f.type==='park'){
   for(let y=16;y<HEIGHT;y+=48)for(let x=16;x<WIDTH;x+=48){const px=x+(Math.sin(x+y)*12),py=y+(Math.cos(x-y)*12);if(rings.reduce((v,r)=>v!==contains([px,py],r),false)&&((x+y+Number(f.id))%7<2))trees.push([px,py]);}
  }
  if(f.type==='pitch'){
   ctx.save();trace(ctx,rings);ctx.clip('evenodd');const frame=fieldFrame(f.points);ctx.rotate(frame.angle);ctx.translate(frame.x,frame.y);
   const sport=f.tags.sport||'',art=sport.includes('soccer')?sports.soccer:sport.includes('basketball')?sports.basketball:null;
   if(art){ctx.translate(frame.w,0);ctx.rotate(Math.PI/2);ctx.drawImage(art,0,0,frame.h,frame.w);}
   else {ctx.strokeStyle='#f0eedb';ctx.lineWidth=2;ctx.strokeRect(3,3,frame.w-6,frame.h-6);
    if(sport.includes('american_football')){for(let i=1;i<12;i++){let x=frame.w*i/12;ctx.beginPath();ctx.moveTo(x,4);ctx.lineTo(x,frame.h-4);ctx.stroke();}}
    else if(sport.includes('baseball')){ctx.beginPath();ctx.moveTo(frame.w*.2,frame.h*.8);ctx.lineTo(frame.w*.5,frame.h*.5);ctx.lineTo(frame.w*.8,frame.h*.8);ctx.stroke();}
    else if(sport.includes('tennis')){ctx.strokeRect(3,frame.h*.2,frame.w-6,frame.h*.6);ctx.beginPath();ctx.moveTo(frame.w/2,0);ctx.lineTo(frame.w/2,frame.h);ctx.stroke();}
   }ctx.restore();
  }
 }
 // Trees are illustrative decoration within mapped greenery, never across pitches or roads.
 const obstacles=local.filter(f=>['building','pitch','water','road'].includes(f.type));
 for(const [x,y] of trees){if(obstacles.some(f=>f.type==='road'?f.points.some(p=>Math.hypot(p[0]-x,p[1]-y)<26):contains([x,y],f.points)))continue;sprite(ctx,'tree',x-16,y-35);}
 for(const b of buildings){const r=b.base;blockedShapes.push([[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]]]);}
 const isBlocked=(x,y)=>x<16||y<16||x>WIDTH-16||y>HEIGHT-16||blockedShapes.some(rings=>rings.reduce((v,r)=>v!==contains([x,y],r),false));
 let spawn=[WIDTH/2,HEIGHT/2];if(isBlocked(...spawn)){outer:for(let radius=16;radius<600;radius+=16)for(let angle=0;angle<Math.PI*2;angle+=.2){let p=[WIDTH/2+Math.cos(angle)*radius,HEIGHT/2+Math.sin(angle)*radius];if(!isBlocked(...p)){spawn=p;break outer;}}}
 if(isBlocked(...spawn))throw Error('No walkable ground at this location');
 const residents=local.filter(f=>f.type==='road').flatMap(f=>f.points).filter(([x,y])=>x>32&&y>32&&x<WIDTH-32&&y<HEIGHT-32&&!isBlocked(x,y));
 return {ground,buildings,features:local,center,spawn,isBlocked,residents,projection:projection(center)};
}
