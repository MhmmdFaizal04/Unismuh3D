import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHOTS} from '../src/core/campus-viewer.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const manifest=JSON.parse(await readFile(new URL('../public/models/manifest.json',import.meta.url),'utf8'));
const panels=[...html.matchAll(/<section class="chapter[^\"]*" id="([^\"]+)"/g)].map(m=>m[1]);
const stops=[...html.matchAll(/class="chapter-stop[^\"]*" data-chapter="(\d+)"/g)].map(m=>Number(m[1]));
assert.equal(SHOTS.length,10);assert.equal(panels.length,SHOTS.length);assert.deepEqual(stops,SHOTS.map((_,i)=>i));
for(const shot of SHOTS){assert(Object.values(shot).every(Number.isFinite));assert(shot.fov>=30&&shot.fov<=65);}
const expected={fkip:'FKIP',perpustakaan:'Perpustakaan',masjid:'Masjid',hukum:'Fakultas_Hukum',pascasarjana:'Pascasarjana','balai-sidang':'Balai_Sidang',menara:'Menara_Iqro'};
for(const [panel,id] of Object.entries(expected)){
 const shot=SHOTS[panels.indexOf(panel)],bounds=manifest.assets.find(a=>a.id===id).bounds;
 assert(shot.tx>=bounds.min[0]&&shot.tx<=bounds.max[0]&&shot.tz>=bounds.min[2]&&shot.tz<=bounds.max[2],`${panel}: camera targets its building`);
}
// The camera must not pass through any building while interpolating the route.
const buildings=manifest.assets.filter(a=>!['Lansekap','Air_Mancur'].includes(a.id));
for(let i=1;i<SHOTS.length;i++)for(let step=0;step<=60;step++){
 const t=step/60,p=['x','y','z'].map(k=>SHOTS[i-1][k]*(1-t)+SHOTS[i][k]*t);
 for(const a of buildings)assert(!p.every((v,axis)=>v>a.bounds.min[axis]&&v<a.bounds.max[axis]),`Camera crosses ${a.id} on route ${i}`);
}
assert.equal(panels.at(-1),'puncak');assert.equal(SHOTS.at(-1).ty,75);
console.log('PASS 10 chapters, matching navigation, building targets, camera clearance and final summit');
