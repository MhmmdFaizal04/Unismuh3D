import * as THREE from "three";
import gsap from "gsap";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ============================================================
   Free-look orbit mode. While active, the scroll story stops
   writing to the camera (stage.orbitActive flag).
   ============================================================ */

export function createOrbitMode({ stage, tower }) {
  const controls = new OrbitControls(stage.camera, stage.renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 34;
  controls.maxDistance = 300;
  controls.maxPolarAngle = Math.PI * 0.495; // don't go below the ground
  controls.target.set(0, tower.height * 0.45, 0);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.35;

  stage.orbitActive = false;

  stage.onTick((delta) => {
    if (stage.orbitActive) controls.update(delta);
  });

  function enter() {
    if (stage.orbitActive) return;
    stage.orbitActive = true;
    document.body.classList.add("orbit-mode");

    // Move from the current scroll camera into a comfortable orbit start.
    const from = stage.camera.position.clone();
    const target = new THREE.Vector3(0, tower.height * 0.45, 0);
    const dir = from.clone().sub(target).normalize();
    const dest = target.clone().add(dir.multiplyScalar(120));
    dest.y = Math.max(dest.y, 32);

    controls.target.copy(stage.lookTarget);
    controls.enabled = true;

    gsap.to(stage.camera.position, {
      x: dest.x,
      y: dest.y,
      z: dest.z,
      duration: 1.2,
      ease: "power3.inOut",
      overwrite: "auto",
    });
    gsap.to(controls.target, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.2,
      ease: "power3.inOut",
      overwrite: "auto",
    });
    gsap.to(stage.camera, {
      fov: 45,
      duration: 1.2,
      ease: "power3.inOut",
      onUpdate: () => stage.camera.updateProjectionMatrix(),
    });
  }

  function exit() {
    if (!stage.orbitActive) return;
    controls.enabled = false;
    document.body.classList.remove("orbit-mode");
    // Let the scroll story take the camera back over on the next frame.
    stage.orbitActive = false;
  }

  function toggle() {
    stage.orbitActive ? exit() : enter();
  }

  function dispose() {
    controls.dispose();
  }

  return { controls, enter, exit, toggle, dispose, get active() { return stage.orbitActive; } };
}
