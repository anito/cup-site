"""
Levo - a levitating cup with a "Thermal Halo" (fictional product).

Builds, in Blender (bpy): a minimal anodised-titanium cup with a full-height smoked label and a recessed light band that
shifts from cool cyan to hot amber around its body, a glowing lip, a dark glass dock
with light rings, studio lighting, and a looping hover/rotate animation. Can render
frames and stills.

    python build_levo.py build                        # writes levo.blend
    python build_levo.py test  [t] [px] [samples]      # one preview frame -> _test.png
    python build_levo.py frames <count> <px> <samples> <outdir>
    python build_levo.py still <hero|top> <px> <samples> <outfile>
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SEGMENTS = 320
CHAIKIN_PASSES = 3
ROOT_BASE_Z = 0.34       # cup hover height above the dock surface
TARGET_Z = 0.50
CAM_DIST = 5.2
CAM_FOCAL = 85

# slots: 0 titanium shell, 1 steel liner, 2 halo glow
PROFILE = [
    (0.000, 0.040),
    (0.280, 0.040),
    (0.318, 0.078),   # rounded base corner
    (0.338, 0.240),
    (0.334, 0.262),   # halo groove (follows the cone)
    (0.355, 0.430),
    (0.364, 0.452),
    (0.428, 0.965),
    (0.432, 0.985),
    (0.416, 1.012),   # glowing lip
    (0.399, 0.985),
    (0.386, 0.940),
    (0.296, 0.200),
    (0.000, 0.150),
]
EDGE_MAT = [0, 0, 0, 0, 2, 0, 0, 0, 2, 2, 1, 1, 1]


# --------------------------------------------------------------------------
# geometry
# --------------------------------------------------------------------------

def chaikin(points, labels, passes):
    for _ in range(passes):
        n = len(points)
        seq = [(points[0], None)]
        for i in range(n - 1):
            p, q, lab = points[i], points[i + 1], labels[i]
            qq = (0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1])
            rr = (0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1])
            last = i == n - 2
            if i > 0:
                seq.append((qq, lab))
            seq.append((q, lab) if last else (rr, lab))
        points = [p for p, _ in seq]
        labels = [l for _, l in seq[1:]]
    return points, labels


def lathe(name, profile, edge_labels, mats, segments=SEGMENTS, passes=CHAIKIN_PASSES):
    pts, labs = chaikin(profile, edge_labels, passes)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, z in pts:
        if r < 1e-6:
            rings.append([bm.verts.new((0.0, 0.0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * j / segments),
                                        r * math.sin(2 * math.pi * j / segments), z))
                          for j in range(segments)])
    for i in range(len(pts) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(segments):
            j2 = (j + 1) % segments
            if len(a) == 1:
                f = bm.faces.new((a[0], b[j2], b[j]))
            elif len(b) == 1:
                f = bm.faces.new((a[j], a[j2], b[0]))
            else:
                f = bm.faces.new((a[j], a[j2], b[j2], b[j]))
            f.material_index = labs[i]
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    for m in mats:
        obj.data.materials.append(m)
    return obj


SLEEVE_T = 0.024                                      # full leather thickness on the ridges
GROOVE_DEPTH, GROOVE_HALF = 0.017, 0.014              # grooves leave ~0.007 of leather: translucent
GROOVE_CENTERS = [0.550, 0.618, 0.686, 0.754, 0.822]
WALL_SLOPE, WALL_R0 = 0.1236, 0.318                   # straight cone: r = R0 + SLOPE * (y - 0.078)


def sleeve_thickness(y):
    g = 0.0
    for c in GROOVE_CENTERS:
        d = abs(y - c)
        if d < GROOVE_HALF:
            g = max(g, 0.5 * (1 + math.cos(math.pi * d / GROOVE_HALF)))
    return SLEEVE_T - GROOVE_DEPTH * g


def build_sleeve(mat):
    """Leather grip sleeve with rounded circumferential grooves, hugging the upper body."""
    r_at = lambda y: WALL_R0 + WALL_SLOPE * (y - 0.078)
    y0, y1, n = 0.49, 0.87, 140
    ys = [y0 + (y1 - y0) * i / n for i in range(n + 1)]
    inner = [(r_at(y) + 0.0015, y) for y in ys]
    outer = [(r_at(y) + sleeve_thickness(y), y) for y in ys]
    profile = [inner[0], outer[0]] + outer[1:] + [inner[-1]] + inner[-2::-1]
    return lathe("LevoSleeve", profile, [0] * (len(profile) - 1), [mat], passes=1)


def build_drink(mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=0.362, depth=0.010,
                                        location=(0, 0, 0.765))
    obj = bpy.context.active_object
    obj.name = "LevoDrink"
    obj.data.materials.append(mat)
    return obj


LID_PROFILE = [
    (0.000, 0.000),   # underside centre (becomes the coaster top when flipped)
    (0.200, 0.000),
    (0.380, 0.000),
    (0.500, 0.000),
    (0.545, 0.003),
    (0.575, 0.015),   # rounded flange edge
    (0.575, 0.050),
    (0.545, 0.066),
    (0.440, 0.066),   # flange top
    (0.405, 0.075),
    (0.395, 0.150),   # raised plateau
    (0.375, 0.170),
    (0.330, 0.170),
    (0.320, 0.155),   # recessed sip deck
    (0.000, 0.155),
]
LID_EDGE_MAT = [1] * 4 + [0] * 10     # 0 soft-touch top, 1 glass underside


def build_lid_coaster(mat_top, mat_under, mat_glow):
    """The lid, flipped: its glass underside is the coaster top (at z=0), the plateau hangs below."""
    objs = []
    lid = lathe("LevoLid", LID_PROFILE, LID_EDGE_MAT, [mat_top, mat_under], segments=256)
    lid.rotation_euler = (math.pi, 0, 0)
    objs.append(lid)
    for name, radius, minor in (("RingA", 0.30, 0.011), ("RingB", 0.41, 0.006)):
        bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=minor,
                                         major_segments=192, minor_segments=12,
                                         location=(0, 0, 0.004))
        t = bpy.context.active_object
        t.name = "Dock" + name
        t.data.materials.append(mat_glow)
        objs.append(t)
    return objs


# --------------------------------------------------------------------------
# print: vertical "LEVO" knocked out of a dark band (negative lettering)
# --------------------------------------------------------------------------

PRINT_PATH = os.path.join(HERE, "levo_print.png")
PRINT_Z0, PRINT_Z1 = -0.03, 1.07      # strip is taller than the cup: its top and bottom edges are never seen
PRINT_ARC = 0.34                      # label width measured along the surface (object units)
PRINT_CENTER = math.radians(-70)      # object angle the label is centred on (faces camera at t=0)


def make_print_texture(path=PRINT_PATH, w=618, h=2000):
    """Alpha = 1 inside the label, 0 where the letters are knocked out."""
    from PIL import Image, ImageDraw

    cap, stroke = 455, 80
    widths = {"L": 330, "E": 330, "V": 400, "O": 370}
    gap = 86
    word = "LEVO"
    total = sum(widths[c] for c in word) + gap * (len(word) - 1)

    text = Image.new("L", (total, cap), 0)
    d = ImageDraw.Draw(text)
    x = 0
    for c in word:
        cw = widths[c]
        if c == "L":
            d.rectangle((x, 0, x + stroke, cap), fill=255)
            d.rectangle((x, cap - stroke, x + cw, cap), fill=255)
        elif c == "E":
            d.rectangle((x, 0, x + stroke, cap), fill=255)
            for y0 in (0, (cap - stroke) // 2, cap - stroke):
                d.rectangle((x, y0, x + cw, y0 + stroke), fill=255)
        elif c == "V":
            k = stroke * 1.25
            d.polygon([(x, 0), (x + k, 0), (x + cw / 2, cap * 0.78), (x + cw - k, 0), (x + cw, 0),
                       (x + cw / 2 + k / 2, cap), (x + cw / 2 - k / 2, cap)], fill=255)
        elif c == "O":
            d.rounded_rectangle((x, 0, x + cw, cap), radius=cw // 2, fill=255)
            d.rounded_rectangle((x + stroke, stroke, x + cw - stroke, cap - stroke),
                                radius=max(1, cw // 2 - stroke), fill=0)
        x += cw + gap

    text = text.rotate(90, expand=True)            # reads bottom -> top, letter tops face left
    label = Image.new("L", (w, h), 0)
    ImageDraw.Draw(label).rectangle((20, 0, w - 20, h), fill=255)
    knock = Image.new("L", (w, h), 0)
    knock.paste(text, ((w - text.width) // 2, (h - text.height) // 2))
    alpha = Image.eval(knock, lambda v: 255 - v)
    alpha = Image.composite(alpha, Image.new("L", (w, h), 0), label)
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    img.putalpha(alpha)
    img.save(path)
    return path


def add_print(nt, tc):
    """Cylindrical label mapping from object coords; returns the Image Texture node.
    u = angle * radius / width keeps the label a constant width on the tapered body."""
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-1300, -500)
    link(nt, tc, "Object", sep, "Vector")
    at = nt.nodes.new("ShaderNodeMath"); at.operation = "ARCTAN2"; at.location = (-1100, -450)
    link(nt, sep, "Y", at, 0)
    link(nt, sep, "X", at, 1)
    sub = nt.nodes.new("ShaderNodeMath"); sub.operation = "SUBTRACT"; sub.location = (-950, -450)
    sub.inputs[1].default_value = PRINT_CENTER
    link(nt, at, 0, sub, 0)
    wr = nt.nodes.new("ShaderNodeMath"); wr.operation = "WRAP"; wr.location = (-800, -450)
    wr.inputs[1].default_value = -math.pi
    wr.inputs[2].default_value = math.pi
    link(nt, sub, 0, wr, 0)
    rad = nt.nodes.new("ShaderNodeMath"); rad.operation = "POWER"; rad.location = (-1100, -650)
    xx = nt.nodes.new("ShaderNodeMath"); xx.operation = "POWER"; xx.inputs[1].default_value = 2.0
    yy = nt.nodes.new("ShaderNodeMath"); yy.operation = "POWER"; yy.inputs[1].default_value = 2.0
    xx.location = (-1250, -650); yy.location = (-1250, -750)
    link(nt, sep, "X", xx, 0)
    link(nt, sep, "Y", yy, 0)
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"; ad.location = (-1100, -700)
    link(nt, xx, 0, ad, 0)
    link(nt, yy, 0, ad, 1)
    sq = nt.nodes.new("ShaderNodeMath"); sq.operation = "SQRT"; sq.location = (-950, -700)
    link(nt, ad, 0, sq, 0)
    arc = nt.nodes.new("ShaderNodeMath"); arc.operation = "MULTIPLY"; arc.location = (-800, -600)
    link(nt, wr, 0, arc, 0)
    link(nt, sq, 0, arc, 1)
    uu = nt.nodes.new("ShaderNodeMath"); uu.operation = "MULTIPLY_ADD"; uu.location = (-650, -600)
    uu.inputs[1].default_value = 1.0 / PRINT_ARC
    uu.inputs[2].default_value = 0.5
    link(nt, arc, 0, uu, 0)
    vv = nt.nodes.new("ShaderNodeMath"); vv.operation = "MULTIPLY_ADD"; vv.location = (-650, -800)
    vv.inputs[1].default_value = 1.0 / (PRINT_Z1 - PRINT_Z0)
    vv.inputs[2].default_value = -PRINT_Z0 / (PRINT_Z1 - PRINT_Z0)
    link(nt, sep, "Z", vv, 0)
    cb = nt.nodes.new("ShaderNodeCombineXYZ"); cb.location = (-480, -700)
    link(nt, uu, 0, cb, "X")
    link(nt, vv, 0, cb, "Y")
    img = nt.nodes.new("ShaderNodeTexImage"); img.location = (-300, -700)
    img.image = bpy.data.images.load(make_print_texture())
    img.interpolation = "Cubic"
    img.extension = "CLIP"
    link(nt, cb, "Vector", img, "Vector")
    return img


# --------------------------------------------------------------------------
# shaders
# --------------------------------------------------------------------------

def new_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (1000, 0)
    return m, nt, out


def link(nt, a, ao, b, bi):
    nt.links.new(a.outputs[ao], b.inputs[bi])


def setv(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


def ramp(nt, stops, interp="LINEAR", loc=(0, 0)):
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.location = loc
    r.color_ramp.interpolation = interp
    el = r.color_ramp.elements
    while len(el) > len(stops):
        el.remove(el[-1])
    while len(el) < len(stops):
        el.new(0.5)
    for e, (pos, col) in zip(el, stops):
        e.position = pos
        e.color = col
    return r


def noise(nt, loc, scale, detail=4.0):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.location = loc
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    return n


def mat_shell():
    """Bead-blasted, anodised titanium with fine lathe lines (anisotropic), carrying a
    smoked-glass label: opaque enough to read on the body, translucent over the halo."""
    m, nt, out = new_material("Shell_Titanium")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1500, 0)

    # lathe lines: 1-D noise in z only, plus a fine blasted grain
    sepz = nt.nodes.new("ShaderNodeSeparateXYZ"); sepz.location = (-1300, 300)
    link(nt, tc, "Object", sepz, "Vector")
    lines_v = nt.nodes.new("ShaderNodeCombineXYZ"); lines_v.location = (-1100, 300)
    link(nt, sepz, "Z", lines_v, "X")
    lines = noise(nt, (-900, 300), 520.0, 2.0)
    link(nt, lines_v, "Vector", lines, "Vector")
    grain = noise(nt, (-900, 120), 900.0, 3.0)
    link(nt, tc, "Object", grain, "Vector")
    mixb = nt.nodes.new("ShaderNodeMath"); mixb.operation = "ADD"; mixb.location = (-700, 220)
    mixb.use_clamp = False
    link(nt, lines, "Fac", mixb, 0)
    link(nt, grain, "Fac", mixb, 1)
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-500, 220)
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.0015
    link(nt, mixb, 0, bump, "Height")

    tint = noise(nt, (-900, -120), 2.2, 4.0)
    link(nt, tc, "Object", tint, "Vector")
    col = ramp(nt, [(0.35, (0.74, 0.60, 0.44, 1)), (0.65, (0.86, 0.72, 0.54, 1))],
               "LINEAR", (-500, 20))
    link(nt, tint, "Fac", col, "Fac")

    img = add_print(nt, tc)

    ink = nt.nodes.new("ShaderNodeMix"); ink.data_type = "RGBA"; ink.location = (-100, 80)
    ink.inputs["B"].default_value = (0.004, 0.005, 0.008, 1)
    link(nt, col, "Color", ink, "A")
    k = nt.nodes.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.location = (-300, -60)
    k.inputs[1].default_value = 0.93
    link(nt, img, "Alpha", k, 0)
    link(nt, k, 0, ink, "Factor")
    metal = nt.nodes.new("ShaderNodeMath"); metal.operation = "SUBTRACT"; metal.location = (-100, -80)
    metal.inputs[0].default_value = 1.0
    link(nt, k, 0, metal, 1)
    rough = nt.nodes.new("ShaderNodeMix"); rough.data_type = "FLOAT"; rough.location = (-100, -220)
    rough.inputs["A"].default_value = 0.44
    rough.inputs["B"].default_value = 0.46
    link(nt, k, 0, rough, "Factor")

    spec = nt.nodes.new("ShaderNodeMix"); spec.data_type = "FLOAT"; spec.location = (100, -380)
    spec.inputs["A"].default_value = 0.35
    spec.inputs["B"].default_value = 0.04          # matte-black print barely reflects
    link(nt, k, 0, spec, "Factor")

    tan = nt.nodes.new("ShaderNodeTangent"); tan.location = (100, -260)
    tan.direction_type = "RADIAL"
    tan.axis = "Z"

    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (450, 0)
    link(nt, ink, "Result", b, "Base Color")
    link(nt, metal, 0, b, "Metallic")
    link(nt, rough, "Result", b, "Roughness")
    link(nt, bump, "Normal", b, "Normal")
    link(nt, tan, "Tangent", b, "Tangent")
    setv(b, "Anisotropic", 0.65)
    link(nt, spec, "Result", b, "Specular IOR Level")
    setv(b, "Coat Weight", 0.0)
    link(nt, b, "BSDF", out, "Surface")
    return m


def mat_leather():
    """Cognac leather that goes translucent where the grooves make it thin."""
    m, nt, out = new_material("Sleeve_Leather")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1500, 0)
    grain = noise(nt, (-900, 200), 380.0, 4.0)
    link(nt, tc, "Object", grain, "Vector")
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-500, 200)
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.004
    link(nt, grain, "Fac", bump, "Height")
    var = noise(nt, (-900, 0), 5.0, 4.0)
    link(nt, tc, "Object", var, "Vector")
    col = ramp(nt, [(0.3, (0.17, 0.055, 0.020, 1)), (0.7, (0.27, 0.100, 0.036, 1))], "LINEAR", (-500, 0))
    link(nt, var, "Fac", col, "Fac")

    # leather thickness from the object-space radius: t = r - wall(y) - 0.0015
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-1300, -400)
    link(nt, tc, "Object", sep, "Vector")
    xx = nt.nodes.new("ShaderNodeMath"); xx.operation = "POWER"; xx.inputs[1].default_value = 2.0
    yy = nt.nodes.new("ShaderNodeMath"); yy.operation = "POWER"; yy.inputs[1].default_value = 2.0
    link(nt, sep, "X", xx, 0)
    link(nt, sep, "Y", yy, 0)
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"
    link(nt, xx, 0, ad, 0)
    link(nt, yy, 0, ad, 1)
    rr = nt.nodes.new("ShaderNodeMath"); rr.operation = "SQRT"
    link(nt, ad, 0, rr, 0)
    line = nt.nodes.new("ShaderNodeMath"); line.operation = "MULTIPLY_ADD"
    line.inputs[1].default_value = WALL_SLOPE
    line.inputs[2].default_value = WALL_R0 - WALL_SLOPE * 0.078 + 0.0015
    link(nt, sep, "Z", line, 0)
    th = nt.nodes.new("ShaderNodeMath"); th.operation = "SUBTRACT"
    link(nt, rr, 0, th, 0)
    link(nt, line, 0, th, 1)
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.location = (-300, -400)
    mr.inputs["From Min"].default_value = 0.009
    mr.inputs["From Max"].default_value = 0.0165
    link(nt, th, 0, mr, "Value")
    op = nt.nodes.new("ShaderNodeMath"); op.operation = "MULTIPLY_ADD"; op.location = (-100, -400)
    op.inputs[1].default_value = 0.8
    op.inputs[2].default_value = 0.2                    # thin leather keeps ~20% opacity
    link(nt, mr, "Result", op, 0)

    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (200, 0)
    link(nt, col, "Color", b, "Base Color")
    link(nt, bump, "Normal", b, "Normal")
    setv(b, "Roughness", 0.5)
    setv(b, "Coat Weight", 0.06)
    setv(b, "Coat Roughness", 0.3)
    setv(b, "Sheen Weight", 0.1)
    clear = nt.nodes.new("ShaderNodeBsdfTransparent"); clear.location = (200, -250)
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.location = (600, 0)
    link(nt, op, 0, mix, "Fac")
    link(nt, clear, "BSDF", mix, 1)
    link(nt, b, "BSDF", mix, 2)
    link(nt, mix, "Shader", out, "Surface")
    return m


def mat_liner():
    m, nt, out = new_material("Liner_Steel")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-900, 0)
    n = noise(nt, (-700, 0), 8.0, 2.0)
    n.inputs["Roughness"].default_value = 0.4
    mp = nt.nodes.new("ShaderNodeMapping"); mp.location = (-900, -300)
    mp.inputs["Scale"].default_value = (1.0, 1.0, 90.0)  # brushed, stretched in z
    link(nt, tc, "Object", mp, "Vector")
    br = noise(nt, (-650, -300), 60.0, 2.0)
    link(nt, mp, "Vector", br, "Vector")
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-300, -200)
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.003
    link(nt, br, "Fac", bump, "Height")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (300, 0)
    setv(b, "Base Color", (0.30, 0.31, 0.34, 1))
    setv(b, "Metallic", 1.0)
    setv(b, "Roughness", 0.30)
    link(nt, bump, "Normal", b, "Normal")
    link(nt, b, "BSDF", out, "Surface")
    return m


def mat_halo():
    """Emissive band: cyan on the handle side to amber on the far side (|angle|)."""
    m, nt, out = new_material("Halo_Glow")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1100, 0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-900, 0)
    link(nt, tc, "Object", sep, "Vector")
    at = nt.nodes.new("ShaderNodeMath"); at.operation = "ARCTAN2"; at.location = (-700, 0)
    link(nt, sep, "Y", at, 0)
    link(nt, sep, "X", at, 1)
    ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; ab.location = (-540, 0)
    link(nt, at, 0, ab, 0)
    dv = nt.nodes.new("ShaderNodeMath"); dv.operation = "DIVIDE"; dv.location = (-380, 0)
    dv.inputs[1].default_value = math.pi
    link(nt, ab, 0, dv, 0)
    r = ramp(nt, [(0.00, (0.00, 0.62, 1.00, 1)),
                  (0.35, (0.25, 0.30, 1.00, 1)),
                  (0.65, (1.00, 0.30, 0.45, 1)),
                  (1.00, (1.00, 0.62, 0.10, 1))], "LINEAR", (-200, 0))
    link(nt, dv, 0, r, "Fac")
    img = add_print(nt, tc)
    dim = nt.nodes.new("ShaderNodeMath"); dim.operation = "MULTIPLY_ADD"; dim.location = (-100, -250)
    dim.inputs[1].default_value = -0.66           # label dims the ring to ~34% ...
    dim.inputs[2].default_value = 4.2             # ... of full strength; letters show it fully
    # strength = 3.2 * (1 - 0.66*alpha)  ->  alpha*(-0.66*3.2) + 3.2
    dim.inputs[1].default_value = -0.66 * 4.2
    link(nt, img, "Alpha", dim, 0)
    e = nt.nodes.new("ShaderNodeEmission"); e.location = (200, 0)
    link(nt, dim, 0, e, "Strength")
    link(nt, r, "Color", e, "Color")
    link(nt, e, "Emission", out, "Surface")
    return m


def mat_lid_top():
    """Matte graphite soft-touch plastic for the lid's top."""
    m, nt, out = new_material("Lid_SoftTouch")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-800, 0)
    n = noise(nt, (-600, -150), 300.0, 4.0)
    link(nt, tc, "Object", n, "Vector")
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-300, -150)
    bump.inputs["Strength"].default_value = 0.1
    bump.inputs["Distance"].default_value = 0.002
    link(nt, n, "Fac", bump, "Height")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (200, 0)
    setv(b, "Base Color", (0.028, 0.030, 0.038, 1))
    setv(b, "Roughness", 0.55)
    setv(b, "Sheen Weight", 0.25)
    link(nt, bump, "Normal", b, "Normal")
    link(nt, b, "BSDF", out, "Surface")
    return m


def mat_dock_glow():
    m, nt, out = new_material("Dock_Glow")
    e = nt.nodes.new("ShaderNodeEmission"); e.location = (0, 0)
    e.inputs["Color"].default_value = (0.20, 0.72, 1.0, 1)
    e.inputs["Strength"].default_value = 3.6
    link(nt, e, "Emission", out, "Surface")
    return m


def mat_dock_body():
    m, nt, out = new_material("Dock_Glass")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-800, 0)
    n = noise(nt, (-600, -150), 260.0, 4.0)
    link(nt, tc, "Object", n, "Vector")
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-300, -150)
    bump.inputs["Strength"].default_value = 0.02
    link(nt, n, "Fac", bump, "Height")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (200, 0)
    setv(b, "Base Color", (0.012, 0.014, 0.020, 1))
    setv(b, "Roughness", 0.22)
    setv(b, "Specular IOR Level", 0.6)
    setv(b, "Coat Weight", 0.8)
    setv(b, "Coat Roughness", 0.05)
    link(nt, bump, "Normal", b, "Normal")
    link(nt, b, "BSDF", out, "Surface")
    return m


def mat_drink():
    m, nt, out = new_material("Drink")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (0, 0)
    setv(b, "Base Color", (0.020, 0.012, 0.010, 1))
    setv(b, "Roughness", 0.04)
    setv(b, "Specular IOR Level", 0.8)
    link(nt, b, "BSDF", out, "Surface")
    return m


# --------------------------------------------------------------------------
# world, lights, camera, animation
# --------------------------------------------------------------------------

def build_world(scene):
    w = bpy.data.worlds.new("Studio")
    scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld"); out.location = (600, 0)
    bg = nt.nodes.new("ShaderNodeBackground"); bg.location = (400, 0)
    bg.inputs["Strength"].default_value = 1.1
    geo = nt.nodes.new("ShaderNodeNewGeometry"); geo.location = (-800, 0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-600, 0)
    link(nt, geo, "Incoming", sep, "Vector")
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.location = (-400, 0)
    mr.inputs["From Min"].default_value = -1.0
    mr.inputs["From Max"].default_value = 1.0
    link(nt, sep, "Z", mr, "Value")
    rp = ramp(nt, [(0.0, (0.010, 0.012, 0.020, 1)),
                   (0.50, (0.050, 0.065, 0.095, 1)),
                   (0.70, (0.30, 0.38, 0.52, 1)),
                   (1.0, (0.70, 0.78, 0.92, 1))], "LINEAR", (-150, 0))
    link(nt, mr, "Result", rp, "Fac")
    link(nt, rp, "Color", bg, "Color")
    link(nt, bg, "Background", out, "Surface")


def area(name, loc, size, power, color, size_y=None, shadow=False, target=(0, 0, 0.5)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = color
    ld.size = size
    if size_y:
        ld.shape = "RECTANGLE"
        ld.size_y = size_y
    ld.use_shadow = shadow
    ob = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    return ob


def build_rig(scene):
    area("Key", (-3.0, -3.2, 4.0), 3.0, 480, (0.95, 0.97, 1.0), shadow=True)
    area("RimCyan", (3.6, 3.0, 2.2), 0.7, 650, (0.35, 0.78, 1.0), size_y=3.6)
    area("RimViolet", (-3.8, 2.4, 2.0), 0.7, 520, (0.62, 0.45, 1.0), size_y=3.4)
    area("Fill", (3.4, -3.4, 1.0), 3.0, 70, (0.85, 0.90, 1.0))
    # tall strip softboxes: long vertical highlights are what make machined metal read as premium
    area("StripL", (-3.4, -2.4, 1.0), 0.55, 700, (1.0, 0.97, 0.92), size_y=4.2)
    area("StripR", (3.2, -2.8, 1.0), 0.45, 520, (0.92, 0.96, 1.0), size_y=4.2)

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = CAM_FOCAL
    cam_data.clip_end = 100
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    tgt = bpy.data.objects.new("CamTarget", None)
    bpy.context.collection.objects.link(tgt)
    tgt.location = (0, 0, TARGET_Z)
    tr = cam.constraints.new("TRACK_TO")
    tr.target = tgt
    tr.track_axis = "TRACK_NEGATIVE_Z"
    tr.up_axis = "UP_Y"
    return cam


def set_pose(cam, root, t):
    """t in [0,1): one full seamless loop."""
    el = math.radians(19 + 11 * math.sin(2 * math.pi * t))
    cam.location = (0, -CAM_DIST * math.cos(el), TARGET_Z + CAM_DIST * math.sin(el))
    root.rotation_euler = (0, 0, math.radians(-20) - 2 * math.pi * t)
    root.location = (0, 0, ROOT_BASE_Z + 0.035 * math.sin(2 * math.pi * t))


def build_animation(scene, cam, root, frames=96):
    scene.frame_start = 1
    scene.frame_end = frames + 1
    scene.render.fps = 24
    for f in range(frames + 1):
        set_pose(cam, root, f / frames)
        cam.keyframe_insert("location", frame=f + 1)
        root.keyframe_insert("rotation_euler", frame=f + 1)
        root.keyframe_insert("location", frame=f + 1)


def configure_render(scene, px, samples):
    scene.render.engine = "CYCLES"
    c = scene.cycles
    c.device = "CPU"
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.02
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.max_bounces = 6
    c.glossy_bounces = 5
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 6
    scene.render.resolution_x = px
    scene.render.resolution_y = px
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = -1.2


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    shell, liner, halo = mat_shell(), mat_liner(), mat_halo()
    body = lathe("LevoBody", PROFILE, EDGE_MAT, [shell, liner, halo])
    sleeve = build_sleeve(mat_leather())
    drink = build_drink(mat_drink())

    root = bpy.data.objects.new("LevoRoot", None)
    bpy.context.collection.objects.link(root)
    for ob in (body, sleeve, drink):
        ob.parent = root

    build_lid_coaster(mat_lid_top(), mat_dock_body(), mat_dock_glow())
    build_world(scene)
    cam = build_rig(scene)
    configure_render(scene, 1000, 48)
    build_animation(scene, cam, root)
    return scene, cam, root


def render_png(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    mode = argv[0] if argv else "build"
    scene, cam, root = build()
    if mode != "build":
        cam.animation_data_clear()
        root.animation_data_clear()

    if mode == "build":
        out = os.path.join(HERE, "levo.blend")
        bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
        print("saved", out)
    elif mode == "test":
        t = float(argv[1]) if len(argv) > 1 else 0.25
        px = int(argv[2]) if len(argv) > 2 else 720
        s = int(argv[3]) if len(argv) > 3 else 32
        configure_render(scene, px, s)
        set_pose(cam, root, t)
        render_png(scene, os.path.join(HERE, "_test.png"))
    elif mode == "frames":
        count, px, s, outdir = int(argv[1]), int(argv[2]), int(argv[3]), argv[4]
        os.makedirs(outdir, exist_ok=True)
        configure_render(scene, px, s)
        for i in range(count):
            fn = os.path.join(outdir, f"f{i:03d}.png")
            if os.path.exists(fn):
                continue
            set_pose(cam, root, i / count)
            render_png(scene, fn)
            print("frame", i, flush=True)
    elif mode == "still":
        name, px, s, outfile = argv[1], int(argv[2]), int(argv[3]), argv[4]
        configure_render(scene, px, s)
        set_pose(cam, root, 0.0)
        if name == "top":
            el = math.radians(58)
            cam.location = (0, -CAM_DIST * math.cos(el), TARGET_Z + CAM_DIST * math.sin(el))
        render_png(scene, outfile)


main()
