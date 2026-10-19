'use client';

import { useMemo } from 'react';
import {
	AdditiveBlending,
	BoxGeometry,
	CanvasTexture,
	ConeGeometry,
	CylinderGeometry,
	ExtrudeGeometry,
	PlaneGeometry,
	RepeatWrapping,
	Shape,
	SphereGeometry,
	SRGBColorSpace
} from 'three';

/* A saddlery workshop desk seen from above. The desk top is y = 0; one unit is about 10 cm.
   Everything is procedural: canvas textures plus simple primitives, so there is nothing to download. */

const rnd = (a, b) => a + Math.random() * (b - a);
const tex = (cv, { srgb = true, repeat } = {}) => {
	const t = new CanvasTexture(cv);
	if (srgb) t.colorSpace = SRGBColorSpace;
	t.anisotropy = 8;
	if (repeat) {
		t.wrapS = t.wrapT = RepeatWrapping;
		t.repeat.set(...repeat);
	}
	return t;
};
const canvas = (w, h) => {
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	return [cv, cv.getContext('2d')];
};

function woodTexture() {
	const [cv, c] = canvas(1024, 1024);
	c.fillStyle = '#5b3a22';
	c.fillRect(0, 0, 1024, 1024);
	for (let i = 0; i < 900; i++) {
		const y = rnd(0, 1024);
		const a = rnd(0.03, 0.16);
		c.strokeStyle = Math.random() < 0.5 ? `rgba(30,16,8,${a})` : `rgba(150,100,60,${a * 0.7})`;
		c.lineWidth = rnd(0.6, 3);
		c.beginPath();
		c.moveTo(0, y);
		for (let x = 0; x <= 1024; x += 128) c.lineTo(x, y + Math.sin(x * 0.01 + i) * rnd(1, 5));
		c.stroke();
	}
	// plank seams
	c.fillStyle = 'rgba(15,8,4,0.55)';
	for (const y of [0, 341, 683]) c.fillRect(0, y, 1024, 3);
	return tex(cv, { repeat: [6, 5] });
}

function matTexture(w, h) {
	const [cv, c] = canvas(1400, Math.round((1400 * h) / w));
	const px = cv.width / w; // pixels per unit
	c.fillStyle = '#134230';
	c.fillRect(0, 0, cv.width, cv.height);
	for (let i = 0; i < 26000; i++) {
		c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${rnd(0.015, 0.05)})`;
		c.fillRect(rnd(0, cv.width), rnd(0, cv.height), rnd(1, 3), rnd(1, 3));
	}
	// grid: fine every 0.25, strong every 1.0
	for (let u = 0; u <= w + 0.001; u += 0.25) {
		const strong = Math.abs(u - Math.round(u)) < 1e-6;
		c.strokeStyle = `rgba(235,245,235,${strong ? 0.32 : 0.14})`;
		c.lineWidth = strong ? 2 : 1;
		c.beginPath();
		c.moveTo(u * px, 0);
		c.lineTo(u * px, cv.height);
		c.stroke();
	}
	for (let v = 0; v <= h + 0.001; v += 0.25) {
		const strong = Math.abs(v - Math.round(v)) < 1e-6;
		c.strokeStyle = `rgba(235,245,235,${strong ? 0.32 : 0.14})`;
		c.lineWidth = strong ? 2 : 1;
		c.beginPath();
		c.moveTo(0, v * px);
		c.lineTo(cv.width, v * px);
		c.stroke();
	}
	// diagonal guide lines and a few printed numbers, like a self-healing cutting mat
	c.strokeStyle = 'rgba(235,245,235,0.18)';
	c.lineWidth = 1.5;
	c.beginPath();
	c.moveTo(0, 0);
	c.lineTo(cv.width, cv.height);
	c.moveTo(cv.width, 0);
	c.lineTo(0, cv.height);
	c.stroke();
	c.fillStyle = 'rgba(235,245,235,0.55)';
	c.font = `${Math.round(px * 0.09)}px sans-serif`;
	for (let u = 1; u < w; u++) c.fillText(String(u * 10), u * px + 5, px * 0.14);
	for (let v = 1; v < h; v++) c.fillText(String(v * 10), 6, v * px - 5);
	return tex(cv);
}

function leatherPieceTexture() {
	const [cv, c] = canvas(768, 480);
	c.fillStyle = '#8a4e26';
	c.fillRect(0, 0, 768, 480);
	for (let i = 0; i < 24000; i++) {
		c.fillStyle = `rgba(${Math.random() < 0.5 ? '60,28,10' : '230,170,110'},${rnd(0.02, 0.09)})`;
		c.beginPath();
		c.arc(rnd(0, 768), rnd(0, 480), rnd(0.8, 3), 0, Math.PI * 2);
		c.fill();
	}
	// darker burnished edge
	const g = c.createLinearGradient(0, 0, 0, 480);
	c.strokeStyle = 'rgba(70,32,12,0.5)';
	c.lineWidth = 14;
	c.strokeRect(0, 0, 768, 480);
	// pricked holes and half-sewn stitching along the inner border
	const inset = 38;
	const pts = [];
	const step = 17;
	for (let x = inset; x <= 768 - inset; x += step) pts.push([x, inset], [x, 480 - inset]);
	for (let y = inset; y <= 480 - inset; y += step) pts.push([inset, y], [768 - inset, y]);
	for (const [x, y] of pts) {
		c.fillStyle = 'rgba(40,18,6,0.8)';
		c.beginPath();
		c.arc(x, y, 2.2, 0, Math.PI * 2);
		c.fill();
	}
	// the stitched part (left half of the top edge and the left edge), thread tone-on-tone
	c.strokeStyle = 'rgba(214,170,112,0.95)';
	c.lineWidth = 4;
	c.lineCap = 'round';
	for (let x = inset; x < 420; x += step) {
		c.beginPath();
		c.moveTo(x - 6, inset + 2);
		c.lineTo(x + 6, inset - 2);
		c.stroke();
	}
	for (let y = inset; y < 480 - inset; y += step) {
		c.beginPath();
		c.moveTo(inset - 2, y - 6);
		c.lineTo(inset + 2, y + 6);
		c.stroke();
	}
	return tex(cv);
}

function rulerTexture() {
	const [cv, c] = canvas(1536, 96);
	const g = c.createLinearGradient(0, 0, 0, 96);
	g.addColorStop(0, '#b9bdc2');
	g.addColorStop(0.5, '#8f959b');
	g.addColorStop(1, '#adb2b8');
	c.fillStyle = g;
	c.fillRect(0, 0, 1536, 96);
	c.fillStyle = '#1b1d20';
	c.font = '26px sans-serif';
	for (let mm = 0; mm <= 300; mm++) {
		const x = (mm / 300) * 1536;
		const len = mm % 10 === 0 ? 42 : mm % 5 === 0 ? 28 : 16;
		c.fillRect(x, 0, mm % 10 === 0 ? 2.4 : 1.4, len);
		if (mm % 10 === 0 && mm > 0 && mm < 300) c.fillText(String(mm / 10), x - 8, 70);
	}
	return tex(cv);
}

function threadTexture() {
	const [cv, c] = canvas(64, 64);
	c.fillStyle = '#d8c7a6';
	c.fillRect(0, 0, 64, 64);
	for (let y = 0; y < 64; y += 3) {
		c.fillStyle = y % 6 === 0 ? 'rgba(120,95,60,0.45)' : 'rgba(255,245,220,0.35)';
		c.fillRect(0, y, 64, 1.6);
	}
	return tex(cv, { repeat: [1, 1] });
}

let blobTex;
export function blobTexture() {
	if (!blobTex) {
		const [cv, c] = canvas(128, 128);
		const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
		g.addColorStop(0, 'rgba(0,0,0,0.7)');
		g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, 128, 128);
		blobTex = tex(cv, { srgb: false });
	}
	return blobTex;
}

function crescentGeometry(r, depth) {
	const s = new Shape();
	s.moveTo(-r, 0);
	s.absarc(0, 0, r, Math.PI, 2 * Math.PI, false); // lower half
	s.lineTo(-r, 0);
	const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 2, curveSegments: 48 });
	g.rotateX(Math.PI / 2); // shape y (negative) -> world z (negative); depth -> down
	g.translate(0, depth, 0);
	return g;
}

const Shadow = ({ w, d, x, z, rot = 0, o = 0.4 }) => (
	<mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, rot]} renderOrder={1}>
		<planeGeometry args={[w, d]} />
		<meshBasicMaterial map={blobTexture()} transparent opacity={o} depthWrite={false} toneMapped={false} />
	</mesh>
);

const steel = { color: '#5f656c', metalness: 1, roughness: 0.46, envMapIntensity: 0.55 };
const wood = { color: '#7a4f2b', roughness: 0.55, envMapIntensity: 0.8 };

export default function Workshop({ ref }) {
	const t = useMemo(
		() => ({
			wood: woodTexture(),
			mat: matTexture(5.6, 3.6),
			piece: leatherPieceTexture(),
			ruler: rulerTexture(),
			thread: threadTexture()
		}),
		[]
	);
	const g = useMemo(
		() => ({
			bench: new BoxGeometry(40, 0.4, 30),
			mat: new BoxGeometry(5.6, 0.04, 3.6),
			piece: new BoxGeometry(1.9, 0.07, 1.2),
			ruler: new BoxGeometry(3.0, 0.016, 0.26),
			blade: crescentGeometry(0.55, 0.022),
			grip: new CylinderGeometry(0.085, 0.06, 0.85, 28).rotateX(Math.PI / 2),
			ferrule: new CylinderGeometry(0.07, 0.07, 0.12, 24).rotateX(Math.PI / 2),
			shaft: new CylinderGeometry(0.018, 0.018, 0.45, 12).rotateZ(Math.PI / 2),
			iron: new BoxGeometry(0.09, 0.045, 0.4),
			tooth: new BoxGeometry(0.14, 0.03, 0.035),
			awlGrip: new SphereGeometry(0.17, 28, 20),
			awlNeck: new CylinderGeometry(0.075, 0.1, 0.5, 24).rotateZ(Math.PI / 2),
			awlShaft: new ConeGeometry(0.022, 1.0, 14).rotateZ(Math.PI / 2),
			mHead: new CylinderGeometry(0.2, 0.2, 0.56, 32).rotateX(Math.PI / 2),
			mHandle: new CylinderGeometry(0.052, 0.07, 1.25, 20).rotateZ(Math.PI / 2),
			spool: new CylinderGeometry(0.17, 0.17, 0.28, 28),
			flange: new CylinderGeometry(0.24, 0.24, 0.03, 28),
			wax: new BoxGeometry(0.46, 0.14, 0.32)
		}),
		[]
	);

	return (
		<group ref={ref}>
			{/* walnut bench and green self-healing cutting mat */}
			<mesh geometry={g.bench} position={[0, -0.2, 0]}>
				<meshStandardMaterial map={t.wood} roughness={0.7} envMapIntensity={0.7} />
			</mesh>
			<mesh geometry={g.mat} position={[0, 0.02, 0]}>
				<meshStandardMaterial map={t.mat} roughness={0.9} envMapIntensity={0.5} />
			</mesh>
			<Shadow w={6.2} d={4.2} x={0} z={0.05} o={0.35} />

			{/* leather piece, half stitched */}
			<mesh geometry={g.piece} position={[-1.55, 0.075, 0.1]} rotation={[0, 0.14, 0]}>
				<meshStandardMaterial map={t.piece} roughness={0.62} envMapIntensity={0.9} />
			</mesh>
			<Shadow w={2.4} d={1.7} x={-1.5} z={0.18} rot={0.14} o={0.45} />

			{/* steel ruler */}
			<mesh geometry={g.ruler} position={[0.3, 0.05, -1.62]} rotation={[0, 0.02, 0]}>
				<meshStandardMaterial map={t.ruler} metalness={0.8} roughness={0.4} envMapIntensity={0.7} />
			</mesh>
			<Shadow w={3.4} d={0.7} x={0.3} z={-1.58} rot={0.02} o={0.4} />

			{/* round knife: the saddler's cutting tool */}
			<group position={[1.75, 0.1, -0.25]} rotation={[0, 0.5, 0]}>
				<mesh geometry={g.blade} position={[0, 0.01, 0]}>
					<meshStandardMaterial {...steel} />
				</mesh>
				<mesh geometry={g.ferrule} position={[0, 0.07, 0.07]}>
					<meshStandardMaterial {...steel} />
				</mesh>
				<mesh geometry={g.grip} position={[0, 0.095, 0.55]}>
					<meshStandardMaterial {...wood} />
				</mesh>
			</group>
			<Shadow w={1.4} d={1.9} x={1.7} z={0.05} rot={0.5} o={0.42} />

			{/* pricking iron (stitching chisel) */}
			<group position={[0.55, 0.09, -0.95]} rotation={[0, 0.12, 0]}>
				<mesh geometry={g.iron} position={[-0.7, 0, 0]}>
					<meshStandardMaterial {...steel} />
				</mesh>
				{[-0.15, -0.075, 0, 0.075, 0.15].map((z) => (
					<mesh key={z} geometry={g.tooth} position={[-0.8, -0.005, z]}>
						<meshStandardMaterial {...steel} />
					</mesh>
				))}
				<mesh geometry={g.shaft} position={[-0.42, 0, 0]}>
					<meshStandardMaterial {...steel} />
				</mesh>
				<mesh geometry={g.awlNeck} position={[0.05, 0, 0]} scale={[1.5, 1, 1]}>
					<meshStandardMaterial {...wood} />
				</mesh>
			</group>
			<Shadow w={2.1} d={0.8} x={0.15} z={-0.92} rot={0.12} o={0.4} />

			{/* awl (on the bench, right of the mat) */}
			<group position={[3.55, 0.12, 0.4]} rotation={[0, 2.7, 0]}>
				<mesh geometry={g.awlGrip} position={[0, 0.03, 0]} scale={[1, 0.85, 1]}>
					<meshStandardMaterial {...wood} />
				</mesh>
				<mesh geometry={g.awlNeck} position={[0.38, 0, 0]}>
					<meshStandardMaterial {...wood} />
				</mesh>
				<mesh geometry={g.awlShaft} position={[1.1, 0, 0]}>
					<meshStandardMaterial {...steel} />
				</mesh>
			</group>
			<Shadow w={2.4} d={0.6} x={4.1} z={0.2} rot={-2.7} o={0.4} />

			{/* wooden mallet */}
			<group position={[-3.7, 0.2, 0.6]} rotation={[0, 0.35, 0]}>
				<mesh geometry={g.mHead} position={[-0.7, 0, 0]}>
					<meshStandardMaterial color="#7d4f2b" roughness={0.5} envMapIntensity={0.9} />
				</mesh>
				<mesh geometry={g.mHandle} position={[0, -0.06, 0]}>
					<meshStandardMaterial {...wood} />
				</mesh>
			</group>
			<Shadow w={2.3} d={0.9} x={-3.5} z={0.65} rot={0.35} o={0.4} />

			{/* waxed-thread spool and beeswax */}
			<group position={[2.5, 0.02, -1.15]}>
				<mesh geometry={g.spool} position={[0, 0.16, 0]}>
					<meshStandardMaterial map={t.thread} roughness={0.85} />
				</mesh>
				<mesh geometry={g.flange} position={[0, 0.015, 0]}>
					<meshStandardMaterial {...wood} />
				</mesh>
				<mesh geometry={g.flange} position={[0, 0.305, 0]}>
					<meshStandardMaterial {...wood} />
				</mesh>
			</group>
			<Shadow w={0.9} d={0.9} x={2.55} z={-1.1} o={0.45} />
			<mesh geometry={g.wax} position={[3.35, 0.09, -1.0]} rotation={[0, -0.3, 0]}>
				<meshPhysicalMaterial color="#d9a441" roughness={0.35} clearcoat={0.3} />
			</mesh>
			<Shadow w={0.9} d={0.75} x={3.4} z={-0.95} rot={-0.3} o={0.4} />
		</group>
	);
}
