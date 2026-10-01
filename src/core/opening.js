import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function createOpening({onEnterCampus,signal}){
 const section=document.querySelector('#opening'),canvas=document.querySelector('#opening-canvas');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const state={reveal:0,pose:0,release:0};
 let started=false,disposed=false,renderer,scene,camera,model,hand,anchor,emblem,mixer,clip,frame,active=true,dirty=true,lastPose='';
 const enter=()=>{if(!started&&!signal.aborted){started=true;onEnterCampus();}};
 const disposeObject=object=>object?.traverse(o=>{o.geometry?.dispose();for(const material of [].concat(o.material||[])){material.map?.dispose();material.dispose();}});
 const ctx=gsap.context(()=>{
  gsap.from('.opening-title span',{y:reduced?0:55,opacity:0,duration:1.15,stagger:.13,ease:'power3.out'});
  const timeline=gsap.timeline({scrollTrigger:{trigger:section,start:'top top',end:'bottom bottom',scrub:reduced?true:.75,invalidateOnRefresh:true,onUpdate:self=>{if(self.progress>.91)enter();},onLeave:enter}});
  timeline.to('.opening-welcome',{autoAlpha:0,y:reduced?0:-45,duration:.22},.06)
   .to(state,{reveal:1,duration:.2},.18)
   .to(state,{pose:1,duration:.38,ease:'power2.inOut'},.18)
   .to('.opening-hand-caption',{autoAlpha:1,y:0,duration:.18},.3)
   .to(state,{release:1,duration:.26,ease:'power2.inOut'},.63)
   .to('.opening-hand-caption',{autoAlpha:0,y:reduced?0:-20,duration:.14},.67)
   .to('.opening-next',{autoAlpha:1,duration:.1},.86)
   .to(state,{reveal:0,duration:.1},.9)
   .to('.opening-next',{autoAlpha:0,duration:.06},.94)
   .to({}, {duration:.01},.99);
 },section);
 function resize(){
  if(!renderer)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.4,Math.sqrt(1400000/(w*h))));renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.position.set(0,-.38,Math.max(6.2,2.2/(2*Math.tan(THREE.MathUtils.degToRad(13))*camera.aspect)));camera.rotation.set(0,0,0);camera.updateProjectionMatrix();dirty=true;
 }
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const visibility=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;if(active){dirty=true;loop();}else cancelAnimationFrame(frame);});visibility.observe(section);
 function loop(){
  cancelAnimationFrame(frame);if(disposed||!active||document.hidden||!renderer||!model)return;
  const pose=reduced?1:state.pose,key=[state.reveal,pose,state.release].join(':');
  if(dirty||key!==lastPose){
   lastPose=key;mixer.setTime(Math.min(clip.duration-.00001,pose*clip.duration));
   // The emblem stays suspended as the hand lowers out of view.
   model.position.y=reduced?0:-state.release*2.6;
   const anchorPosition=anchor.getWorldPosition(new THREE.Vector3());emblem.position.copy(anchorPosition);emblem.position.y+=reduced?0:state.release*2.6;
   emblem.position.lerp(new THREE.Vector3(0,-.38,.65),state.release);emblem.scale.setScalar(reduced?1:1+state.release*.85);
   emblem.rotation.set(reduced?0:-.06,reduced?0:.2+(1-pose)*.35+state.release*.3,reduced?0:-.025);
   hand.visible=state.release<.99;canvas.style.opacity=String(state.reveal);renderer.render(scene,camera);dirty=false;
  }
  frame=requestAnimationFrame(loop);
 }
 const resume=()=>{if(!document.hidden)loop();else cancelAnimationFrame(frame);};document.addEventListener('visibilitychange',resume,{signal});
 async function load(){try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(26,1,.01,100);
  scene.add(new THREE.HemisphereLight(0xffffff,0xc1b8a3,2));const keyLight=new THREE.DirectionalLight(0xfff4df,3);keyLight.position.set(-3,4,5);scene.add(keyLight);const rimLight=new THREE.DirectionalLight(0xd5ecff,2);rimLight.position.set(3,1,2);scene.add(rimLight);
  const [gltf,logo]=await Promise.all([new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}intro/emblem-hand.glb?v=1`),new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}intro/logo-unismuh-3d.glb?v=1`)]);
  if(disposed){disposeObject(gltf.scene);disposeObject(logo.scene);return;}
  model=gltf.scene;hand=model.getObjectByName('Hand');anchor=model.getObjectByName('Emblem_Anchor');clip=gltf.animations[0];if(!hand||!anchor||!clip)throw new Error('Emblem hand animation missing');
  scene.add(model);mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();
  // An exposure lift preserves the reference texture, hue, and baked shading.
  hand.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb *= 3.2;');};
  hand.material.customProgramCacheKey=()=> 'opening-skin-exposure-3.2';hand.material.needsUpdate=true;
  emblem=logo.scene;scene.add(emblem);resize();loop();
 }catch(error){console.warn('[Opening]',error);disposeObject(scene);renderer?.dispose();renderer=undefined;canvas.hidden=true;section.classList.add('opening-fallback');}}
 load();
 document.querySelector('#opening-skip').addEventListener('click',()=>{enter();document.querySelector('#journey').scrollIntoView({behavior:reduced?'instant':'smooth'});},{signal});
 if(scrollY>=section.offsetHeight-innerHeight)enter();
 return{dispose(){disposed=true;ctx.revert();observer.disconnect();visibility.disconnect();cancelAnimationFrame(frame);mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);disposeObject(scene);renderer?.dispose();}};
}
