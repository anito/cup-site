"""Convert rendered PNGs into the web assets used by the site.

    python export_web.py <frames_png_dir> <hero_png> <site_assets_dir>
"""
import os
import sys
from PIL import Image

frames_dir, hero_png, out = sys.argv[1:4]
os.makedirs(os.path.join(out, "frames"), exist_ok=True)

for name in sorted(os.listdir(frames_dir)):
    if not name.endswith(".png"):
        continue
    im = Image.open(os.path.join(frames_dir, name)).convert("RGBA")
    im.save(os.path.join(out, "frames", name.replace(".png", ".webp")),
            "WEBP", quality=86, alpha_quality=90, method=6)

hero = Image.open(hero_png).convert("RGBA")
hero.save(os.path.join(out, "hero-2000.webp"), "WEBP", quality=90, alpha_quality=95, method=6)

# social card: cup on a warm sunset backdrop, 1200x630
w, h = 1200, 630
bg = Image.new("RGB", (w, h), (242, 233, 221))
sun = Image.new("RGBA", (w, h), (0, 0, 0, 0))
from PIL import ImageDraw, ImageFilter
d = ImageDraw.Draw(sun)
d.ellipse((w // 2 - 290, h // 2 - 290, w // 2 + 290, h // 2 + 290), fill=(232, 185, 138, 255))
bg.paste(sun.filter(ImageFilter.GaussianBlur(2)), (0, 0), sun)
cup = hero.resize((760, 760), Image.LANCZOS)
bg.paste(cup, (w // 2 - 380, h // 2 - 400), cup)
bg.save(os.path.join(out, "og.jpg"), quality=88)
print("ok")
