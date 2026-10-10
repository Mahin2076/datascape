import {readFileSync,writeFileSync} from 'node:fs';
const features=JSON.parse(readFileSync(new URL('../dist/assets/rincon-map.json',import.meta.url)));
const roads=features.filter(f=>f.type==='road'&&f.tags.name);
const locations={};
for(const f of features.filter(f=>f.type==='building')){
 const pts=f.points,lon=pts.reduce((s,p)=>s+p[0],0)/pts.length,lat=pts.reduce((s,p)=>s+p[1],0)/pts.length;
 let nearest=null,best=Infinity;
 for(const road of roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=(b[0]-a[0])*.79,dy=b[1]-a[1],px=(lon-a[0])*.79,py=lat-a[1];
  const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1))),d=(px-t*dx)**2+(py-t*dy)**2;
  if(d<best){best=d;nearest=road.tags.name;}
 }
 const tags=f.tags,address=[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ');
 locations[f.id]={name:tags.name||address||`Building near ${nearest||'Rincon Hill'}`,address:address||'Street address unavailable',lat,lon,sourceUrl:`https://www.openstreetmap.org/way/${f.id}`};
}
writeFileSync(new URL('../dist/neighborhood/locations.js',import.meta.url),'// Generated from the saved OpenStreetMap building geometry and tags. Run node scripts/build-property-locations.mjs.\nexport const locations='+JSON.stringify(locations)+';\n');
console.log(`Mapped ${Object.keys(locations).length} building locations`);
