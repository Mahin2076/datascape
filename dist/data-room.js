import {locations} from './neighborhood/locations.js';
import {propertyForBuilding} from './neighborhood/data.js';
const $=s=>document.querySelector(s),money=n=>'$'+n.toLocaleString('en-US'),number=n=>n.toLocaleString('en-US');
const svg=(tag,attrs={},text)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;};
try{
 const [db,features]=await Promise.all(['assets/data.json','assets/rincon-map.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Data unavailable');return r.json();}));
 const sf=db.cities.find(c=>c.id==='sf');
 for(const d of sf.data)$('#year').add(new Option(d.year,d.year));$('#year').value=String(sf.data.at(-1).year);
 function renderYear(){const d=sf.data.find(d=>d.year===Number($('#year').value));$('#metrics').replaceChildren();
  for(const [label,value,detail]of [['Median gross rent',money(d.rent),'per month · ±'+money(d.rentMoe)+' MOE'],['Median household income',money(d.income),'per year · ±'+money(d.incomeMoe)+' MOE'],['Population',number(d.population),'people · citywide estimate'],['Housing units',number(d.housingUnits),'total · '+number(d.vacantUnits)+' vacant']]){const el=document.createElement('article');el.className='metric';for(const [tag,text]of [['small',label],['strong',value],['span',detail]]){const n=document.createElement(tag);n.textContent=text;el.append(n);}$('#metrics').append(el);}
  $('#period').textContent=`ACS ${d.period} · five-year estimates · GEOID ${sf.geoid} · MOE: margin of error`;
  $('#census-links').replaceChildren();for(const [key,label]of [['b25064','Rent source'],['b19013','Income source'],['b01003','Population'],['b25002','Housing']]){const a=document.createElement('a');a.textContent=label+' ↗';a.href=d.sources[key];a.target='_blank';a.rel='noreferrer';$('#census-links').append(a);}
  const chart=$('#trend');chart.replaceChildren();const x=i=>50+i*175,y=v=>193-v*8;
  for(const v of [0,5,10,15,20]){chart.append(svg('line',{x1:45,y1:y(v),x2:592,y2:y(v),stroke:'#cbd2c3','stroke-dasharray':'3 5'}),svg('text',{x:5,y:y(v)+4,fill:'#6c7769','font-size':10},v+'%'));}
  for(const [key,color]of [['rent','#ab6b40'],['income','#497365']]){const values=sf.data.map(r=>(r[key]/sf.data[0][key]-1)*100);chart.append(svg('polyline',{points:values.map((v,i)=>`${x(i)},${y(v)}`).join(' '),fill:'none',stroke:color,'stroke-width':3}));values.forEach((v,i)=>{const c=svg('circle',{cx:x(i),cy:y(v),r:sf.data[i].year===d.year?6:3,fill:color,stroke:'#eaece1','stroke-width':2});c.append(svg('title',{},`${sf.data[i].year} ${key}: ${v.toFixed(1)}%`));chart.append(c);});chart.append(svg('text',{x:x(3)+10,y:y(values[3])+(key==='rent'?-6:15),fill:color,'font-size':11},'+'+values[3].toFixed(1)+'%'));}
  sf.data.forEach((r,i)=>chart.append(svg('text',{x:x(i),y:225,'text-anchor':'middle',fill:'#6c7769','font-size':11},r.year)));
  $('#trend-summary').textContent=`${d.year} vs 2021: rent +${((d.rent/sf.data[0].rent-1)*100).toFixed(1)}% · income +${((d.income/sf.data[0].income-1)*100).toFixed(1)}%`;
 }$('#year').addEventListener('change',renderYear);renderYear();
 const map=$('#blueprint'),xy=p=>[(p[0]+122.396)*50000,430-(p[1]-37.785)*53750];
 const line=points=>points.map(p=>xy(p).join(',')).join(' ');
 for(const f of [...features].sort((a,b)=>(a.type==='water'?-1:1)-(b.type==='water'?-1:1))){if(!['water','road','building','park'].includes(f.type))continue;map.append(svg(f.type==='road'?'polyline':'polygon',{points:line(f.points),fill:f.type==='road'?'none':f.type==='water'?'#345d60':f.type==='park'?'#35523d':'#a8bc8e',stroke:f.type==='road'?'#829481':'none','stroke-width':f.type==='road'?1:0,opacity:f.type==='building'?.85:1}));}
 map.append(svg('text',{x:435,y:80,fill:'#8db5b3','font-size':11,'letter-spacing':3,transform:'rotate(-28 435 80)'},'SAN FRANCISCO BAY'));
 $('#map-count').textContent=number(features.filter(f=>f.type==='building').length)+' mapped building records';
 const records=Object.entries(locations).sort((a,b)=>a[1].name.localeCompare(b[1].name));let limit=12;
 function renderRows(){const q=$('#search').value.toLowerCase().trim(),filtered=records.filter(([,p])=>(p.name+' '+p.address).toLowerCase().includes(q));$('#rows').replaceChildren();for(const [id,p]of filtered.slice(0,limit)){const tr=document.createElement('tr');for(const text of [p.name,p.address,money(propertyForBuilding(id).price)]){const td=document.createElement('td');td.textContent=text;tr.append(td);}const td=document.createElement('td'),a=document.createElement('a');a.href=p.sourceUrl;a.textContent='OSM ↗';a.setAttribute('aria-label','OpenStreetMap record for '+p.name);a.target='_blank';a.rel='noreferrer';td.append(a);tr.append(td);$('#rows').append(tr);}$('#record-count').textContent=`${Math.min(limit,filtered.length)} of ${filtered.length} buildings${q?' matching your search':''}`;$('#more').hidden=limit>=filtered.length;$('#empty').hidden=filtered.length>0;}
 $('#search').addEventListener('input',()=>{limit=12;renderRows();});$('#more').addEventListener('click',()=>{limit+=24;renderRows();});renderRows();
 document.body.dataset.ready='true';
}catch(e){$('#error').hidden=false;console.error('Data room failed to load',e);}
