import gsap from 'gsap';

import {createJourney} from './core/journey.js';

import {createCampusViewer,SHOTS} from './core/campus-viewer.js';

const $=s=>document.querySelector(s),abort=new AbortController(),{signal}=abort;

let campus,journey,free=false,rotate=false,night=true,lastScroll=0,lastFocus;

const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function openDialog(selector){const el=$(selector);el.showModal();if(!reduced())gsap.fromTo(el,{y:18,opacity:0},{y:0,opacity:1,duration:.35,ease:'power3.out'});}

$('#models-button').addEventListener('click',()=>openDialog('#models-dialog'),{signal});

$('#about-button').addEventListener('click',()=>openDialog('#about-dialog'),{signal});

document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close-dialog').addEventListener('click',()=>d.close(),{signal});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}},{signal});});

function goTo(index){if(free)setFree(false);journey?.goTo(Number(index));}

document.querySelectorAll('[data-chapter]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();goTo(el.dataset.chapter);},{signal}));

function setFree(value){

 if(!campus)return;free=value;campus.setFree(value);$('#experience').classList.toggle('free-mode',value);$('#orbit-panel').hidden=!value;$('#orbit-button').textContent=value?'Kembali ke perjalanan ↓':'Eksplorasi bebas ↗';

 if(value){night=campus.state.night>=.5;$('#night-orbit').setAttribute('aria-pressed',String(night));$('#night-orbit').textContent=night?'Siang':'Malam';lastScroll=scrollY;lastFocus=document.activeElement;document.body.style.overflow='hidden';$('#narratives').inert=true;$('#chapter-navigation').inert=true;$('#webgl').tabIndex=0;$('#webgl').focus();}

 else{document.body.style.overflow='';window.scrollTo(0,lastScroll);$('#narratives').inert=false;$('#chapter-navigation').inert=false;$('#webgl').removeAttribute('tabindex');rotate=false;night=false;campus.setNight(null);$('#rotate-orbit').setAttribute('aria-pressed','false');$('#night-orbit').setAttribute('aria-pressed','false');$('#night-orbit').textContent='Malam';lastFocus?.focus();}

}

$('#orbit-button').addEventListener('click',()=>setFree(!free),{signal});$('#exit-orbit').addEventListener('click',()=>setFree(false),{signal});

$('#plan-view').addEventListener('click',()=>{campus?.viewPlan();rotate=false;$('#rotate-orbit').setAttribute('aria-pressed','false');},{signal});

$('#zoom-in').addEventListener('click',()=>campus?.zoom(.85),{signal});$('#zoom-out').addEventListener('click',()=>campus?.zoom(1.18),{signal});$('#reset-orbit').addEventListener('click',()=>{campus?.reset();rotate=false;$('#rotate-orbit').setAttribute('aria-pressed','false');},{signal});

$('#rotate-orbit').addEventListener('click',()=>{rotate=!rotate;campus?.setAutoRotate(rotate);$('#rotate-orbit').setAttribute('aria-pressed',String(rotate));},{signal});

$('#night-orbit').addEventListener('click',()=>{night=!night;campus?.setNight(night?1:0);$('#night-orbit').setAttribute('aria-pressed',String(night));$('#night-orbit').textContent=night?'Siang':'Malam';},{signal});

window.addEventListener('keydown',e=>{if(e.key==='Escape'&&free&&!document.querySelector('dialog[open]'))setFree(false);if(free&&e.target===$('#webgl')){if(e.key==='+'||e.key==='='){e.preventDefault();campus.zoom(.85);}if(e.key==='-'){e.preventDefault();campus.zoom(1.18);}}},{signal});

function fillAssets(assets){const list=$('#asset-list');list.replaceChildren();assets.forEach(asset=>{const a=document.createElement('a');a.href=`${import.meta.env.BASE_URL}models/${asset.file}?v=${asset.version??1}`;a.download=asset.file;a.textContent=asset.label;const size=document.createElement('small');size.textContent=`GLB · ${Math.round(asset.bytes/1024)} KB`;const arrow=document.createElement('span');arrow.textContent='↓';a.append(size,arrow);list.append(a);});}

async function boot(){

 try{

  const typographyReady=Promise.allSettled([

   document.fonts.load('500 1em "Sora"'),

   document.fonts.load('400 1em "DM Sans"'),

   document.fonts.load('italic 500 1em "Cormorant Garamond"')

  ]);

  campus=await createCampusViewer({canvas:$('#webgl'),container:$('#scene'),signal,onProgress:p=>{gsap.set('#load-fill',{scaleX:p});$('#load-percent').textContent=`${Math.round(p*100)}%`;}});

  fillAssets(campus.assets);$('#orbit-button').disabled=false;

  await typographyReady;

  if(signal.aborted)return;

  journey=createJourney(campus);

  gsap.to('#loader',{autoAlpha:0,duration:reduced()?0:.65,onComplete:()=>$('#loader').hidden=true});

  if(import.meta.env.DEV)window.__campus={viewer:campus,journey};

 }catch(error){

  if(signal.aborted)return;console.error('[Unismuh 3D]',error);$('#load-text').textContent='Visual 3D belum dapat dimuat. Anda tetap bisa membaca perjalanan kampus.';$('#load-percent').textContent='';

  const actions=document.createElement('div');actions.className='error-actions';const retry=document.createElement('button');retry.textContent='Coba lagi';retry.addEventListener('click',()=>location.reload(),{signal});

  const read=document.createElement('button');read.textContent='Baca perjalanan';read.addEventListener('click',()=>{$('#loader').hidden=true;$('#experience').classList.add('fallback');$('#scene').style.backgroundImage=`url(${import.meta.env.BASE_URL}images/kampus-reference.png)`;journey=createJourney({state:{...SHOTS[0]}});},{signal});actions.append(retry,read);$('#loader').append(actions);

  try{const response=await fetch(`${import.meta.env.BASE_URL}models/manifest.json`,{signal,cache:'no-cache'});if(response.ok){const manifest=await response.json();fillAssets(manifest.assets.map(asset=>({...asset,version:asset.hash??manifest.version})));}}catch{};

 }

}

boot();

function dispose(){abort.abort();journey?.dispose();campus?.dispose();gsap.killTweensOf('#loader');document.body.style.overflow='';}

if(import.meta.hot)import.meta.hot.dispose(dispose);



