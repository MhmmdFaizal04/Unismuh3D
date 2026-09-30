import gsap from "gsap";

/* ============================================================
   DOM references + small UI behaviours.
   Kept separate so the 3D modules never query the DOM.
   ============================================================ */

export function createUI() {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const loader = $("#loader");
  const loaderFill = $("#loader-fill");
  const loaderPct = $("#loader-pct");
  const progressFill = $("#progress > i");
  const navLinks = $$(".nav__links a[data-nav]");

  const ui = {
    loader,
    nav: $("#nav"),
    content: $("#content"),
    scrollhint: $("#scrollhint"),
    panels: $$(".panel"),
    reveals: $$("[data-reveal]"),
    heroEls: $$("[data-hero-el]"),
    heroTitleChars: $$("[data-hero-title]"),
    outroTitleLines: $$("[data-outro-title]"),
    counters: $$("[data-count]"),
    floorRows: $$(".floorlist__row"),
    orbitUI: $("#orbit-ui"),
    btnExplore: $("#btn-explore"),
    btnOrbitExit: $("#btn-orbit-exit"),
    btnTop: $("#btn-top"),
    btnNight: $("#btn-night"),
    nightLabel: $("#night-label"),
  };

  /** Drive the preloader bar (0..1). */
  function setLoadProgress(t) {
    const pct = Math.round(t * 100);
    gsap.to(loaderFill, { width: `${pct}%`, duration: 0.4, ease: "power2.out" });
    loaderPct.textContent = `${pct}%`;
  }

  /** Fade the preloader out; resolves when it's gone. */
  function hideLoader() {
    return new Promise((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            loader.style.display = "none";
            resolve();
          },
        })
        .to(loaderFill, { width: "100%", duration: 0.3, ease: "power2.out" })
        .to(loader, { autoAlpha: 0, duration: 0.7, ease: "power2.inOut" }, "+=0.15");
    });
  }

  /** Scroll progress rail (0..1). */
  function setProgress(t) {
    progressFill.style.height = `${(t * 100).toFixed(2)}%`;
  }

  function setActiveNav(id) {
    navLinks.forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
    });
  }

  /** Smooth anchor scrolling without an extra plugin. */
  function wireNavLinks() {
    navLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
      });
    });
  }

  function setActiveFloorRow(row) {
    ui.floorRows.forEach((r) => r.classList.toggle("is-active", r === row));
  }

  function setNightLabel(isNight) {
    ui.nightLabel.textContent = isNight ? "Malam" : "Siang";
  }

  return {
    ...ui,
    setLoadProgress,
    hideLoader,
    setProgress,
    setActiveNav,
    wireNavLinks,
    setActiveFloorRow,
    setNightLabel,
  };
}
