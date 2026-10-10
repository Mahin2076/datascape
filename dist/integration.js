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
