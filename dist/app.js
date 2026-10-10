import { streetCamera } from './map/geometry.js';
import { createCityOverview } from './map/city-overview.js';
import { createSelectionStore } from './map/selection.js';
const $=s=>document.querySelector(s),canvas=$('#world'),ctx=canvas.getContext('2d'),mini=$('#mini'),mc=mini.getContext('2d');
const money=n=>'$'+Math.round(n).toLocaleString('en-US'),pct=n=>(n*100).toFixed(1)+'%',ratio=d=>12*d.rent/d.income;
const image=src=>new Promise((resolve,reject)=>{let a=new Image();a.onload=()=>resolve(a);a.onerror=()=>reject(Error('Could not load '+src));a.src=src});
let db,atlas,art,chars;
try{[db,atlas,art,chars]=await Promise.all([fetch('assets/data.json').then(r=>r.json()),fetch('assets/world-atlas.json').then(r=>r.json()),image('assets/world-atlas.png'),image('assets/sprites.png')]);}catch(e){$('#loading h1').textContent='The city could not load';$('#loading p').textContent='Please refresh to try again.';throw e;}
const W=1536,H=1152,cities=db.cities,origins=[[48,64],[560,64],[1072,64],[48,624],[560,624]], names=['Pacific Court','Hudson House','Juniper Place','Lakeside Row','Cedar Court'];
let year=0,current=0,near=null,inspected=null,overview=true,zoom=1.65,ambient=!matchMedia('(prefers-reduced-motion: reduce)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,discovered=new Set(),clock=0,keys=new Set(),path=[],last=0,timer=null,toastTimer;
const player={x:320,y:304,dir:0,char:0,moving:false},cam={x:320,y:272,z:1.65};
const selection = createSelectionStore({ cityIds: cities.map(c=>c.id), years: db.years });
const residentEvents = new EventTarget();
let selectedResident = null, residentHits = [], syncingSelection = false;
const streetPositions = new Map();
const cityMap = createCityOverview({ reducedMotion: reduced, onEnter:options=>enterStreet(options?.animated), onError:()=>{overview=true;refresh();toast('Street map unavailable. The comparison map still works.');} });
function emitSelection(){
 if(syncingSelection)return;
 selection.set({cityId:cities[current].id,year:db.years[year]});
}
// Teammates import the store, subscribe to resident selection, and mount their own panel.
export const mapIntegration = Object.freeze({
 selection,
 onResidentSelect(callback){const handler=e=>callback(e.detail.residentId,e.detail);residentEvents.addEventListener('select',handler);return()=>residentEvents.removeEventListener('select',handler);},
 getResidents(){return cities.flatMap((c,i)=>npc.map(a=>({residentId:residentId(a,i),cityId:c.id,spriteIndex:a.char})));},
 getSelectedResident(){return selectedResident;}
});
selection.subscribe(value=>{
 if(cities[current].id===value.cityId&&db.years[year]===value.year)return;
 syncingSelection=true;
 if(cities[current].id!==value.cityId){const next=cities.findIndex(c=>c.id===value.cityId);if(!overview)travel(next);else{current=next;if(cityMap.active&&current!==0)cityMap.close();}}
 year=db.years.indexOf(value.year);refresh();syncingSelection=false;
});
function updateMapUI(){
 const mode=cityMap.active?'city':overview?'compare':'street';
 $('#game').dataset.view=mode;
 $('#cityView').textContent=mode==='street'?'← City map':'City map';$('#mapCaption').hidden=mode!=='city';$('#mapMode').textContent=mode==='city'?'CITY / SAN FRANCISCO':mode==='compare'?'FIVE CITIES':`${cities[current].name.toUpperCase()} / STREET`;
 $('#cityView').setAttribute('aria-pressed',String(mode==='city'));
 $('#compareView').setAttribute('aria-pressed',String(mode==='compare'));
 $('#cityCard').hidden=mode!=='city';$('#mapAttribution').hidden=mode!=='city';$('#streetHint').hidden=mode!=='street';$('#ambient').hidden=mode!=='street';
 $('#cityRent').textContent=money(cities[0].data[year].rent);$('#cityIncome').textContent=money(cities[0].data[year].income);
 $('#cityPeriod').textContent=`ACS ${cities[0].data[year].period} · overlapping five-year estimates. Figures describe the whole city.`;
 $('#mapLegend').hidden=mode!=='compare';$('#story .story-key span:last-child').textContent=mode==='compare'?'Bars: 0–30% since 2021 · ACS estimates':'Citywide ACS estimates · Compare cities for growth bars';
 $('#mapToggle').setAttribute('aria-label',mode==='street'?'Return to overview':'Explore selected city');
 emitSelection();
}
function showCity(){
 stopTimeline();keys.clear();path=[];
 if(!overview)streetPositions.set(current,{x:player.x,y:player.y});
 inspected=null;$('#inspection').hidden=true;$('#answer').hidden=true;$('#askform').hidden=true;
 overview=true;
 if(current===0)cityMap.open();else{cityMap.close();toast('Detailed city overview is available for San Francisco. Select a city to walk its illustrative streets.');}
 refresh();
}
function showComparison(){
 stopTimeline();if(!overview)streetPositions.set(current,{x:player.x,y:player.y});
 cityMap.close();overview=true;keys.clear();path=[];inspected=null;$('#inspection').hidden=true;$('#answer').hidden=true;refresh();
}
function enterStreet(animated=false){
 stopTimeline();const saved=streetPositions.get(current);travel(current);zoom=1.65;
 if(saved){player.x=saved.x;player.y=saved.y;cam.x=player.x;cam.y=player.y-28;}if(animated){cam.z=1.05;}updateMapUI();canvas.focus();
}
function zoomMap(delta){
 if(cityMap.active){cityMap.changeZoom(delta);return;}
 if(overview){if(delta>0)enterStreet();return;}
 if(delta<0&&zoom<=1.05){showCity();return;}
 zoom=Math.max(.85,Math.min(3.2,zoom+delta*.25));
}
const buildings=[],props=[],obstacles=[];let seed=135;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const growth=(i,y=year)=>{const a=cities[i].data[0],b=cities[i].data[y];return {rent:(b.rent/a.rent-1)*100,income:(b.income/a.income-1)*100}};
const gapColor=i=>{const g=growth(i);return year===0?'#d6d3bd':g.rent>g.income?'#e9a08a':'#80c6bb'};
const color=d=>{let t=Math.max(0,Math.min(1,(ratio(d)-.18)/.1));return t<.5?'#8aaa71':t<.8?'#d3af65':'#d38d78'};
function stopTimeline(){clearInterval(timer);timer=null;$('#play').textContent='▶';$('#play').setAttribute('aria-label','Play timeline');$('#watchStory').textContent='▶ Watch again'}
function playStory(){cityMap.close();stopTimeline();year=0;overview=true;inspected=null;$('#inspection').hidden=true;$('#answer').hidden=true;$('#mapLegend').hidden=false;keys.clear();path=[];refresh();$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','Pause timeline');$('#watchStory').textContent='Playing…';timer=setInterval(()=>{year++;refresh();if(year===3){stopTimeline();revealStory()}},2600)}
function revealStory(){stopTimeline();year=3;refresh();ask('Where did rent outpace income?')}

function sprite(c,n,x,y,s=1){let a=atlas[n];c.drawImage(art,...a,Math.round(x),Math.round(y),a[2]*s,a[3]*s)}
function prop(n,x,y,solid=false){let a=atlas[n];props.push({n,x,y,z:y+a[3]});if(solid)obstacles.push({x:x+a[2]*.3,y:y+a[3]-9,w:a[2]*.4,h:9})}
function building(n,x,foot,city,title){const a=atlas[n],b={id:buildings.length,n,x,y:foot-a[3],w:a[2],h:a[3],foot,city,title,doorX:x+a[2]/2,doorY:foot+14};buildings.push(b);obstacles.push({x:x+3,y:b.y+5,w:b.w-6,h:b.h-8});return b;}
origins.forEach(([x,y],i)=>{
 const sets=[['apartmentSlate','houseMedium','houseSmall','townhouse'],['brownstone','houseMedium','townhouse','apartmentGold'],['apartmentGold','houseSmall','houseSmall','townhouse'],['apartmentSlate','houseMedium','houseSmall','townhouse'],['apartmentTeal','houseMedium','houseSmall','townhouse']][i];
 building(sets[0],x+24,y+210,i,names[i]);building(sets[1],x+224,y+210,i,['Bay Window House','Orchard House','Sunflower House','Willow House','Evergreen House'][i]);building(sets[2],x+56,y+400,i,'Garden Apartments');building(sets[3],x+296,y+400,i,'The Corner Residence');
 for(let xx=x+8;xx<x+410;xx+=16){if(xx<x+55||xx>x+150)prop('fence',xx,y+415);}
 for(let j=0;j<5;j++){prop(j%2?'tree':'tree2',x+144+(j%2)*30,y+25+j*35,true)}
 for(let j=0;j<3;j++){prop('cypress',x+353,y+55+j*44,true);prop('flowersPink',x+229+j*32,y+215);}
 prop('benchWide',x+170,y+299,true);prop('benchVertical',x+8,y+296,true);prop('flowersWhite',x+175,y+337);prop('tree',x+172,y+348,true);prop('tree2',x+344,y+354,true);prop('lamp',x+190,y+213);prop('lampMirror',x+400,y+350);prop('hydrant',x+403,y+216,true);prop('trash',x+216,y+268,true);
});
// A commercial corner and public garden connect the five neighborhoods.
building('hardware',1090,900,2,'Market Street Apartments');building('office',1298,954,2,'Civic Square Apartments');
for(let i=0;i<21;i++){let x=1080+(i%7)*27,y=650+Math.floor(i/7)*44;prop(i%3?'tree':'cypress',x,y,true)}
for(let i=0;i<16;i++){prop('tree',12+i*96,24,true);prop('tree2',12+i*96,1093,true)}
for(let y=150;y<1080;y+=96){prop('tree',16,y,true);prop('cypress',1492,y,true)}
for(let y of [480,586])for(let x=100;x<1450;x+=130)prop('streetLight',x,y-50);
for(let x of [1160,1210]){prop('bench',x,785,true);prop('flowersRed',x,819)}
const ground=document.createElement('canvas');ground.width=W;ground.height=H;const gc=ground.getContext('2d');gc.imageSmoothingEnabled=false;
function pattern(n){let a=atlas[n],c=document.createElement('canvas');c.width=a[2];c.height=a[3];c.getContext('2d').drawImage(art,...a,0,0,a[2],a[3]);return gc.createPattern(c,'repeat')}
const patterns=Object.fromEntries(['grass','cobble','asphalt','pavement'].map(n=>[n,pattern(n)]));
function fill(n,x,y,w,h){gc.fillStyle=patterns[n];gc.fillRect(x,y,w,h)}
fill('grass',0,0,W,H);fill('pavement',32,48,W-64,H-96);
fill('asphalt',480,48,64,H-96);fill('asphalt',992,48,64,H-96);fill('asphalt',32,496,W-64,96);
origins.forEach(([x,y])=>{fill('cobble',x,y,416,432);fill('grass',x+150,y+10,56,197);fill('grass',x+349,y+12,52,190);fill('grass',x+170,y+342,64,62);fill('asphalt',x,y+252,150,48);gc.fillStyle='#d4d5c6';gc.fillRect(x,y+249,150,3);gc.fillRect(x,y+300,150,3);for(let xx=x+8;xx<x+145;xx+=22){gc.fillStyle='#d9d8c7';gc.fillRect(xx,y+275,12,2)}for(let yy=y+253;yy<y+298;yy+=9){gc.fillStyle='#dddccd';gc.fillRect(x+137,yy,11,5)}});
fill('cobble',1072,624,416,432);fill('grass',1072,632,202,152);fill('pavement',1096,764,170,64);
gc.fillStyle='#d1d2c0';for(let y=70;y<1080;y+=28){gc.fillRect(510,y,3,15);gc.fillRect(1022,y,3,15)}for(let x=50;x<1480;x+=32)gc.fillRect(x,542,18,3);
for(let x of [480,992])for(let y of [480,592]){for(let j=0;j<6;j++){gc.fillStyle='#e1e0ce';gc.fillRect(x+j*10,y,6,16)}}
const npc=Array.from({length:55},(_,i)=>({id:`${cities[i%5].id}-resident-${Math.floor(i/5)+1}`,ordinal:Math.floor(i/5)+1,city:i%5,offset:random()*390,speed:10+random()*8,row:i%2,char:(i+1)%10}));
function residentId(a,city){return `${cities[city].id}-resident-${a.ordinal+((a.city-city+5)%5)*11}`;}
let vehicles=[];const oldArt=await image('assets/city-atlas.png');const oldAtlas=await fetch('assets/atlas.json').then(r=>r.json());
function car(n,x,y,vx){const a=oldAtlas[n],w=a[2]*.65,h=a[3]*.65;/* Car art faces right; bus art faces left. Match facing to velocity. */const flip=n==='bus'?vx>0:vx<0;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(oldArt,...a,-w/2,0,w,h);ctx.restore()}
function blocked(x,y){return x<40||y<50||x>1490||y>1090||obstacles.some(b=>x>b.x-5&&x<b.x+b.w+5&&y>b.y-3&&y<b.y+b.h+4)}
function move(dx,dy){const before=[player.x,player.y];if(!blocked(player.x+dx,player.y))player.x+=dx;if(!blocked(player.x,player.y+dy))player.y+=dy;return Math.abs(before[0]-player.x)+Math.abs(before[1]-player.y)>.01;}
function nearest(){let best=null,dist=65;for(const b of buildings){let d=Math.hypot(b.doorX-player.x,b.doorY-player.y);if(d<dist){dist=d;best=b}}return best;}
function refresh(){
 updateMapUI();
 $('#storyStatus').textContent=year===0?'2021 baseline: both growth bars start at zero.':`${db.years[year]}: ${cities.filter((_,i)=>{let g=growth(i);return g.rent>g.income}).length} of 5 cities show rent growing faster than household income.`;$('#year').textContent=db.years[year];$('#time').value=year;$('#citySelect').value=current;$('#state').textContent=cities[current].state;$('#districtTitle').textContent=cities[current].name;$('#districtSubtitle').textContent=['A new perspective on the Golden City.','Big-city dreams. Real-world prices.','A growing city, a changing cost of living.','Find a home beside the lake.','A little rain. A different kind of city.'][current];$('#miniLabel').textContent=cities[current].name.toUpperCase();$('#discoveries').textContent=`${discovered.size} / 5 cities discovered`;if(inspected)showInspection(inspected,false);
}
function showInspection(b,record=true){if(!overview)b={...b,city:current};inspected=b;if(record){discovered.add(b.city);$('#quest').hidden=true;refresh();}let c=cities[b.city],d=c.data[year],a=c.data[0],g=d.rent/a.rent-1,ig=d.income/a.income-1;$('#inspection').hidden=false;$('#inspection').innerHTML=`<button class="close" id="closeInspection" aria-label="Close building details">×</button><span class="type">${c.name.toUpperCase()} · HISTORICAL HOUSING DATA</span><h2>${b.title}</h2><span class="sub">Fictional building · ${c.name}, ${c.state}</span><div class="price">${money(d.rent)} <small>/ month</small></div><p class="disclaimer">City median gross rent, not this building’s asking price.<br>ACS ${d.period} five-year estimate.</p><div class="stats"><div><small>HOUSEHOLD INCOME</small><b>${money(d.income)}</b></div><div><small>ANNUAL RENT / INCOME</small><b>${pct(ratio(d))}</b></div><div><small>POPULATION</small><b>${d.population.toLocaleString()}</b></div><div><small>HOUSING VACANCY</small><b>${pct(d.vacantUnits/d.housingUnits)}</b></div></div><p class="trend">${year?`Since 2021: rent <b>+${pct(g)}</b>; household income <b>+${pct(ig)}</b>. Gap: <b>${((g-ig)*100).toFixed(1)} percentage points</b>.`:'This is the 2021 baseline. Move the time slider to see what changed.'}</p><button class="source-button" id="exactSources">View exact values & Census sources ↗</button>`;$('#closeInspection').onclick=()=>{inspected=null;$('#inspection').hidden=true};$('#exactSources').onclick=()=>showSources(b.city);}
function showSources(i=current){let c=cities[i],d=c.data[year];$('#sourceDetails').innerHTML=`<p><b>${c.name} · ${d.period}</b><br>Median gross rent: ${money(d.rent)} ± ${money(d.rentMoe)}<br>Median household income: ${money(d.income)} ± ${money(d.incomeMoe)}<br>Margins of error at 90% confidence.</p>`;$('#sourceLinks').innerHTML=Object.entries(d.sources).map(([k,v])=>`<a target="_blank" rel="noreferrer" href="${v}">${k.toUpperCase()} ↗</a>`).join('');keys.clear();path=[];$('#sources').showModal();}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600)}
function travel(i){if(!overview)streetPositions.set(current,{x:player.x,y:player.y});cityMap.close();selectedResident=null;delete canvas.dataset.selectedResident;current=i;player.x=origins[i][0]+272;player.y=origins[i][1]+240;player.dir=0;path=[];keys.clear();inspected=null;$('#inspection').hidden=true;overview=false;$('#mapLegend').hidden=true;$('#locationBanner').hidden=false;cam.x=player.x;cam.y=player.y-28;cam.z=zoom;refresh();}
function setMap(){if(overview){if(cityMap.active)cityMap.enter();else enterStreet();}else showCity();}
function ask(q){stopTimeline();const text=q.toLowerCase();let index=0,title,body,comparison=false,end=year===0?3:year;
 if(/afford|cheap|expensive|burden/.test(text)&&!/grow|rent.*rise|outpace|ahead|keep/.test(text)){let ranked=cities.map((c,i)=>({i,r:ratio(c.data[year])})).sort((a,b)=>a.r-b.r);index=/expensive|least|highest/.test(text)?ranked.at(-1).i:ranked[0].i;let d=cities[index].data[year];title=`${cities[index].name}, by the numbers.`;body=`Its ${d.year} rent-to-income ratio is <strong>${pct(ratio(d))}</strong>, the ${index===ranked[0].i?'lowest':'highest'} of these five cities. Rent: ${money(d.rent)}/month. Household income: ${money(d.income)}/year.`;
 }else if(/rent|income|wage|growth/.test(text)){comparison=true;let ranked=cities.map((c,i)=>({i,r:c.data[end].rent/c.data[0].rent-1,w:c.data[end].income/c.data[0].income-1})).filter(d=>d.r>d.w).sort((a,b)=>/fast/.test(text)?b.r-a.r:(b.r-b.w)-(a.r-a.w));let g=ranked[0];index=g.i;title=/fast/.test(text)?`${cities[index].name} saw rent rise fastest.`:`${cities[index].name} had the widest gap.`;let a=cities[index].data[0],b=cities[index].data[end];body=`2021 → ${db.years[end]}: rent rose <strong>${pct(g.r)}</strong> (${money(a.rent)} → ${money(b.rent)}), while household income grew <strong>${pct(g.w)}</strong> (${money(a.income)} → ${money(b.income)}). A <strong>${((g.r-g.w)*100).toFixed(1)} percentage-point gap</strong>.`;
 }else{title='Ask about the cost of living.';body='Try “Where did rent outpace income?”, “Where did rent rise fastest?” or “Which city is most affordable?”';index=null;}
 if(index!==null){if(comparison)year=end;travel(index);showInspection(buildings.find(b=>b.city===index&&b.title.includes('House'))||buildings.find(b=>b.city===index));$('#inspection').hidden=true;inspected=null;}
 $('#askform').hidden=true;$('#answer').hidden=false;$('#answer').innerHTML=`<button class="close" id="closeAnswer" aria-label="Close answer">×</button><b>${title}</b><p>${body}</p>${comparison?`<table class="ranking"><caption>2021 → ${db.years[end]} · growth</caption><thead><tr><th>City</th><th>Rent</th><th>Income</th><th>Gap¹</th></tr></thead><tbody>${cities.map((c,i)=>({c,i,...growth(i,end)})).sort((a,b)=>(b.rent-b.income)-(a.rent-a.income)).map(g=>`<tr class="${g.i===index?'selected':''}"><th>${g.c.name}</th><td>${g.rent.toFixed(1)}%</td><td>${g.income.toFixed(1)}%</td><td>${(g.rent-g.income).toFixed(1)}</td></tr>`).join('')}</tbody></table><p class="reading">¹ Percentage points. This compares city medians, not individual renters. It shows divergence, not its cause.</p>`:''}<small>ACS five-year estimates · overlapping periods · nominal dollars · statistical significance not tested. <a href="#" id="answerSources">Sources ↗</a></small>`;$('#closeAnswer').onclick=()=>$('#answer').hidden=true;$('#answerSources').onclick=e=>{e.preventDefault();showSources(index??current)};
}
// Grid route-finding lets pointer and touch users walk around buildings, not through them.
function routeTo(x,y){const S=16,cols=W/S,rows=H/S,sx=Math.floor(player.x/S),sy=Math.floor(player.y/S),tx=Math.floor(x/S),ty=Math.floor(y/S);if(blocked(tx*S+8,ty*S+8)){toast('Choose an open patch of pavement.');return}let start=sy*cols+sx,goal=ty*cols+tx,queue=[start],prev=new Map([[start,-1]]),at=0;while(at<queue.length&&at<7500){let id=queue[at++];if(id===goal)break;let cx=id%cols,cy=Math.floor(id/cols);for(let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=cx+dx,ny=cy+dy,nid=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||prev.has(nid)||blocked(nx*S+8,ny*S+8))continue;prev.set(nid,id);queue.push(nid)}}if(!prev.has(goal)){toast('That spot is not reachable. Try a nearby street.');return}let nodes=[],p=goal;while(p!==start&&p!==-1){nodes.push({x:(p%cols)*S+8,y:Math.floor(p/cols)*S+8});p=prev.get(p)}path=nodes.reverse();}
function character(c,character,x,y,dir,walking,t,scale=1){const f=walking?[1,0,1,2][Math.floor(t*8)%4]:1;c.drawImage(chars,(character%5)*48+f*16,Math.floor(character/5)*64+dir*16,16,16,Math.round(x-8*scale),Math.round(y-16*scale),16*scale,16*scale)}
function rounded(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function render(now){let dt=Math.min(.04,(now-last)/1000||0);last=now;if(ambient)clock+=dt;
 if(!overview&&!cityMap.transitioning&&!$('#sources').open){let dx=0,dy=0;for(const k of keys){if(k==='w'||k==='arrowup')dy-=1;if(k==='s'||k==='arrowdown')dy+=1;if(k==='a'||k==='arrowleft')dx-=1;if(k==='d'||k==='arrowright')dx+=1;}if(dx||dy)path=[];else if(path.length){let p=path[0],dist=Math.hypot(p.x-player.x,p.y-player.y);if(dist<3)path.shift();else{dx=(p.x-player.x)/dist;dy=(p.y-player.y)/dist;}}const len=Math.hypot(dx,dy);player.moving=false;if(len){let step=dt*(keys.has('shift')?110:68);player.moving=move(dx/len*step,dy/len*step);player.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?1:2):(dy<0?3:0);if(!player.moving&&path.length)path=[];}}
 else player.moving=false;
 // All street blocks belong to the selected city's illustrative world.
 const candidate=overview?null:nearest();if(candidate!==near){near=candidate;$('#nearby').hidden=!near;if(near)$('#nearbyName').textContent=near.title;}
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
 const top=document.querySelector('.hud').getBoundingClientRect().bottom,usable=Math.max(180,h-top-64);
 $('#game').style.setProperty('--map-top',`${top+9}px`);
 canvas.dataset.view=$('#game').dataset.view;canvas.dataset.playerX=player.x.toFixed(1);canvas.dataset.playerY=player.y.toFixed(1);
 if(cityMap.active){ctx.setTransform(dpr,0,0,dpr,0,0);cityMap.draw(ctx,w,h,top,dt,now);requestAnimationFrame(render);return;}
 residentHits=[];const dest=overview?{x:W/2,y:H/2,z:Math.min(w/(W+60),usable/(H+60))}:streetCamera({width:w,height:usable,worldWidth:W,worldHeight:H,x:player.x,y:player.y-25,zoom:w<650?zoom*.82:zoom});let ease=reduced?1:Math.min(1,dt*7);['x','y','z'].forEach(k=>cam[k]+=(dest[k]-cam[k])*ease);if(!overview)Object.assign(cam,streetCamera({width:w,height:usable,worldWidth:W,worldHeight:H,x:cam.x,y:cam.y,zoom:cam.z}));
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#68816c';ctx.fillRect(0,0,w,h);const ox=Math.round(w/2-cam.x*cam.z),oy=Math.round(top+usable*.5-cam.y*cam.z);render.transform={ox,oy,scale:cam.z};ctx.translate(ox,oy);ctx.scale(cam.z,cam.z);ctx.save();ctx.drawImage(ground,0,0);
 let objs=props.map(p=>({z:p.z,draw:()=>sprite(ctx,p.n,p.x,p.y)}));
 for(const b of buildings)objs.push({z:b.foot,draw:()=>{ctx.fillStyle='#26332a20';ctx.fillRect(b.x+8,b.y+12,b.w,b.h);sprite(ctx,b.n,b.x,b.y);if(overview){ctx.strokeStyle=gapColor(b.city);ctx.lineWidth=3/cam.z;ctx.strokeRect(b.x-3,b.y-3,b.w+6,b.h+6)}if(!overview){ctx.fillStyle='#202e2aee';ctx.fillRect(b.doorX-37,b.foot-22,74,16);ctx.fillStyle=gapColor(current);ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(money(cities[current].data[year].rent)+'/mo',b.doorX,b.foot-10)}if(b===near&&!overview){ctx.fillStyle='#e3cc7b';ctx.fillRect(b.doorX-7,b.foot+2,14,2);ctx.fillStyle='#fffbe2';ctx.fillRect(b.doorX-2,b.foot+6,4,2)}}});
 for(const a of npc){const id=overview?a.id:residentId(a,current);let [x,y]=origins[a.city],walk=(a.offset+clock*a.speed)%740,forward=walk<370,xx=x+12+(forward?walk:740-walk),yy=y+(a.row?430:235);residentHits.push({id,x:xx,y:yy,city:current});objs.push({z:yy,draw:()=>{if(selectedResident===id){ctx.strokeStyle='#ffec9c';ctx.lineWidth=1.5;ctx.strokeRect(xx-10,yy-20,20,23);}character(ctx,a.char,xx,yy,forward?2:1,ambient,clock+a.offset)}});}
 objs.push({z:player.y,draw:()=>{ctx.fillStyle='#25332633';ctx.beginPath();ctx.ellipse(player.x,player.y,7,3,0,0,Math.PI*2);ctx.fill();character(ctx,player.char,player.x,player.y,player.dir,player.moving,now/1000,1.15);if(!overview){ctx.fillStyle='#fff9d8';ctx.beginPath();ctx.moveTo(player.x-3,player.y-27);ctx.lineTo(player.x+3,player.y-27);ctx.lineTo(player.x,player.y-23);ctx.fill();}}});
 objs.sort((a,b)=>a.z-b.z);for(const o of objs)o.draw();
 for(let i=0;i<7;i++){const vx=i%2?23:-19,x=(i*231+clock*vx+100000)%1450+40;car(i===3?'bus':'car',x,i%2?557:514,vx)}
 if(path.length&&!overview){const p=path.at(-1);ctx.strokeStyle='#fbf2c9';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.stroke();}
 // Data signboards sit in the city; a fixed 0–30% scale is shared by both metrics and all years.
 origins.forEach(([x,y],i)=>{if(!overview)return;const g=growth(i),sx=x+18,sy=y+255;
 ctx.fillStyle='#202e2af2';ctx.fillRect(sx,sy,390,142);ctx.strokeStyle=gapColor(i);ctx.lineWidth=2;ctx.strokeRect(sx,sy,390,142);ctx.textAlign='left';ctx.font='bold 24px monospace';ctx.fillStyle='#f0efdf';ctx.fillText(cities[i].name,sx+12,sy+29);
 for(const [j,value,label,col] of [[0,g.rent,'RENT','#e9a08a'],[1,g.income,'INCOME','#80c6bb']]){const yy=sy+49+j*31;ctx.font='16px monospace';ctx.fillStyle='#d9ded3';ctx.fillText(label,sx+12,yy+13);ctx.fillStyle='#46514a';ctx.fillRect(sx+86,yy,218,16);ctx.fillStyle=col;ctx.fillRect(sx+86,yy,218*Math.max(0,Math.min(30,value))/30,16);ctx.fillText(value.toFixed(1)+'%',sx+313,yy+13)}ctx.font='15px monospace';ctx.fillStyle='#d9ded3';ctx.fillText(year===0?'BASELINE / BOTH START AT ZERO':`GAP ${(g.rent-g.income).toFixed(1)} pp / SINCE 2021`,sx+12,sy+129);
 });
 if(overview){ctx.fillStyle='#fff1a8';ctx.beginPath();ctx.arc(player.x,player.y,9,0,Math.PI*2);ctx.fill();}

 ctx.restore();ctx.setTransform(dpr,0,0,dpr,0,0);cityMap.draw(ctx,w,h,top,dt,now);
 drawMini();$('#position').textContent=`${Math.round(player.x)}, ${Math.round(player.y)}`;canvas.dataset.playerX=player.x.toFixed(1);canvas.dataset.playerY=player.y.toFixed(1);canvas.dataset.nearby=near?.title||'';requestAnimationFrame(render);
}
function drawMini(){mc.imageSmoothingEnabled=false;mc.fillStyle='#a6b291';mc.fillRect(0,0,168,112);const sx=168/W,sy=112/H;mc.fillStyle='#7b897b';mc.fillRect(480*sx,0,64*sx,112);mc.fillRect(992*sx,0,64*sx,112);mc.fillRect(0,496*sy,168,96*sy);for(const b of buildings){mc.fillStyle=color(cities[b.city].data[year]);mc.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy)}mc.fillStyle='#fff7d2';mc.beginPath();mc.arc(player.x*sx,player.y*sy,3,0,Math.PI*2);mc.fill();mc.strokeStyle='#49623d';mc.stroke();}
$('#citySelect').innerHTML=cities.map((c,i)=>`<option value="${i}">${c.name}</option>`).join('');$('#citySelect').onchange=e=>{const i=+e.target.value;if(overview){current=i;showCity();}else travel(i);};
function inspect(){if(near)showInspection(near);else toast('Walk closer to a building’s front door.');}
const movement=['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','shift'];
window.addEventListener('keydown',e=>{if(cityMap.transitioning){e.preventDefault();if(e.key==='Escape')cityMap.cancelTransition();return;}if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||$('#sources').open)return;let k=e.key.toLowerCase();if(k==='enter'&&cityMap.active){e.preventDefault();cityMap.enter();return;}if(k==='+'||k==='='){e.preventDefault();zoomMap(1);return;}if(k==='-'){e.preventDefault();zoomMap(-1);return;}if(movement.includes(k)){e.preventDefault();if(cityMap.active){cityMap.pan(['a','arrowleft'].includes(k)?35:['d','arrowright'].includes(k)?-35:0,['w','arrowup'].includes(k)?35:['s','arrowdown'].includes(k)?-35:0);return;}keys.add(k);if(overview)setMap();if(!e.repeat){let dx=['a','arrowleft'].includes(k)?-2:['d','arrowright'].includes(k)?2:0,dy=['w','arrowup'].includes(k)?-2:['s','arrowdown'].includes(k)?2:0;move(dx,dy)}}else if(k==='e'){inspect()}else if(k==='m'){setMap()}else if(k==='/'){e.preventDefault();openAsk()}else if(k==='escape'){inspected=null;$('#inspection').hidden=true;$('#askform').hidden=true;$('#answer').hidden=true;if(!overview)showCity()}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
for(const button of document.querySelectorAll('[data-dir]')){const k={up:'w',down:'s',left:'a',right:'d'}[button.dataset.dir];button.onpointerdown=e=>{e.preventDefault();keys.add(k);path=[];move(k==='a'?-3:k==='d'?3:0,k==='w'?-3:k==='s'?3:0);button.setPointerCapture(e.pointerId);if(overview)setMap()};button.onpointerup=button.onpointercancel=()=>keys.delete(k);}
let pointerStart=null,dragged=false,pinchDistance=null,wheelAt=0;const pointers=new Map();
canvas.onpointerdown=e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pointerStart={x:e.clientX,y:e.clientY};dragged=false;};
canvas.onpointermove=e=>{
 if(!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){dragged=true;const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance&&Math.abs(distance-pinchDistance)>22){zoomMap(distance>pinchDistance?1:-1);pinchDistance=distance;}else if(!pinchDistance)pinchDistance=distance;return;}
 if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)dragged=true;
 if(cityMap.active&&dragged)cityMap.pan(e.clientX-previous.x,e.clientY-previous.y);
};
canvas.onpointerup=e=>{
 pointers.delete(e.pointerId);pinchDistance=null;if(dragged||!pointerStart){if(!pointers.size)pointerStart=null;return;}pointerStart=null;
 const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top;
 if(cityMap.active){cityMap.click(sx,sy);return;}
 const t=render.transform;if(!t)return;const x=(sx-t.ox)/t.scale,y=(sy-t.oy)/t.scale;
 if(overview){const i=origins.findIndex(([px,py])=>x>=px&&x<px+432&&y>=py&&y<py+432);if(i>=0){current=i;if(i===0)showCity();else enterStreet();}return;}
 const resident=residentHits.filter(a=>a.city===current).sort((a,b)=>Math.hypot(a.x-x,a.y-8-y)-Math.hypot(b.x-x,b.y-8-y)).find(a=>Math.abs(a.x-x)<12&&Math.abs(a.y-8-y)<15);
 if(resident){selectedResident=resident.id;path=[];keys.clear();const detail={residentId:resident.id,selection:selection.get()};residentEvents.dispatchEvent(new CustomEvent('select',{detail}));window.dispatchEvent(new CustomEvent('datascape:resident-select',{detail}));canvas.dataset.selectedResident=resident.id;toast(`Resident selected · ${resident.id}`);return;}
 const b=buildings.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.foot);
 if(b){if(b===near)inspect();else{routeTo(b.doorX,b.doorY+10);toast('Walking to '+b.title)}}else routeTo(x,y);
};
canvas.onpointercancel=e=>{pointers.delete(e.pointerId);pointerStart=null;pinchDistance=null;dragged=true;};
canvas.addEventListener('wheel',e=>{e.preventDefault();if(performance.now()-wheelAt<140||Math.abs(e.deltaY)<2)return;wheelAt=performance.now();zoomMap(e.deltaY<0?1:-1);},{passive:false});
$('#cityView').onclick=showCity;$('#compareView').onclick=showComparison;$('#enterStreet').onclick=()=>cityMap.enter();

mini.onclick=()=>setMap();$('#inspect').onclick=inspect;$('#mapToggle').onclick=setMap;$('#recenter').onclick=()=>cityMap.active?cityMap.reset():travel(current);$('#zoomIn').onclick=()=>zoomMap(1);$('#zoomOut').onclick=()=>zoomMap(-1);$('#ambient').onclick=()=>{ambient=!ambient;$('#ambient').textContent=ambient?'Ⅱ':'▶';$('#ambient').setAttribute('aria-label',ambient?'Pause ambient animation':'Resume ambient animation')};
function portrait(){let c=$('#portrait').getContext('2d');c.clearRect(0,0,48,48);c.imageSmoothingEnabled=false;character(c,player.char,24,42,0,false,0,2.4)}$('#avatarButton').onclick=()=>{player.char=(player.char+1)%10;portrait();toast('A new face in the neighborhood.')};
$('#time').oninput=e=>{stopTimeline();year=+e.target.value;$('#answer').hidden=true;refresh()};$('#play').onclick=()=>timer?stopTimeline():playStory();$('#watchStory').onclick=playStory;$('#revealStory').onclick=revealStory;

function openAsk(){$('#askform').hidden=false;$('#answer').hidden=true;keys.clear();path=[];$('#question').focus()}$('#askToggle').onclick=openAsk;$('#closeAsk').onclick=()=>$('#askform').hidden=true;$('#askform').onsubmit=e=>{e.preventDefault();if($('#question').value.trim())ask($('#question').value)};document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{$('#question').value=b.dataset.question;ask(b.dataset.question)});
$('#about').onclick=()=>showSources();$('#closeSources').onclick=()=>$('#sources').close();$('#closeQuest').onclick=()=>$('#quest').hidden=true;
cityMap.open();$('#mapLegend').hidden=false;refresh();portrait();$('#loading').hidden=true;requestAnimationFrame(render);
