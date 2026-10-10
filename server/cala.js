const cache=new Map();
export async function researchNeighborhood(question,{signal,fetcher=fetch,key=process.env.CALA_API_KEY}={}){
 if(!key)return {status:'unavailable',sources:[],content:''};
 const query=`Rincon Hill, San Francisco, near The Infinity at 318 Spear Street. Housing research question: ${question.slice(0,600)}. Include source references. Do not guess individual unit prices if unavailable.`;
 const cached=cache.get(query);if(cached&&Date.now()-cached.at<900000)return {...cached.value,cached:true};
 try{
  const response=await fetcher('https://api.cala.ai/v1/knowledge/search',{method:'POST',headers:{'Content-Type':'application/json','X-API-KEY':key},body:JSON.stringify({input:query,explainability:false,return_entities:false}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});
  if(!response.ok)return {status:'unavailable',sources:[],content:'',reason:`Cala HTTP ${response.status}`};
  const body=await response.json(),sources=[];
  function collect(value){if(!value||typeof value!=='object')return;if(typeof value.url==='string'){try{const u=new URL(value.url);if(u.protocol==='https:'&&!sources.some(s=>s.url===u.href))sources.push({url:u.href,title:String(value.name||u.hostname).slice(0,180)});}catch{}}for(const v of Object.values(value))if(typeof v==='object')Array.isArray(v)?v.forEach(collect):collect(v);}
  collect(body.context);
  const content=typeof body.content==='string'?body.content.slice(0,8000):'';
  const value={status:content&&sources.length?'available':'no-sources',content,sources:sources.slice(0,8),retrievedAt:new Date().toISOString()};
  cache.set(query,{at:Date.now(),value});while(cache.size>40)cache.delete(cache.keys().next().value);return value;
 }catch(error){if(signal?.aborted)throw error;return {status:'unavailable',sources:[],content:'',reason:'Cala request unavailable'};}
}
