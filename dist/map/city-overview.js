const SF_CENTER = [37.76,-122.435];
export function createCityOverview({ onEnter, onError, reducedMotion = false, leaflet = globalThis.L, element = document.querySelector('#cityMap'), overlay = globalThis.document?.querySelector('#mapDive'), schedule = setTimeout, unschedule = clearTimeout }) {
  let active = false, map = null, transitioning = false, handingOff = false, timers = [];
  function cancelTransition(){
    timers.forEach(unschedule);timers=[];transitioning=false;map?.stop?.();
    if(overlay)overlay.hidden=true;element.classList?.remove('zoom-handoff');if(!active)element.hidden=true;
  }
  function close(){if(handingOff){active=false;return;}cancelTransition();active=false;element.hidden=true;}
  function enter(latlng){
    if(!active||transitioning)return;
    if(reducedMotion){close();onEnter({animated:false});return;}
    transitioning=true;
    const target=latlng||map.getCenter(),finalZoom=Math.min(18,map.getZoom()+4);
    if(overlay)overlay.hidden=false;
    // One uninterrupted flight. Blend the live map into the moving street camera.
    map.flyTo(target,finalZoom,{duration:1.8,easeLinearity:.2});
    timers.push(schedule(()=>{
      active=false;handingOff=true;
      try{onEnter({animated:true,latlng:target});}finally{handingOff=false;}
      element.classList?.add('zoom-handoff');
    },1000));
    timers.push(schedule(()=>{element.hidden=true;element.classList?.remove('zoom-handoff');transitioning=false;timers=[];if(overlay)overlay.hidden=true;},1800));
  }
  function open(){
    if(!leaflet){onError();return false;}
    cancelTransition();active=true;element.hidden=false;
    if(!map){
      map=leaflet.map(element,{zoomControl:false,attributionControl:true,minZoom:11,maxZoom:18,keyboard:false,doubleClickZoom:false,zoomAnimation:!reducedMotion,fadeAnimation:!reducedMotion,maxBounds:[[37.6,-122.65],[37.95,-122.2]],maxBoundsViscosity:1});
      leaflet.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
        maxZoom:19,keepBuffer:0,updateWhenIdle:true,
        attribution:'Imagery: <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri</a>, Vantor, Earthstar Geographics, GIS User Community'
      }).on('tileerror',()=>{element.dataset.tileError='true';}).on('tileload',()=>{delete element.dataset.tileError;}).addTo(map);
      map.on('click',e=>enter(e.latlng));
      map.setView(SF_CENTER,12,{animate:false});
      new ResizeObserver(()=>{if(active)map.invalidateSize({pan:false});}).observe(element);
    }
    map.invalidateSize({pan:false});return true;
  }
  return {
    open,close,enter,cancelTransition,
    get transitioning(){return transitioning;},
    get active(){return active;},get ready(){return !!map;},
    changeZoom(delta){if(active&&!transitioning)map.setZoom(map.getZoom()+(delta>0?1:-1));},
    pan(dx,dy){if(active&&!transitioning)map.panBy([-dx,-dy],{animate:false});},
    click(){if(!active||transitioning)return false;enter();return true;},
    reset(){if(map)map.setView(SF_CENTER,12,{animate:false});},
    draw(){return active;},
  };
}
