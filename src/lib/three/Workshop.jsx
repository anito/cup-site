'use client';

import { useMemo } from 'react';
import { BoxGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/* The opening pad: a dark gray cutting mat the cup rests on, seen from above. The mat top is y = 0
   and one unit is about 10 cm. Procedural (a canvas texture), so there is nothing to download. */

const rnd = (a, b) => a + Math.random() * (b - a);

/* placement from the layout sketch (units; screen right = +x, screen down = +z) */
const PAD = { rot: 0.42, x: 2.0, z: -2.05 };
const MAT_W = 5;
const MAT_D = 4;

function matTexture() {
	const cv = document.createElement('canvas');
	cv.width = 1480;
	cv.height = Math.round((1480 * MAT_D) / MAT_W);
	const c = cv.getContext('2d');
	const px = cv.width / MAT_W; // pixels per unit
	c.fillStyle = '#1b1c1f';
	c.fillRect(0, 0, cv.width, cv.height);
	for (let i = 0; i < 30000; i++) {
		c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${rnd(0.012, 0.045)})`;
		c.fillRect(rnd(0, cv.width), rnd(0, cv.height), rnd(1, 3), rnd(1, 3));
	}
	// fine measuring grid: light every 0.25, stronger every 1.0
	for (let u = 0; u <= MAT_W + 0.001; u += 0.5) {
		const strong = Math.abs(u - Math.round(u)) < 1e-6;
		c.strokeStyle = `rgba(230,232,236,${strong ? 0.2 : 0.1})`;
		c.lineWidth = strong ? 2 : 1;
		c.beginPath();
		c.moveTo(u * px, 0);
		c.lineTo(u * px, cv.height);
		c.stroke();
	}
	for (let v = 0; v <= MAT_D + 0.001; v += 0.5) {
		const strong = Math.abs(v - Math.round(v)) < 1e-6;
		c.strokeStyle = `rgba(230,232,236,${strong ? 0.2 : 0.1})`;
		c.lineWidth = strong ? 2 : 1;
		c.beginPath();
		c.moveTo(0, v * px);
		c.lineTo(cv.width, v * px);
		c.stroke();
	}
	c.strokeStyle = 'rgba(230,232,236,0.14)';
	c.lineWidth = 1.5;
	c.beginPath();
	c.moveTo(0, 0);
	c.lineTo(cv.width, cv.height);
	c.moveTo(cv.width, 0);
	c.lineTo(0, cv.height);
	c.stroke();
	const t = new CanvasTexture(cv);
	t.colorSpace = SRGBColorSpace;
	t.anisotropy = 8;
	t.wrapS = t.wrapT = RepeatWrapping;
	return t;
}

let blobTex;
export function blobTexture() {
	if (!blobTex) {
		const cv = document.createElement('canvas');
		cv.width = cv.height = 128;
		const c = cv.getContext('2d');
		const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
		g.addColorStop(0, 'rgba(0,0,0,0.7)');
		g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, 128, 128);
		blobTex = new CanvasTexture(cv);
	}
	return blobTex;
}

export default function Workshop({ ref }) {
	const map = useMemo(() => matTexture(), []);
	const geo = useMemo(() => new BoxGeometry(MAT_W, 0.07, MAT_D), []);
	return (
		<group ref={ref}>
			{/* rotated pad: its bottom-left corner sits just down-right of the cup, the rest runs off the top and right edges */}
			<mesh geometry={geo} position={[PAD.x, -0.03, PAD.z]} rotation={[0, PAD.rot, 0]} receiveShadow>
				<meshStandardMaterial map={map} color="#a8a8a8" roughness={0.8} metalness={0} envMapIntensity={0.7} />
			</mesh>
		</group>
	);
}
