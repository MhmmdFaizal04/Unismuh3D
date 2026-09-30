import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {renderPixelRatio,RenderBudget} from './render-budget.js';
export const SHOTS=[
 {x:133,y:98,z:172,tx:3,ty:32,tz:0,fov:40,night:0},
 {x:6,y:17,z:69,tx:-21,ty:3.8,tz:25,fov:39,night:.04},
 {x:89,y:42,z:58,tx:40,ty:19,tz:-12,fov:42,night:.08},
 {x:34,y:39,z:83,tx:-15,ty:39,tz:-8,fov:42,night:.22},
 {x:21,y:89,z:49,tx:-15,ty:75,tz:-8,fov:38,night:.62}
];
export async function createCampusViewer({canvas,container,onProgress,signal}){
 const low=matchMedia('(max-width:760px)').matches||(navigator.hardwareConcurrency||8)<6||(navigator.deviceMemory||8)<=4;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 // Architecture and light direction stay fixed: build the shadow map once.
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#101f2c');scene.fog=new THREE.FogExp2('#101f2c',.0015);
 const camera=new THREE.PerspectiveCamera(40,1,.2,1200),state={...SHOTS[0]};
 const controls=new OrbitControls(camera,canvas);controls.enabled=false;controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=15;controls.maxDistance=370;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.3;canvas.style.touchAction='pan-y';
 const hemi=new THREE.HemisphereLight(0xd4edff,0x3b5060,1.5);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe7c2,2.2);sun.position.set(-70,110,80);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:110,bottom:-100,near:1,far:300});sun.shadow.bias=-.00025;sun.shadow.normalBias=.15;scene.add(sun);
 const rim=new THREE.DirectionalLight(0x53bfff,1.2);rim.position.set(50,80,-60);scene.add(rim);
 const envSource=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(envSource,.04);scene.environment=env.texture;scene.environmentIntensity=.3;envSource.dispose();pmrem.dispose();
 // Render directly with ACES and native antialiasing. The existing CSS shade
 // provides atmosphere without HDR targets, bloom blurs or fullscreen passes.
 const model=new THREE.Group();model.name='UnismuhCampus';scene.add(model);const resources=new Set(),geometries=new Set();let assets=[];
 function disposeResources(){geometries.forEach(g=>g.dispose());resources.forEach(m=>m.dispose());controls.dispose();env.dispose();sun.shadow.dispose();renderer.dispose();}
 try{
  const response=await fetch(`${import.meta.env.BASE_URL}models/manifest.json`,{signal});if(!response.ok)throw new Error('Manifest model tidak ditemukan');({assets}=await response.json());const loader=new GLTFLoader();let loaded=0;
  const results=await Promise.allSettled(assets.map(async asset=>{const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${asset.file}`);gltf.scene.name=asset.id;gltf.scene.position.fromArray(asset.position);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;geometries.add(o.geometry);resources.add(o.material);o.material.envMapIntensity=.3;}});model.add(gltf.scene);onProgress(++loaded/assets.length);}));
  if(signal.aborted)throw new Error('Aborted');const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 }catch(error){disposeResources();throw error;}
 const waterUniform={value:0};
 for(const material of resources)if(material.name==='water'){
  material.onBeforeCompile=shader=>{shader.uniforms.uTime=waterUniform;shader.vertexShader='varying vec3 vWaterWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='varying vec3 vWaterWorld;uniform float uTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat rings=sin(length(vWaterWorld.xz-vec2(-21.,25.))*5.-uTime*3.);diffuseColor.rgb*=.8+rings*.18;');};material.customProgramCacheKey=()=> 'fountain-ripples-v1';
 }
 const count=low?160:320,positions=new Float32Array(count*3),phases=new Float32Array(count),angles=new Float32Array(count);for(let i=0;i<count;i++){phases[i]=(i*.61803398875)%1;angles[i]=(i%8)/8*Math.PI*2;}
 const sprayGeometry=new THREE.BufferGeometry();sprayGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));sprayGeometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));sprayGeometry.setAttribute('aAngle',new THREE.BufferAttribute(angles,1));
 const sprayMaterial=new THREE.ShaderMaterial({uniforms:{uTime:waterUniform,uDpr:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute float aPhase;attribute float aAngle;uniform float uTime;uniform float uDpr;varying float vAlpha;void main(){float t=fract(aPhase+uTime*.42);float r=t*5.3;vec3 p=vec3(-21.+cos(aAngle)*r,4.55+11.*t-13.75*t*t,25.+sin(aAngle)*r);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(95.*uDpr/-mv.z,1.3,5.);vAlpha=sin(t*3.14159)*.8;}',fragmentShader:'varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.55,.92,1.,vAlpha*(1.-d*2.));}'});
 sprayGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(-21,6,25),9);
 const spray=new THREE.Points(sprayGeometry,sprayMaterial);scene.add(spray);geometries.add(sprayGeometry);resources.add(sprayMaterial);
 const groundMat=new THREE.MeshStandardMaterial({color:0x152d38,roughness:.97}),groundGeo=new THREE.PlaneGeometry(3000,3000),ground=new THREE.Mesh(groundGeo,groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-2.65;ground.receiveShadow=true;scene.add(ground);resources.add(groundMat);geometries.add(groundGeo);
 const targetPoint=new THREE.Vector3(),offset=new THREE.Vector3(),budget=new RenderBudget();
 const stateKeys=['x','y','z','tx','ty','tz','fov'],lastCamera=stateKeys.map(()=>NaN);
 const frustum=new THREE.Frustum(),projectionView=new THREE.Matrix4();
 let free=false,frame,disposed=false,nightOverride=null,lastLight=-1,width=1,height=1,dirty=true;
 let previousFrame=0,lastDraw=0,wasMoving=false,waterVisible=false,time=0;
 // Freeze local transforms of the static imported architecture.
 model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
 function applyCamera(force=false){
  if(free)return controls.update();
  if(!force&&!stateKeys.some((key,i)=>Math.abs(state[key]-lastCamera[i])>.00001||Number.isNaN(lastCamera[i])))return false;
  stateKeys.forEach((key,i)=>lastCamera[i]=state[key]);
  targetPoint.set(state.tx,state.ty,state.tz);offset.set(state.x,state.y,state.z).sub(targetPoint);
  const mobile=width<760;if(mobile)offset.multiplyScalar(1.5);
  camera.position.copy(targetPoint).add(offset);camera.lookAt(targetPoint);
  const fov=mobile?47:state.fov;
  if(force||camera.fov!==fov){camera.fov=fov;camera.setViewOffset(width,height,mobile?0:-width*.17,mobile?-height*.17:0,width,height);}
  return true;
 }
 const nightColor=new THREE.Color('#080f23');
 function lighting(){const n=nightOverride??state.night;if(Math.abs(n-lastLight)<.001)return false;lastLight=n;hemi.intensity=1.5-n*.95;sun.intensity=2.2-n*1.95;rim.intensity=1.2+n*.35;renderer.toneMappingExposure=1.05-n*.09;scene.background.set('#101f2c').lerp(nightColor,n);scene.fog.color.copy(scene.background);resources.forEach(m=>{if(['glass','darkglass'].includes(m.name))m.emissiveIntensity=n*1.3;});return true;}
 function resize(){width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);camera.aspect=width/height;renderer.setPixelRatio(renderPixelRatio(width,height,devicePixelRatio,low,budget.scale));renderer.setSize(width,height,false);sprayMaterial.uniforms.uDpr.value=renderer.getPixelRatio();camera.updateProjectionMatrix();applyCamera(true);dirty=true;}
 function updateWaterVisibility(){camera.updateMatrixWorld();projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projectionView);waterVisible=camera.position.distanceTo(sprayGeometry.boundingSphere.center)<140&&frustum.intersectsSphere(sprayGeometry.boundingSphere);spray.visible=waterVisible;}
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 function loop(timestamp){
  if(disposed||document.hidden)return;
  frame=requestAnimationFrame(loop);
  const interval=previousFrame?timestamp-previousFrame:0;previousFrame=timestamp;
  const moving=applyCamera(),lightChanged=lighting();dirty=dirty||moving||lightChanged;
  if(moving&&wasMoving&&budget.sample(interval))resize();
  if(!moving)budget.reset();wasMoving=moving;
  if(dirty)updateWaterVisibility();
  const animateWater=waterVisible&&!reduced.matches;
  if(!dirty&&!animateWater)return;
  // Full speed while travelling; quiet fountain frames are capped at 30/24 fps.
  const minInterval=moving||lightChanged?1000/60:1000/(low?24:30);
  if(lastDraw&&timestamp-lastDraw<minInterval-.75)return;
  if(animateWater)time+=Math.min((timestamp-lastDraw)/1000||0,.1);
  waterUniform.value=time;renderer.render(scene,camera);dirty=false;lastDraw=timestamp;
 }
 function visibility(){cancelAnimationFrame(frame);previousFrame=lastDraw=0;budget.reset();if(!document.hidden&&!disposed){dirty=true;frame=requestAnimationFrame(loop);}}
 document.addEventListener('visibilitychange',visibility);
 try{await renderer.compileAsync(scene,camera);}catch(error){ro.disconnect();document.removeEventListener('visibilitychange',visibility);disposeResources();throw error;}
 if(signal.aborted){ro.disconnect();document.removeEventListener('visibilitychange',visibility);disposeResources();throw new Error('Aborted');}
 frame=requestAnimationFrame(loop);
 function setFree(value){free=value;controls.enabled=value;controls.autoRotate=false;canvas.style.touchAction=value?'none':'pan-y';if(value){camera.clearViewOffset();controls.target.set(state.tx,state.ty,state.tz);controls.update();}else applyCamera(true);dirty=true;}
 function zoom(factor){if(!free)return;offset.copy(camera.position).sub(controls.target).multiplyScalar(factor);offset.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);dirty=true;}
 function dispose(){disposed=true;cancelAnimationFrame(frame);ro.disconnect();document.removeEventListener('visibilitychange',visibility);disposeResources();}
 return {state,assets,setFree,zoom,dispose,setNight(value){nightOverride=value;dirty=true;},reset(){setFree(false);setFree(true);},setAutoRotate(value){controls.autoRotate=value;dirty=true;},get free(){return free;},get debug(){return{position:camera.position.toArray(),target:targetPoint.toArray(),state:Object.fromEntries(Object.keys(SHOTS[0]).map(k=>[k,state[k]])),models:model.children.map(o=>o.name),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,waterTime:waterUniform.value,pixelRatio:renderer.getPixelRatio(),qualityScale:budget.scale,waterVisible,postprocessing:false};}};
}

