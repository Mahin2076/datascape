export const DEMO_STEPS=[
  {title:'Every window. A different story.',caption:'One neighborhood, many fictional household budgets. The house labels show the city median, not asking rents.',scenario:{rentChangePct:0,incomeChangePct:0}},
  {title:'Then the rent goes up.',caption:'A 10% rent shock. Ask the people on this block what they would have to change.',scenario:{rentChangePct:10,incomeChangePct:0},question:'If rent rose 10% here, what would you have to change in your life to stay?'},
  {title:'Does a raise close the gap?',caption:'Keep rent up 10%, add income +5%, and listen to how the same households respond.',scenario:{rentChangePct:10,incomeChangePct:5},question:'With rent up 10% and income up 5%, does that give you enough room to stay here? What still worries you?'},
  {title:'A city is more than its median.',caption:'Census gives us the context. Calculated budgets show the trade-offs. AI gives these fictional households a voice.'},
];
export function nearbyResidents(scene){
  if(scene.mode!=='street')return [];
  return scene.residents.filter(r=>r.distance<=340&&r.x>12&&r.x<scene.width-12&&r.y>120&&r.y<scene.height-155).sort((a,b)=>a.distance-b.distance);
}
export function visibleHouses(scene){
  const chosen=[],width=scene.width<650?150:195;
  for(const house of scene.buildings.filter(b=>b.x>width/2&&b.x<scene.width-width/2&&b.y>160&&b.y<scene.height-250).sort((a,b)=>a.distance-b.distance)){
    if(chosen.every(other=>Math.abs(other.x-house.x)>width||Math.abs(other.y-house.y)>110))chosen.push(house);
    if(chosen.length===(scene.width<650?2:4))break;
  }
  return chosen;
}
export function houseScenario(housing,scenario){
  if(!housing)return null;
  const base=Math.round(housing.monthlyRent),rent=Math.round(housing.monthlyRent*(1+scenario.rentChangePct/100));
  return {base,rent,delta:rent-base};
}
export const dollars=n=>'$'+Math.round(n).toLocaleString('en-US');

// Partition all replies into readable waves without overlapping full speech boxes.
export function speechWaves(replies,scene){
  const points=new Map(scene.residents.map(r=>[r.residentId,r]));
  const groups=[];const limit=scene.width<650?2:4;
  const width=scene.width<650?155:200;
  const half=scene.width<650?73:93;
  const screenX=x=>Math.max(half+5,Math.min(scene.width-half-5,x));
  for(const reply of replies){
    const point=points.get(reply.id);let group=groups.find(g=>g.length<limit&&g.every(id=>{
      const other=points.get(id);return !point||!other||Math.abs(screenX(point.x)-screenX(other.x))>width||Math.abs(point.y-other.y)>165;
    }));
    if(!group){group=[];groups.push(group);}group.push(reply.id);
  }
  return groups;
}
