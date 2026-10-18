"""
Ember Cup - procedural hero asset for the Ember site.

Builds a high-resolution glazed ceramic cup in Blender (bpy), with a fully
procedural node-based shader set, a studio lighting rig and a looping
turntable/hover animation. Can render frames and stills.

Usage (bpy installed as a python module, or `blender -b -P build_ember.py --`):

    python build_ember.py build                       # writes ember.blend
    python build_ember.py test  [t] [px] [samples]     # one preview frame
    python build_ember.py frames <count> <px> <samples> <outdir>
    python build_ember.py still <name> <px> <samples> <outfile>
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SEGMENTS = 288          # radial resolution of the lathe
CHAIKIN_PASSES = 4      # profile smoothing passes
ROOT_BASE_Z = 0.22      # hover height of the cup above the shadow plane
TARGET_Z = 0.52
CAM_DIST = 4.9
CAM_FOCAL = 85

# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def chaikin(points, labels, passes):
    """Corner-cutting subdivision of an open polyline; carries per-edge labels."""
    for _ in range(passes):
        n = len(points)
        seq = [(points[0], None)]
        for i in range(n - 1):
            p, q, lab = points[i], points[i + 1], labels[i]
            qq = (0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1])
            rr = (0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1])
            last = i == n - 2
            if i > 0:
                seq.append((qq, lab))          # corner edge into Q
            if last:
                seq.append((q, lab))           # keep the end point fixed
            else:
                seq.append((rr, lab))
        points = [p for p, _ in seq]
        labels = [l for _, l in seq[1:]]
    return points, labels


# coarse cross-section of the cup wall (r, z): centre of the foot recess,
# outwards over the rim and back down the inside to the centre of the floor
PROFILE = [
    (0.000, 0.040),  # 0  foot recess centre
    (0.250, 0.040),  # 1
    (0.262, 0.000),  # 2  foot ring, inner
    (0.308, 0.000),  # 3  foot ring, outer
    (0.322, 0.055),  # 4  glaze starts
    (0.352, 0.220),  # 5
    (0.418, 0.500),  # 6
    (0.452, 0.760),  # 7
    (0.445, 0.925),  # 8  gold band starts (outside)
    (0.445, 0.985),  # 9
    (0.418, 1.008),  # 10 rim
    (0.391, 0.985),  # 11
    (0.390, 0.925),  # 12 gold band ends (inside)
    (0.395, 0.700),  # 13
    (0.368, 0.450),  # 14
    (0.318, 0.250),  # 15
    (0.252, 0.150),  # 16
    (0.000, 0.125),  # 17 inner floor centre
]
# material slot per coarse edge: 0 raw clay, 1 outer glaze, 2 gold, 3 inner glaze
EDGE_MAT = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3]


def build_cup_body(mats):
    pts, labs = chaikin(PROFILE, EDGE_MAT, CHAIKIN_PASSES)
    me = bpy.data.meshes.new("EmberBody")
    bm = bmesh.new()
    rings = []
    for (r, z) in pts:
        if r < 1e-6:
            rings.append([bm.verts.new((0.0, 0.0, z))])
        else:
            ring = [bm.verts.new((r * math.cos(2 * math.pi * j / SEGMENTS),
                                  r * math.sin(2 * math.pi * j / SEGMENTS), z))
                    for j in range(SEGMENTS)]
            rings.append(ring)
    for i in range(len(pts) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(SEGMENTS):
            j2 = (j + 1) % SEGMENTS
            try:
                if len(a) == 1:
                    f = bm.faces.new((a[0], b[j2], b[j]))
                elif len(b) == 1:
                    f = bm.faces.new((a[j], a[j2], b[0]))
                else:
                    f = bm.faces.new((a[j], a[j2], b[j2], b[j]))
            except ValueError:
                continue
            f.material_index = labs[i]
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("EmberBody", me)
    bpy.context.collection.objects.link(obj)
    for m in mats:
        obj.data.materials.append(m)
    return obj


def build_handle(mat):
    cu = bpy.data.curves.new("EmberHandleCurve", "CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = 64
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 14
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    # (x, z, radius)
    pts = [
        (0.415, 0.845, 0.050),
        (0.640, 0.805, 0.043),
        (0.705, 0.560, 0.038),
        (0.620, 0.350, 0.039),
        (0.350, 0.300, 0.050),
    ]
    sp.bezier_points.add(len(pts) - 1)
    for bp, (x, z, rad) in zip(sp.bezier_points, pts):
        bp.co = (x, 0.0, z)
        bp.radius = rad
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new("EmberHandle", cu)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.view_layer.objects.active
    obj.name = "EmberHandle"
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.materials.append(mat)
    obj.select_set(False)
    return obj


def build_coffee(mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=0.372, depth=0.012,
                                        location=(0, 0, 0.775))
    obj = bpy.context.active_object
    obj.name = "EmberCoffee"
    for p in obj.data.polygons:
        p.use_smooth = False
    obj.data.materials.append(mat)
    return obj


# --------------------------------------------------------------------------
# shaders
# --------------------------------------------------------------------------


def _n(nt, kind, loc=(0, 0), **inputs):
    node = nt.nodes.new(kind)
    node.location = loc
    for k, v in inputs.items():
        node.inputs[k.replace("_", " ")].default_value = v
    return node


def _link(nt, a, ao, b, bi):
    nt.links.new(a.outputs[ao], b.inputs[bi])


def _principled(nt):
    return nt.nodes.new("ShaderNodeBsdfPrincipled")


def _set(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


def new_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (1400, 0)
    return m, nt, out


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


def mat_outer_glaze():
    """Two-tone dip glaze: terracotta below, cream above with organic drips,
    speckled, with a coat layer and micro bump."""
    m, nt, out = new_material("Glaze_Outer")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-1600, 0)

    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-1400, 200)
    _link(nt, tc, "Object", sep, "Vector")

    # stretched noise -> vertical drip streaks
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.location = (-1400, -100)
    mp.inputs["Scale"].default_value = (5.0, 5.0, 0.55)
    _link(nt, tc, "Object", mp, "Vector")
    drip = _n(nt, "ShaderNodeTexNoise", (-1200, -100), Scale=1.0, Detail=7.0,
              Roughness=0.62, Distortion=0.35)
    _link(nt, mp, "Vector", drip, "Vector")

    # slow wobble of the glaze line
    wob = _n(nt, "ShaderNodeTexNoise", (-1200, -400), Scale=2.4, Detail=3.0,
             Roughness=0.5)
    _link(nt, tc, "Object", wob, "Vector")

    # threshold = z + (drip-0.5)*0.55 + (wobble-0.5)*0.12
    sub1 = nt.nodes.new("ShaderNodeMath"); sub1.operation = "SUBTRACT"
    sub1.inputs[1].default_value = 0.5; sub1.location = (-1000, -100)
    _link(nt, drip, "Fac", sub1, 0)
    mul1 = nt.nodes.new("ShaderNodeMath"); mul1.operation = "MULTIPLY"
    mul1.inputs[1].default_value = 0.62; mul1.location = (-850, -100)
    _link(nt, sub1, 0, mul1, 0)

    sub2 = nt.nodes.new("ShaderNodeMath"); sub2.operation = "SUBTRACT"
    sub2.inputs[1].default_value = 0.5; sub2.location = (-1000, -400)
    _link(nt, wob, "Fac", sub2, 0)
    mul2 = nt.nodes.new("ShaderNodeMath"); mul2.operation = "MULTIPLY"
    mul2.inputs[1].default_value = 0.14; mul2.location = (-850, -400)
    _link(nt, sub2, 0, mul2, 0)

    add1 = nt.nodes.new("ShaderNodeMath"); add1.operation = "ADD"
    add1.location = (-700, 100)
    _link(nt, sep, "Z", add1, 0)
    _link(nt, mul1, 0, add1, 1)
    add2 = nt.nodes.new("ShaderNodeMath"); add2.operation = "ADD"
    add2.location = (-550, 100)
    _link(nt, add1, 0, add2, 0)
    _link(nt, mul2, 0, add2, 1)

    # glaze boundary
    edge = ramp(nt, [(0.60, (0, 0, 0, 1)), (0.64, (1, 1, 1, 1))], "EASE",
                (-380, 100))
    _link(nt, add2, 0, edge, "Fac")

    # colour variation inside each glaze
    var = _n(nt, "ShaderNodeTexNoise", (-1200, -700), Scale=3.0, Detail=6.0,
             Roughness=0.55)
    _link(nt, tc, "Object", var, "Vector")
    rust = ramp(nt, [(0.30, (0.30, 0.050, 0.014, 1)),
                     (0.50, (0.43, 0.100, 0.028, 1)),
                     (0.75, (0.58, 0.190, 0.055, 1))], "LINEAR", (-380, -250))
    _link(nt, var, "Fac", rust, "Fac")
    cream = ramp(nt, [(0.30, (0.74, 0.66, 0.54, 1)),
                      (0.70, (0.90, 0.84, 0.72, 1))], "LINEAR", (-380, -520))
    _link(nt, var, "Fac", cream, "Fac")

    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.location = (-120, 0)
    _link(nt, edge, "Color", mix, "Factor") if False else None
    # Factor needs a float: take red channel of the ramp
    sepc = nt.nodes.new("ShaderNodeSeparateColor"); sepc.location = (-200, 200)
    _link(nt, edge, "Color", sepc, "Color")
    _link(nt, sepc, "Red", mix, "Factor")
    _link(nt, rust, "Color", mix, "A")
    _link(nt, cream, "Color", mix, "B")

    # iron speckle
    vor = _n(nt, "ShaderNodeTexVoronoi", (-1200, -1000), Scale=210.0,
             Randomness=1.0)
    _link(nt, tc, "Object", vor, "Vector")
    fleck = ramp(nt, [(0.0, (1, 1, 1, 1)), (0.075, (0, 0, 0, 1))], "LINEAR",
                 (-950, -1000))
    _link(nt, vor, "Distance", fleck, "Fac")
    # sparse mask for the flecks
    vor2 = _n(nt, "ShaderNodeTexNoise", (-1200, -1300), Scale=18.0, Detail=2.0)
    _link(nt, tc, "Object", vor2, "Vector")
    gate = ramp(nt, [(0.44, (0, 0, 0, 1)), (0.58, (1, 1, 1, 1))], "LINEAR",
                (-950, -1300))
    _link(nt, vor2, "Fac", gate, "Fac")
    mulf = nt.nodes.new("ShaderNodeMath"); mulf.operation = "MULTIPLY"
    mulf.location = (-700, -1100)
    sepf = nt.nodes.new("ShaderNodeSeparateColor"); sepf.location = (-800, -1000)
    sepg = nt.nodes.new("ShaderNodeSeparateColor"); sepg.location = (-800, -1300)
    _link(nt, fleck, "Color", sepf, "Color")
    _link(nt, gate, "Color", sepg, "Color")
    _link(nt, sepf, "Red", mulf, 0)
    _link(nt, sepg, "Red", mulf, 1)

    mix2 = nt.nodes.new("ShaderNodeMix"); mix2.data_type = "RGBA"
    mix2.location = (120, 0)
    mix2.inputs["B"].default_value = (0.045, 0.020, 0.012, 1)
    _link(nt, mulf, 0, mix2, "Factor")
    _link(nt, mix, "Result", mix2, "A")

    # micro bump (glaze orange-peel)
    bn = _n(nt, "ShaderNodeTexNoise", (-400, -900), Scale=90.0, Detail=4.0,
            Roughness=0.6)
    _link(nt, tc, "Object", bn, "Vector")
    bump = _n(nt, "ShaderNodeBump", (200, -500), Strength=0.08, Distance=0.01)
    _link(nt, bn, "Fac", bump, "Height")

    # roughness: rust a touch glossier than cream satin
    rough = ramp(nt, [(0.0, (0.12, 0.12, 0.12, 1)),
                      (1.0, (0.30, 0.30, 0.30, 1))], "LINEAR", (-60, -700))
    _link(nt, sepc, "Red", rough, "Fac")

    bsdf = _principled(nt)
    bsdf.location = (700, 0)
    _link(nt, mix2, "Result", bsdf, "Base Color")
    _link(nt, rough, "Color", bsdf, "Roughness") if False else None
    sepr = nt.nodes.new("ShaderNodeSeparateColor"); sepr.location = (200, -700)
    _link(nt, rough, "Color", sepr, "Color")
    _link(nt, sepr, "Red", bsdf, "Roughness")
    _link(nt, bump, "Normal", bsdf, "Normal")
    _set(bsdf, "Coat Weight", 0.75)
    _set(bsdf, "Coat Roughness", 0.025)
    _set(bsdf, "Subsurface Weight", 0.06)
    _set(bsdf, "Specular IOR Level", 0.55)
    _link(nt, bsdf, "BSDF", out, "Surface")
    return m


def mat_inner_glaze():
    m, nt, out = new_material("Glaze_Inner")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1000, 0)
    var = _n(nt, "ShaderNodeTexNoise", (-800, 0), Scale=4.0, Detail=5.0)
    _link(nt, tc, "Object", var, "Vector")
    col = ramp(nt, [(0.3, (0.80, 0.74, 0.62, 1)), (0.7, (0.93, 0.88, 0.77, 1))],
               "LINEAR", (-500, 0))
    _link(nt, var, "Fac", col, "Fac")
    vor = _n(nt, "ShaderNodeTexVoronoi", (-800, -300), Scale=240.0)
    _link(nt, tc, "Object", vor, "Vector")
    fl = ramp(nt, [(0.0, (1, 1, 1, 1)), (0.06, (0, 0, 0, 1))], "LINEAR",
              (-500, -300))
    _link(nt, vor, "Distance", fl, "Fac")
    gate = _n(nt, "ShaderNodeTexNoise", (-800, -600), Scale=14.0, Detail=1.0)
    _link(nt, tc, "Object", gate, "Vector")
    gr = ramp(nt, [(0.5, (0, 0, 0, 1)), (0.62, (1, 1, 1, 1))], "LINEAR",
              (-500, -600))
    _link(nt, gate, "Fac", gr, "Fac")
    s1 = nt.nodes.new("ShaderNodeSeparateColor"); s1.location = (-250, -300)
    s2 = nt.nodes.new("ShaderNodeSeparateColor"); s2.location = (-250, -600)
    _link(nt, fl, "Color", s1, "Color")
    _link(nt, gr, "Color", s2, "Color")
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    mul.location = (-50, -400)
    _link(nt, s1, "Red", mul, 0)
    _link(nt, s2, "Red", mul, 1)
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    mx.location = (150, 0)
    mx.inputs["B"].default_value = (0.20, 0.11, 0.06, 1)
    _link(nt, mul, 0, mx, "Factor")
    _link(nt, col, "Color", mx, "A")
    b = _principled(nt); b.location = (500, 0)
    _link(nt, mx, "Result", b, "Base Color")
    _set(b, "Roughness", 0.16)
    _set(b, "Coat Weight", 0.5)
    _set(b, "Coat Roughness", 0.02)
    _set(b, "Subsurface Weight", 0.05)
    _link(nt, b, "BSDF", out, "Surface")
    return m


def mat_gold():
    m, nt, out = new_material("Gold_Lustre")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-800, 0)
    bn = _n(nt, "ShaderNodeTexNoise", (-600, -200), Scale=60.0, Detail=6.0)
    _link(nt, tc, "Object", bn, "Vector")
    bump = _n(nt, "ShaderNodeBump", (-300, -200), Strength=0.05, Distance=0.004)
    _link(nt, bn, "Fac", bump, "Height")
    b = _principled(nt); b.location = (100, 0)
    _set(b, "Base Color", (1.0, 0.70, 0.28, 1))
    _set(b, "Metallic", 1.0)
    _set(b, "Roughness", 0.2)
    _link(nt, bump, "Normal", b, "Normal")
    _link(nt, b, "BSDF", out, "Surface")
    return m


def mat_raw_clay():
    m, nt, out = new_material("Clay_Raw")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1000, 0)
    n1 = _n(nt, "ShaderNodeTexNoise", (-800, 0), Scale=30.0, Detail=10.0,
            Roughness=0.7)
    _link(nt, tc, "Object", n1, "Vector")
    col = ramp(nt, [(0.3, (0.40, 0.29, 0.20, 1)), (0.7, (0.64, 0.51, 0.38, 1))],
               "LINEAR", (-500, 0))
    _link(nt, n1, "Fac", col, "Fac")
    vor = _n(nt, "ShaderNodeTexVoronoi", (-800, -300), Scale=300.0)
    _link(nt, tc, "Object", vor, "Vector")
    fl = ramp(nt, [(0.0, (1, 1, 1, 1)), (0.08, (0, 0, 0, 1))], "LINEAR",
              (-500, -300))
    _link(nt, vor, "Distance", fl, "Fac")
    sp = nt.nodes.new("ShaderNodeSeparateColor"); sp.location = (-250, -300)
    _link(nt, fl, "Color", sp, "Color")
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    mx.location = (0, 0)
    mx.inputs["B"].default_value = (0.12, 0.07, 0.045, 1)
    _link(nt, sp, "Red", mx, "Factor")
    _link(nt, col, "Color", mx, "A")
    bn = _n(nt, "ShaderNodeTexNoise", (-500, -700), Scale=220.0, Detail=8.0)
    _link(nt, tc, "Object", bn, "Vector")
    bump = _n(nt, "ShaderNodeBump", (0, -500), Strength=0.55, Distance=0.02)
    _link(nt, bn, "Fac", bump, "Height")
    b = _principled(nt); b.location = (400, 0)
    _link(nt, mx, "Result", b, "Base Color")
    _link(nt, bump, "Normal", b, "Normal")
    _set(b, "Roughness", 0.88)
    _set(b, "Specular IOR Level", 0.25)
    _link(nt, b, "BSDF", out, "Surface")
    return m


def mat_coffee():
    m, nt, out = new_material("Coffee")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1100, 0)
    vm = nt.nodes.new("ShaderNodeVectorMath"); vm.operation = "LENGTH"
    vm.location = (-900, 0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-1000, -150)
    _link(nt, tc, "Object", sep, "Vector")
    comb = nt.nodes.new("ShaderNodeCombineXYZ"); comb.location = (-850, -150)
    _link(nt, sep, "X", comb, "X")
    _link(nt, sep, "Y", comb, "Y")
    _link(nt, comb, "Vector", vm, 0)
    nz = _n(nt, "ShaderNodeTexNoise", (-900, -400), Scale=7.0, Detail=5.0,
            Distortion=1.2)
    _link(nt, tc, "Object", nz, "Vector")
    r = ramp(nt, [(0.0, (0.050, 0.022, 0.010, 1)),
                  (0.20, (0.060, 0.026, 0.011, 1)),
                  (0.34, (0.19, 0.085, 0.032, 1)),
                  (0.38, (0.34, 0.17, 0.07, 1))], "LINEAR", (-550, 0))
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    add.location = (-700, -100)
    mu = nt.nodes.new("ShaderNodeMath"); mu.operation = "MULTIPLY"
    mu.inputs[1].default_value = 0.05; mu.location = (-720, -300)
    _link(nt, nz, "Fac", mu, 0)
    _link(nt, vm, "Value", add, 0)
    _link(nt, mu, 0, add, 1)
    _link(nt, add, 0, r, "Fac")
    b = _principled(nt); b.location = (-100, 0)
    _link(nt, r, "Color", b, "Base Color")
    _set(b, "Roughness", 0.05)
    _set(b, "Specular IOR Level", 0.7)
    _set(b, "Coat Weight", 0.3)
    _link(nt, b, "BSDF", out, "Surface")
    return m


# --------------------------------------------------------------------------
# lighting, camera, animation
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
    bg.inputs["Strength"].default_value = 0.55
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-600, 0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-400, 0)
    _link(nt, tc, "Generated", sep, "Vector") if False else None
    # use camera-independent direction: 'Window' is view-based; use world dir
    geo = nt.nodes.new("ShaderNodeNewGeometry"); geo.location = (-800, 0)
    sep2 = nt.nodes.new("ShaderNodeSeparateXYZ"); sep2.location = (-600, 0)
    _link(nt, geo, "Incoming", sep2, "Vector")
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.location = (-400, 0)
    mr.inputs["From Min"].default_value = -1.0
    mr.inputs["From Max"].default_value = 1.0
    _link(nt, sep2, "Z", mr, "Value")
    rp = ramp(nt, [(0.0, (0.050, 0.040, 0.034, 1)),
                   (0.45, (0.30, 0.26, 0.22, 1)),
                   (0.62, (0.80, 0.74, 0.66, 1)),
                   (1.0, (0.95, 0.93, 0.90, 1))], "LINEAR", (-150, 0))
    _link(nt, mr, "Result", rp, "Fac")
    _link(nt, rp, "Color", bg, "Color")
    _link(nt, bg, "Background", out, "Surface")


def area(name, loc, size, power, color=(1, 1, 1), size_y=None, target=(0, 0, 0.5)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = color
    ld.size = size
    if size_y:
        ld.shape = "RECTANGLE"
        ld.size_y = size_y
    ob = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    ld.use_shadow = name == "Key"
    return ob


def build_rig(scene):
    area("Key", (-3.2, -2.6, 4.2), 3.2, 520, (1.0, 0.95, 0.88))
    area("Rim", (3.4, 3.2, 2.4), 0.8, 520, (1.0, 0.90, 0.78), size_y=3.4)
    area("Fill", (3.6, -3.2, 1.2), 3.0, 70, (0.85, 0.90, 1.0))
    area("Top", (0.0, -0.2, 5.0), 3.5, 90, (1.0, 0.98, 0.95))

    # shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.18))
    pl = bpy.context.active_object
    pl.name = "ShadowCatcher"
    pl.is_shadow_catcher = True

    # camera
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
    return cam, tgt


def set_pose(cam, root, t):
    """t in [0,1): one full seamless loop."""
    el = math.radians(23 + 13 * math.sin(2 * math.pi * t))
    cam.location = (0, -CAM_DIST * math.cos(el), TARGET_Z + CAM_DIST * math.sin(el))
    root.rotation_euler = (0, 0, math.radians(-25) - 2 * math.pi * t)
    root.location = (0, 0, ROOT_BASE_Z + 0.045 * math.sin(2 * math.pi * t))


def build_animation(scene, cam, root, frames=96):
    scene.frame_start = 1
    scene.frame_end = frames
    scene.render.fps = 24
    for f in range(frames + 1):
        t = f / frames
        set_pose(cam, root, t)
        scene.frame_set(f + 1)
        cam.keyframe_insert("location", frame=f + 1)
        root.keyframe_insert("rotation_euler", frame=f + 1)
        root.keyframe_insert("location", frame=f + 1)
    scene.frame_end = frames + 1
    for ob in (cam, root):
        if ob.animation_data and ob.animation_data.action:
            for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action, "fcurves") else []:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"


def configure_render(scene, px, samples):
    scene.render.engine = "CYCLES"
    c = scene.cycles
    c.device = "CPU"
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.02
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.max_bounces = 8
    c.glossy_bounces = 6
    c.transmission_bounces = 4
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 8
    scene.render.resolution_x = px
    scene.render.resolution_y = px
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Punchy"
    except TypeError:
        pass
    scene.view_settings.exposure = 0.0


def build():
    scene = reset_scene()
    mats = [mat_raw_clay(), mat_outer_glaze(), mat_gold(), mat_inner_glaze()]
    body = build_cup_body(mats)
    handle = build_handle(mats[1])
    coffee = build_coffee(mat_coffee())

    root = bpy.data.objects.new("EmberRoot", None)
    bpy.context.collection.objects.link(root)
    for ob in (body, handle, coffee):
        ob.parent = root

    build_world(scene)
    cam, tgt = build_rig(scene)
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
        # render modes pose the rig by hand; drop the baked keyframes
        cam.animation_data_clear()
        root.animation_data_clear()

    if mode == "build":
        out = os.path.join(HERE, "ember.blend")
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
        if name == "hero":
            set_pose(cam, root, 0.0)
        elif name == "top":
            set_pose(cam, root, 0.0)
            el = math.radians(62)
            cam.location = (0, -CAM_DIST * math.cos(el), TARGET_Z + CAM_DIST * math.sin(el))
        render_png(scene, outfile)


main()
