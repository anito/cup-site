# Handover / audit: Levo site, state at commit 8137bdd

Written so a **new session** can continue in a **new repository** without this conversation. The current repo (`anito/cup-site`) stays untouched as the archive of v1.

## 1. The task for the next session

Build a **new** site in a **new repo** (suggested name: `levo-ai`, created empty by the user; the session needs push access to it). Reuse the cup and the engine from this repo, but rebuild the **scroll stages in the style of oryzo.ai**: a deadpan parody of AI product pages for a ridiculous product, with playful, interactive mini-scenes, invented "science" with numbers and a fake research paper. User wording: "be fictive, don't be too serious, use high quality effects", "use oryzo.ai as inspiration".

Proposed concept (user said "yes, rebuild the stages that way", details not yet agreed): product "Levo-1" (the AI-era cup). Stage ideas mapped from oryzo.ai:
- Hero: "Made for mugs"-style one-liner + a PLAY button; hover-hand gag ("AI fills in the gaps. We said high five. It heard six.").
- "Isn't just a cup. It's the result of unprecedented AI* breakthroughs." with footnote.
- Wearable gag + chat box ("Hey @levo, ...") + a fake magazine cover ("Issue No. 00124 – AI slop ideas for this winter").
- Feature stages with pseudo-science and numbers: lift ("exactly one coaster thick"), thermal diagram (Thermal Diffusion Model, "a visualization, not a warranty"), "N% more circular" with a circularity gauge, "smart flip encryption" (write a message on the lid, flip it, decode), grip/friction coefficient, drop test ("Damage: The Floor ;)"), "runs on an RTX 3090 / on device / no tokens".
- Reviews with invented people and jobs; three models (Levo / Pro / Pro Max = stacked lids) with "Join Waitlist"; a fake paper (abstract, acknowledgements, peer review "Trust me bro", BibTeX) with an OBJ download.
Full copy deck: `docs/oryzo-notes.md`.

## 2. Hard rules the user set (do not break)

1. **Look at oryzo.ai before building from it.** The user was upset that v1's "oryzo-style" stages were invented without seeing the site. In the last session the host was blocked for WebFetch (DNS) but **`curl` through the proxy worked** after the user allowed the domain. If it is blocked again: **stop and tell the user** (Environment settings > Network access > Allowed domains > `oryzo.ai`), do not fake it. Even when readable, only HTML/JS can be read: **the motion is not known**; ask for screenshots/video of stage order and animation, or say what is assumed.
2. Never claim to have studied something you could not load.
3. Don't present unverified work as verified. The user wants honest status (what was tested, what not).

## 3. Environment facts and traps

- GitHub: **creating repos from the session fails (403)**; the user creates the repo, then `add_repo` attaches it (`push` access). Branch deletion and tag pushes through the proxy fail ("remote end hung up"), the GitHub API delete is refused. The old branch `claude/ember-cup-site` in `anito/mogney` still exists; user must delete it by hand. A tag `levo-v1` could not be pushed; the commit hash `8137bdd` is the reference.
- Pages: `.github/workflows/pages.yml` builds with `BASE_PATH=/cup-site` and publishes `out/`. Repo Settings > Pages > Source must be "GitHub Actions". For a new repo change `BASE_PATH` to `/<repo>`. At the time of writing the last deploy run (8137bdd) sat in status `waiting` for ~27 min (possibly an environment approval or queue); not verified live.
- The sandbox cannot open github.io; nothing was seen live. All checks were local headless Chromium with software WebGL (slow; frames lag, wait 10 s+ after scroll before a screenshot).
- `pkill -f <name>` kills the session's own shell (command line matches). Use `pgrep -f` with the `[x]yz` trick or kill by PID.
- Containers can restart and kill background jobs (renders, http servers). Re-start.
- Blender (`bpy` 5.2 via pip, Python 3.13) works headless; used only for the original model now.
- SvelteKit 3 / Vite 8 / Next 16 / three 0.186 / R3F 9 are very new: old APIs removed (e.g. `$lib`, `base`, `MeshReflectorMaterial` crashes unless morph arrays exist, `PCFSoftShadowMap` removed).

## 4. What exists in `anito/cup-site` (v1)

Stack: **Next.js 16 (App Router, static export, CSS Modules)** + **React Three Fiber** + GSAP/ScrollTrigger + Lenis. History: Ember static site > Levo (SvelteKit) > Next.js. Product "Levo": a takeaway cup with a Thermal Halo (cyan to amber light band), a leather sleeve and a leather lid that flips and flattens into a levitating wireless coaster.

Layout:
- `src/components/Home.jsx` page; `Stage.jsx` = pinned scroll scene (GSAP timeline `PIN_VH = 12`, 8 chapters, `AT` array of chapter starts, `PAL` palette per chapter, `rig` object shared with the 3D scene: `frame, lidT, topT, expl, macro, night, mouse, cupEl`); `Nav.jsx` (active section + progress line), `Steam.jsx` (WebGL smoke shader with scroll inertia), `Hud.jsx`, `Preloader.jsx`, `Manifesto.jsx` (word-by-word scrub), `Reviews.jsx`, `Promo.jsx`, `Features.jsx` (anatomy hotspots), `Specs.jsx`, `Reserve.jsx`, `Marquee.jsx`, `Footer.jsx`, `Reveal.jsx`.
- `src/lib/three/`: `LevoCanvas.jsx` (scene: Environment of lightformers, ACES tone mapping, shadow key light via module-level `sunRef`, camera follows the DOM `.cup` box that GSAP moves), `geometry.js` (lathe cup, lid with a **morph target** capping to coaster, sleeve, label/brand canvas textures), `materials.js` (satin titanium, **smooth leather** with stamped label + stitching shader via `onBeforeCompile`, halo emissive), `Workshop.jsx` (the opening pad: dark gray cutting mat with printed grid + `MeshReflectorMaterial`).
- `src/app/studio/` unlinked route + `scripts/capture-stills.mjs`: renders the live scene transparent so the site's stills (`public/anatomy.webp`, `reserve.webp`, `og.jpg`) match the hero.
- `blender/build_levo.py`: original procedural Blender model (kept as source; not used by the page anymore).
- `docs/oryzo-notes.md`: oryzo.ai copy deck.

Opening scene: top-down view of the cup on a rotated dark mat (layout from the user's sketch: cup left of centre, mat running off top/right), scroll tilts to the side view (`rig.topT`).

## 5. What was verified vs. not

Verified locally (headless Chromium, software GL, desktop 1440x900, some 390x844): hero, chapters 2-7 screenshots, nav progress/active state, loader finishing, Reserve/Anatomy stills, no console errors (only a Three Clock deprecation warning).
Not verified: real GPU performance (mirror pass + shadows may be heavy; the user asked for realism), live github.io page, mobile for the newer stages/lid motion, reduced-motion layout, Safari/Firefox, the manifesto fix after the last edit (spacing), whether the last Pages deploy completed.

## 6. Known issues / open items

- Leather macro zoom can show a faint cellular pattern; grain is procedural and tuned for ~1-2x screen density.
- User wanted "perfect realistic": not achieved (real-time limits). Metal was repeatedly judged too reflective; current titanium is a satin finish (metalness ~0.58).
- Pad reflection is only visible when the camera tilts.
- Story is long (12 screen heights); user may want it shorter.
- `window.__levoRig` debug hook was removed; add it temporarily when debugging scroll state.

## 7. Suggested plan for the new session

1. Create/attach the new empty repo; copy this repo's code as the starting point (not history); update `BASE_PATH`, README, workflow.
2. Re-check oryzo.ai access (curl); ask the user for screenshots/video of the stage order and motion if only text is available.
3. Agree the stage list and tone with the user in 5 lines, then rebuild `Stage.jsx` chapters and add interactive mini-scenes (hover-hand, chat box, flip-encryption on the lid, drop test, thermal diagram, circularity gauge, paper section with BibTeX).
4. Keep the cup, materials and lighting as they are unless asked.
5. Test with the headless pipeline (wait long after scroll), report verified/unverified honestly, push, check the Pages run.
