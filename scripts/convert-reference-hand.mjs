import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {readFile,writeFile} from 'node:fs/promises';
// Convert the reference's packed geometry and world-space joint animation to standard glTF skinning.
const source=new URL('./reference-hand/',import.meta.url);
async function unpack(name){
 const data=await readFile(new URL(name,source)),length=data.readUInt32LE(0),meta=JSON.parse(data.subarray(4,4+length));let offset=4+length;const attrs={};
 const types={Int8Array:[1,'readInt8'],Uint8Array:[1,'readUInt8'],Int16Array:[2,'readInt16LE'],Uint16Array:[2,'readUInt16LE'],Float32Array:[4,'readFloatLE']};
 for(const a of meta.attributes){const [bytes,read]=types[a.storageType],count=(a.id==='indices'?meta.indexCount:meta.vertexCount)*a.componentSize;const out=new Float32Array(count);
  for(let i=0;i<count;i++){let v=data[read](offset+i*bytes);if(a.needsPack){const c=a.packedComponents[i%a.componentSize];v=(v+(a.storageType.startsWith('Int')?2**(bytes*8-1):0))/(2**(bytes*8)-1)*c.delta+c.from;}out[i]=v;}
  attrs[a.id]=out;offset+=count*bytes;
 }return {meta,attrs};
}
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
const {attrs:g}=await unpack('hand.buf'),{attrs:a}=await unpack('hand_animation.buf'),{attrs:c}=await unpack('coaster_hero_animation.buf');
const root=new THREE.Group();root.name='Unismuh_Emblem_Hand';
const center=new THREE.Vector3(-.0105758577,.548192548,-.0485146008);
const facing=new THREE.Quaternion(0,-Math.SQRT1_2,-Math.SQRT1_2,0).invert();
const geo=new THREE.BufferGeometry();geo.setIndex(new THREE.BufferAttribute(new Uint16Array(g.indices),1));
geo.setAttribute('position',new THREE.BufferAttribute(g.position.map(v=>v*10),3));geo.setAttribute('normal',new THREE.BufferAttribute(g.normal,3));
const uv=g.uv.map((v,i)=>i%2?(1-v)*.5:v*.5);geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
geo.setAttribute('skinIndex',new THREE.BufferAttribute(new Uint16Array(g.boneIndices),4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(g.boneWeights,4));
const skin=new THREE.SkinnedMesh(geo,new THREE.MeshBasicMaterial({name:'Reference_Baked_Skin',color:0xffffff}));skin.name='Hand';skin.frustumCulled=false;root.add(skin);
const bones=[],tracks=[],times=Array.from({length:46},(_,i)=>i/30),v=new THREE.Vector3(),q=new THREE.Quaternion();
for(let b=0;b<36;b++){
 const bone=new THREE.Bone();bone.name=`Hand_Joint_${b}`;root.add(bone);bones.push(bone);const pos=[],rot=[];
 for(let f=0;f<46;f++){v.fromArray(a.position,(f*36+b)*3).sub(center).applyQuaternion(facing).multiplyScalar(10);q.fromArray(a.orient,(f*36+b)*4).premultiply(facing).normalize();pos.push(...v);rot.push(...q);}
 bone.position.fromArray(pos);bone.quaternion.fromArray(rot);
 tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`,times,pos),new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,times,rot));
}
const skeleton=new THREE.Skeleton(bones,bones.map(()=>new THREE.Matrix4()));skin.bind(skeleton,new THREE.Matrix4());skin.normalizeSkinWeights();
const anchor=new THREE.Object3D();anchor.name='Emblem_Anchor';root.add(anchor);const logoPos=[];
for(let f=0;f<46;f++){v.fromArray(c.position,(f+70)*3).sub(center).applyQuaternion(facing).multiplyScalar(10);logoPos.push(...v);}
anchor.position.fromArray(logoPos);tracks.push(new THREE.VectorKeyframeTrack('Emblem_Anchor.position',times,logoPos));
const clip=new THREE.AnimationClip('Present_Emblem',45/30,tracks);clip.optimize();
root.userData={reference:'https://cork-webgl-study.vercel.app/',originalCredit:'Lusion / ORYZO study reference',conversion:'Packed BUF to glTF joints, local embedded texture',vertices:8441};
root.updateMatrixWorld(true);
const exported=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations:[clip],onlyVisible:false}));
// Embed the baked texture without a DOM/canvas dependency in the build script.
const jsonLength=exported.readUInt32LE(12),doc=JSON.parse(exported.subarray(20,20+jsonLength)),binStart=20+jsonLength+8,oldBin=exported.subarray(binStart),image=await readFile(new URL('AI_HAND.webp',source));
const imageOffset=oldBin.length;const payload=Buffer.concat([oldBin,image,Buffer.alloc((4-image.length%4)%4)]);
doc.bufferViews.push({buffer:0,byteOffset:imageOffset,byteLength:image.length});doc.buffers[0].byteLength=payload.length;
doc.images=[{bufferView:doc.bufferViews.length-1,mimeType:'image/webp'}];doc.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];doc.textures=[{sampler:0,extensions:{EXT_texture_webp:{source:0}}}];
doc.extensionsUsed=[...new Set([...(doc.extensionsUsed||[]),'EXT_texture_webp'])];doc.extensionsRequired=['EXT_texture_webp'];doc.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};
const json=Buffer.from(JSON.stringify(doc)),jsonPad=Buffer.alloc((4-json.length%4)%4,32),jsonChunk=Buffer.concat([json,jsonPad]);const total=12+8+jsonChunk.length+8+payload.length,out=Buffer.alloc(total);
out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);out.writeUInt32LE(jsonChunk.length,12);out.writeUInt32LE(0x4e4f534a,16);jsonChunk.copy(out,20);out.writeUInt32LE(payload.length,20+jsonChunk.length);out.writeUInt32LE(0x004e4942,24+jsonChunk.length);payload.copy(out,28+jsonChunk.length);
await writeFile(new URL('../public/intro/emblem-hand.glb',import.meta.url),out);console.log(`Animated hand GLB: ${out.length} bytes, 36 joints, ${clip.tracks.length} tracks`);
