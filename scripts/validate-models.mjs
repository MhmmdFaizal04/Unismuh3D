import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base=new URL('../public/models/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
assert.equal(manifest.assets.length,11);
assert.equal(new Set(manifest.assets.map(a=>a.file)).size,11);
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
const road=manifest.layout.road;
assert(byId.Air_Mancur.bounds.max[2]<road.centerZ-road.width/2,'Clear gap before the road');
assert(byId.FKIP.bounds.min[2]>road.centerZ+road.width/2,'FKIP is across the road');
assert(byId.Perpustakaan.bounds.min[2]>byId.FKIP.bounds.max[2],'Library is in front of FKIP');
assert(byId.Masjid.bounds.max[0]<byId.Perpustakaan.bounds.min[0],'Mosque is beside the library');
assert(Math.abs(byId.Masjid.position[2]-byId.Perpustakaan.position[2])<1,'Mosque and library align in depth');
const law=manifest.layout.entrances.Fakultas_Hukum,pasca=manifest.layout.entrances.Pascasarjana;
const delta=[pasca.center[0]-law.center[0],pasca.center[2]-law.center[2]];
const frontOffset=delta[0]*law.direction[0]+delta[1]*law.direction[2]+pasca.frontDepth-law.frontDepth;
assert(Math.abs(frontOffset)<.001,'Hukum and Pascasarjana front walls align along the rotated facade');
const sideOffset=-delta[0]*law.direction[2]+delta[1]*law.direction[0];
assert(sideOffset>40,'Pascasarjana sits laterally beside Hukum with an open gap');
assert(Math.abs(pasca.direction[0]-law.direction[0])<.001&&Math.abs(pasca.direction[2]-law.direction[2])<.001,'Both buildings face the same direction');
assert(byId.Fakultas_Hukum.bounds.max[0]<byId.Sayap_Akademik.bounds.min[0],'Hukum sits beside the tower complex');
const target=[-21-law.center[0],25-law.center[2]],length=Math.hypot(...target);
assert(law.direction[0]*target[0]/length+law.direction[2]*target[1]/length>.9999,'Hukum entrance points to fountain');
assert(byId.Balai_Sidang.position[0]>byId.Menara_Iqro.position[0],'Balai Sidang remains beside the tower');
assert(total<3*1024*1024,'Campus GLBs stay within the 3 MiB asset budget');
console.log(`Validated ${manifest.assets.length} independent GLB 2.0 files and campus spacing; total ${(total/1024/1024).toFixed(2)} MiB.`);
