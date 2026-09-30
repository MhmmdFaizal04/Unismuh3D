import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=new URL('../public/models/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
assert.equal(manifest.assets.length,7);
assert.equal(new Set(manifest.assets.map(a=>a.file)).size,7);
let total=0;
for(const asset of manifest.assets){
 const data=await readFile(new URL(asset.file,base));
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
 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){const pos=gltf.accessors[primitive.attributes.POSITION];assert.equal(pos.type,'VEC3');assert.ok(pos.count>0);assert.ok(pos.min.every(Number.isFinite));assert.ok(pos.max.every(Number.isFinite));}
 assert.ok(asset.position.every(Number.isFinite));
 total+=data.length;console.log(`PASS ${asset.file}: ${data.length} bytes, ${gltf.meshes.length} meshes`);
}
console.log(`Validated 7 independent GLB 2.0 files; total ${(total/1024/1024).toFixed(2)} MiB.`);
