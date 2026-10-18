# Levo

A levitating smart cup with a **Thermal Halo** (a fictional concept product): a procedural Blender model with custom shaders, and a scroll-driven SvelteKit site that renders the cup live in the browser with React Three Fiber.

## Original request

> would you able to create a high resolution blender object including shader, animate this object within a 2D scene and create a highly profossional website from it like https://oryzo.ai/

Follow-ups: reinvent the cup with a creative fictional feature and a simple, futuristic look; port the site to SvelteKit; add a steam background and a printed label; use React Three Fiber instead of rendered frames.

## The product idea

Levo hovers above a wireless dock on a six-millimetre magnetic cushion. Induction in its steel liner holds your drink at a chosen temperature (20–80 °C) for up to four hours, and a recessed light band, the Thermal Halo, shifts from cyan to amber so you can read the temperature at a glance. The site turns the live 3D cup through four chapters (Float, Halo, Hold, Rest) while a live readout climbs from 22 to 65 °C.

## Details

- **Material:** bead-blasted, anodised champagne titanium with fine anisotropic lathe lines, lit by tall strip softboxes so the body picks up long machined-metal highlights.
- **Label:** a full-height, vertical, negative "LEVO" (knocked out of a smoked matte-black label), generated as an alpha texture in `build_levo.py` and mapped cylindrically (constant width on the tapered body). The same mask dims the Thermal Halo shader to about a third, so the ring stays visible through the label.
- **Steam:** `src/lib/components/Steam.svelte` is a small WebGL smoke shader. Scroll velocity feeds a damped follower (about 0.5 s), so the smoke keeps drifting after you stop scrolling; the pointer pushes it around; it takes the chapter colour.

## Hosting

`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main` (repo Settings → Pages → Source: GitHub Actions). Live at https://anito.github.io/cup-site/ . All asset URLs are document-relative, so it also works from any sub-path.

## Layout

- `src/`: SvelteKit 3 app (Svelte 5 runes, adapter-static). `src/lib/components/Stage.svelte` holds the GSAP ScrollTrigger timeline and mounts the 3D scene.
- `src/lib/three/`: the **live 3D cup**, a React Three Fiber island mounted from Svelte (`mount.js`). `geometry.js` is a JS port of the Blender parametric model (lathe body, handle tube, dock, glows, label texture), `materials.js` holds the titanium / smoked-label / emissive-halo materials (the label is mapped in the shader from object-space position), `LevoCanvas.jsx` is the scene (strip-softbox environment, camera, hover/rotation). The DOM `.cup` wrapper is the layout driver: GSAP moves and scales it, and the 3D group follows its box every frame.
- `blender/build_levo.py`: the original Blender source (cup, dock, procedural shaders, lighting, animation) with `bpy` (`pip install bpy`, Python 3.13). Modes: `build`, `test`, `frames`, `still`. It is used for the hero still and social image; the page itself no longer plays pre-rendered frames.
- `blender/export_web.py`: converts the hero still to WebP (adds a bloom glow) and builds the social card.
- `static/hero-2000.webp`, `static/og.jpg`: Blender-rendered images used in the close-up and reserve sections.

## Run the site

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in build/
npm run preview
```

## Re-render the Blender images

```bash
python blender/build_levo.py still hero 2000 160 out/hero.png
python blender/export_web.py out/hero.png static
```

The product, copy, price and sign-up form are illustrative; the form sends nothing.
