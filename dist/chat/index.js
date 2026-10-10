import {getHousing} from '../data/index.js';
import {DEMO_STEPS,nearbyResidents,visibleHouses,houseScenario,dollars,speechWaves} from './model.js';

const el=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
const button=(text,className,click)=>{const node=el('button',className,text);node.type='button';node.addEventListener('click',click);return node;};
const pause=(ms,signal)=>new Promise((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('Stopped','AbortError'));const timer=setTimeout(done,ms);function done(){signal.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));}signal.addEventListener('abort',abort,{once:true});});

export function mountNeighborhoodChat({root,map,closeProfiles}){
  const style=el('link','');style.rel='stylesheet';style.href=new URL('./chat.css',import.meta.url).href;document.head.append(style);
  const shell=el('section','nc-shell');shell.setAttribute('aria-label','Neighborhood chat');shell.hidden=true;
  const eyebrow=el('div','nc-eyebrow','THE NEIGHBORHOOD HAS A VOICE');
  const heading=el('div','nc-heading');const title=el('h2','','Ask the people who live here.');
  const dismiss=button('×','nc-dismiss',()=>{stopDemo();clearReplies();shell.hidden=true;root.classList.remove('chat-open');});dismiss.setAttribute('aria-label','Close neighborhood chat');heading.append(title,dismiss);
  const sub=el('p','nc-context','Zoom into a street to meet your neighbors.');
  const form=el('form','nc-form');const input=el('input','nc-input');input.placeholder='Could you still afford to stay?';input.maxLength=600;input.required=true;input.setAttribute('aria-label','Ask this neighborhood about housing');
  const submit=el('button','nc-send','Ask neighbors ↗');submit.type='submit';form.append(input,submit);
  const prompts=el('div','nc-prompts');
  for(const [label,q] of [['Could you stay?','Could you afford to stay here if your rent went up?'],['What is hard about housing?','What is the hardest part of affording housing here?'],['What would help?','What housing change would make the biggest difference for your household?']]) prompts.append(button(label,'',()=>{input.value=q;stopDemo();void ask(q);}));
  const tools=el('div','nc-tools');const houseToggle=button('⌂ House lens','nc-lens',()=>{lens=!lens;houseToggle.setAttribute('aria-pressed',String(lens));});houseToggle.setAttribute('aria-pressed','false');
  const transcriptToggle=button('Read all replies','',()=>{transcript.hidden=!transcript.hidden;});
  const waveButton=button('Next voices →','',()=>{wave++;waveAt=performance.now();});waveButton.hidden=true;
  tools.append(houseToggle,transcriptToggle,waveButton);
  const status=el('p','nc-status','AI dialogue · fictional residents · sourced citywide context');status.setAttribute('role','status');
  shell.append(eyebrow,heading,sub,form,prompts,tools,status);
  const overlay=el('div','nc-overlay');overlay.setAttribute('aria-hidden','true');
  const transcript=el('aside','nc-transcript');transcript.hidden=true;transcript.setAttribute('aria-label','All neighborhood replies');
  const transcriptHead=el('header','nc-transcript-head');transcriptHead.append(el('b','','Voices from this block'),button('×','',()=>transcript.hidden=true));
  const transcriptBody=el('div','nc-transcript-body');transcript.append(transcriptHead,transcriptBody);
  const demo=el('section','nc-demo');demo.hidden=true;const stepLabel=el('small','nc-step');const demoTitle=el('h2','');const caption=el('p','');const progress=el('div','nc-progress');
  for(let i=0;i<4;i++)progress.append(el('i',''));
  const demoActions=el('div','nc-demo-actions');const demoNext=button('Next chapter →','',()=>void nextDemo());const demoStop=button('End story','',stopDemo);demoActions.append(demoNext,demoStop);demo.append(stepLabel,demoTitle,caption,progress,demoActions);
  const launcher=button('◌ Talk to the neighborhood','nc-launcher',()=>open());
  const demoLauncher=button('▶ Play neighborhood story','nc-demo-launcher',()=>void startDemo());
  root.append(overlay,shell,transcript,demo,launcher,demoLauncher);
  let scene=map.getScene(),selection=map.selection.get(),housing=null,lens=false,replies=[],bubbleNodes=new Map(),houseNodes=new Map();
  let request=null,version=0,history=[],wave=0,waveAt=0,housingVersion=0,region=scene.regionKey;
  let demoController=null,demoIndex=-1,demoBusy=false,originalAmbient=null;
  const waveSize=()=>scene.width<650?2:4;

  function open(){closeProfiles();shell.hidden=false;root.classList.add('chat-open');input.focus();}
  function clearReplies(){
    version++;request?.abort();request=null;replies=[];bubbleNodes.forEach(n=>n.remove());bubbleNodes.clear();waveButton.hidden=true;submit.disabled=false;submit.textContent='Ask neighbors ↗';shell.removeAttribute('aria-busy');
    delete shell.dataset.replyCount;delete shell.dataset.method;
    if(originalAmbient!==null){map.setAmbient(originalAmbient);originalAmbient=null;}
  }
  async function refreshHousing(){const id=++housingVersion;try{const next=await getHousing(selection.cityId,selection.year);if(id===housingVersion)housing=next;}catch{if(id===housingVersion)housing=null;}}
  void refreshHousing();
  map.selection.subscribe(next=>{
    if(next.cityId!==selection.cityId&&demoIndex>=0)stopDemo();
    selection=next;clearReplies();history=[];transcriptBody.replaceChildren();transcript.hidden=true;status.textContent='Context changed. Ask the neighborhood again.';void refreshHousing();
  });
  async function ask(question){
    if(!question.trim())return false;
    const people=nearbyResidents(scene);
    if(!people.length){open();status.textContent='Zoom into a street and move near residents before asking.';return false;}
    clearReplies();open();
    const token=version,controller=new AbortController();request=controller;
    originalAmbient=scene.ambient;map.setAmbient(false);
    const askedSelection=structuredClone(selection);const captured=people.map(p=>p.residentId);
    submit.disabled=true;submit.textContent='Listening…';shell.setAttribute('aria-busy','true');
    status.textContent=`Asking ${people.length} nearby residents…`;
    transcriptBody.replaceChildren();transcript.hidden=true;
    replies=captured.map(id=>({id,text:'Thinking…',name:'Neighbor',mood:'steady',pending:true}));wave=0;waveAt=performance.now();
    input.value=question;
    try{
      const response=await fetch('/api/neighborhood-chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(52000)]),body:JSON.stringify({...askedSelection,question,residentIds:captured,history})});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw Error(result?.error||'Live chat needs the DataScape server. Start the app with npm start.');
      if(token!==version)return false;
      if(result?.method!=='ai'||!Array.isArray(result.replies)||result.replies.length!==captured.length||new Set(result.replies.map(r=>r.id)).size!==captured.length||result.replies.some(r=>!captured.includes(r.id)||typeof r.text!=='string'))throw Error('The reply did not match this neighborhood. Please try again.');
      replies=result.replies;history=[...history,question].slice(-2);wave=0;waveAt=performance.now();
      status.textContent=`${replies.length} neighbors answered · ${result.cached?'Cached AI':'Live AI'} · fictional households`;
      shell.dataset.replyCount=String(replies.length);shell.dataset.method='ai';
      transcriptBody.append(el('p','nc-question',question));
      for(const reply of replies){const card=el('article',`nc-reply nc-${reply.mood}`);card.append(el('b','',reply.name),el('p','',reply.text),el('small','',`Illustrative rent ${dollars(reply.budget.rent)} · left after rent ${dollars(reply.budget.remaining)}`));transcriptBody.append(card);}
      waveButton.hidden=replies.length<=waveSize();
      return true;
    }catch(error){
      if(token===version&&!controller.signal.aborted){clearReplies();status.textContent=error.name==='TimeoutError'?'The neighborhood took too long to answer. Try again.':error.message;return false;}
      return false;
    }finally{if(token===version){request=null;submit.disabled=false;submit.textContent='Ask neighbors ↗';shell.removeAttribute('aria-busy');}}
  }
  form.addEventListener('submit',event=>{event.preventDefault();stopDemo();void ask(input.value);});

  function updateBubbles(now){
    if(replies.length&&now-waveAt>6500){wave++;waveAt=now;}
    const groups=speechWaves(replies,scene);
    const expanded=new Set(groups.length?groups[wave%groups.length]:[]);
    if(groups.length>1)waveButton.textContent=`Voices ${wave%groups.length+1}/${groups.length} →`;
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
  function updateHouses(){
    const facts=houseScenario(housing,selection.scenario);
    const targets=lens&&facts&&scene.mode==='street'?visibleHouses(scene):[];
    const ids=new Set(targets.map(h=>h.id));
    for(const [id,node] of houseNodes)if(!ids.has(id)){node.remove();houseNodes.delete(id);}
    for(const house of targets){
      let node=houseNodes.get(house.id);if(!node){node=el('div','nc-house');node.append(el('small','','CITY MEDIAN / MONTH'),el('strong',''),el('span',''));overlay.append(node);houseNodes.set(house.id,node);}
      node.style.left=`${house.x}px`;node.style.top=`${house.y-12}px`;node.classList.toggle('is-shock',facts.delta>0);
      node.querySelector('strong').textContent=dollars(facts.rent);
      node.querySelector('span').textContent=facts.delta?`${facts.delta>0?'+':'−'}${dollars(Math.abs(facts.delta))} scenario · not an asking rent`:'Census context · not an asking rent';
      const box=node.getBoundingClientRect();
      node.style.opacity=[...bubbleNodes.values()].some(b=>{if(b.hidden||!b.classList.contains('is-speaking'))return false;const r=b.getBoundingClientRect();return box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top;})?'.18':'1';
    }
  }
  const unsubscribe=map.onSceneFrame(next=>{
    scene=next;
    if(scene.mode!=='street'&&demoIndex>=0)stopDemo();
    if(region!==scene.regionKey||scene.mode!=='street'&&replies.length){region=scene.regionKey;clearReplies();history=[];}
    const count=nearbyResidents(scene).length;
    sub.textContent=scene.mode==='street'?`${housing?.geography||selection.cityId} · ${selection.year} · ${count} nearby voices`:'Zoom into a street to ask the people around you.';
    launcher.textContent=scene.mode==='street'?`◌ Ask ${count} neighbors`:'◌ Talk to the neighborhood';
    updateBubbles(performance.now());updateHouses();
  });

  function stopDemo(){if(demoController)clearReplies();demoController?.abort();demoController=null;demoIndex=-1;demoBusy=false;demo.hidden=true;demoLauncher.disabled=false;root.classList.remove('demo-playing');}
  async function startDemo(){
    stopDemo();clearReplies();closeProfiles();const controller=new AbortController();demoController=controller;
    demoLauncher.disabled=true;demo.hidden=false;root.classList.add('demo-playing');stepLabel.textContent='A DATASCAPE SHORT STORY';demoTitle.textContent='Finding our block…';caption.textContent='Loading the neighborhood. Every house sets the scene. Every household has a voice.';
    try{await map.enterDemoNeighborhood(controller.signal);if(controller.signal.aborted)return;await pause(160,controller.signal);lens=true;houseToggle.setAttribute('aria-pressed','true');open();demoIndex=-1;await nextDemo();}
    catch(error){if(!controller.signal.aborted){caption.textContent='This neighborhood could not load. Check the connection and try again.';demoLauncher.disabled=false;}}
  }
  async function nextDemo(){
    if(demoBusy||!demoController)return;
    const controller=demoController;demoIndex++;
    if(demoIndex>=DEMO_STEPS.length){stopDemo();return;}
    const step=DEMO_STEPS[demoIndex];stepLabel.textContent=`${String(demoIndex+1).padStart(2,'0')} / 04 · CAN YOU AFFORD TO STAY?`;demoTitle.textContent=step.title;caption.textContent=step.caption;
    [...progress.children].forEach((n,i)=>n.classList.toggle('active',i<=demoIndex));
    demoNext.textContent=demoIndex===3?'Explore on your own →':'Next chapter →';
    if(step.scenario)map.selection.set({scenario:step.scenario});
    if(step.question){
      demoBusy=true;demoNext.disabled=true;const success=await ask(step.question);
      if(controller.signal.aborted||controller!==demoController)return;
      demoBusy=false;demoNext.disabled=false;
      if(!success)caption.textContent='Live replies are unavailable. The house scenario and calculated budgets still work; retry from the question box.';
    }
  }
  root.dataset.neighborhoodChat='ready';
  return {ask,open,startDemo,destroy(){stopDemo();clearReplies();unsubscribe();[shell,overlay,transcript,demo,launcher,demoLauncher,style].forEach(n=>n.remove());}};
}
