import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";

/**
 * Detects a low-power device so we can dial back resolution and effects.
 */
export function detectQuality() {
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (mobile || cores <= 4 || small) return "low";
  if (cores <= 8) return "medium";
  return "high";
}

/**
 * Creates renderer, scene, camera, post-processing chain and the render loop.
 */
export function createStage(canvas) {
  const quality = detectQuality();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // MSAA handled by the composer render target
    powerPreference: "high-performance",
    stencil: false,
  });

  const maxDpr = quality === "low" ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type =
    quality === "low" ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  // Needed for the "building rises" clipping reveal on the tower.
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fb4c9, 160, 620);

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.5,
    2000,
  );
  camera.position.set(78, 26, 96);

  // The camera always looks at this proxy, so GSAP can tween the target too.
  const lookTarget = new THREE.Vector3(0, 34, 0);

  /* ---------------- Post-processing ---------------- */
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: quality === "low" ? 0 : 4,
  });

  const composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    quality === "low" ? 0.28 : 0.46, // strength
    0.75, // radius
    0.82, // threshold
  );
  composer.addPass(bloom);

  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms.offset.value = 1.05;
  vignette.uniforms.darkness.value = 1.15;
  composer.addPass(vignette);

  // OutputPass applies tone mapping + sRGB conversion correctly.
  composer.addPass(new OutputPass());

  /* ---------------- Resize ---------------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }
  window.addEventListener("resize", resize);

  /* ---------------- Loop ---------------- */
  const clock = new THREE.Clock();
  const updaters = new Set();

  /** Register a per-frame callback: fn(delta, elapsed) */
  function onTick(fn) {
    updaters.add(fn);
    return () => updaters.delete(fn);
  }

  let running = true;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();
    updaters.forEach((fn) => fn(delta, elapsed));
    // In orbit mode OrbitControls owns the camera orientation.
    if (!api.orbitActive) camera.lookAt(lookTarget);
    composer.render();
  }

  function start() {
    running = true;
    clock.start();
    loop();
  }

  function dispose() {
    running = false;
    window.removeEventListener("resize", resize);
    renderer.dispose();
    composer.dispose();
  }

  const api = {
    quality,
    renderer,
    scene,
    camera,
    composer,
    bloom,
    vignette,
    lookTarget,
    onTick,
    start,
    dispose,
    resize,
    // Set to true by orbit-mode so the scroll story releases the camera.
    orbitActive: false,
  };

  return api;
}
