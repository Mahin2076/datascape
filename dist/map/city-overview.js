const SF_CENTER = [37.76,-122.435];
export function createCityOverview({ onEnter, onReturn = ()=>{}, onError, reducedMotion = false, leaflet = globalThis.L, element = document.querySelector('#cityMap'), overlay = globalThis.document?.querySelector('#mapDive'), schedule = setTimeout, unschedule = clearTimeout }) {
  let active = false, map = null, transitioning = false, handingOff = false, timers = [], returning = false, lastZoom = 12;
  function cancelTransition(){
    timers.forEach(unschedule);timers=[];transitioning=true;map?.stop?.();transitioning=false;
    if(overlay)overlay.hidden=true;element.classList?.remove('zoom-handoff','zoom-return');if(returning){returning=false;active=true;onReturn();}if(!active)element.hidden=true;
  }
  function close(){if(handingOff){active=false;return;}cancelTransition();active=false;element.hidden=true;}
  function enter(latlng, fromZoom=false){
    if(!active||transitioning)return;
    if(reducedMotion){close();onEnter({animated:false});return;}
    transitioning=true;
    const target=latlng||map.getCenter(),finalZoom=18;
    const duration=fromZoom?800:1800, handoff=fromZoom?0:1000;
    if(overlay)overlay.hidden=false;
    // One uninterrupted flight. Blend the live map into the moving street camera.
    map.flyTo(target,finalZoom,{duration:duration/1000,easeLinearity:.2});
    timers.push(schedule(()=>{
      active=false;handingOff=true;
      try{onEnter({animated:true,latlng:target});}finally{handingOff=false;}
      element.classList?.add('zoom-handoff');
    },handoff));
    timers.push(schedule(()=>{element.hidden=true;element.classList?.remove('zoom-handoff');transitioning=false;timers=[];if(overlay)overlay.hidden=true;},duration));
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
      map.on('zoomend',()=>{const next=map.getZoom(),zoomingIn=next>lastZoom;lastZoom=next;if(active&&!transitioning&&zoomingIn&&next>=17)enter(map.getCenter(),true);});
      map.setView(SF_CENTER,12,{animate:false});
      new ResizeObserver(()=>{if(active)map.invalidateSize({pan:false});}).observe(element);
    }
    map.invalidateSize({pan:false});return true;
  }
  function exit(){
    if(transitioning)return;
    if(!map){open();onReturn();return;}
    if(reducedMotion){map.setView(map.getCenter(),15,{animate:false});open();onReturn();return;}
    // Keep drawing the street camera underneath until the satellite layer is opaque.
    returning=true;transitioning=true;active=false;element.hidden=false;
    element.classList?.add('zoom-return');if(overlay)overlay.hidden=false;
    map.invalidateSize({pan:false});
    map.flyTo(map.getCenter(),15,{duration:.8,easeLinearity:.2});
    timers.push(schedule(()=>{
      returning=false;transitioning=false;active=true;timers=[];
      element.classList?.remove('zoom-return');if(overlay)overlay.hidden=true;onReturn();
    },800));
  }
  return {
    open,close,enter,exit,cancelTransition,
    get transitioning(){return transitioning;},
    get active(){return active;},get ready(){return !!map;},
    changeZoom(delta){if(active&&!transitioning)map.setZoom(map.getZoom()+(delta>0?1:-1));},
    pan(dx,dy){if(active&&!transitioning)map.panBy([-dx,-dy],{animate:false});},
    click(){if(!active||transitioning)return false;enter();return true;},
    reset(){if(map)map.setView(SF_CENTER,12,{animate:false});},
    draw(){return active;},
  };
}
