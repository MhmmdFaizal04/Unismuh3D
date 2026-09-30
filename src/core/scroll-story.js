import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   Scroll choreography.
   One master scrubbed timeline drives the camera dolly, the
   tower's build-up reveal and the day -> night blend.
   Panel content uses its own non-scrubbed triggers.
   ============================================================ */

/** Camera keyframes per narrative stage (position + look target). */
const SHOTS = {
  hero: {
    pos: { x: 74, y: 22, z: 92 },
    look: { x: 0, y: 30, z: 0 },
    fov: 42,
  },
  about: {
    pos: { x: -46, y: 16, z: 62 },
    look: { x: 0, y: 34, z: 0 },
    fov: 40,
  },
  specs: {
    pos: { x: 30, y: 52, z: 44 },
    look: { x: 0, y: 48, z: 0 },
    fov: 36,
  },
  floors: {
    pos: { x: -22, y: 66, z: 34 },
    look: { x: 0, y: 58, z: 0 },
    fov: 34,
  },
  contact: {
    pos: { x: 0, y: 96, z: 122 },
    look: { x: 0, y: 44, z: 0 },
    fov: 46,
  },
};

export function createScrollStory({ stage, tower, environment, ui }) {
  const { camera, lookTarget } = stage;
  const mm = gsap.matchMedia();

  // Mutable proxy objects GSAP tweens; the render loop reads them.
  const cam = { ...SHOTS.hero.pos, fov: SHOTS.hero.fov };
  const look = { ...SHOTS.hero.look };
  // `spin` is driven by scroll, `introSpin` only by the one-shot intro, so the
  // two never fight over the same property.
  const state = { build: 0, night: 0, spin: 0, introSpin: 0 };

  /* ---- keep the real camera in sync with the proxies ---- */
  const unTick = stage.onTick(() => {
    if (stage.orbitActive) return;
    camera.position.set(cam.x, cam.y, cam.z);
    lookTarget.set(look.x, look.y, look.z);
    if (Math.abs(camera.fov - cam.fov) > 0.001) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }
    tower.group.rotation.y = state.spin + state.introSpin;
  });

  // Each stage occupies exactly 1 time unit of the master timeline so the
  // shots line up with the five stacked 100vh panels.
  const SEG = 1;

  function applyShot(tl, key, position) {
    const s = SHOTS[key];
    tl.to(cam, { ...s.pos, fov: s.fov, duration: SEG, ease: "none" }, position);
    tl.to(look, { ...s.look, duration: SEG, ease: "none" }, position);
  }

  /**
   * First segment is a fromTo anchored to the hero shot, so scroll progress 0
   * always equals the hero framing even if the intro tween is still running.
   */
  function applyFirstShot(tl, key) {
    const s = SHOTS[key];
    tl.fromTo(
      cam,
      { ...SHOTS.hero.pos, fov: SHOTS.hero.fov },
      { ...s.pos, fov: s.fov, duration: SEG, ease: "none", immediateRender: false },
      0,
    );
    tl.fromTo(
      look,
      { ...SHOTS.hero.look },
      { ...s.look, duration: SEG, ease: "none", immediateRender: false },
      0,
    );
  }

  /* ============================================================
     Intro: build-up reveal (plays once, not scroll-linked)
     ============================================================ */
  function playIntro({ reduced = false } = {}) {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        // The reveal is done; drop the clip planes for cheaper shading.
        tower.releaseClipping();
      },
    });

    if (reduced) {
      tower.setBuildProgress(1);
      state.build = 1;
      tl.set(ui.heroTitleChars, { yPercent: 0, autoAlpha: 1 });
      tl.set(ui.heroEls, { y: 0, autoAlpha: 1 });
      return tl;
    }

    // Tower grows from the ground up
    tl.fromTo(
      state,
      { build: 0 },
      {
        build: 1,
        duration: 2.6,
        ease: "power2.inOut",
        onUpdate: () => tower.setBuildProgress(state.build),
      },
      0,
    );

    // Camera pulls back while it grows
    tl.fromTo(
      cam,
      { x: 34, y: 6, z: 46, fov: 58 },
      { ...SHOTS.hero.pos, fov: SHOTS.hero.fov, duration: 3, ease: "power2.inOut" },
      0,
    );
    tl.fromTo(
      look,
      { x: 0, y: 8, z: 0 },
      { ...SHOTS.hero.look, duration: 3, ease: "power2.inOut" },
      0,
    );

    // A slow quarter-turn settles the hero framing
    tl.fromTo(
      state,
      { introSpin: -0.55 },
      { introSpin: 0, duration: 3.2, ease: "power2.out" },
      0,
    );

    // Headline reveal
    tl.from(
      ui.heroTitleChars,
      { yPercent: 118, duration: 1.15, stagger: 0.09, ease: "power4.out" },
      1.1,
    );
    tl.from(
      ui.heroEls,
      { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.09 },
      1.5,
    );

    // Count-up metrics
    ui.counters.forEach((el) => {
      const end = Number(el.dataset.count);
      const obj = { v: 0 };
      tl.to(
        obj,
        {
          v: end,
          duration: 1.5,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(obj.v).toString();
          },
        },
        1.7,
      );
    });

    tl.from(ui.nav, { y: -24, autoAlpha: 0, duration: 0.8 }, 0.5);
    tl.from(ui.scrollhint, { autoAlpha: 0, y: 18, duration: 0.8 }, 2.2);

    return tl;
  }

  /* ============================================================
     Master scrubbed timeline
     ============================================================ */
  let master = null;

  function buildMaster({ reduced = false } = {}) {
    // Total scroll distance = the stacked panels; use the content height.
    master = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ui.content,
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 1.1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          ui.setProgress(self.progress);
        },
      },
    });

    // hero -> about -> specs -> floors -> contact, one segment each
    applyFirstShot(master, "about");
    applyShot(master, "specs", 1);
    applyShot(master, "floors", 2);
    applyShot(master, "contact", 3);

    // A continuous, gentle rotation of the tower across the whole scroll
    master.to(state, { spin: Math.PI * 0.55, duration: 4 }, 0);

    // Dusk falls over the second half of the page
    master.to(
      state,
      {
        night: 1,
        duration: 2,
        onUpdate: () => {
          tower.setNight(state.night);
          environment.setNight(state.night);
          stage.bloom.strength = 0.4 + state.night * 0.75;
          stage.renderer.toneMappingExposure = 1.05 - state.night * 0.12;
        },
      },
      2,
    );

    return master;
  }

  /* ============================================================
     Panel content reveals + active nav link
     ============================================================ */
  function buildPanelTriggers({ reduced = false } = {}) {
    ui.reveals.forEach((el) => {
      if (reduced) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
        return;
      }
      gsap.from(el, {
        y: 54,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el.closest(".panel"),
          start: "top 62%",
          toggleActions: "play none none reverse",
        },
      });
    });

    // Outro headline lines
    gsap.from(ui.outroTitleLines, {
      yPercent: 110,
      autoAlpha: 0,
      duration: reduced ? 0 : 0.9,
      stagger: reduced ? 0 : 0.1,
      ease: "power4.out",
      scrollTrigger: {
        trigger: "#contact",
        start: "top 55%",
        toggleActions: "play none none reverse",
      },
    });

    // Nav highlight per section
    ui.panels.forEach((panel) => {
      ScrollTrigger.create({
        trigger: panel,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => {
          if (self.isActive) ui.setActiveNav(panel.id);
        },
      });
    });

    // Fade the scroll hint away once the user leaves the hero
    gsap.to(ui.scrollhint, {
      autoAlpha: 0,
      duration: 0.4,
      scrollTrigger: {
        trigger: "#hero",
        start: "bottom 80%",
        toggleActions: "play none none reverse",
      },
    });
  }

  /* ============================================================
     Responsive / reduced-motion wiring
     ============================================================ */
  function init() {
    mm.add(
      {
        isDesktop: "(min-width: 901px)",
        isMobile: "(max-width: 900px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { isMobile, reduced } = ctx.conditions;

        // Pull the camera back and raise the target on small screens
        if (isMobile) {
          SHOTS.hero.pos = { x: 62, y: 26, z: 128 };
          SHOTS.hero.fov = 54;
          SHOTS.about.pos = { x: -58, y: 20, z: 96 };
          SHOTS.about.fov = 52;
          SHOTS.specs.pos = { x: 44, y: 54, z: 78 };
          SHOTS.specs.fov = 50;
          SHOTS.floors.pos = { x: -34, y: 68, z: 66 };
          SHOTS.floors.fov = 48;
          SHOTS.contact.pos = { x: 0, y: 96, z: 176 };
          SHOTS.contact.fov = 56;
        }

        Object.assign(cam, SHOTS.hero.pos, { fov: SHOTS.hero.fov });
        Object.assign(look, SHOTS.hero.look);

        // Start at the top so the intro and scroll position agree.
        if (window.scrollY > 2) window.scrollTo(0, 0);

        const intro = playIntro({ reduced });

        // The intro also animates `cam`. Build the scrubbed master only once
        // the intro is finished (or as soon as the user scrolls away), so the
        // two never write to the same proxy at the same time.
        let started = false;
        const startMaster = () => {
          if (started) return;
          started = true;
          // Jump the intro to its end state instead of killing it, so the
          // headline and counters still land on their final values.
          intro.progress(1);
          tower.setBuildProgress(1);
          tower.releaseClipping();
          buildMaster({ reduced });
          buildPanelTriggers({ reduced });
          ScrollTrigger.refresh();
        };

        intro.eventCallback("onComplete", () => {
          tower.releaseClipping();
          startMaster();
        });
        window.addEventListener("wheel", startMaster, { once: true, passive: true });
        window.addEventListener("touchmove", startMaster, { once: true, passive: true });

        return () => {
          intro.kill();
          window.removeEventListener("wheel", startMaster);
          window.removeEventListener("touchmove", startMaster);
          master?.scrollTrigger?.kill();
          master?.kill();
          master = null;
        };
      },
    );
  }

  /* ---- focus a specific floor (used by the floor list) ---- */
  function focusFloor(floor) {
    const y = tower.getFloorY(floor);
    gsap.to(cam, {
      x: -18,
      y: y + 8,
      z: 40,
      fov: 32,
      duration: 1.4,
      ease: "power3.inOut",
      overwrite: "auto",
    });
    gsap.to(look, {
      x: 0,
      y: y + 2,
      z: 0,
      duration: 1.4,
      ease: "power3.inOut",
      overwrite: "auto",
    });
  }

  /* ---- manual day/night override ---- */
  function setNight(target) {
    gsap.to(state, {
      night: target,
      duration: 1.6,
      ease: "power2.inOut",
      overwrite: "auto",
      onUpdate: () => {
        tower.setNight(state.night);
        environment.setNight(state.night);
        stage.bloom.strength = 0.4 + state.night * 0.75;
        stage.renderer.toneMappingExposure = 1.05 - state.night * 0.12;
      },
    });
  }

  function dispose() {
    unTick();
    mm.revert();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }

  return { init, cam, look, state, focusFloor, setNight, dispose, SHOTS };
}
