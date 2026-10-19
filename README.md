# Levo

A levitating smart cup with a **Thermal Halo** (a fictional concept product): a procedural Blender model with custom shaders, and a scroll-driven Next.js site that renders the cup live in the browser with React Three Fiber.

## Original request

> would you able to create a high resolution blender object including shader, animate this object within a 2D scene and create a highly profossional website from it like https://oryzo.ai/

Follow-ups: reinvent the cup with a creative fictional feature and a simple, futuristic look; port the site to SvelteKit (later replaced by Next.js); add a steam background and a printed label; use React Three Fiber instead of rendered frames.

## The product idea

Levo hovers above its own lid, flipped into a wireless coaster, on a six-millimetre magnetic cushion. Induction in its steel liner holds your drink at a chosen temperature (20–80 °C) for up to four hours, and a recessed light band, the Thermal Halo, shifts from cyan to amber so you can read the temperature at a glance. The site turns the live 3D cup through four chapters (Float, Halo, Hold, Rest) while a live readout climbs from 22 to 65 °C.

## Details

- **Shape and lid-coaster:** the cup follows a takeaway-cup silhouette (straight tapered cone, flat rim). Its lid is also the coaster and is **deformable**: one mesh with a morph target blends a capping lid (a roof over the lip, a skirt wrapping the outside of the rim, a plug inside the mouth, a raised plateau with sip slot, vent and a champagne wordmark) into a flat coaster slab with glowing inlay rings. It uses the same cognac leather as the sleeve. In the scroll story the lid lifts off, flies clear, flips and flattens while it slides underneath; in the last chapter it flips back on. The path and the morph are driven by one parameter (`rig.lidT`) tweened by GSAP and read by the 3D scene (`LevoCanvas.jsx`).
- **Opening: the pad.** The page starts looking straight down at the cup, lid on, resting on a dark gray pad in the centre of the screen (`src/lib/three/Workshop.jsx`), under a studio lighting rig: a photo-studio environment of lightformers (a soft ceiling box, narrow strip boxes for long metal highlights, front fill, cyan/violet kickers and a warm floor bounce), ACES filmic tone mapping and a shadow-casting key light that drops soft real shadows of the cup and lid onto the pad and the coaster. Scrolling tilts the camera into the side view, the mat drops away and the cup lifts off and glides to the left. One parameter (`rig.topT`, 1 to 0) drives the camera elevation, zoom, mat position and the cup's lift.
- **Fictional advertising:** per-chapter ad pills (Commute Mode, Desk Mode, "as featured on" and a founders' offer), a promo section with two ad cards, and the updated marquee, specs and reserve copy.

- **Material:** bead-blasted, anodised champagne titanium with fine anisotropic lathe lines, lit by tall strip softboxes so the body picks up long machined-metal highlights.
- **Label:** a vertical, negative "LEVO" knocked out of a smoked matte-black strip that is taller than the cup, so its top and bottom edges are never visible and the lettering spans the whole height. It is generated as an alpha texture and mapped cylindrically (constant width on the tapered body). The same mask dims the Thermal Halo shader to about a third, so the ring stays visible through the label, and it continues across the sleeve.
- **Sleeve (no handle) and leather:** a one-piece, hand-finished camel-tan leather sleeve modelled on real blind-embossed leather: a matte, nubuck-like surface with soft rolls and fine wrinkles, and tone-on-tone detail. Where the sleeve covers the cup's label, the lettering is **embossed** into the leather: pressed in with soft bevelled walls, a slightly darker, warm compressed floor and a burnished sheen. The saddle stitching is small, tight and close to the leather's own tone: slanted twisted thread through punched holes in a pressed channel, along both edges and up the seam (a stitched ring on the lid, which follows the flange as it deforms). The Blender source builds the same look (noise-based relief, a blurred emboss mask, PIL-generated stitch textures).
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
