import assert from 'node:assert/strict';
import {renderPixelRatio,RenderBudget} from '../src/core/render-budget.js';
// Keep a 4K / Retina exhibition screen within the GPU pixel budget.
for(const [w,h,dpr,low] of [[3840,2160,2,false],[1920,1080,2,false],[390,844,3,true]]){
 const ratio=renderPixelRatio(w,h,dpr,low);
 assert(w*h*ratio*ratio<=(low?900000:2100000)+1);
 assert(ratio<=dpr);
}
const budget=new RenderBudget();
for(let i=0;i<180;i++)budget.sample(1000/60);
assert.equal(budget.scale,1,'Healthy frame intervals retain quality');
for(let i=0;i<90;i++)budget.sample(35);
assert.equal(budget.scale,.85,'Sustained slow frames lower resolution');
for(let i=0;i<900;i++)budget.sample(35);
assert.equal(budget.scale,.65,'Quality has a stable lower bound');
budget.sample(2000);
assert.equal(budget.samples,0,'Returning from a hidden tab does not count as slow rendering');
assert(renderPixelRatio(1920,1080,2,false,.65)<renderPixelRatio(1920,1080,2,false));
console.log('PASS pixel budgets, sustained-frame adaptation, quality floor and hidden-tab reset');
