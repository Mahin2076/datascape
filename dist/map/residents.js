// Build continuous walkable runs; never connect across a blocked gap.
export function createWalkingRoutes(features,isBlocked){
 const routes=[];
 for(const f of features){
  if(f.type!=='road'||f.tags.foot==='no'||f.tags.access==='private'||['motorway','motorway_link','trunk','trunk_link'].includes(f.tags.highway))continue;
  let points=[];
  function finish(){
   if(points.length>1){const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
    if(distances.at(-1)>=48)routes.push({points,distances,length:distances.at(-1)});
   }points=[];
  }
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],b=f.points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4);
   for(let j=i===1?0:1;j<=steps;j++){const t=j/Math.max(1,steps),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(isBlocked(...p))finish();else points.push(p);}
  }finish();
 }return routes;
}
export function walkingPosition(route,time,speed,phase){
 const period=route.length*2,progress=((time*speed+phase)%period+period)%period,forward=progress<route.length,distance=forward?progress:period-progress;
 let lo=1,hi=route.distances.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(route.distances[mid]<distance)lo=mid+1;else hi=mid;}
 const a=route.points[lo-1],b=route.points[lo],length=route.distances[lo]-route.distances[lo-1],t=length?(distance-route.distances[lo-1])/length:0;
 const dx=(b[0]-a[0])*(forward?1:-1),dy=(b[1]-a[1])*(forward?1:-1);
 return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dir:Math.abs(dx)>Math.abs(dy)?(dx<0?1:2):(dy<0?3:0)};
}
export function assignWalkingRoutes(routes,count){
 const total=routes.reduce((sum,r)=>sum+r.length,0);if(!total)return [];
 return Array.from({length:count},(_,i)=>{
  let distance=total*(i+.5)/count,route=routes.at(-1);
  for(const r of routes){distance-=r.length;if(distance<=0){route=r;break;}}
  return {route,speed:14+(i*17%19),phase:((i*.61803398875)%1)*route.length*2};
 });
}
