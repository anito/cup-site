/* Parametric Levo geometry: a JS port of blender/build_levo.py (same profile numbers),
   so the live scene and the Blender source stay in step. y is up; the handle is on +x
   and the front of the cup (towards the camera) is +z. */
import {
	BufferGeometry,
	CanvasTexture,
	CatmullRomCurve3,
	Color,
	Float32BufferAttribute,
	LinearSRGBColorSpace,
	SRGBColorSpace,
	TorusGeometry,
	TubeGeometry,
	Vector3
} from 'three';

export const PRINT = {
	y0: 0.09,
	y1: 0.97,
	arc: 0.34,
	center: (-70 * Math.PI) / 180
};

/* (r, y) of the cup wall: foot recess centre -> up the outside -> over the lip -> down the inside */
const PROFILE = [
	[0.0, 0.04],
	[0.3, 0.04],
	[0.342, 0.08],
	[0.36, 0.24],
	[0.352, 0.262], // halo groove
	[0.352, 0.43],
	[0.362, 0.452],
	[0.425, 0.965],
	[0.432, 0.985],
	[0.416, 1.012], // lip
	[0.399, 0.985],
	[0.386, 0.94],
	[0.33, 0.2],
	[0.0, 0.15]
];
/* material slot per edge: 0 titanium shell, 1 steel liner, 2 halo glow */
const EDGE_SLOT = [0, 0, 0, 0, 2, 0, 0, 0, 2, 2, 1, 1, 1];

export function chaikin(points, labels, passes) {
	for (let k = 0; k < passes; k++) {
		const n = points.length;
		const seq = [[points[0], null]];
		for (let i = 0; i < n - 1; i++) {
			const p = points[i];
			const q = points[i + 1];
			const lab = labels[i];
			const qq = [0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]];
			const rr = [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]];
			const last = i === n - 2;
			if (i > 0) seq.push([qq, lab]);
			seq.push(last ? [q, lab] : [rr, lab]);
		}
		points = seq.map((s) => s[0]);
		labels = seq.slice(1).map((s) => s[1]);
	}
	return { points, labels };
}

/* angle -> colour along the Halo band: cyan on the handle side to amber on the far side */
const RAMP = [
	[0.0, [0.0, 0.62, 1.0]],
	[0.35, [0.25, 0.3, 1.0]],
	[0.65, [1.0, 0.3, 0.45]],
	[1.0, [1.0, 0.62, 0.1]]
];
export function haloColor(t, out = [0, 0, 0]) {
	for (let i = 1; i < RAMP.length; i++) {
		if (t <= RAMP[i][0]) {
			const [t0, c0] = RAMP[i - 1];
			const [t1, c1] = RAMP[i];
			const k = (t - t0) / (t1 - t0);
			for (let j = 0; j < 3; j++) out[j] = c0[j] + (c1[j] - c0[j]) * k;
			return out;
		}
	}
	out[0] = 1; out[1] = 0.62; out[2] = 0.1;
	return out;
}
const azimuth = (x, z) => Math.atan2(-z, x); // matches Blender's atan2(y, x) with y = -z

/** Lathe a (r, y) profile into an indexed mesh with smooth profile normals, one group per slot. */
export function latheProfile(profile, edgeSlots, { segments = 256, passes = 3, colors = false, normV = false } = {}) {
	const { points, labels } = chaikin(profile, edgeSlots, passes);
	const n = points.length;

	// per-point normals from the neighbouring profile edges (outward = (dy, -dr))
	const edgeN = [];
	for (let i = 0; i < n - 1; i++) {
		const dr = points[i + 1][0] - points[i][0];
		const dy = points[i + 1][1] - points[i][1];
		const l = Math.hypot(dr, dy) || 1;
		edgeN.push([dy / l, -dr / l]);
	}
	const ptN = points.map((_, i) => {
		const a = edgeN[Math.max(0, i - 1)];
		const b = edgeN[Math.min(n - 2, i)];
		const x = a[0] + b[0];
		const y = a[1] + b[1];
		const l = Math.hypot(x, y) || 1;
		return [x / l, y / l];
	});

	const pos = [];
	const nor = [];
	const uv = [];
	const col = [];
	const ring = []; // vertex index of ring i, segment j
	let arc = 0;
	const v = [0];
	for (let i = 1; i < n; i++) {
		arc += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
		v.push(arc);
	}
	const c = [0, 0, 0];
	for (let i = 0; i < n; i++) {
		const [r, y] = points[i];
		const [nr, ny] = ptN[i];
		ring.push([]);
		for (let j = 0; j <= segments; j++) {
			const a = (j / segments) * Math.PI * 2;
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			pos.push(r * ca, y, -r * sa);
			nor.push(nr * ca, ny, -nr * sa);
			uv.push(j / segments, normV ? v[i] / arc : v[i] * 6);
			if (colors) {
				haloColor(Math.abs(azimuth(r * ca, -r * sa)) / Math.PI, c);
				col.push(c[0], c[1], c[2]);
			}
			ring[i].push(i * (segments + 1) + j);
		}
	}

	const buckets = new Map();
	for (let i = 0; i < n - 1; i++) {
		const s = labels[i];
		if (!buckets.has(s)) buckets.set(s, []);
		const idx = buckets.get(s);
		for (let j = 0; j < segments; j++) {
			const a = ring[i][j];
			const b = ring[i][j + 1];
			const c2 = ring[i + 1][j + 1];
			const d = ring[i + 1][j];
			idx.push(a, b, d, b, c2, d); // outward-facing for the profile direction used above
		}
	}
	const g = new BufferGeometry();
	g.setAttribute('position', new Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
	g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
	if (colors) g.setAttribute('color', new Float32BufferAttribute(col, 3));
	const index = [];
	[...buckets.keys()].sort().forEach((slot) => {
		const start = index.length;
		index.push(...buckets.get(slot));
		g.addGroup(start, index.length - start, slot);
	});
	g.setIndex(index);
	return { geometry: g, points };
}

export const cupBody = () => latheProfile(PROFILE, EDGE_SLOT, { segments: 256, colors: true });

/** Outward-offset shells around the Halo groove, for the additive glow. */
export function haloShell(points, offset) {
	const sel = [];
	for (let i = 0; i < points.length; i++) {
		const [r, y] = points[i];
		if (y > 0.19 && y < 0.5 && r > 0.3 && i < points.length * 0.6) sel.push([r + offset, y]);
	}
	const { geometry } = latheProfile(sel, new Array(sel.length - 1).fill(0), { segments: 192, passes: 0, colors: true, normV: true });
	return geometry;
}

export function lipGlow(radius, tube) {
	const g = new TorusGeometry(radius, tube, 10, 192);
	g.rotateX(Math.PI / 2);
	g.translate(0, 1.004, 0);
	const pos = g.attributes.position;
	const col = [];
	const c = [0, 0, 0];
	for (let i = 0; i < pos.count; i++) {
		haloColor(Math.abs(azimuth(pos.getX(i), pos.getZ(i))) / Math.PI, c);
		col.push(c[0], c[1], c[2]);
	}
	g.setAttribute('color', new Float32BufferAttribute(col, 3));
	return g;
}

/** Thin rounded-rectangle handle tube, ends buried in the wall. */
export function handle() {
	const x1 = 0.64, y1 = 0.865, y0 = 0.52, r = 0.1, n = 14;
	const path = [[0.395, 0.865]];
	for (let k = 0; k <= n; k++) {
		const a = (Math.PI / 2) * (1 - k / n);
		path.push([x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a)]);
	}
	for (let k = 0; k <= n; k++) {
		const a = (-Math.PI / 2) * (k / n);
		path.push([x1 - r + r * Math.cos(a), y0 + r + r * Math.sin(a)]);
	}
	path.push([0.362, 0.52]);
	const curve = new CatmullRomCurve3(path.map(([x, y]) => new Vector3(x, y, 0)), false, 'centripetal');
	return new TubeGeometry(curve, 220, 0.03, 16, false);
}

export function dockBody() {
	const profile = [
		[0.0, -0.1],
		[0.62, -0.1],
		[0.66, -0.07],
		[0.66, -0.02],
		[0.63, 0.0],
		[0.0, 0.0]
	];
	return latheProfile(profile, new Array(profile.length - 1).fill(0), { segments: 192, passes: 3 }).geometry;
}

export function dockRing(radius, tube) {
	const g = new TorusGeometry(radius, tube, 12, 192);
	g.rotateX(Math.PI / 2);
	g.translate(0, 0.004, 0);
	return g;
}

export function drinkDisc() {
	return latheProfile(
		[[0.362, 0.765], [0, 0.765]], [0], { segments: 128, passes: 0 }
	).geometry;
}

/* ───────── textures ───────── */

/** The label: alpha 1 on the smoked strip, 0 where the letters are knocked out (reads bottom to top). */
export function labelTexture(w = 695, h = 1800) {
	const cap = 500, stroke = 84, gap = 52;
	const widths = { L: 290, E: 290, V: 350, O: 320 };
	const word = 'LEVO';
	const total = [...word].reduce((s, c) => s + widths[c], 0) + gap * (word.length - 1);

	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext('2d');
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.roundRect(20, 20, w - 40, h - 40, 64);
	ctx.fill();

	ctx.save();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.translate(w / 2, h / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.translate(-total / 2, -cap / 2);
	let x = 0;
	for (const c of word) {
		const cw = widths[c];
		ctx.beginPath();
		if (c === 'L') {
			ctx.rect(x, 0, stroke, cap);
			ctx.rect(x, cap - stroke, cw, stroke);
		} else if (c === 'E') {
			ctx.rect(x, 0, stroke, cap);
			for (const y0 of [0, (cap - stroke) / 2, cap - stroke]) ctx.rect(x, y0, cw, stroke);
		} else if (c === 'V') {
			const k = stroke * 1.25;
			ctx.moveTo(x, 0);
			ctx.lineTo(x + k, 0);
			ctx.lineTo(x + cw / 2, cap * 0.78);
			ctx.lineTo(x + cw - k, 0);
			ctx.lineTo(x + cw, 0);
			ctx.lineTo(x + cw / 2 + k / 2, cap);
			ctx.lineTo(x + cw / 2 - k / 2, cap);
			ctx.closePath();
		} else if (c === 'O') {
			ctx.roundRect(x, 0, cw, cap, cw / 2);
			ctx.roundRect(x + stroke, stroke, cw - 2 * stroke, cap - 2 * stroke, Math.max(1, cw / 2 - stroke));
		}
		ctx.fill(c === 'O' ? 'evenodd' : 'nonzero');
		x += cw + gap;
	}
	ctx.restore();

	const t = new CanvasTexture(cv);
	t.colorSpace = LinearSRGBColorSpace;
	t.anisotropy = 8;
	return t;
}

/** Fine lathe lines for the bump map (variation along v only). */
export function latheLinesTexture() {
	const cv = document.createElement('canvas');
	cv.width = 4;
	cv.height = 512;
	const ctx = cv.getContext('2d');
	for (let y = 0; y < 512; y++) {
		const g = 128 + Math.random() * 127;
		ctx.fillStyle = `rgb(${g},${g},${g})`;
		ctx.fillRect(0, y, 4, 1);
	}
	const t = new CanvasTexture(cv);
	t.wrapS = t.wrapT = 1000; // RepeatWrapping
	return t;
}

/** Soft concentric rings for the dock glow plane (additive). */
export function dockGlowTexture() {
	const s = 1024;
	const cv = document.createElement('canvas');
	cv.width = cv.height = s;
	const ctx = cv.getContext('2d');
	const unit = s / 1.8; // plane is 1.8 world units wide
	ctx.strokeStyle = '#33b8ff';
	for (const [r, wid, blur, alpha] of [
		[0.44, 0.02, 0.07, 0.9],
		[0.55, 0.012, 0.06, 0.8],
		[0.5, 0.2, 0.2, 0.14]
	]) {
		ctx.save();
		ctx.shadowColor = '#33b8ff';
		ctx.shadowBlur = blur * unit;
		ctx.globalAlpha = alpha;
		ctx.lineWidth = wid * unit;
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r * unit, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
	const t = new CanvasTexture(cv);
	t.colorSpace = SRGBColorSpace;
	return t;
}

export function verticalGlowTexture() {
	const cv = document.createElement('canvas');
	cv.width = 4;
	cv.height = 128;
	const ctx = cv.getContext('2d');
	const g = ctx.createLinearGradient(0, 0, 0, 128);
	g.addColorStop(0, '#000');
	g.addColorStop(0.5, '#fff');
	g.addColorStop(1, '#000');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 4, 128);
	return new CanvasTexture(cv);
}

export const linear = (r, g, b) => new Color().setRGB(r, g, b, LinearSRGBColorSpace);
