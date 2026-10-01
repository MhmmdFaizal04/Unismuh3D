import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}};
const root=new THREE.Group();root.name='Salam_Unismuh';
const mats={skinLeft:new THREE.MeshStandardMaterial({name:'skin-left',color:0xd5a77e,roughness:.66}),skinRight:new THREE.MeshStandardMaterial({name:'skin-right',color:0xa8734b,roughness:.67}),sleeve:new THREE.MeshStandardMaterial({name:'sleeve',color:0x075e8c,roughness:.7}),cuff:new THREE.MeshStandardMaterial({name:'cuff',color:0xf0f1e8,roughness:.6})};
function hand(name,skin,mirror){
 const group=new THREE.Group();group.name=name;root.add(group);const buckets={};
 function add(key,geo){(buckets[key]??=[]).push(geo);}
 function ellipsoid(key,x,y,z,sx,sy,sz){const geo=new THREE.SphereGeometry(1,20,12);geo.scale(sx,sy,sz);geo.translate(x,y,z);add(key,geo);}
 function segment(key,a,b,r1,r2){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),geo=new THREE.CylinderGeometry(r2,r1,start.distanceTo(end),20);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize()));geo.translate(...start.clone().add(end).multiplyScalar(.5).toArray());add(key,geo);}
 segment('sleeve',[-3.6,-.25,0],[-1.45,-.12,0],.48,.36);
 segment('cuff',[-1.55,-.12,0],[-1.25,-.1,0],.38,.34);
 segment(skin,[-1.27,-.1,0],[-.7,-.02,0],.3,.31);
 ellipsoid(skin,-.48,0,0,.64,.39,.27);
 // Four fingers curl over the opposing hand rather than crossing as straight rods.
 for(let i=0;i<4;i++){
  const y=.17-i*.135,z=.13+i*.055;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.02,y,z),new THREE.Vector3(.42,y-.035,z+.05),new THREE.Vector3(.52,y-.2,z-.02),new THREE.Vector3(.23,y-.3,z-.12)]);
  add(skin,new THREE.TubeGeometry(curve,18,.105-i*.005,10,false));
  ellipsoid(skin,.24,y-.3,z-.12,.105,.105,.105);
 }
 // Thumb rests diagonally on the top of the clasp.
 const thumb=new THREE.CatmullRomCurve3([new THREE.Vector3(-.72,.24,.1),new THREE.Vector3(-.42,.47,.22),new THREE.Vector3(-.02,.42,.32),new THREE.Vector3(.17,.29,.32)]);
 add(skin,new THREE.TubeGeometry(thumb,20,.14,12,false));ellipsoid(skin,.17,.29,.32,.14,.13,.13);
 for(const [key,geos] of Object.entries(buckets)){const geometry=mergeGeometries(geos,false);geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,mats[key]);mesh.name=name+'_'+key;group.add(mesh);}
 if(mirror){group.rotation.y=Math.PI;group.position.z=-.32;group.position.y=-.06;}else group.position.z=.18;
 return group;
}
hand('Hand_Left','skinLeft',false);hand('Hand_Right','skinRight',true);
root.userData={description:'Stylized sculpted handshake. Two individually named hand groups animate apart on scroll.'};
await mkdir(new URL('../public/intro/',import.meta.url),{recursive:true});
const data=await new GLTFExporter().parseAsync(root,{binary:true});await writeFile(new URL('../public/intro/handshake.glb',import.meta.url),Buffer.from(data));
console.log(`Handshake GLB: ${data.byteLength} bytes; Hand_Left and Hand_Right`);
