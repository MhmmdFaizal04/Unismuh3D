import * as THREE from 'three';

// Recover the reference's finger hierarchy from its world-space GLB skin animation.
// Each chain is bent in local joint space, then converted back to the exported skin joints.
export function createFingerInteraction(model, hand) {
 const data=model.getObjectByName('Unismuh_Emblem_Hand')?.userData.fingerRig;
 if(!data?.length)throw new Error('Hand finger hierarchy missing');
 const center=new THREE.Vector3(-.0105758577,.548192548,-.0485146008);
 const facing=new THREE.Quaternion(0,-Math.SQRT1_2,-Math.SQRT1_2,0).invert();
 const inverseFacing=facing.clone().invert();
 const rootMatrix=new THREE.Matrix4().fromArray([1.08842,0,-.159194,0,19082e-22,1.1,763278e-23,0,.159194,0,1.08842,0,-.00995603,.524108,-.0576238,1]).transpose();
 const inverseRoot=rootMatrix.clone().invert();
 const rigRoot=new THREE.Object3D(),joints=[],angles=[.1,.25,.25,.3];
 let group=-1;
 for(const entry of data){
  const joint=new THREE.Object3D();joint.name=entry.name;const parent=entry.parentIndex<0?rigRoot:joints[entry.parentIndex-1];
  if(!parent)throw new Error('Invalid finger parent');parent.add(joint);
  if(parent===rigRoot)group++;
  joint.position.fromArray(entry.position);joint.quaternion.fromArray(entry.quaternion);joint.scale.fromArray(entry.scale);
  joints.push(joint);joint.userData={id:Number(entry.name),group,parentId:entry.data?.parentIdx?.value,parentRest:entry.data?.parentMatrix?.value};
 }
 rigRoot.updateMatrixWorld(true);
 for(const joint of joints){joint.userData.rest=joint.matrixWorld.clone();joint.userData.restInverse=joint.matrixWorld.clone().invert();joint.userData.local=new THREE.Matrix4();joint.userData.baseParent=new THREE.Matrix4();}
 const bones=Array.from({length:36},(_,i)=>model.getObjectByName(`Hand_Joint_${i}`));
 if(bones.some(b=>!b))throw new Error('Finger skin joints missing');
 const skinMatrices=bones.map(()=>new THREE.Matrix4()),p=new THREE.Vector3(),q=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1),temp=new THREE.Matrix4(),turn=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0),scratchScale=new THREE.Vector3();
 const basePositions=bones.map(b=>b.position.clone()),baseQuaternions=bones.map(b=>b.quaternion.clone());
 const weights=[0,0,0,0],pointer=new THREE.Vector2(2,2);let hovering=false;
 return {
  reset(){bones.forEach((b,i)=>{b.position.copy(basePositions[i]);b.quaternion.copy(baseQuaternions[i]);});},
  capture(){bones.forEach((b,i)=>{basePositions[i].copy(b.position);baseQuaternions[i].copy(b.quaternion);});},
  move(x,y){pointer.set(x,y);hovering=true;},
  leave(){hovering=false;},
  update(delta,enabled){
   let moving=false;const horizontal=1-THREE.MathUtils.smoothstep(Math.abs(pointer.x),.2,.4);
   for(let i=0;i<4;i++){
    const phase=THREE.MathUtils.clamp((-pointer.y-.2-i*.1)/.5,0,1);
    const target=enabled&&hovering?(1-Math.abs(phase-.5)*2)*horizontal:0;
    const next=THREE.MathUtils.damp(weights[i],target,12,delta);
    if(Math.abs(next-weights[i])>.00002)moving=true;
    weights[i]=Math.abs(target-next)<.0001?target:next;
   }
   return moving;
  },
  poseKey(){return weights.map(v=>Math.round(v*10000)).join(',');},
  apply(strength){
   if(!weights.some(w=>w*strength>.00001))return;
   for(let i=0;i<bones.length;i++){
    p.copy(bones[i].position).applyQuaternion(inverseFacing).multiplyScalar(.1).add(center);
    q.copy(bones[i].quaternion).premultiply(inverseFacing);skinMatrices[i].compose(p,q,unit);
   }
   // Derive a local pose from the unmodified animation before bending anything.
   for(const joint of joints){const d=joint.userData;
    joint.matrixWorld.copy(inverseRoot).multiply(skinMatrices[d.id]).multiply(d.rest);
    if(joint.parent===rigRoot)d.baseParent.copy(inverseRoot).multiply(skinMatrices[d.parentId]).multiply(temp.fromArray(d.parentRest));
    else d.baseParent.copy(joint.parent.matrixWorld);
    d.local.copy(d.baseParent).invert().multiply(joint.matrixWorld);
   }
   for(const joint of joints){const d=joint.userData;
    d.local.decompose(joint.position,joint.quaternion,joint.scale);
    if(joint.children.length){turn.setFromAxisAngle(axis,weights[d.group]*angles[d.group]*strength);joint.quaternion.premultiply(turn);}
    joint.matrix.compose(joint.position,joint.quaternion,unit);
    joint.matrixWorld.copy(joint.parent===rigRoot?d.baseParent:joint.parent.matrixWorld).multiply(joint.matrix);
    temp.copy(rootMatrix).multiply(joint.matrixWorld).multiply(d.restInverse);temp.decompose(p,q,scratchScale);
    const bone=bones[d.id];bone.position.copy(p).sub(center).applyQuaternion(facing).multiplyScalar(10);bone.quaternion.copy(q).premultiply(facing);
   }

  }
 };
}
