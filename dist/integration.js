import {mountNeighborhood} from './neighborhood/index.js';
import { mountNeighborhoodChat } from './chat/index.js';
import { mapIntegration } from './app.js';
import { createResidentStories } from './residents/index.js';
import { profilesForSprites } from './residents/map-profiles.js';
import { getHousing, calculateBudget } from './data/index.js';

const root=document.querySelector('#game');
const profiles=profilesForSprites(mapIntegration.getResidents());
const stories=createResidentStories({root,data:{getHousing,calculateBudget},residents:profiles,
  initialSelection:mapIntegration.selection.get(),
  onSelectionChange:selection=>mapIntegration.selection.set(selection)});
const yearSelect=document.querySelector('#housingYear');
const people=document.querySelector('#residentPicker');
function sync(selection) {
  stories.setSelection(selection);
  yearSelect.value=String(selection.year);
  people.replaceChildren(new Option('Meet a resident…',''));
  profiles.filter(p=>p.cityId===selection.cityId).sort((a,b)=>Number(a.id.split('-').at(-1))-Number(b.id.split('-').at(-1))).slice(0,4).forEach(p=>people.add(new Option(p.name,p.id)));
}
mapIntegration.selection.subscribe(sync);
mapIntegration.onResidentSelect(id=>{
  document.querySelector('#inspection').hidden=true;
  document.querySelector('#answer').hidden=true;
  stories.onResidentSelect(id);
});
yearSelect.addEventListener('change',()=>mapIntegration.selection.set({year:Number(yearSelect.value)}));
people.addEventListener('change',()=>{if(people.value)stories.onResidentSelect(people.value);});
document.querySelector('#cityView').addEventListener('click',()=>stories.close());
document.querySelector('#compareView').addEventListener('click',()=>stories.close());
sync(mapIntegration.selection.get());
root.dataset.storiesReady='true';

// Keep secondary exploration controls available without crowding the map.
const explore=document.createElement('details');explore.className='explore-menu';
const summary=document.createElement('summary');summary.textContent='Explore';
const options=document.createElement('div');options.className='explore-options';
explore.append(summary,options);
for(const selector of ['#mapNavigation','#mapToggle','#about','.zoom','#askToggle'])options.append(document.querySelector(selector));
document.querySelector('.header-actions').append(explore);
options.querySelector('#askToggle').textContent='Compare housing data';
options.querySelector('#about').textContent='Data & sources';
for(const select of options.querySelectorAll('select')){const label=document.createElement('label');label.textContent=select.getAttribute('aria-label');select.before(label);label.append(select);}
options.addEventListener('click',event=>{if(event.target.closest('button')&&!event.target.closest('.zoom'))explore.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')explore.open=false;});
document.addEventListener('pointerdown',event=>{if(!explore.contains(event.target))explore.open=false;});

mountNeighborhoodChat({root,map:mapIntegration,closeProfiles:()=>stories.close()});

mountNeighborhood({root,map:mapIntegration});
