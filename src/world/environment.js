import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TOWER } from "./tower.js";

/* ============================================================
   Site + sky + lighting rig, with a day <-> night blend.
   ============================================================ */

const DAY = {
  sky: new THREE.Color(0x9fc4e4),
  horizon: new THREE.Color(0xe8eef3),
  fog: new THREE.Color(0xb6c8d8),
  sun: new THREE.Color(0xfff2d6),
  sunI: 2.6,
  hemiSky: new THREE.Color(0xbcd8f2),
  hemiGround: new THREE.Color(0x6a6152),
  hemiI: 0.85,
  ambientI: 0.35,
  ground: new THREE.Color(0x4d5a4a),
};

const NIGHT = {
  sky: new THREE.Color(0x070b16),
  horizon: new THREE.Color(0x16202f),
  fog: new THREE.Color(0x0a0f1a),
  sun: new THREE.Color(0x9fb6ff),
  sunI: 0.35,
  hemiSky: new THREE.Color(0x121c30),
  hemiGround: new THREE.Color(0x05070c),
  hemiI: 0.28,
  ambientI: 0.12,
  ground: new THREE.Color(0x121a18),
};

/* ---------------- sky dome shader ---------------- */
const skyVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uNight;
  varying vec3 vWorld;

  // cheap hash for star field
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vWorld);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uBottom, uTop, pow(h, 0.85));

    // stars, only at night and above the horizon
    if (uNight > 0.01 && dir.y > 0.02) {
      vec2 cell = floor(dir.xz * 260.0 / max(dir.y, 0.15));
      float s = hash(cell);
      float star = smoothstep(0.9975, 1.0, s) * uNight * dir.y * 2.2;
      col += vec3(star);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------------- procedural ground texture ---------------- */
function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#3f4a3c";
  ctx.fillRect(0, 0, 512, 512);

  // paving noise
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const a = 0.02 + Math.random() * 0.07;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${a})`;
    ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(26, 26);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------- surrounding campus blocks ---------------- */
function buildContext(quality) {
  const group = new THREE.Group();
  group.name = "context";

  const wallGeos = [];
  const roofGeos = [];
  const glassGeos = [];

  // Deterministic pseudo-random so the layout is stable across reloads.
  let seed = 20190617;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const blocks = quality === "low" ? 14 : 24;
  const keepOut = 46; // don't intersect the tower podium

  for (let i = 0; i < blocks; i++) {
    const ang = (i / blocks) * Math.PI * 2 + rnd() * 0.5;
    const dist = keepOut + rnd() * 150;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist * 0.85;

    const w = 14 + rnd() * 26;
    const d = 12 + rnd() * 22;
    const floors = 1 + Math.floor(rnd() * 4);
    const h = floors * 4.2;
    const rot = rnd() * Math.PI;

    const m = new THREE.Matrix4()
      .makeRotationY(rot)
      .setPosition(x, h / 2, z);

    const body = new THREE.BoxGeometry(w, h, d).applyMatrix4(m);
    wallGeos.push(body);

    const roof = new THREE.BoxGeometry(w + 1.2, 0.7, d + 1.2).applyMatrix4(
      new THREE.Matrix4().makeRotationY(rot).setPosition(x, h + 0.35, z),
    );
    roofGeos.push(roof);

    // window band per floor
    for (let f = 0; f < floors; f++) {
      const y = f * 4.2 + 2.4;
      const band = new THREE.BoxGeometry(w + 0.25, 1.9, d + 0.25).applyMatrix4(
        new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z),
      );
      glassGeos.push(band);
    }
  }

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd9d2c4,
    roughness: 0.85,
    metalness: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x8f6b52,
    roughness: 0.9,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2a3f4a,
    roughness: 0.25,
    metalness: 0.4,
    emissive: new THREE.Color(0xffc06a),
    emissiveIntensity: 0,
  });

  const add = (geos, mat, name) => {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  add(wallGeos, wallMat, "ctx-walls");
  add(roofGeos, roofMat, "ctx-roofs");
  add(glassGeos, glassMat, "ctx-glass");

  return { group, glassMat, wallMat, roofMat };
}

/* ---------------- trees (instanced) ---------------- */
function buildTrees(quality) {
  const count = quality === "low" ? 48 : 120;

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 3.2, 6);
  trunkGeo.translate(0, 1.6, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5a4632,
    roughness: 0.9,
  });

  const leafGeo = new THREE.IcosahedronGeometry(1.9, 0);
  leafGeo.translate(0, 4.1, 0);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2f6b3a,
    roughness: 0.8,
    flatShading: true,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
  trunks.castShadow = leaves.castShadow = true;
  leaves.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  let seed = 7771;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let i = 0; i < count; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = 34 + rnd() * 165;
    pos.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist * 0.9);
    const s = 0.8 + rnd() * 0.9;
    scl.set(s, s * (0.85 + rnd() * 0.5), s);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
    m.compose(pos, q, scl);
    trunks.setMatrixAt(i, m);
    leaves.setMatrixAt(i, m);
  }
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.name = "trees";
  group.add(trunks, leaves);
  return { group, leafMat, trunkMat };
}

/* ============================================================
   Public API
   ============================================================ */

export function buildEnvironment(stage) {
  const { scene, quality } = stage;
  const group = new THREE.Group();
  group.name = "environment";

  /* ---- sky dome ---- */
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: DAY.sky.clone() },
      uBottom: { value: DAY.horizon.clone() },
      uNight: { value: 0 },
    },
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), skyMat);
  sky.name = "sky";
  group.add(sky);

  /* ---- ground ---- */
  const groundTex = makeGroundTexture();
  const groundMat = new THREE.MeshStandardMaterial({
    color: DAY.ground.clone(),
    map: groundTex,
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(700, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = "ground";
  group.add(ground);

  /* ---- plaza in front of the tower ---- */
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xb9b3a4,
    roughness: 0.8,
    metalness: 0.03,
  });
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(TOWER.W + 60, 0.35, TOWER.D + 54),
    plazaMat,
  );
  plaza.position.set(0, 0.18, 12);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Reflecting pool (dark, glossy -> catches the tower's glow at night)
  const poolMat = new THREE.MeshPhysicalMaterial({
    color: 0x10222b,
    roughness: 0.06,
    metalness: 0.2,
    clearcoat: 1,
  });
  const pool = new THREE.Mesh(new THREE.BoxGeometry(34, 0.3, 12), poolMat);
  pool.position.set(0, 0.32, TOWER.D / 2 + 26);
  group.add(pool);

  /* ---- context + trees ---- */
  const context = buildContext(quality);
  group.add(context.group);

  const trees = buildTrees(quality);
  group.add(trees.group);

  /* ---- lighting rig ---- */
  const hemi = new THREE.HemisphereLight(
    DAY.hemiSky.clone(),
    DAY.hemiGround.clone(),
    DAY.hemiI,
  );
  hemi.position.set(0, 80, 0);
  group.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, DAY.ambientI);
  group.add(ambient);

  const sun = new THREE.DirectionalLight(DAY.sun.clone(), DAY.sunI);
  sun.position.set(88, 122, 74);
  sun.castShadow = true;
  const sm = quality === "low" ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 420;
  const d = 130;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  group.add(sun);
  group.add(sun.target);

  // Cool rim light so the tower separates from the sky
  const rim = new THREE.DirectionalLight(0x8fb8ff, 0.5);
  rim.position.set(-96, 58, -82);
  group.add(rim);

  // Warm uplights at the base of the tower (become dominant at night)
  const upLights = [];
  for (const ux of [-16, 16]) {
    const p = new THREE.PointLight(0xffb867, 0, 70, 2);
    p.position.set(ux, 4, TOWER.D / 2 + 9);
    group.add(p);
    upLights.push(p);
  }

  // Spotlight grazing the facade, emphasising the fins
  const facadeSpot = new THREE.SpotLight(
    0xffd9a3,
    0,
    240,
    Math.PI / 7,
    0.55,
    1.6,
  );
  facadeSpot.position.set(0, 6, TOWER.D / 2 + 62);
  facadeSpot.target.position.set(0, TOWER.BODY_H * 0.6, 0);
  group.add(facadeSpot, facadeSpot.target);

  scene.add(group);

  /* ---- day <-> night blend ---- */
  const tmp = new THREE.Color();
  let nightAmount = 0;

  function setNight(t) {
    nightAmount = THREE.MathUtils.clamp(t, 0, 1);
    const k = nightAmount;

    skyMat.uniforms.uTop.value.copy(DAY.sky).lerp(NIGHT.sky, k);
    skyMat.uniforms.uBottom.value.copy(DAY.horizon).lerp(NIGHT.horizon, k);
    skyMat.uniforms.uNight.value = k;

    scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, k);
    scene.fog.near = THREE.MathUtils.lerp(160, 120, k);
    scene.fog.far = THREE.MathUtils.lerp(620, 470, k);

    groundMat.color.copy(DAY.ground).lerp(NIGHT.ground, k);

    hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, k);
    hemi.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, k);
    hemi.intensity = THREE.MathUtils.lerp(DAY.hemiI, NIGHT.hemiI, k);

    ambient.intensity = THREE.MathUtils.lerp(DAY.ambientI, NIGHT.ambientI, k);

    sun.color.copy(DAY.sun).lerp(NIGHT.sun, k);
    sun.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, k);

    rim.intensity = THREE.MathUtils.lerp(0.5, 0.9, k);

    upLights.forEach((p) => (p.intensity = k * 260));
    facadeSpot.intensity = k * 900;

    // Neighbouring buildings switch their lights on
    context.glassMat.emissiveIntensity = k * 0.85;
    tmp.setHex(0x2a3f4a).lerp(new THREE.Color(0x141c24), k);
    context.glassMat.color.copy(tmp);
    context.wallMat.color.copy(
      new THREE.Color(0xd9d2c4).lerp(new THREE.Color(0x5d6067), k * 0.8),
    );
    trees.leafMat.color.copy(
      new THREE.Color(0x2f6b3a).lerp(new THREE.Color(0x12241a), k * 0.85),
    );
  }
  setNight(0);

  function dispose() {
    group.traverse((o) => {
      if (o.isMesh || o.isInstancedMesh) {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose();
      }
    });
    groundTex.dispose();
    scene.remove(group);
  }

  return {
    group,
    sky,
    skyMat,
    ground,
    pool,
    sun,
    hemi,
    ambient,
    upLights,
    facadeSpot,
    context,
    trees,
    setNight,
    get nightAmount() {
      return nightAmount;
    },
    dispose,
  };
}
