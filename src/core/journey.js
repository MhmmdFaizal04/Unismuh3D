import gsap from 'gsap';

import {ScrollTrigger} from 'gsap/ScrollTrigger';

import {ScrollToPlugin} from 'gsap/ScrollToPlugin';

import {SplitText} from 'gsap/SplitText';

import {MotionPathPlugin} from 'gsap/MotionPathPlugin';

import {CustomEase} from 'gsap/CustomEase';

import {SHOTS} from './campus-viewer.js';

gsap.registerPlugin(ScrollTrigger,ScrollToPlugin,SplitText,MotionPathPlugin,CustomEase);

CustomEase.create('campus-travel','.42,0,.22,1');

const LABELS=[['PERSPEKTIF KAMPUS','UNIVERSITAS MUHAMMADIYAH MAKASSAR','Kampus Unismuh'],['RUANG TERBUKA','TAMAN DEPAN KAMPUS','Air mancur'],['FKIP','RUANG BELAJAR & PENDIDIKAN','FKIP'],['PERPUSTAKAAN','RUANG BACA KAMPUS','Perpustakaan'],['MASJID KAMPUS','C · SUBULUSSALAM AL-KHOORY','Masjid kampus'],['PERKULIAHAN BERSAMA','K1 · DI SISI MENARA IQRA','Perkuliahan bersama'],['PASCASARJANA','B · KOMPLEKS A / B / AB','Pascasarjana'],['BALAI SIDANG','RUANG PERTEMUAN KAMPUS','Balai Sidang'],['MENARA IQRO','IKON VERTIKAL KAMPUS','Menara Iqro'],['PUNCAK MENARA','PANDANGAN KE MASA DEPAN','Mahkota Iqro']];

export function createJourney(campus){

 const root=document.getElementById('experience'),panels=gsap.utils.toArray('.chapter',root),stops=gsap.utils.toArray('.chapter-stop',root);

 const last=SHOTS.length-1,nav=document.getElementById('chapter-navigation');

 if(panels.length!==SHOTS.length||stops.length!==SHOTS.length)throw new Error('Jumlah bab dan posisi kamera tidak sesuai');

 const routeFill=gsap.quickSetter('#route-fill','scaleX'),sideFill=gsap.quickSetter('#side-progress','scaleY'),percent=document.getElementById('journey-percent');let lastPercent=-1;

 const mm=gsap.matchMedia();let master,trigger,active=-1,reduced=false,previousProgress=0;

 function activate(index){

  if(index===active)return;active=index;

  panels.forEach((el,i)=>{el.classList.toggle('is-current',i===index);el.setAttribute('aria-hidden',String(i!==index));el.inert=i!==index;});

  stops.forEach((el,i)=>{el.classList.toggle('active',i===index);if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});

  if(nav.scrollWidth>nav.clientWidth)nav.scrollTo({left:Math.max(0,stops[index].offsetLeft-nav.clientWidth/2+stops[index].offsetWidth/2),behavior:reduced?'instant':'smooth'});

  const [place,type,title]=LABELS[index];document.getElementById('scene-location').textContent=place;document.getElementById('landmark-type').textContent=type;document.getElementById('landmark-title').textContent=title;document.getElementById('label-index').textContent=String(index+1).padStart(2,'0');document.getElementById('scroll-label').textContent=index===last?'PUNCAK PERJALANAN':'GULIR UNTUK MENJELAJAHI';

 }

 mm.add({desktop:'(min-width:761px)',mobile:'(max-width:760px)',reduce:'(prefers-reduced-motion:reduce)'},ctx=>{

  reduced=ctx.conditions.reduce;document.body.classList.toggle('reduce-motion',reduced);active=-1;

  gsap.set(panels,{autoAlpha:0,x:0,y:0});gsap.set(panels[0],{autoAlpha:1});Object.assign(campus.state,SHOTS[0]);

  // Fonts finish loading before splitting. Rebuild the line masks at each

  // breakpoint so their bounds match the final exhibition typography.

  const split=panels.map(p=>SplitText.create(p.querySelector('[data-split]'),{type:'lines',mask:'lines',aria:'auto',linesClass:'story-line',deepSlice:true}));

  const copy=panels.map(p=>p.querySelector('.chapter-description'));

  const supporting=panels.map(p=>[...p.querySelectorAll('.journey-button,.chapter-meta,.story-detail,.final-actions')].filter(el=>!el.closest('.final-actions')||el.classList.contains('final-actions')));

  master=gsap.timeline({paused:true,onUpdate:()=>{activate(Math.min(last,Math.floor(master.time()+(reduced?.5:.35))));}});

  master.addLabel('campus',0);

  for(let i=1;i<=last;i++){

   master.addLabel(panels[i].id,i);

   master.to(campus.state,{...SHOTS[i],duration:1,ease:reduced?'steps(1)':'power1.inOut'},i-1);

   master.to(panels[i-1],{autoAlpha:0,y:reduced?0:-18,duration:reduced?.01:.25,ease:'power2.in'},i-1+(reduced?.5:.46));

   master.fromTo(panels[i],{autoAlpha:0,x:0,y:0},{autoAlpha:1,duration:reduced?.01:.18,ease:'power2.out',immediateRender:false},i-1+.5);

   if(!reduced){

    master.fromTo(panels[i].querySelector('.eyebrow'),{autoAlpha:0,y:8},{autoAlpha:1,y:0,duration:.2,ease:'power2.out',immediateRender:false},i-1+.48);

    master.fromTo(split[i].lines,{yPercent:112,rotationX:-10,autoAlpha:0},{yPercent:0,rotationX:0,autoAlpha:1,duration:.32,stagger:{amount:.12},ease:'power3.out',immediateRender:false},i-1+.54);

    master.fromTo(copy[i],{autoAlpha:0,y:14},{autoAlpha:1,y:0,duration:.24,ease:'power2.out',immediateRender:false},i-1+.73);

    master.fromTo(supporting[i],{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.18,stagger:{amount:.02},ease:'power2.out',immediateRender:false},i-1+.8);

   }

  }

  trigger=ScrollTrigger.create({trigger:document.getElementById('journey'),pin:root,start:'top top',end:()=>`+=${window.innerHeight*last*(ctx.conditions.mobile?1.35:1.45)}`,animation:master,scrub:reduced?true:1.05,invalidateOnRefresh:true,anticipatePin:1,onUpdate:self=>{

   previousProgress=self.progress;

   routeFill(self.progress);sideFill(self.progress);const value=Math.round(self.progress*100);if(value!==lastPercent){lastPercent=value;percent.textContent=String(value).padStart(2,'0');}

  }});

  let finishIntro;

  if(!reduced){

   gsap.to('#scroll-dot',{motionPath:{path:[{x:0,y:0},{x:0,y:23}],curviness:0},duration:1.5,ease:'power2.inOut',repeat:-1,yoyo:true});

   if(window.scrollY<5){

    const intro=gsap.timeline({defaults:{ease:'power3.out'}})

     .fromTo(panels[0].querySelector('.eyebrow'),{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.65},.1)

     .fromTo(split[0].lines,{yPercent:112,rotationX:-10,autoAlpha:0},{yPercent:0,rotationX:0,autoAlpha:1,duration:1,stagger:.14},.18)

     .fromTo(copy[0],{autoAlpha:0,y:16},{autoAlpha:1,y:0,duration:.7},.8)

     .fromTo(supporting[0],{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.6,stagger:.1},1);

    // Scrolling early lands the opening text before the master fades it out.

    finishIntro=()=>intro.progress(1);

    window.addEventListener('wheel',finishIntro,{once:true,passive:true});

    window.addEventListener('touchmove',finishIntro,{once:true,passive:true});

   }

  }

  activate(Math.round(previousProgress*last));ScrollTrigger.refresh();

  return()=>{trigger?.kill();master?.kill();split.forEach(s=>s.revert());if(finishIntro){window.removeEventListener('wheel',finishIntro);window.removeEventListener('touchmove',finishIntro);}};

 },root);

 let width=window.innerWidth,resizeCall;

 const resizeTypography=()=>{const next=window.innerWidth;if(next===width)return;const changedBreakpoint=(next<=760)!==(width<=760);width=next;resizeCall?.kill();if(!changedBreakpoint)resizeCall=gsap.delayedCall(.2,()=>gsap.matchMediaRefresh());};

 window.addEventListener('resize',resizeTypography,{passive:true});

 function goTo(index){if(!trigger)return;const p=gsap.utils.clamp(0,last,index)/last;gsap.to(window,{scrollTo:{y:trigger.start+(trigger.end-trigger.start)*p,autoKill:true},duration:reduced?0:1.5,ease:'campus-travel',overwrite:'auto'});}

 return {goTo,dispose(){window.removeEventListener('resize',resizeTypography);resizeCall?.kill();gsap.killTweensOf(window);mm.revert();},get progress(){return trigger?.progress??0;},get active(){return active;},get timelineTime(){return master?.time()??0;}};

}

