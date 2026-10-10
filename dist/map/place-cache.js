const NAME='datascape-places-v1',MAX_AGE=24*60*60*1000;
export const covers=(outer,inner)=>inner[0]>=outer[0]&&inner[1]>=outer[1]&&inner[2]<=outer[2]&&inner[3]<=outer[3];
export function createPlaceCache(storage=globalThis.caches){
 return {
  async read(bounds){try{
   if(!storage)return null;const cache=await storage.open(NAME);
   for(const key of await cache.keys()){
    const box=JSON.parse(new URL(key.url).searchParams.get('bounds'));if(!box||!covers(box,bounds))continue;
    const response=await cache.match(key);if(Date.now()-Number(response.headers.get('x-saved-at'))>MAX_AGE){await cache.delete(key);continue;}
    return {bounds:box,features:await response.json()};
   }
  }catch{/* Storage denial/corruption must not prevent a normal fetch. */}return null;},
  async write(entry){try{
   if(!storage)return;const cache=await storage.open(NAME),url=new URL('map/place-cache',globalThis.location.href);
   url.searchParams.set('bounds',JSON.stringify(entry.bounds));
   await cache.put(url.href,new Response(JSON.stringify(entry.features),{headers:{'content-type':'application/json','x-saved-at':String(Date.now())}}));
   const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-8)))await cache.delete(key);
  }catch{/* Cache quota failures are nonfatal. */}}
 };
}
