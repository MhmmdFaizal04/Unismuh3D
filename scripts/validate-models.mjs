import {readFile} from 'node:fs/promises';

import assert from 'node:assert/strict';

import {createHash} from 'node:crypto';

const base=new URL('../public/models/',import.meta.url);

const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));

assert.equal(manifest.assets.length,29);

assert.equal(new Set(manifest.assets.map(a=>a.file)).size,29);

let total=0;

for(const asset of manifest.assets){

 const data=await readFile(new URL(asset.file,base));

 assert.equal(asset.hash,createHash('sha256').update(data).digest('hex').slice(0,12),'Cache version matches model content');

 assert.equal(data.readUInt32LE(0),0x46546c67,`${asset.file}: GLB magic`);

 assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);assert.equal(data.length,asset.bytes);

 const jsonLength=data.readUInt32LE(12);assert.equal(data.readUInt32LE(16),0x4e4f534a);

 const gltf=JSON.parse(data.subarray(20,20+jsonLength).toString('utf8'));

 assert.equal(gltf.asset.version,'2.0');assert.ok(gltf.scenes.length>0);assert.ok(gltf.meshes.length>0);

 const binaryOffset=20+jsonLength;assert.equal(data.readUInt32LE(binaryOffset+4),0x004e4942);

 const binaryLength=data.readUInt32LE(binaryOffset);assert.equal(binaryOffset+8+binaryLength,data.length);

 for(const buffer of gltf.buffers){assert.equal(buffer.uri,undefined,`${asset.file}: external buffer`);assert.ok(buffer.byteLength<=binaryLength);}

 for(const image of gltf.images??[])assert.equal(image.uri,undefined,`${asset.file}: external image`);

 for(const view of gltf.bufferViews){assert.ok((view.byteOffset??0)+view.byteLength<=binaryLength);assert.equal((view.byteOffset??0)%4,0);}

 const actualMin=[Infinity,Infinity,Infinity],actualMax=[-Infinity,-Infinity,-Infinity];

 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){const pos=gltf.accessors[primitive.attributes.POSITION];assert.equal(pos.type,'VEC3');assert.ok(pos.count>0);assert.ok(pos.min.every(Number.isFinite));assert.ok(pos.max.every(Number.isFinite));for(let axis=0;axis<3;axis++){actualMin[axis]=Math.min(actualMin[axis],pos.min[axis]+asset.position[axis]);actualMax[axis]=Math.max(actualMax[axis],pos.max[axis]+asset.position[axis]);}}

 for(let axis=0;axis<3;axis++){assert(Math.abs(actualMin[axis]-asset.bounds.min[axis])<.001,`${asset.file}: world minimum matches GLB`);assert(Math.abs(actualMax[axis]-asset.bounds.max[axis])<.001,`${asset.file}: world maximum matches GLB`);}

 assert.ok(asset.position.every(Number.isFinite));

 total+=data.length;console.log(`PASS ${asset.file}: ${data.length} bytes, ${gltf.meshes.length} meshes`);

}

const byId=Object.fromEntries(manifest.assets.map(a=>[a.id,a]));

assert.equal(manifest.layout.trees,false);

const expected=['A','B','AB','C','D','E','F','G','H','I','J','K','K1','M','M1','M2','M3','M4','M5','M6','M7','N','O','P','Q','R','S','T'];

assert.deepEqual(Object.keys(manifest.layout.codes).sort(),expected.sort());

for(const id of Object.values(manifest.layout.codes))assert(byId[id],`Missing plan model ${id}`);

assert(byId.Masjid.position[2]<byId.Perpustakaan.position[2],'C is north of E');

assert(byId.Pascasarjana.position[2]>byId.SMA_Unismuh.position[2],'B is south of A');

assert(byId.Lab_Komputer_FKIP.position[0]>byId.SMA_Unismuh.position[0],'AB is the east arm of A/B complex');

assert(byId.Asrama_Putri.position[2]<byId.Asrama_Putra.position[2],'O is north of P');

assert(byId.PKM.position[2]>byId.Asrama_Putra.position[2],'Q is south of P');

assert(byId.Balai_Sidang.position[2]>byId.Menara_Iqro.position[2],'N is south of K');

const landscape=await readFile(new URL(byId.Lansekap.file,base));

const n=landscape.readUInt32LE(12),g=JSON.parse(landscape.subarray(20,20+n).toString());

assert(!g.materials.some(m=>['leaf','leaflight','trunk'].includes(m.name)),'No tree geometry');

assert(total<6*1024*1024,'Campus GLBs stay under 6 MiB');

console.log(`Validated ${manifest.assets.length} independent GLB 2.0 files and campus spacing; total ${(total/1024/1024).toFixed(2)} MiB.`);


assert.equal(manifest.layout.codes.K1,'Menara_Iqro');
assert(manifest.layout.connectedTower);
assert(!byId.Perkuliahan_Bersama,'Rear wings use the same GLB as the tower');
for(const id of ['SMA_Unismuh','Pascasarjana']){
 const arm=byId[id].bounds,link=byId.Lab_Komputer_FKIP.bounds;
 assert(arm.max[0]>link.min[0]&&arm.min[0]<link.max[0],'AB connects to '+id+' along X');
 assert(arm.max[2]>link.min[2]&&arm.min[2]<link.max[2],'AB connects to '+id+' along Z');
}
assert(byId.SMA_Unismuh.bounds.max[2]<byId.Pascasarjana.bounds.min[2],'A/B retain an open courtyard');
