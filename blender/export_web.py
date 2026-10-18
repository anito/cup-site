"""Turn rendered PNGs into the web assets used by the SvelteKit site.

Cycles has no bloom, so a soft glow is added here: saturated, bright pixels (the
emissive Halo band, lip and dock rings) are blurred and added back in premultiplied
space, which also lets the glow spill onto the transparent background.

    python export_web.py <frames_png_dir> <hero_png> <static_dir>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter


def bloom(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert("RGBA"), dtype=np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3:4]
    mx, mn = rgb.max(-1, keepdims=True), rgb.min(-1, keepdims=True)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    mask = np.clip((sat - 0.45) / 0.35, 0, 1) * np.clip((mx - 0.55) / 0.3, 0, 1) * (alpha > 0.5)
    src = Image.fromarray((rgb * mask * 255).astype(np.uint8), "RGB")
    w = im.width
    glow = np.zeros_like(rgb)
    for radius, gain in ((w * 0.006, 1.1), (w * 0.018, 1.0), (w * 0.05, 0.85)):
        glow += np.asarray(src.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0 * gain
    glow = np.clip(glow, 0, 1)
    glow_a = np.clip(glow.max(-1, keepdims=True) * 0.9, 0, 1)
    pre = rgb * alpha + glow
    out_a = np.clip(alpha + glow_a * (1 - alpha), 0, 1)
    out_rgb = np.where(out_a > 1e-4, pre / np.maximum(out_a, 1e-4), 0)
    out = np.concatenate([np.clip(out_rgb, 0, 1), out_a], -1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def main():
    frames_dir, hero_png, static = sys.argv[1:4]
    os.makedirs(os.path.join(static, "frames"), exist_ok=True)
    for name in sorted(os.listdir(frames_dir)):
        if name.endswith(".png"):
            bloom(Image.open(os.path.join(frames_dir, name))).save(
                os.path.join(static, "frames", name.replace(".png", ".webp")),
                "WEBP", quality=86, alpha_quality=92, method=6)

    hero = bloom(Image.open(hero_png))
    hero.save(os.path.join(static, "hero-2000.webp"), "WEBP", quality=90, alpha_quality=95, method=6)

    # 1200x630 social card on the site's dark background
    w, h = 1200, 630
    bg = Image.new("RGB", (w, h), (5, 7, 11))
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    from PIL import ImageDraw
    ImageDraw.Draw(glow).ellipse((w // 2 - 330, h // 2 - 330, w // 2 + 330, h // 2 + 330), fill=(14, 52, 74))
    bg = Image.blend(bg, Image.eval(glow.filter(ImageFilter.GaussianBlur(120)), lambda v: v), 1.0).convert("RGB")
    cup = hero.resize((700, 700), Image.LANCZOS)
    bg.paste(cup, (w // 2 - 350, h // 2 - 350), cup)
    bg.save(os.path.join(static, "og.jpg"), quality=88)
    print("ok")


main()
