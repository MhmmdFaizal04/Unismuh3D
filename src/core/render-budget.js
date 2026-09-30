// Limit GPU pixel work independently of the CSS viewport (text stays sharp).
export function renderPixelRatio(width,height,deviceRatio,low,scale=1){
 const pixelLimit=low?900000:2100000;
 return Math.min(deviceRatio,low?1.15:1.5,Math.sqrt(pixelLimit/Math.max(1,width*height)))*scale;
}
export class RenderBudget{
 scale=1;
 samples=0;
 elapsed=0;
 reset(){this.samples=0;this.elapsed=0;}
 sample(interval){
  if(interval<=0||interval>250){this.reset();return false;}
  this.samples++;this.elapsed+=interval;
  if(this.samples<90)return false;
  const slow=this.elapsed/this.samples>23;
  this.reset();
  if(!slow||this.scale<=.65)return false;
  this.scale=Math.max(.65,this.scale-.15);
  return true;
 }
}
