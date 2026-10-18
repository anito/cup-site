# Ember

A procedural Blender ceramic cup (glaze shader, gold rim, looping animation) and a scroll-driven 2D product website built from its renders.

## Original request

> would you able to create a high resolution blender object including shader, animate this object within a 2D scene and create a highly profossional website from it like https://oryzo.ai/

## Status

Work in progress. The Blender scene and site code are done; the 72 rendered frames and hero still have **not** been generated yet, so the site shows nothing until they are.

## Layout

- `blender/build_ember.py`: builds the cup, shaders, lighting and animation with `bpy` (`pip install bpy`, Python 3.13). Modes: `build`, `test`, `frames`, `still`.
- `blender/export_web.py`: converts rendered PNGs to the WebP assets the site uses.
- `site/`: static site (HTML/CSS/JS, vendored GSAP, ScrollTrigger, Lenis, self-hosted fonts). Expects `site/assets/frames/f000.webp`..`f071.webp`, `site/assets/hero-2000.webp` and `site/assets/og.jpg`.

## Rendering

```bash
python blender/build_ember.py frames 72 880 28 out/frames
python blender/build_ember.py still hero 2000 160 out/hero.png
python blender/export_web.py out/frames out/hero.png site/assets
cd site && python -m http.server 8000
```

The product is fictional; all copy is illustrative.
