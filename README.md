# Levo

A levitating smart cup with a **Thermal Halo** (a fictional concept product): a procedural Blender model with custom shaders, a looping animation, and a scroll-driven SvelteKit site built from its renders.

## Original request

> would you able to create a high resolution blender object including shader, animate this object within a 2D scene and create a highly profossional website from it like https://oryzo.ai/

Follow-up: reinvent the cup with a creative fictional feature and a simple, futuristic look, and port the site to SvelteKit.

## The product idea

Levo hovers above a wireless dock on a six-millimetre magnetic cushion. Induction in its steel liner holds your drink at a chosen temperature (20–80 °C) for up to four hours, and a recessed light band, the Thermal Halo, shifts from cyan to amber so you can read the temperature at a glance. The site scrubs the cup through four chapters (Float, Halo, Hold, Rest) while a live readout climbs from 22 to 65 °C.

## Details

- **Material:** bead-blasted, anodised champagne titanium with fine anisotropic lathe lines, lit by tall strip softboxes so the body picks up long machined-metal highlights.
- **Label:** a full-height, vertical, negative "LEVO" (knocked out of a smoked matte-black label), generated as an alpha texture in `build_levo.py` and mapped cylindrically (constant width on the tapered body). The same mask dims the Thermal Halo shader to about a third, so the ring stays visible through the label.
- **Steam:** `src/lib/components/Steam.svelte` is a small WebGL smoke shader. Scroll velocity feeds a damped follower (about 0.5 s), so the smoke keeps drifting after you stop scrolling; the pointer pushes it around; it takes the chapter colour.

## Hosting

`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main` (repo Settings → Pages → Source: GitHub Actions). Live at https://anito.github.io/cup-site/ . All asset URLs are document-relative, so it also works from any sub-path.

## Layout

- `blender/build_levo.py`: builds the cup, dock, procedural shaders, lighting and animation with `bpy` (`pip install bpy`, Python 3.13). Modes: `build`, `test`, `frames`, `still`.
- `blender/export_web.py`: converts renders to WebP and adds a bloom glow around the emissive parts.
- `src/`: SvelteKit 3 app (Svelte 5 runes, adapter-static). `src/lib/components/Stage.svelte` holds the canvas frame scrubber and the GSAP ScrollTrigger timeline.
- `static/frames/f000..f071.webp`, `static/hero-2000.webp`, `static/og.jpg`: rendered assets used by the site.

## Run the site

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in build/ (set BASE_PATH for sub-path hosting)
npm run preview
```

## Re-render the assets

```bash
python blender/build_levo.py frames 72 840 28 out/frames
python blender/build_levo.py still hero 2000 160 out/hero.png
python blender/export_web.py out/frames out/hero.png static
```

Frames are 72 steps of one full turn, so the loop is seamless. The product, copy, price and sign-up form are illustrative; the form sends nothing.
