import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/* ============================================================
   Menara Iqro - procedural model
   Slab tower, 17 floors, cream concrete frame, vertical fins,
   blue-green glass curtain wall, crown with dome + spire.
   Everything is merged per-material -> a handful of draw calls.
   ============================================================ */

export const TOWER = {
  W: 24, // footprint width  (x)
  D: 18, // footprint depth  (z)
  FLOORS: 17,
  FLOOR_H: 3.6,
};
TOWER.BODY_H = TOWER.FLOORS * TOWER.FLOOR_H; // 61.2
TOWER.TOTAL_H = TOWER.BODY_H + 11; // ~72 m with crown

/* ---------------- geometry helpers ---------------- */

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function cyl(rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

function domeGeo(r, seg, x, y, z) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

/** Merge a list of geometries into one mesh, disposing the parts. */
function mergeToMesh(geos, material, name) {
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ---------------- materials ---------------- */

function createMaterials(quality) {
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xe8e2d4,
    roughness: 0.72,
    metalness: 0.04,
    name: "concrete",
  });

  const accent = new THREE.MeshStandardMaterial({
    color: 0xcfc6b2,
    roughness: 0.6,
    metalness: 0.08,
    name: "accent",
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x1d4b57,
    roughness: quality === "low" ? 0.2 : 0.12,
    metalness: 0.0,
    reflectivity: 0.75,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: new THREE.Color(0xffc978),
    emissiveIntensity: 0,
    name: "glass",
  });

  const mullion = new THREE.MeshStandardMaterial({
    color: 0x3c4450,
    roughness: 0.42,
    metalness: 0.65,
    name: "mullion",
  });

  const green = new THREE.MeshStandardMaterial({
    color: 0x1f8a5f,
    roughness: 0.45,
    metalness: 0.2,
    name: "green",
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xd8b165,
    roughness: 0.28,
    metalness: 0.9,
    emissive: new THREE.Color(0xd8b165),
    emissiveIntensity: 0.25,
    name: "gold",
  });

  return { concrete, accent, glass, mullion, green, gold };
}

/* ============================================================
   Main builder
   ============================================================ */

export function buildTower({ quality = "high" } = {}) {
  const { W, D, FLOORS, FLOOR_H, BODY_H } = TOWER;
  const group = new THREE.Group();
  group.name = "MenaraIqro";

  const mats = createMaterials(quality);

  const concreteGeos = [];
  const accentGeos = [];
  const glassGeos = [];
  const mullionGeos = [];
  const greenGeos = [];
  const goldGeos = [];

  /* ---------- 1. Podium (floors 1-2, spreads wider than tower) ---------- */
  // Ground plinth
  concreteGeos.push(box(W + 34, 1.6, D + 24, 0, 0.8, 0));
  accentGeos.push(box(W + 30, 0.4, D + 20, 0, 1.75, 0));
  // Podium mass
  concreteGeos.push(box(W + 18, 6.4, D + 11, 0, 4.9, 0));
  // Podium glazing ribbon
  glassGeos.push(box(W + 18.3, 3.4, D + 11.3, 0, 5.4, 0));
  // Podium cornice
  accentGeos.push(box(W + 21, 0.7, D + 14, 0, 8.4, 0));

  // Entrance canopy on the +Z (front) side
  const frontZ = D / 2 + 5.5;
  accentGeos.push(box(20, 0.6, 8, 0, 8.9, frontZ + 2));
  for (const px of [-8.5, -2.8, 2.8, 8.5]) {
    concreteGeos.push(cyl(0.55, 0.55, 8.6, 12, px, 4.3, frontZ + 4.6));
  }
  // Entrance portal frame (green Muhammadiyah accent)
  greenGeos.push(box(13, 0.9, 1.2, 0, 8.05, frontZ + 0.4));
  greenGeos.push(box(1.2, 8.2, 1.2, -6.4, 4.1, frontZ + 0.4));
  greenGeos.push(box(1.2, 8.2, 1.2, 6.4, 4.1, frontZ + 0.4));

  /* ---------- 2. Tower shaft: floor-by-floor facade ---------- */
  const spandrel = 1.05; // solid concrete band height
  const glazing = FLOOR_H - spandrel - 0.25;

  for (let i = 0; i < FLOORS; i++) {
    const y0 = i * FLOOR_H;

    // Floor slab / spandrel band wrapping the tower, protruding slightly
    concreteGeos.push(box(W + 0.7, spandrel, D + 0.7, 0, y0 + spandrel / 2, 0));

    // Glass ribbon on the two long faces (+Z / -Z)
    const gY = y0 + spandrel + glazing / 2;
    glassGeos.push(box(W - 2.6, glazing, D + 0.5, 0, gY, 0));

    // Narrow window slots on the short faces (x +/-) -> slab tower look
    for (const sx of [-1, 1]) {
      glassGeos.push(
        box(0.6, glazing, D * 0.52, sx * (W / 2 + 0.12), gY, 0),
      );
    }

    // Horizontal mullion line inside the glazing
    mullionGeos.push(box(W - 2.4, 0.16, D + 0.66, 0, gY, 0));
  }

  /* ---------- 3. Vertical fins (sun shading) on long faces ---------- */
  const finCount = quality === "low" ? 7 : 11;
  const finSpan = W - 3.4;
  for (let f = 0; f < finCount; f++) {
    const fx = -finSpan / 2 + (finSpan / (finCount - 1)) * f;
    for (const sz of [-1, 1]) {
      accentGeos.push(
        box(0.42, BODY_H - 1.2, 0.85, fx, BODY_H / 2 + 0.6, sz * (D / 2 + 0.7)),
      );
    }
  }

  /* ---------- 4. Corner piers + side blades ---------- */
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      concreteGeos.push(
        box(2.2, BODY_H + 1.4, 2.2, sx * (W / 2 - 0.3), (BODY_H + 1.4) / 2, sz * (D / 2 - 0.3)),
      );
    }
    // Full-height blade wall on the short faces
    concreteGeos.push(
      box(1.5, BODY_H + 2.6, D - 2.2, sx * (W / 2 + 0.5), (BODY_H + 2.6) / 2, 0),
    );
  }

  /* ---------- 5. Service core rising above the last floor ---------- */
  concreteGeos.push(box(W - 7, BODY_H + 4.2, D - 6, 0, (BODY_H + 4.2) / 2, 0));

  /* ---------- 6. Crown: setbacks, dome, spire, signage ---------- */
  let cy = BODY_H;
  accentGeos.push(box(W + 1.8, 0.9, D + 1.8, 0, cy + 0.45, 0)); // cap cornice
  cy += 0.9;

  concreteGeos.push(box(W - 4.5, 3.2, D - 3.5, 0, cy + 1.6, 0));
  glassGeos.push(box(W - 4.2, 1.9, D - 3.2, 0, cy + 1.6, 0));
  cy += 3.2;

  accentGeos.push(box(W - 8, 2.4, D - 7, 0, cy + 1.2, 0));
  cy += 2.4;

  // Dome (green, Islamic-architecture cue) on an octagonal drum
  accentGeos.push(cyl(4.6, 5.2, 1.6, 8, 0, cy + 0.8, 0));
  cy += 1.6;
  greenGeos.push(domeGeo(4.5, quality === "low" ? 14 : 24, 0, cy, 0));
  cy += 4.5;

  // Spire + finial
  goldGeos.push(cyl(0.16, 0.34, 7.2, 8, 0, cy + 3.6, 0));
  goldGeos.push(domeGeo(0.62, 10, 0, cy + 7.2, 0));

  // Rooftop signage plates on both long faces
  for (const sz of [-1, 1]) {
    goldGeos.push(box(11.5, 1.5, 0.35, 0, BODY_H - 2.4, sz * (D / 2 + 1.25)));
  }

  // Roof parapet + antennae
  accentGeos.push(box(W - 6.6, 0.8, D - 5.6, 0, BODY_H + 4.6, 0));
  for (const ax of [-6, 6]) {
    mullionGeos.push(cyl(0.09, 0.09, 4.4, 6, ax, BODY_H + 6.6, -3));
  }

  /* ---------- assemble ---------- */
  const meshes = {
    concrete: mergeToMesh(concreteGeos, mats.concrete, "concrete"),
    accent: mergeToMesh(accentGeos, mats.accent, "accent"),
    glass: mergeToMesh(glassGeos, mats.glass, "glass"),
    mullion: mergeToMesh(mullionGeos, mats.mullion, "mullion"),
    green: mergeToMesh(greenGeos, mats.green, "green"),
    gold: mergeToMesh(goldGeos, mats.gold, "gold"),
  };
  Object.values(meshes).forEach((m) => group.add(m));

  /* ---------- build-up clipping plane (bottom-up reveal) ---------- */
  // normal (0,-1,0): points with -y + constant < 0  (y > constant) get clipped
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const materials = Object.values(mats);
  materials.forEach((m) => {
    m.clippingPlanes = [clipPlane];
    m.clipShadows = true;
  });

  /** 0 = hidden, 1 = fully built */
  function setBuildProgress(t) {
    clipPlane.constant = THREE.MathUtils.lerp(0, TOWER.TOTAL_H + 12, t);
  }
  setBuildProgress(0);

  /** Release the clipping plane once the reveal is done (saves shader work). */
  function releaseClipping() {
    materials.forEach((m) => {
      m.clippingPlanes = null;
      m.needsUpdate = true;
    });
  }

  /** 0 = day, 1 = night. Lights up the glass and the gold accents. */
  function setNight(t) {
    mats.glass.emissiveIntensity = t * 1.35;
    mats.glass.color.setHSL(0.53, 0.5 - t * 0.25, 0.2 + t * 0.06);
    mats.gold.emissiveIntensity = 0.25 + t * 1.5;
    mats.green.emissive.setRGB(0, t * 0.12, t * 0.08);
  }

  function getFloorY(floor) {
    return THREE.MathUtils.clamp(floor, 0, FLOORS) * FLOOR_H;
  }

  function dispose() {
    Object.values(meshes).forEach((m) => m.geometry.dispose());
    materials.forEach((m) => m.dispose());
  }

  return {
    group,
    meshes,
    materials: mats,
    clipPlane,
    setBuildProgress,
    releaseClipping,
    setNight,
    getFloorY,
    dispose,
    height: TOWER.TOTAL_H,
  };
}
