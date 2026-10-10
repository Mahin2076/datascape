const SF_CENTER = [37.76,-122.435];
export function createCityOverview({ onEnter, onError, reducedMotion = false, leaflet = globalThis.L, element = document.querySelector('#cityMap') }) {
  let active = false, map = null;
  function close(){active=false;element.hidden=true;}
  function enter(latlng){if(!active)return;close();onEnter(latlng);}
  function open(){
    if(!leaflet){onError();return false;}
    active=true;element.hidden=false;
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
    open,close,enter,
    get active(){return active;},get ready(){return !!map;},
    changeZoom(delta){if(active)map.setZoom(map.getZoom()+(delta>0?1:-1));},
    pan(dx,dy){if(active)map.panBy([-dx,-dy],{animate:false});},
    click(){if(!active)return false;enter();return true;},
    reset(){if(map)map.setView(SF_CENTER,12,{animate:false});},
    draw(){return active;},
  };
}
