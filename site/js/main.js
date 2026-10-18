/* Ember — scroll-driven 2D scene.
   A Blender-rendered frame sequence (see ../blender/build_ember.py) is scrubbed on a
   canvas while GSAP ScrollTrigger drives the cup's path, the palette and the parallax. */
(() => {
  "use strict";

  const FRAMES = 72;
  const framePath = (i) => `assets/frames/f${String(i).padStart(3, "0")}.webp`;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  gsap.registerPlugin(ScrollTrigger);

  /* ───────── 1. load frames ───────── */
  const images = new Array(FRAMES);
  const loadFrames = () =>
    new Promise((resolve) => {
      let done = 0;
      const pct = $("#loadPct");
      const ring = $("#ringFg");
      const shown = { v: 0 };
      const paint = () => {
        pct.textContent = Math.round(shown.v);
        ring.style.strokeDashoffset = 289 * (1 - shown.v / 100);
      };
      const tick = () => {
        done++;
        gsap.to(shown, { v: (done / FRAMES) * 100, duration: 0.4, ease: "power1.out", onUpdate: paint });
        if (done === FRAMES) setTimeout(resolve, 450);
      };
      for (let i = 0; i < FRAMES; i++) {
        const img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = tick;
        img.src = framePath(i);
        images[i] = img;
      }
    });

  /* ───────── 2. canvas renderer ───────── */
  const canvas = $("#cupCanvas");
  const ctx = canvas.getContext("2d");
  const state = { frame: 0 };
  const mouse = { v: 0 };
  let heroWeight = 1;
  let lastDrawn = -1;

  const draw = () => {
    let f = state.frame + mouse.v * heroWeight;
    f = ((f % FRAMES) + FRAMES) % FRAMES;
    const key = Math.round(f * 50);
    if (key === lastDrawn) return;
    lastDrawn = key;
    const i = Math.floor(f);
    const frac = f - i;
    const a = images[i];
    const b = images[(i + 1) % FRAMES];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (a && a.complete && a.naturalWidth) ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
    if (frac > 0.04 && b && b.complete && b.naturalWidth) {
      ctx.globalAlpha = frac;
      ctx.drawImage(b, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  };

  /* ───────── 3. scene palette ───────── */
  const PAL = [
    { bg: "#f2e9dd", ink: "#22160f", sun: "#e8b98a", d1: "#e9d5bb", d2: "#dcbf9d", d3: "#c99a73" }, // intro
    { bg: "#ead7bd", ink: "#22160f", sun: "#d98a55", d1: "#dec29d", d2: "#cfa57a", d3: "#b97d52" }, // thrown
    { bg: "#c2512a", ink: "#fff3e4", sun: "#f08b4e", d1: "#b04523", d2: "#9a3a1d", d3: "#7e2e16" }, // dipped
    { bg: "#1b1310", ink: "#f6e6c8", sun: "#d8a24a", d1: "#2b1d17", d2: "#231813", d3: "#170f0c" }, // gilded
    { bg: "#2a0f08", ink: "#ffe9d2", sun: "#ff7a2e", d1: "#4a1a0d", d2: "#36130a", d3: "#230b05" }, // fired
  ];
  const root = document.documentElement;
  const cssVars = (p) => ({ "--bg": p.bg, "--ink": p.ink, "--sun": p.sun, "--d1": p.d1, "--d2": p.d2, "--d3": p.d3 });
  gsap.set(root, cssVars(PAL[0]));

  /* chapter boundaries on the 0..1 scroll timeline */
  const AT = [0, 0.13, 0.35, 0.57, 0.79];
  const END = 1;

  /* ───────── 4. sparks ───────── */
  const sparks = $("#sparks");
  if (!reduceMotion) {
    for (let i = 0; i < 34; i++) {
      const s = document.createElement("i");
      const size = gsap.utils.random(3, 9);
      s.style.setProperty("--s", `${size}px`);
      s.style.left = `${gsap.utils.random(2, 98)}%`;
      sparks.appendChild(s);
      gsap.fromTo(
        s,
        { y: 0, x: 0, opacity: 0 },
        {
          y: () => -gsap.utils.random(innerHeight * 0.5, innerHeight * 1.15),
          x: () => gsap.utils.random(-70, 70),
          opacity: gsap.utils.random(0.5, 1),
          duration: gsap.utils.random(4, 9),
          delay: gsap.utils.random(0, 6),
          repeat: -1,
          ease: "sine.out",
        }
      );
    }
  }

  /* ───────── 5. main timeline ───────── */
  const nav = $("#nav");
  const railItems = $$("#rail li");
  let railIndex = -1;
  const setRail = (p) => {
    let idx = 0;
    AT.forEach((t, i) => { if (p >= t - 0.001) idx = i; });
    if (idx === railIndex) return;
    railIndex = idx;
    railItems.forEach((li, i) => li.classList.toggle("is-active", i === idx));
  };

  const vw = (n) => () => innerWidth * (n / 100);
  const isMobile = () => innerWidth <= 860;

  const buildTimeline = () => {
    gsap.set("#cup", { xPercent: -50, yPercent: -50 });
    const cupBase = { x: 0, y: () => (isMobile() ? -innerHeight * 0.17 : -innerHeight * 0.015), scale: 1 };

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#story",
        start: "top top",
        end: () => "+=" + Math.round(innerHeight * 7.4),
        pin: "#stage",
        scrub: 0.9,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setRail(self.progress);
          heroWeight = clamp(1 - self.progress / 0.06, 0, 1);
        },
      },
    });

    // two full turns of the cup over the whole story
    tl.to(state, { frame: FRAMES * 2, duration: END }, 0);

    // hero copy out
    tl.to("#heroCopy", { opacity: 0, y: -30, duration: 0.06, ease: "power1.in" }, 0.015);
    tl.to("#scrollCue", { opacity: 0, duration: 0.04 }, 0.01);
    tl.to("#wordmark", { yPercent: -22, scale: 1.12, duration: 0.3 }, 0);
    tl.to("#wordmark", { opacity: 0, duration: 0.1 }, 0.1);

    // cup path
    const path = [
      { x: 0, y: cupBase.y, scale: 1 },
      { x: isMobile() ? 0 : vw(-23), y: isMobile() ? () => -innerHeight * 0.2 : () => 0, scale: isMobile() ? 0.92 : 1.04 },
      { x: isMobile() ? 0 : vw(23), y: isMobile() ? () => -innerHeight * 0.2 : () => 0, scale: isMobile() ? 0.95 : 1.1 },
      { x: isMobile() ? 0 : vw(-19), y: isMobile() ? () => -innerHeight * 0.2 : () => -innerHeight * 0.01, scale: isMobile() ? 1.02 : 1.22 },
      { x: 0, y: isMobile() ? () => -innerHeight * 0.22 : () => -innerHeight * 0.1, scale: isMobile() ? 1.05 : 1.34 },
    ];
    path.slice(1).forEach((p, i) => {
      tl.to("#cup", { ...p, duration: 0.09, ease: "power2.inOut" }, AT[i + 1] - 0.055);
    });
    gsap.set("#cup", { y: cupBase.y });

    // sun
    const sunStates = [
      { scale: 1, yPercent: 0 },
      { scale: 1.15, yPercent: 0 },
      { scale: 0.95, yPercent: -4 },
      { scale: 1.1, yPercent: 0 },
      { scale: 1.45, yPercent: -6 },
    ];
    sunStates.slice(1).forEach((s, i) => tl.to("#sun", { ...s, duration: 0.1, ease: "power2.inOut" }, AT[i + 1] - 0.06));

    // palette
    PAL.slice(1).forEach((p, i) => tl.to(root, { ...cssVars(p), duration: 0.09, ease: "power1.inOut" }, AT[i + 1] - 0.06));

    // parallax dunes
    tl.to("#dune1", { x: vw(-5), duration: END }, 0);
    tl.to("#dune2", { x: vw(5), y: -10, duration: END }, 0);
    tl.to("#dune3", { x: vw(-9), y: -22, duration: END }, 0);

    // sparks: light in the gilded chapter, full in the fired one
    tl.to("#sparks", { opacity: 0.35, duration: 0.05 }, AT[3] - 0.02);
    tl.to("#sparks", { opacity: 1, duration: 0.06 }, AT[4] - 0.02);

    // chapters
    $$(".chapter").forEach((el, i) => {
      const start = AT[i + 1];
      const stop = i === 3 ? END : AT[i + 2] - 0.065;
      const dy = el.classList.contains("chapter--center") || isMobile() ? 40 : 30;
      tl.fromTo(el, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.045, ease: "power2.out" }, start);
      if (i < 3) tl.to(el, { opacity: 0, y: -dy, duration: 0.04, ease: "power2.in" }, stop);
    });

    return tl;
  };

  /* ───────── 6. interactions ───────── */
  const initHotspots = () => {
    const spots = $$(".hotspot");
    const items = $$("#hotList li");
    const set = (k) => {
      spots.forEach((s) => s.classList.toggle("is-active", s.dataset.k === String(k)));
      items.forEach((l) => l.classList.toggle("is-active", l.dataset.k === String(k)));
    };
    set(0);
    spots.forEach((s) => {
      s.addEventListener("pointerenter", () => set(s.dataset.k));
      s.addEventListener("focus", () => set(s.dataset.k));
      s.addEventListener("click", () => set(s.dataset.k));
    });
    items.forEach((l) => {
      l.addEventListener("click", () => set(l.dataset.k));
      l.addEventListener("pointerenter", () => set(l.dataset.k));
    });
  };

  const initReveal = () => {
    ScrollTrigger.batch(".reveal", {
      start: "top 88%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, overwrite: true }),
    });
    $$("[data-count]").forEach((el) => {
      const target = +el.dataset.count;
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () =>
          gsap.to(o, {
            v: target,
            duration: 1.8,
            ease: "power3.out",
            onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString("en-US")),
          }),
      });
    });
  };

  const initSignup = () => {
    const form = $("#signup");
    const msg = $("#signupMsg");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#email").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        msg.textContent = "Please enter a valid email address.";
        return;
      }
      msg.textContent = "You’re on the list — thank you. (Demo form: nothing was sent.)";
      form.reset();
    });
  };

  const initNavTheme = () => {
    ScrollTrigger.create({
      trigger: ".marquee",
      start: "top 70",
      end: "max",
      onToggle: (self) => nav.classList.toggle("on-paper", self.isActive),
    });
  };

  const initSmoothScroll = () => {
    if (reduceMotion || typeof Lenis === "undefined") return null;
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const target = id === "#top" ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === "#story" ? 0 : -10, duration: 1.8 });
      })
    );
    return lenis;
  };

  /* ───────── 7. boot ───────── */
  const intro = () => {
    $("#preloader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    if (reduceMotion) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".cup canvas", { scale: 0.86, opacity: 0, duration: 1.6 }, 0.1)
      .from("#wordmark", { yPercent: 14, opacity: 0, duration: 1.6 }, 0)
      .from("#sun", { scale: 0.7, opacity: 0, duration: 1.8 }, 0)
      .from(".hero-left > *", { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.5)
      .from(".hero-right > *", { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.7)
      .from(".nav > *", { y: -20, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.6)
      .to("#scrollCue", { opacity: 0.6, duration: 1 }, 1.4);
    gsap.set("#scrollCue", { display: "flex", opacity: 0 });
    gsap.to(".cup canvas", { y: "-1.6%", duration: 2.8, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.8 });
  };

  const boot = async () => {
    await loadFrames();
    draw();
    initSmoothScroll();

    if (reduceMotion) {
      document.body.classList.add("is-static");
      gsap.set(".chapter", { opacity: 1 });
    } else {
      buildTimeline();
      gsap.ticker.add(draw);
      if (matchMedia("(pointer:fine)").matches) {
        const qx = gsap.quickTo(mouse, "v", { duration: 0.9, ease: "power3.out" });
        addEventListener("pointermove", (e) => qx((e.clientX / innerWidth - 0.5) * 5));
      }
    }
    setRail(0);
    initHotspots();
    initReveal();
    initSignup();
    initNavTheme();
    intro();
    addEventListener("load", () => ScrollTrigger.refresh());
    $$("img[loading=lazy]").forEach((img) => img.addEventListener("load", () => ScrollTrigger.refresh()));
  };

  boot();
})();
