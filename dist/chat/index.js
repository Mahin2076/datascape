import {getHousing} from '../data/index.js';
import {nearbyResidents,dollars,speechWaves} from './model.js';

const el=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
const button=(text,className,click)=>{const node=el('button',className,text);node.type='button';node.addEventListener('click',click);return node;};


export function mountNeighborhoodChat({root,map,closeProfiles}){
  const style=el('link','');style.rel='stylesheet';style.href=new URL('./chat.css',import.meta.url).href;document.head.append(style);
  const shell=el('section','nc-shell');shell.setAttribute('aria-label','Neighborhood chat');shell.hidden=false;
  const heading=el('div','nc-heading');const title=el('h2','','Ask the neighborhood');
  heading.append(title);
  const sub=el('p','nc-context','Zoom into a street to meet your neighbors.');
  const form=el('form','nc-form');const input=el('input','nc-input');input.placeholder='What’s it like to afford a home here?';input.maxLength=600;input.required=true;input.setAttribute('aria-label','Ask this neighborhood about housing');
  const submit=el('button','nc-send','Ask neighbors');submit.type='submit';form.append(input,submit);
  const tools=el('div','nc-tools');
  const transcriptToggle=button('Read all replies','',()=>{transcript.hidden=!transcript.hidden;});
  transcriptToggle.hidden=true;tools.append(transcriptToggle);
  const status=el('p','nc-status','AI dialogue · fictional residents · sourced citywide context');status.setAttribute('role','status');
  shell.append(heading,sub,form,tools,status);
  const overlay=el('div','nc-overlay');overlay.setAttribute('aria-hidden','true');
  const transcript=el('aside','nc-transcript');transcript.hidden=true;transcript.setAttribute('aria-label','All neighborhood replies');
  const transcriptHead=el('header','nc-transcript-head');transcriptHead.append(el('b','','Voices from this block'),button('Close','',()=>transcript.hidden=true));
  const transcriptBody=el('div','nc-transcript-body');transcript.append(transcriptHead,transcriptBody);
  root.append(overlay,shell,transcript);root.classList.add('chat-open');
  let scene=map.getScene(),selection=map.selection.get(),housing=null,replies=[],bubbleNodes=new Map();
  let request=null,version=0,history=[],wave=0,waveAt=0,housingVersion=0,region=scene.regionKey;

  function open(){closeProfiles();shell.hidden=false;root.classList.add('chat-open');input.focus();}
  function clearReplies(){
    version++;request?.abort();request=null;replies=[];bubbleNodes.forEach(n=>n.remove());bubbleNodes.clear();transcriptToggle.hidden=true;submit.disabled=false;submit.textContent='Ask neighbors';shell.removeAttribute('aria-busy');
    delete shell.dataset.replyCount;delete shell.dataset.method;
  }
  async function refreshHousing(){const id=++housingVersion;try{const next=await getHousing(selection.cityId,selection.year);if(id===housingVersion)housing=next;}catch{if(id===housingVersion)housing=null;}}
  void refreshHousing();
  map.selection.subscribe(next=>{
    selection=next;clearReplies();history=[];transcriptBody.replaceChildren();transcript.hidden=true;status.textContent='Context changed. Ask the neighborhood again.';void refreshHousing();
  });
  async function ask(question){
    if(!question.trim())return false;
    if(scene.mode!=='street'){
      submit.disabled=true;submit.textContent='Opening…';status.textContent='Opening the neighborhood at the center of your map…';
      const city=selection.cityId;map.enterNeighborhood();
      const started=performance.now();
      while(scene.mode!=='street'&&selection.cityId===city&&performance.now()-started<15000)await new Promise(resolve=>setTimeout(resolve,100));
      submit.disabled=false;submit.textContent='Ask neighbors';
      if(selection.cityId!==city){status.textContent='City changed. Ask your question again.';return false;}
      if(scene.mode!=='street'){status.textContent='Choose a street on the map, then ask again.';return false;}
    }
    const people=nearbyResidents(scene);
    if(!people.length){open();status.textContent='Zoom into a street and move near residents before asking.';return false;}
    clearReplies();open();
    const token=version,controller=new AbortController();request=controller;
    const askedSelection=structuredClone(selection);const captured=people.map(p=>p.residentId);
    submit.disabled=true;submit.textContent='Listening…';shell.setAttribute('aria-busy','true');
    status.textContent=`Asking ${people.length} nearby residents…`;
    transcriptBody.replaceChildren();transcript.hidden=true;
    replies=captured.map(id=>({id,text:'Thinking…',name:'Neighbor',mood:'steady',pending:true}));wave=0;waveAt=performance.now();
    input.value=question;
    try{
      const payload=JSON.stringify({...askedSelection,question,residentIds:captured,history,neighborhoodId:'rincon-hill',propertyIds:scene.buildings.filter(b=>b.distance<350).map(b=>b.id).slice(0,16),activePropertyId:root.dataset.activeProperty||null});
      const researchPromise=fetch('/api/neighborhood-research',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:payload}).then(r=>r.ok?r.json():null).catch(()=>null);
      const response=await fetch('/api/neighborhood-chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)]),body:payload});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw Error(result?.error||'Live chat needs the DataScape server. Start the app with npm start.');
      if(token!==version)return false;
      if(result?.method!=='ai'||!Array.isArray(result.replies)||result.replies.length!==captured.length||new Set(result.replies.map(r=>r.id)).size!==captured.length||result.replies.some(r=>!captured.includes(r.id)||typeof r.text!=='string'))throw Error('The reply did not match this neighborhood. Please try again.');
      replies=result.replies;history=[...history,question].slice(-2);wave=0;waveAt=performance.now();
      status.textContent=`${replies.length} neighbors answered · ${result.cached?'Cached AI':'Live AI'} · fictional households`;
      shell.dataset.replyCount=String(replies.length);shell.dataset.method='ai';
      transcriptBody.append(el('p','nc-question',question));
      for(const reply of replies){const card=el('article',`nc-reply nc-${reply.mood}`);card.append(el('b','',reply.name),el('p','',reply.text),el('small','',`Illustrative rent ${dollars(reply.budget.rent)} · left after rent ${dollars(reply.budget.remaining)}`));transcriptBody.append(card);}
      const note=el('article','nc-reply nc-research');note.append(el('b','','Cala neighborhood research'),el('p','','Sources are loading separately. Residents have already answered.'));transcriptBody.append(note);
      void researchPromise.then(research=>{
        if(token!==version)return;
        note.replaceChildren(el('b','','Cala neighborhood research'),el('p','',research?.status==='available'?research.content:'No sourced Cala result is available for this question. Property examples remain simulated.'));
        for(const source of research?.sources||[]){try{const url=new URL(source.url);if(url.protocol!=='https:')continue;const a=el('a','',source.title);a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';note.append(a,el('br',''));}catch{}}
      });
      transcriptToggle.hidden=false;
      return true;
    }catch(error){
      if(token===version&&!controller.signal.aborted){clearReplies();status.textContent=error.name==='TimeoutError'?'The neighborhood took too long to answer. Try again.':error.message;return false;}
      return false;
    }finally{if(token===version){submit.disabled=false;submit.textContent='Ask neighbors';shell.removeAttribute('aria-busy');}}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void ask(input.value);});

  function updateBubbles(now){
    if(replies.length&&now-waveAt>6500){wave++;waveAt=now;}
    const groups=speechWaves(replies,scene);
    const expanded=new Set(groups.length?groups[wave%groups.length]:[]);
    const positions=new Map(scene.residents.map(r=>[r.residentId,r]));
    for(const reply of replies){
      let node=bubbleNodes.get(reply.id);
      if(!node){node=el('div','nc-bubble');node.append(el('b',''),el('p',''));overlay.append(node);bubbleNodes.set(reply.id,node);}
      const point=positions.get(reply.id);const show=point&&point.x>10&&point.x<scene.width-10&&point.y>95&&point.y<scene.height-100&&scene.mode==='street';
      node.hidden=!show;if(!show)continue;
      const full=expanded.has(reply.id);
      node.className=`nc-bubble nc-${reply.mood} ${full?'is-speaking':'is-waiting'} ${reply.pending?'is-thinking':''}`;
      const half=full?(scene.width<650?73:93):35;
      const bubbleX=Math.max(half+5,Math.min(scene.width-half-5,point.x));
      node.style.left=`${bubbleX}px`;node.style.top=`${point.y-18}px`;node.style.setProperty('--tail-shift',`${point.x-bubbleX}px`);
      node.querySelector('b').textContent=reply.pending?'•••':reply.name;
      node.querySelector('p').textContent=full?reply.text:'···';
      node.dataset.residentId=reply.id;
    }
  }
  const unsubscribe=map.onSceneFrame(next=>{
    scene=next;
    if(region!==scene.regionKey||scene.mode!=='street'&&replies.length){region=scene.regionKey;clearReplies();history=[];}
    const count=nearbyResidents(scene).length;
    sub.textContent=scene.mode==='street'?`Rincon Hill · ${count} nearby voices`:'Ask a housing question. We’ll open this area and hear from nearby residents.';
    updateBubbles(performance.now());
  });

  root.dataset.neighborhoodChat='ready';
  return {ask,open,destroy(){clearReplies();unsubscribe();[shell,overlay,transcript,style].forEach(n=>n.remove());}};
}
