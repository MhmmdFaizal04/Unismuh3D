import * as THREE from 'three';

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';

import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { readFile, writeFile, mkdir } from 'node:fs/promises';

import {createHash} from 'node:crypto';

import {PLAN_BUILDINGS,PLAN_SCALE,planPoint} from '../src/core/campus-layout.js';



// Deterministic, photo-inspired architectural study; dimensions are approximate.

// A real binary glTF is generated here; the website loads this file with GLTFLoader.

globalThis.FileReader = class {

  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }

  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }

};

const font = new FontLoader().parse(JSON.parse(await readFile(new URL('../node_modules/three/examples/fonts/helvetiker_regular.typeface.json', import.meta.url), 'utf8')));

const root = new THREE.Group();

root.name = 'Unismuh_Makassar_Campus';

root.userData = { source: 'User-provided aerial reference', accuracy: 'Artistic reconstruction; approximate dimensions, inferred rear elevations', up: 'Y' };

const palette = {

  ivory: [0xf2efdf, .78, .03], trim: [0xd6e3e3, .65, .04],

  blue: [0x008fc7, .36, .3], roof: [0x00a7d1, .4, .22],

  glass: [0x164a64, .22, .45], darkglass: [0x083950, .3, .3],

  gold: [0xe3bc69, .3, .65], paving: [0x99aab0, .94, 0],

  road: [0x344651, .94, 0], grass: [0x537663, 1, 0],

  leaf: [0x39705b, .95, 0], leaflight: [0x619477, 1, 0],

  trunk: [0x8b7964, 1, 0], line: [0xe1dbc1, .8, 0], base: [0x283e4b, .75, .1], water: [0x35cbd3,.15,.35],

};

const materials = Object.fromEntries(Object.entries(palette).map(([name,[color,roughness,metalness]]) => [name,new THREE.MeshStandardMaterial({name,color,roughness,metalness})]));

materials.glass.emissive.set(0xffce82);

materials.darkglass.emissive.set(0xffce82);

materials.glass.emissiveIntensity = materials.darkglass.emissiveIntensity = 0;

let buckets;

function begin(name) { const g = new THREE.Group(); g.name = name; root.add(g); buckets = { group:g, geos:{} }; }

function put(key, geo, x=0,y=0,z=0, rotation=0) {

  geo.rotateY(rotation); geo.translate(x,y,z); (buckets.geos[key] ??= []).push(geo);

}

function box(key,w,h,d,x,y,z) { put(key,new THREE.BoxGeometry(w,h,d),x,y,z); }

function cyl(key,rt,rb,h,x,y,z,segments=24) { put(key,new THREE.CylinderGeometry(rt,rb,h,segments),x,y,z); }

function dome(key,r,x,y,z) { const g = new THREE.SphereGeometry(r,32,16,0,Math.PI*2,0,Math.PI/2); g.scale(1,.65,1); put(key,g,x,y,z); }

function roof(w,d,h,x,y,z,key='roof') {

  // Four sloped faces, rectangular eaves and ridge.

  const v = [-w/2,0,d/2,w/2,0,d/2,0,h,0,w/2,0,d/2,w/2,0,-d/2,0,h,0,w/2,0,-d/2,-w/2,0,-d/2,0,h,0,-w/2,0,-d/2,-w/2,0,d/2,0,h,0];

  const g = new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); g.computeVertexNormals(); g.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(24).fill(0),2)); g.setIndex([...Array(12).keys()]); put(key,g,x,y,z);

}

function text(label,size,x,y,z,key='ivory') {

  const g = new TextGeometry(label,{font,size,depth:.05,curveSegments:2,bevelEnabled:false}); g.computeBoundingBox(); g.translate(-(g.boundingBox.max.x)/2,0,0);

  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); put(key,g,x,y,z);

}

function finish() {

  for (const [key,geos] of Object.entries(buckets.geos)) {

    const g = mergeGeometries(geos,false); if (!g) throw new Error(`Cannot merge ${key}`);

    g.computeBoundingBox(); g.computeBoundingSphere();

    const mesh = new THREE.Mesh(g,materials[key]); mesh.name = `${buckets.group.name}_${key}`;

    mesh.castShadow = mesh.receiveShadow = true; buckets.group.add(mesh); geos.forEach(g=>g.dispose());

  }

}

// Main tower: slender blue shaft, cream window grid, open lantern and pyramid.

begin('Menara_Iqro');

box('ivory',19,64,15,-15,32,-8);

box('blue',19.25,58,15.25,-15,33,-8);

for (const z of [-15.72,-.28]) {

  box('glass',12.8,56,.2,-15,33,z);

  for(let i=0;i<16;i++) {

    const y=6+i*3.5;

    box('ivory',14,.65,.55,-15,y,z);

    for (let j=0;j<4;j++) box('trim',.13,2.8,.58,-19.8+j*3.2,y+1.6,z);

  }

  for(let j=0;j<5;j++) box('ivory',.9,58,.8,-21.4+j*3.2,33,z);

  for (const x of [-24,-6]) box('ivory',.8,60,1.1,x,32,z);

}

// Side elevations remain blue, with fine horizontal seams.

for (const x of [-24.7,-5.3]) for(let i=0;i<17;i++) box('trim',.12,.13,15.3,x,4+i*3.5,-8);

for (const x of [-24.8,-5.2]) { box('blue',.6,61,3.4,x,32,-8); box('ivory',.7,62,.65,x,32,-14); }

box('ivory',21,1.1,17,-15,63,-8);

box('glass',18,6,14,-15,66.5,-8);

for(const z of [-15.4,-.6]) for(let i=0;i<7;i++) box('ivory',.8,6.1,.7,-23+i*2.67,66.5,z);

for(const x of [-24.2,-5.8]) for(let i=0;i<5;i++) box('ivory',.7,6, .8,x,66.5,-14+i*3);

box('ivory',22,1,18,-15,70,-8);

box('blue',23,.5,19,-15,70.65,-8);

roof(16,14,13,-15,70.9,-8,'blue');

cyl('gold',.08,.15,2,-15,84.8,-8,8);

text('UNISMUH',1.15,-15,68.9,-.1);

// Front entrance pavilion and small blue dome.

box('ivory',19,7,8,-15,3.5,3);

box('darkglass',13,5.4,.3,-15,3.4,7.1);

for(const x of [-23,-19,-11,-7]) box('ivory',.7,6.5,.9,x,3.25,7.5);

box('trim',21,.7,10,-15,7.1,3);

cyl('ivory',4.4,4.4,1.3,-15,8.1,3);

dome('roof',4.5,-15,8.7,3); cyl('gold',.1,.18,1.6,-15,12,3,8);

for(let i=0;i<5;i++) box('trim',17+i, .25,1.1,-15,.15+i*.25,11-i);

text('MENARA IQRO',.65,-15,6.1,7.7,'blue');

finish();

// Academic wings frame the tower and expose repeated recessed windows.

begin('Sayap_Akademik');

for(const cx of [-38,8]) {

  box('ivory',26,31,15,cx,15.5,-9);

  for(let floor=0;floor<8;floor++) {

    const y=2.8+floor*3.55;

    for (const z of [-1.35,-16.65]) for(let col=0;col<7;col++) {

      const x=cx-10.7+col*3.55;

      box('glass',2.35,2.55,.16,x,y,z);

      box('trim',2.6,.18,.8,x,y-1.3,z);

      box('trim',.11,2.6,.22,x,y,z+.04);

    }

    box('ivory',27,.55,16,cx,y-1.6,-9);

  }

  for(let j=0;j<8;j++) box('ivory',.6,33,1,cx-12.3+j*3.5,16.5,-.7);

  box('trim',28,.8,17,cx,32,-9);

  // Tall roofline arches suggested by narrow inset glazing and crowns.

  for(let j=0;j<7;j++) {

    box('glass',2,3,.25,cx-10.5+j*3.5,32.7,-1.25);

    const arch = new THREE.TorusGeometry(1.15,.28,6,16,Math.PI);

    put('ivory',arch,cx-10.5+j*3.5,33,-.95);

  }

  box('roof',25,.35,14,cx,33.8,-9);

}

finish();

// The domed building beside the tower is Balai Sidang (user correction).

begin('Balai_Sidang');

box('ivory',37,18,33,43,9,-13);

box('trim',39,.8,35,43,1,-13);

for(let j=0;j<8;j++) {

  let x=27.8+j*4.3;

  box('darkglass',2.4,6,.2,x,8,3.6);

  for(let y of [3,14.4]) box('glass',1.4,1.6,.3,x,y,3.7);

  box('ivory',.55,17,.7,x-1.85,9,4);

}

// Blue arch arcade on the visible left side.

for(let j=0;j<5;j++) {

  const z=-25+j*6;

  box('glass',.3,9,4.7,24.35,7,z);

  const arch = new THREE.TorusGeometry(2.4,.38,8,24,Math.PI); arch.rotateY(Math.PI/2);

  put('roof',arch,23.9,10.5,z);

  for(const zz of [z-2.4,z+2.4]) box('roof',.9,10.5,.65,23.9,5.25,zz);

}

box('blue',40,.9,36,43,18,-13);

roof(42,38,6.5,43,18.5,-13);

cyl('trim',7.4,8.2,1.8,43,24.4,-13,32);

dome('roof',7.7,43,25.2,-13);

cyl('gold',.12,.25,3.1,43,31.6,-13,12);

cyl('gold',.5,.5,.6,43,33.1,-13,12);

box('ivory',18,1.8,.3,43,16.5,4.7);

text('BALAI SIDANG',.85,43,16.1,4.95,'blue');

finish();

function academicBuilding(name,label,x,z,{width=30,depth=22,floors=4,rotation=0}={}){

  begin(name);

  const height=floors*3.4;

  box('ivory',width,height,depth,x,height/2,z);

  box('trim',width+2,.5,depth+2,x,.5,z);

  for(let floor=0;floor<floors;floor++){

    const y=2+floor*3.4;

    for(const side of [-1,1]){

      for(let col=0;col<7;col++){

        const cx=x-width*.4+col*width*.8/6;

        box('glass',2.4,2.1,.18,cx,y,z+side*(depth/2+.1));

        box('trim',2.6,.14,.45,cx,y-1.1,z+side*(depth/2+.15));

      }

      box('trim',width+1,.35,.5,x,y-1.5,z+side*(depth/2+.2));

    }

  }

  box('glass',6,3.2,.2,x,1.9,z+depth/2+.35);

  for(const dx of [-4,4])box('ivory',.65,4,3,x+dx,2,z+depth/2+1.2);

  box('trim',10,.45,4,x,4.2,z+depth/2+1.2);

  box('ivory',width-2,2,.5,x,height-.7,z+depth/2+.4);

  text(label,.72,x,height-1.2,z+depth/2+.7,'blue');

  box('blue',width+2,.5,depth+2,x,height+.3,z);

  roof(width+4,depth+4,4,x,height+.55,z,'blue');

  if(rotation)for(const geos of Object.values(buckets.geos))for(const geo of geos){geo.translate(-x,0,-z);geo.rotateY(rotation);geo.translate(x,0,z);}

  finish();

}

begin('Masjid');

box('ivory',30,10,26,-149,5,103);

box('trim',32,.7,28,-149,.6,103);

for(let col=0;col<5;col++){

  const x=-160+col*5.5;

  box('darkglass',3.3,5,.2,x,4,116.2);

  const arch=new THREE.TorusGeometry(1.65,.25,5,12,Math.PI);

  put('trim',arch,x,6.4,116.4);

  for(const dx of [-1.65,1.65])box('trim',.45,5.9,.5,x+dx,3.45,116.4);

}

box('blue',33,.6,29,-149,10.4,103);

roof(35,31,4,-149,10.7,103,'roof');

cyl('trim',5,5.5,1.2,-149,14.8,103,24);

dome('roof',5.2,-149,15.4,103);

cyl('gold',.12,.2,2,-149,19.8,103,8);

cyl('ivory',1.1,1.5,20,-167,10,94,12);

cyl('blue',1.7,1.7,.6,-167,19.7,94,12);

dome('roof',1.7,-167,20.1,94);

cyl('gold',.08,.13,1.7,-167,22,94,8);

text('MASJID KAMPUS',.72,-149,8.8,116.7,'blue');

finish();

// Small circular entrance building from the left foreground of the photo.

begin('Gerbang');

cyl('ivory',5,5,10,-47,5,21,24);

for(let y of [2,5,8]) cyl('glass',5.06,5.06,.7,-47,y,21,24);

cyl('blue',6.5,6.5,.65,-47,10.2,21,24);

roof(13,13,5,-47,10.6,21,'blue');

finish();

// Trace the campus boundary and circulation from the supplied A–T plan.

function relocate(id,oldX,oldZ,px,py,rotation=0,sx=1,sz=1){

 const part=root.children.find(g=>g.name===id),[x,z]=planPoint(px,py);

 part.traverse(o=>{if(o.isMesh){o.geometry.translate(-oldX,0,-oldZ);o.geometry.scale(sx,1,sz);o.geometry.rotateY(rotation);o.geometry.translate(x,0,z);}});

}

relocate('Menara_Iqro',-15,-8,1036,688,-Math.PI/2);

relocate('Sayap_Akademik',-15,-9,1036,688,-Math.PI/2,.9,1.1);
root.children.find(g=>g.name==='Sayap_Akademik').traverse(o=>{if(o.isMesh)o.geometry.translate(12,0,0);});

// One connected tower complex: two rear wings and a shared base.
const towerPart=root.children.find(g=>g.name==='Menara_Iqro');
const wingPart=root.children.find(g=>g.name==='Sayap_Akademik');
const [towerX,towerZ]=planPoint(1036,688);
begin('Kompleks_Iqro');
for(const part of [towerPart,wingPart])part.traverse(o=>{if(o.isMesh)(buckets.geos[o.material.name]??=[]).push(o.geometry.clone());});
box('ivory',23,6,68,towerX+8,3,towerZ);
box('trim',24,.45,69,towerX+8,6.2,towerZ);
finish();
root.remove(towerPart,wingPart);
root.children.find(g=>g.name==='Kompleks_Iqro').name='Menara_Iqro';

relocate('Balai_Sidang',43,-13,845,930,.25,1,2);

relocate('Masjid',-149,103,423,540,0,.72,.72);

// The circular entry marker on the plan is an arrival plaza, not a building.

root.remove(root.children.find(g=>g.name==='Gerbang'));

for(const [code,id,label,px,py,width,depth,floors,rotation] of PLAN_BUILDINGS){

 const [x,z]=planPoint(px,py);academicBuilding(id,code+' '+(id==='FKIP'?'FKIP':id==='Pascasarjana'?'PASCA':''),x,z,{width,depth,floors,rotation});

 if(id==='UMC')academicExtension(x,z);

}

function academicExtension(x,z){

 const part=root.children.find(g=>g.name==='UMC');

 begin('UMC_Extension');box('ivory',11,10,7,x+8,5,z+8);roof(13,9,3,x+8,10,z+8);finish();

 const extra=root.children.at(-1);part.add(...extra.children.slice());root.remove(extra);

}

// E: stepped/star-like library footprint, unlike a standard rectangular block.

begin('Perpustakaan');

const [libraryX,libraryZ]=planPoint(433,690);

box('ivory',19,11,19,libraryX,5.5,libraryZ);

for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){

 put('ivory',new THREE.BoxGeometry(10,8,7),libraryX+Math.sin(a)*11,4,libraryZ+Math.cos(a)*11,a);

 put('glass',new THREE.BoxGeometry(8,3,.2),libraryX+Math.sin(a)*14.6,4,libraryZ+Math.cos(a)*14.6,a);

}

roof(26,26,6,libraryX,11,libraryZ);text('E PERPUSTAKAAN',.7,libraryX,9,libraryZ+10,'blue');finish();

begin('Lansekap');

const outline=[[310,621],[370,470],[447,468],[520,327],[1250,558],[1180,855],[1100,1100],[985,1360],[720,1300],[748,1160],[433,1110],[455,988],[300,966]];

const shape=new THREE.Shape();outline.forEach(([px,py],i)=>{const [x,z]=planPoint(px,py);i?shape.lineTo(x,-z):shape.moveTo(x,-z);});shape.closePath();

const paved=new THREE.ShapeGeometry(shape);paved.rotateX(-Math.PI/2);put('paving',paved,0,.1,0);

function road(points,width=7,key='road'){

 for(let i=1;i<points.length;i++){const [x1,z1]=planPoint(...points[i-1]),[x2,z2]=planPoint(...points[i]);put(key,new THREE.BoxGeometry(width,.12,Math.hypot(x2-x1,z2-z1)+width*.5),(x1+x2)/2,.25,(z1+z2)/2,Math.atan2(x2-x1,z2-z1));}

}

road([[306,633],[524,610],[745,587],[976,574]],7);

road([[526,333],[518,610],[530,775],[484,844]],6);

road([[302,843],[483,867],[730,958],[756,1060],[859,1119],[814,1260]],7);

road([[748,586],[774,737],[767,781]],6);

// Public streets: Sultan Alauddin west and Tala’salapang north.

road([[230,220],[216,1130]],11);road([[269,291],[394,289],[1240,469]],10);

text('JL SULTAN ALAUDDIN',1.1,-161,.5,23,'ivory');

const [streetX,streetZ]=planPoint(810,355);text('JL TALASALAPANG',1.1,streetX,.5,streetZ,'ivory');

// Fountain garden is the only green plot shown here; there are no trees.

box('trim',29,.2,30,-21,.3,25);box('grass',27,.2,28,-21,.45,25);

// Arrival plaza circle removed at the user's request; keep the road open.

// Each building carries its plan code; names remain in the asset list.

finish();

// A designed fountain in the front garden, requested as an addition to the photo.

begin('Air_Mancur');

cyl('trim',7,7.4,.6,-21,1,25,64);

cyl('blue',6.6,6.6,.55,-21,1.45,25,64);

cyl('water',6.1,6.1,.12,-21,1.74,25,64);

const lip=new THREE.TorusGeometry(6.55,.28,8,64);lip.rotateX(Math.PI/2);put('ivory',lip,-21,1.85,25);

cyl('ivory',.65,1.3,2.5,-21,2.8,25,24);

cyl('trim',2.4,1.5,.45,-21,4.1,25,32);

cyl('water',2.2,2.2,.08,-21,4.36,25,32);

cyl('gold',.14,.24,.5,-21,4.55,25,12);

for(let i=0;i<8;i++){

  const a=i*Math.PI/4;

  const jet=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-21,4.6,25),new THREE.Vector3(-21+Math.cos(a)*2.3,10,25+Math.sin(a)*2.3),new THREE.Vector3(-21+Math.cos(a)*5.3,1.9,25+Math.sin(a)*5.3));

  put('water',new THREE.TubeGeometry(jet,20,.055,5,false));

}

finish();

root.updateMatrixWorld(true);

const exporter = new GLTFExporter();

await mkdir(new URL('../public/models/',import.meta.url),{recursive:true});

const fixedNames={Menara_Iqro:['menara-iqro','K / K1 · Menara Iqro dan dua sayap belakang'],Perkuliahan_Bersama:['perkuliahan-bersama','K1 · Gedung Perkuliahan Bersama'],Masjid:['masjid','C · Masjid Subulussalam Al-Khoory'],Balai_Sidang:['balai-sidang','N · Balai Sidang Muktamar 47'],Perpustakaan:['perpustakaan','E · UPT Perpustakaan / IT / BKD / KOMDIS-ETIK'],Lansekap:['lansekap','Jalan dan tapak kampus tanpa pepohonan'],Air_Mancur:['air-mancur','Taman dan air mancur']};

const names={...fixedNames,...Object.fromEntries(PLAN_BUILDINGS.map(([code,id,label])=>[id,[id.toLowerCase().replaceAll('_','-'),code+' · '+label]]))};

const manifest={version:7,description:'Layout traced from user-provided A–T campus plan. Approximate architectural heights and facades from aerial reference.',layout:{source:'photo_6194783613841248516_w.jpg',northAxis:'-Z',eastAxis:'+X',trees:false,planScale:PLAN_SCALE,spacing:1.4545454545,connectedTower:true,arrivalCircle:false,codes:{...Object.fromEntries(PLAN_BUILDINGS.map(([code,id])=>[code,id])),C:'Masjid',E:'Perpustakaan',K:'Menara_Iqro',K1:'Menara_Iqro',N:'Balai_Sidang'}},assets:[]};

for(const part of root.children){

  const bounds=new THREE.Box3().setFromObject(part),center=bounds.getCenter(new THREE.Vector3());

  const offset=new THREE.Vector3(center.x,0,center.z),copy=part.clone(true);

  copy.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.geometry.translate(-offset.x,0,-offset.z);}});

  copy.userData={...root.userData,campusPosition:offset.toArray()};

  const [slug,label]=names[part.name],file=`${slug}.glb`;

  const result=await exporter.parseAsync(copy,{binary:true,onlyVisible:true});

  await writeFile(new URL(`../public/models/${file}`,import.meta.url),Buffer.from(result));

  let triangles=0,meshes=0;copy.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});

  const hash=createHash('sha256').update(Buffer.from(result)).digest('hex').slice(0,12);

  manifest.assets.push({id:part.name,label,file,hash,position:offset.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},bytes:result.byteLength,meshes,triangles});

  copy.traverse(o=>o.geometry?.dispose());

}

await writeFile(new URL('../public/models/manifest.json',import.meta.url),JSON.stringify(manifest,null,2));

console.log(JSON.stringify(manifest,null,2));

