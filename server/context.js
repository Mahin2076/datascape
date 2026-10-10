import {readFile} from 'node:fs/promises';
import {createHousingData,calculateBudget} from '../dist/data/index.js';
import {RESIDENTS} from '../dist/residents/fixtures.js';
import {resolveHousehold,computeBudgets} from '../dist/residents/budget.js';

const data=createHousingData(JSON.parse(await readFile(new URL('../dist/assets/data.json',import.meta.url),'utf8')));
export class InputError extends Error {}
export function buildContext(input) {
  if(!input||typeof input!=='object') throw new InputError('Send a housing question.');
  const {cityId,year,question,residentIds,scenario={}}=input;
  if(typeof question!=='string'||!question.trim()||question.length>600) throw new InputError('Use a question of 1–600 characters.');
  if(!Array.isArray(residentIds)||!residentIds.length||residentIds.length>110||new Set(residentIds).size!==residentIds.length) throw new InputError('Select nearby residents first.');
  const housing=data.getHousing(cityId,year);
  if(!housing) throw new InputError('Choose an available city and estimate year.');
  if(!scenario||typeof scenario!=='object'||Array.isArray(scenario))throw new InputError('Choose a valid scenario.');
  const {rentChangePct=0,incomeChangePct=0}=scenario;
  if(![rentChangePct,incomeChangePct].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=-50&&n<=100&&Number.isInteger(n))) throw new InputError('Scenario changes must be whole percentages from −50 to +100.');
  const templates=RESIDENTS.filter(r=>r.cityId===cityId);
  const residents=residentIds.map(id=>{
    const match=typeof id==='string'&&id.match(new RegExp(`^${cityId}-resident-([1-9]\\d*)$`));
    const ordinal=match?Number(match[1]):0;
    if(!ordinal||ordinal>(cityId==='sf'?110:55)) throw new InputError('Resident does not belong to this city.');
    const resident=templates[(ordinal-1)%templates.length];
    const household=resolveHousehold(resident,housing);
    const budgets=computeBudgets(household,{rentChangePct,incomeChangePct},calculateBudget);
    return {id,name:resident.name,occupation:resident.occupation,household:resident.household.description,
      voice:resident.voice,roots:resident.traits.roots,essentialsMonthly:resident.essentialsMonthly,
      assumptions:{rent:resident.rent,income:resident.income},before:budgets.before,after:budgets.after,delta:budgets.delta};
  });
  const history=Array.isArray(input.history)?input.history.slice(-2).filter(q=>typeof q==='string').map(q=>q.slice(0,600)):[];
  return {question:question.trim(),history,cityId,year,scenario:{rentChangePct,incomeChangePct},housing,residents};
}

export function validateReplies(output,context) {
  if(!output||!Array.isArray(output.replies)||output.replies.length!==context.residents.length) throw new Error('Incomplete resident response');
  const ids=new Set();
  for(const reply of output.replies) {
    if(!context.residents.some(r=>r.id===reply.id)||ids.has(reply.id)) throw new Error('Unexpected resident response');
    ids.add(reply.id);
    if(typeof reply.text!=='string'||!reply.text.trim()||reply.text.length>240||!['concerned','hopeful','steady'].includes(reply.mood)) throw new Error('Invalid resident response');
  }
  return context.residents.map(r=>({...output.replies.find(reply=>reply.id===r.id),name:r.name,
    budget:{rent:r.after.adjustedRent,remaining:r.after.remainingAfterRent,delta:r.delta.remaining}}));
}
