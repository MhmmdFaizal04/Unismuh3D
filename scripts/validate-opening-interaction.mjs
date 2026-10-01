import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createFingerInteraction} from '../src/core/finger-interaction.js';
const file=await readFile(new URL('../public/intro/emblem-hand.glb',import.meta.url)),jl=file.readUInt32LE(12),doc=JSON.parse(file.subarray(20,20+jl)),bin=file.subarray(28+jl);
const rootNode=doc.nodes.find(n=>n.name==='Unismuh_Emblem_Hand'),model=new THREE.Group(),root=new THREE.Group();root.name=rootNode.name;root.userData=rootNode.extras;model.add(root);
const bones=Array.from({length:36},(_,i)=>{const b=new THREE.Bone();b.name=`Hand_Joint_${i}`;root.add(b);return b;});
function values(index){const a=doc.accessors[index],view=doc.bufferViews[a.bufferView];assert.equal(a.componentType,5126);const n=a.type==='VEC3'?3:a.type==='VEC4'?4:1,offset=(view.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count*n},(_,i)=>bin.readFloatLE(offset+i*4));}
for(const ch of doc.animations[0].channels){const n=doc.nodes[ch.target.node],id=bones.findIndex(b=>b.name===n.name);if(id<0)continue;const v=values(doc.animations[0].samplers[ch.sampler].output);if(ch.target.path==='translation')bones[id].position.fromArray(v.slice(-3));if(ch.target.path==='rotation')bones[id].quaternion.fromArray(v.slice(-4));}
const base=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})),fingers=createFingerInteraction(model,{});
fingers.move(0,-.55);for(let i=0;i<90;i++)fingers.update(1/60,true);
fingers.apply(1);const changed=bones.map((b,i)=>b.position.distanceTo(base[i].p));assert(Math.max(...changed)>.01,'Finger joints should move');assert(Math.max(...changed)<1,'Joint displacement should stay bounded');
for(let i of [0,1,2,3,4,5,6,7,8,9,22,23,24,25,26,27,28,29,31,32])assert(changed[i]<1e-9,'Palm/grip joints must remain fixed');
const pose=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
for(let i=0;i<100;i++){fingers.reset();fingers.capture();fingers.apply(1);for(let j=0;j<36;j++)assert(bones[j].position.distanceTo(pose[j].p)<1e-8,'Repeated interaction must not accumulate drift');}
fingers.leave();for(let i=0;i<120;i++)fingers.update(1/60,true);fingers.reset();fingers.apply(1);for(let i=0;i<36;i++)assert(bones[i].position.distanceTo(base[i].p)<1e-7,'Pointer leave should restore the base pose');
fingers.move(0,-.55);for(let i=0;i<60;i++)fingers.update(1/60,false);fingers.reset();fingers.apply(1);for(let i=0;i<36;i++)assert(bones[i].position.distanceTo(base[i].p)<1e-7,'Disabled interaction should remain in base pose');
console.log(`PASS cursor finger deformation, fixed palm, no drift across 100 poses, leave/reset, disabled interaction; max displacement ${Math.max(...changed).toFixed(3)}`);
