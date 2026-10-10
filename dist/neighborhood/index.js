import {NEIGHBORHOOD} from './data.js';
export function mountNeighborhood({root,map}){
 const label=document.createElement('div');label.className='rh-location';label.innerHTML='<b>Rincon Hill</b><span>318 Spear St · waterfront district</span>';root.append(label);
 const card=document.createElement('article');card.className='rh-property';card.hidden=true;card.setAttribute('aria-label','Nearby property');root.append(card);
 const hint=document.createElement('p');hint.className='rh-hint';hint.textContent='Walk with arrow keys or tap a street · Approach a home to reveal it';root.append(hint);
 let active=null;
 map.onSceneFrame(scene=>{
  const street=scene.mode==='street';label.hidden=!street;hint.hidden=!street;
  const candidates=scene.buildings.filter(b=>b.distance<230&&b.x>20&&b.x<scene.width-20&&b.y>60&&b.y<scene.height-165).sort((a,b)=>a.distance-b.distance);
  let nearest=candidates[0];const previous=candidates.find(b=>b.id===active);if(previous&&nearest&&previous.distance<nearest.distance+30)nearest=previous;
  card.hidden=!street||!nearest;root.dataset.activeProperty=nearest?.id||'';
  if(card.hidden){active=null;return;}
  const p=nearest.property;
  if(active!==nearest.id){active=nearest.id;card.replaceChildren();
   for(const [tag,cls,text] of [['small','rh-kicker','ILLUSTRATIVE PROPERTY · RINCON HILL'],['h2','',p.name],['strong','rh-price',`$${p.price.toLocaleString()} `],['p','rh-spec',`${p.beds||'Studio'}${p.beds?' bed':''} · ${p.baths} bath · ${p.sqft.toLocaleString()} sq ft`],['p','rh-rent',`Rent $${p.rent.toLocaleString()}/mo · HOA $${p.hoa}/mo`],['p','rh-feature',p.feature],['small','rh-disclosure','Demo property · simulated price']]){const el=document.createElement(tag);el.className=cls;el.textContent=text;card.append(el);}
  }
  const x=Math.max(135,Math.min(scene.width-135,nearest.x));const y=Math.max(75,Math.min(scene.height-385,nearest.y-190));card.style.left=x+'px';card.style.top=y+'px';card.style.setProperty('--beam',Math.max(20,nearest.y-y-165)+'px');card.dataset.propertyId=nearest.id;
 });
 document.addEventListener('rincon-inspect',event=>{active=null;map.walkToBuilding(event.detail);});
}
