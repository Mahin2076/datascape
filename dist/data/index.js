// Sourced city medians and pure household arithmetic. No generated observations.
const finite = n => typeof n === 'number' && Number.isFinite(n);
const validPct = n => finite(n) && n >= -100;
const emptyBudget = status => ({status, monthlyIncome:null, adjustedRent:null, remainingAfterRent:null, rentToIncomeRatio:null});

export function calculateBudget({monthlyRent, annualIncome, rentChangePct=0, incomeChangePct=0}={}) {
  if (!validPct(rentChangePct) || !validPct(incomeChangePct)) return emptyBudget('invalid');
  if (!finite(monthlyRent) || monthlyRent < 0) return emptyBudget('rent_unavailable');
  const adjustedRent = monthlyRent * (1 + rentChangePct / 100);
  if (!finite(adjustedRent)) return emptyBudget('invalid');
  if (!finite(annualIncome) || annualIncome <= 0) return {...emptyBudget('income_unavailable'), adjustedRent};
  const monthlyIncome = annualIncome * (1 + incomeChangePct / 100) / 12;
  if (monthlyIncome <= 0) return {...emptyBudget('income_unavailable'), adjustedRent};
  const remainingAfterRent = monthlyIncome - adjustedRent;
  const rentToIncomeRatio = adjustedRent / monthlyIncome;
  if (![monthlyIncome, remainingAfterRent, rentToIncomeRatio].every(finite)) return emptyBudget('invalid');
  return {status:'ok', monthlyIncome, adjustedRent, remainingAfterRent, rentToIncomeRatio};
}

export function createHousingData(db) {
  const snapshot = structuredClone(db);
  function getHousing(cityId, year) {
    const city = snapshot.cities.find(c => c.id === cityId);
    const row = city?.data.find(d => d.year === year);
    if (!row) return null;
    const sources = [['b25064','B25064 rent'],['b19013','B19013 income']].map(([key,label]) => ({label,url:row.sources?.[key]}));
    if (!sources.every(s => {try {const u=new URL(s.url);return u.protocol==='https:' && (u.hostname==='census.gov'||u.hostname.endsWith('.census.gov'));}catch{return false;}})) return null;
    if (![row.rent,row.income].every(n => finite(n) && n > 0)) return null;
    return {cityId,cityName:city.name,year,monthlyRent:row.rent,annualIncome:row.income,
      rentMoe:row.rentMoe,incomeMoe:row.incomeMoe,geoid:city.geoid,
      geography:`${city.name}, ${city.state} (city/place)`,period:row.period,
      evidenceClass:'sourced_observation',dataset:snapshot.dataset,sources,
      caveats:[...snapshot.notes]};
  }
  function getTimeline(cityId) {return snapshot.years.map(year=>getHousing(cityId,year)).filter(Boolean);}
  function compareCities(year, {baseYear=snapshot.years[0],sortBy='gap'}={}) {
    if (!['gap','rentGrowth','incomeGrowth','monthlyRent','rentToIncomeRatio'].includes(sortBy)) throw new RangeError('Unsupported comparison');
    if (year < baseYear) return [];
    const rows=snapshot.cities.flatMap(c=>{
      const current=getHousing(c.id,year),base=getHousing(c.id,baseYear);
      if (!current||!base) return [];
      const rentGrowth=current.monthlyRent/base.monthlyRent-1, incomeGrowth=current.annualIncome/base.annualIncome-1;
      return [{...current,baseYear,rentGrowth,incomeGrowth,gap:rentGrowth-incomeGrowth,
        rentToIncomeRatio:12*current.monthlyRent/current.annualIncome}];
    });
    const direction=['monthlyRent','rentToIncomeRatio'].includes(sortBy)?1:-1;
    return rows.sort((a,b)=>direction*(a[sortBy]-b[sortBy])||a.cityId.localeCompare(b.cityId));
  }
  return Object.freeze({getHousing,getTimeline,compareCities,calculateBudget});
}

let pending;
async function load() {
  pending ??= fetch(new URL('../assets/data.json',import.meta.url)).then(r=>{
    if (!r.ok) throw new Error('Housing data unavailable');
    return r.json();
  }).then(createHousingData).catch(error=>{pending=null;throw error;});
  return pending;
}
export const getHousing = async (cityId,year) => (await load()).getHousing(cityId,year);
export const getTimeline = async cityId => (await load()).getTimeline(cityId);
export const compareCities = async (year,options) => (await load()).compareCities(year,options);
