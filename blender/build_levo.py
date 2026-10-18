"""
Levo - a levitating cup with a "Thermal Halo" (fictional product).

Builds, in Blender (bpy): a minimal satin-white cup with a recessed light band that
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

# slots: 0 satin shell, 1 steel liner, 2 halo glow
PROFILE = [
    (0.000, 0.040),
    (0.300, 0.040),
    (0.342, 0.080),
    (0.360, 0.240),
    (0.352, 0.262),   # halo groove
    (0.352, 0.430),
    (0.362, 0.452),
    (0.425, 0.965),
    (0.432, 0.985),
    (0.416, 1.012),   # glowing lip
    (0.399, 0.985),
    (0.386, 0.940),
    (0.330, 0.200),
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


def rounded_path(start, end, x1, z1, z0, r, n=14):
    """Open path in the XZ plane: start -> right along the top, down the outer edge,
    back left along the bottom to end, with rounded corners of radius r."""
    pts = [start]
    for k in range(n + 1):  # top-right corner, 90deg -> 0deg
        a = math.pi / 2 * (1 - k / n)
        pts.append((x1 - r + r * math.cos(a), z1 - r + r * math.sin(a)))
    for k in range(n + 1):  # bottom-right corner, 0 -> -90deg
        a = -math.pi / 2 * (k / n)
        pts.append((x1 - r + r * math.cos(a), z0 + r + r * math.sin(a)))
    pts.append(end)
    return pts


def build_handle(mat):
    cu = bpy.data.curves.new("LevoHandleCurve", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 12
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    path = rounded_path((0.395, 0.865), (0.362, 0.520), 0.640, 0.865, 0.520, 0.10)
    sp.points.add(len(path) - 1)
    for p, (x, z) in zip(sp.points, path):
        p.co = (x, 0.0, z, 1.0)
        p.radius = 0.030
    obj = bpy.data.objects.new("LevoHandle", cu)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.view_layer.objects.active
    obj.name = "LevoHandle"
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.materials.append(mat)
    obj.select_set(False)
    return obj


def build_drink(mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=0.362, depth=0.010,
                                        location=(0, 0, 0.765))
    obj = bpy.context.active_object
    obj.name = "LevoDrink"
    obj.data.materials.append(mat)
    return obj


def build_dock(mat_body, mat_glow):
    """Dark glass dock; top surface at z=0. Returns list of objects."""
    objs = []
    bpy.ops.mesh.primitive_cylinder_add(vertices=192, radius=0.66, depth=0.10,
                                        location=(0, 0, -0.05))
    d = bpy.context.active_object
    d.name = "LevoDock"
    d.data.materials.append(mat_body)
    bv = d.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.035
    bv.segments = 6
    for p in d.data.polygons:
        p.use_smooth = True
    objs.append(d)
    for name, radius, minor, z in (("RingA", 0.44, 0.011, 0.004), ("RingB", 0.55, 0.006, 0.003)):
        bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=minor,
                                         major_segments=192, minor_segments=12,
                                         location=(0, 0, z))
        t = bpy.context.active_object
        t.name = "Dock" + name
        t.data.materials.append(mat_glow)
        objs.append(t)
    return objs



# --------------------------------------------------------------------------
# print: vertical "LEVO" knocked out of a dark band (negative lettering)
# --------------------------------------------------------------------------

PRINT_PATH = os.path.join(HERE, "levo_print.png")
PRINT_Z0, PRINT_Z1 = 0.47, 0.97       # vertical extent of the band on the cup (object z)
PRINT_ARC = 0.42                      # band width measured along the surface (object units)
PRINT_CENTER = math.radians(-70)      # object angle the band is centred on (faces camera at t=0)


def make_print_texture(path=PRINT_PATH, w=1000, h=1190):
    """Alpha = 1 inside the printed band, 0 where the letters are knocked out."""
    from PIL import Image, ImageDraw

    cap, stroke = 470, 66
    widths = {"L": 190, "E": 190, "V": 236, "O": 214}
    gap = 36
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
            k = stroke * 1.2
            d.polygon([(x, 0), (x + k, 0), (x + cw / 2, cap * 0.76), (x + cw - k, 0), (x + cw, 0),
                       (x + cw / 2 + k / 2, cap), (x + cw / 2 - k / 2, cap)], fill=255)
        elif c == "O":
            d.rounded_rectangle((x, 0, x + cw, cap), radius=cw // 2, fill=255)
            d.rounded_rectangle((x + stroke, stroke, x + cw - stroke, cap - stroke),
                                radius=max(1, cw // 2 - stroke), fill=0)
        x += cw + gap

    text = text.rotate(90, expand=True)            # reads bottom -> top, letter tops face left
    band = Image.new("L", (w, h), 0)
    ImageDraw.Draw(band).rounded_rectangle((36, 36, w - 36, h - 36), radius=70, fill=255)
    knock = Image.new("L", (w, h), 0)
    knock.paste(text, ((w - text.width) // 2, (h - text.height) // 2))
    alpha = Image.eval(knock, lambda v: 255 - v)
    alpha = Image.composite(alpha, Image.new("L", (w, h), 0), band)
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    img.putalpha(alpha)
    img.save(path)
    return path

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
    """Satin ceramic-composite: soft white, faint micro-texture, a hint of coat,
    with a dark printed band carrying the knocked-out vertical wordmark."""
    m, nt, out = new_material("Shell_Satin")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1500, 0)
    n = noise(nt, (-700, -200), 420.0, 5.0)
    link(nt, tc, "Object", n, "Vector")
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-400, -200)
    bump.inputs["Strength"].default_value = 0.035
    bump.inputs["Distance"].default_value = 0.004
    link(nt, n, "Fac", bump, "Height")
    var = noise(nt, (-700, 100), 2.0, 3.0)
    link(nt, tc, "Object", var, "Vector")
    col = ramp(nt, [(0.35, (0.80, 0.82, 0.86, 1)), (0.65, (0.93, 0.94, 0.96, 1))],
               "LINEAR", (-400, 100))
    link(nt, var, "Fac", col, "Fac")

    # cylindrical print coordinates: u from the angle, v from z
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
    uu = nt.nodes.new("ShaderNodeMath"); uu.operation = "MULTIPLY_ADD"; uu.location = (-650, -450)
    uu.inputs[1].default_value = 0.40 / PRINT_ARC     # ~radius / arc width
    uu.inputs[2].default_value = 0.5
    link(nt, wr, 0, uu, 0)
    vv = nt.nodes.new("ShaderNodeMath"); vv.operation = "MULTIPLY_ADD"; vv.location = (-650, -650)
    vv.inputs[1].default_value = 1.0 / (PRINT_Z1 - PRINT_Z0)
    vv.inputs[2].default_value = -PRINT_Z0 / (PRINT_Z1 - PRINT_Z0)
    link(nt, sep, "Z", vv, 0)
    cb = nt.nodes.new("ShaderNodeCombineXYZ"); cb.location = (-480, -550)
    link(nt, uu, 0, cb, "X")
    link(nt, vv, 0, cb, "Y")
    img = nt.nodes.new("ShaderNodeTexImage"); img.location = (-300, -550)
    img.image = bpy.data.images.load(make_print_texture())
    img.interpolation = "Cubic"
    img.extension = "CLIP"
    link(nt, cb, "Vector", img, "Vector")

    ink = nt.nodes.new("ShaderNodeMix"); ink.data_type = "RGBA"; ink.location = (0, 100)
    ink.inputs["B"].default_value = (0.020, 0.023, 0.032, 1)
    link(nt, col, "Color", ink, "A")
    link(nt, img, "Alpha", ink, "Factor")
    rough = nt.nodes.new("ShaderNodeMix"); rough.data_type = "FLOAT"; rough.location = (0, -100)
    rough.inputs["A"].default_value = 0.40
    rough.inputs["B"].default_value = 0.24
    link(nt, img, "Alpha", rough, "Factor")

    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (400, 0)
    link(nt, ink, "Result", b, "Base Color")
    link(nt, rough, "Result", b, "Roughness")
    link(nt, bump, "Normal", b, "Normal")
    setv(b, "Coat Weight", 0.25)
    setv(b, "Coat Roughness", 0.12)
    setv(b, "Subsurface Weight", 0.04)
    link(nt, b, "BSDF", out, "Surface")
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
    e = nt.nodes.new("ShaderNodeEmission"); e.location = (200, 0)
    e.inputs["Strength"].default_value = 3.2
    link(nt, r, "Color", e, "Color")
    link(nt, e, "Emission", out, "Surface")
    return m


def mat_dock_glow():
    m, nt, out = new_material("Dock_Glow")
    e = nt.nodes.new("ShaderNodeEmission"); e.location = (0, 0)
    e.inputs["Color"].default_value = (0.20, 0.72, 1.0, 1)
    e.inputs["Strength"].default_value = 2.8
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
    bg.inputs["Strength"].default_value = 0.6
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
    scene.view_settings.exposure = -0.9


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    shell, liner, halo = mat_shell(), mat_liner(), mat_halo()
    body = lathe("LevoBody", PROFILE, EDGE_MAT, [shell, liner, halo])
    handle = build_handle(shell)
    drink = build_drink(mat_drink())

    root = bpy.data.objects.new("LevoRoot", None)
    bpy.context.collection.objects.link(root)
    for ob in (body, handle, drink):
        ob.parent = root

    build_dock(mat_dock_body(), mat_dock_glow())
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
