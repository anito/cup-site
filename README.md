# Levo

A levitating smart cup with a **Thermal Halo** (a fictional concept product): a procedural Blender model with custom shaders, and a scroll-driven Next.js site that renders the cup live in the browser with React Three Fiber.

## Original request

> would you able to create a high resolution blender object including shader, animate this object within a 2D scene and create a highly profossional website from it like https://oryzo.ai/

Follow-ups: reinvent the cup with a creative fictional feature and a simple, futuristic look; port the site to SvelteKit (later replaced by Next.js); add a steam background and a printed label; use React Three Fiber instead of rendered frames.

## The product idea

Levo hovers above its own lid, flipped into a wireless coaster, on a six-millimetre magnetic cushion. Induction in its steel liner holds your drink at a chosen temperature (20–80 °C) for up to four hours, and a recessed light band, the Thermal Halo, shifts from cyan to amber so you can read the temperature at a glance. The site turns the live 3D cup through four chapters (Float, Halo, Hold, Rest) while a live readout climbs from 22 to 65 °C.

## Details

- **Shape and lid-coaster:** the cup follows a takeaway-cup silhouette (straight tapered cone, flat rim). Its lid is also the coaster: the top has a flange, raised plateau, recessed sip deck, sip slot, vent and a champagne wordmark, and the underside is a dark glass face with glowing rings. In the scroll story the lid lifts off, flies clear of the cup, flips while descending and slides in underneath as the levitation coaster; in the last chapter it flips back on and the halo sleeps. The path is a single parameter (`rig.lidT`) tweened by GSAP and read by the 3D scene (`LevoCanvas.jsx`).
- **Fictional advertising:** per-chapter ad pills (Commute Mode, Desk Mode, "as featured on" and a founders' offer), a promo section with two ad cards, and the updated marquee, specs and reserve copy.

- **Material:** bead-blasted, anodised champagne titanium with fine anisotropic lathe lines, lit by tall strip softboxes so the body picks up long machined-metal highlights.
- **Label:** a vertical, negative "LEVO" knocked out of a smoked matte-black strip that is taller than the cup, so its top and bottom edges are never visible and the lettering spans the whole height. It is generated as an alpha texture and mapped cylindrically (constant width on the tapered body). The same mask dims the Thermal Halo shader to about a third, so the ring stays visible through the label, and it continues across the sleeve.
- **Sleeve (no handle):** a cognac full-grain leather grip sleeve with five rounded circumferential grooves (real geometry), a hand-stitched seam and a debossed ring-and-LEVO mark on the back. The shader derives the leather thickness from the object-space radius, so where the grooves make it thin it turns translucent (about 20% opaque) and the label on the cup shows through; the ridges stay opaque. The same thickness logic is in the Blender shader (Mix Shader with a Transparent BSDF).
- **Steam:** `src/lib/components/Steam.svelte` is a small WebGL smoke shader. Scroll velocity feeds a damped follower (about 0.5 s), so the smoke keeps drifting after you stop scrolling; the pointer pushes it around; it takes the chapter colour.

## Hosting

`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main` with `BASE_PATH=/cup-site` (repo Settings → Pages → Source: GitHub Actions). Live at https://anito.github.io/cup-site/ .

## Layout

- `src/app/`: Next.js App Router (static export). `src/components/Stage.jsx` holds the GSAP ScrollTrigger timeline and the pinned scene; the other sections are small client components with CSS Modules.
- `src/lib/three/`: the **live 3D cup** (React Three Fiber). `geometry.js` is a JS port of the Blender parametric model (lathe body, handle tube, dock, glows, label texture), `materials.js` holds the titanium / smoked-label / emissive-halo materials (the label is mapped in the shader from object-space position), `LevoCanvas.jsx` is the scene (strip-softbox environment, camera, hover/rotation). The DOM `.cup` box in `Stage.jsx` is the layout driver: GSAP moves and scales it, and the 3D group follows its box every frame.
- `src/components/Steam.jsx`: the WebGL smoke shader (see above).
- `blender/build_levo.py`: the original Blender source (cup, dock, procedural shaders, lighting, animation) with `bpy` (`pip install bpy`, Python 3.13). Modes: `build`, `test`, `frames`, `still`. It is used for the hero still and social image; the page itself renders the cup live.
- `blender/export_web.py`: converts the hero still to WebP (adds a bloom glow) and builds the social card.
- `public/`: `hero-2000.webp` and `og.jpg` (Blender renders), favicon.

## Run the site

```bash
npm install
npm run dev                      # http://localhost:3000
npm run build                    # static export in out/
BASE_PATH=/cup-site npm run build   # for GitHub Pages project hosting
```

## Re-render the Blender images

```bash
python blender/build_levo.py still hero 2000 160 out/hero.png
python blender/export_web.py out/hero.png public
```

The product, copy, price and sign-up form are illustrative; the form sends nothing.
