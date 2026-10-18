'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { PlaneGeometry, CircleGeometry } from 'three';
import { cupBody, haloShell, lipGlow, sleeve as sleeveGeometry, lidBody, lidRing, sipSlot, drinkDisc, LID } from './geometry.js';
import { createMaterials } from './materials.js';

const TARGET_Y = 0.5; // the point the camera looks at (centre of the cup + coaster)
const CAM_DIST = 5.2;
const HOVER = 0.34;
const UNITS_ACROSS = 2.2; // world units spanned by the square the frames used to fill

/* the lid's journey (rig.lidT 0 -> 1): lift off, slide clear of the cup, flip while it descends,
   then slide in underneath as the coaster. The same curve runs backwards to put it back on. */
const SIDE = 1.25;
const LIFT = 0.55;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sm = (a, b, x) => {
	const t = clamp01((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

function Levo({ rig, onReady }) {
	const group = useRef();
	const cup = useRef();
	const lid = useRef();
	const { camera, size } = useThree();

	const mats = useMemo(() => createMaterials(), []);
	const body = useMemo(() => cupBody(), []);
	const geo = useMemo(
		() => ({
			shells: [haloShell(body.points, 0.012), haloShell(body.points, 0.03)],
			lip: lipGlow(0.416, 0.03),
			sleeve: sleeveGeometry(),
			lid: lidBody(),
			ringA: lidRing(0.3, 0.011),
			ringB: lidRing(0.41, 0.006),
			slot: sipSlot(),
			vent: new CircleGeometry(0.011, 16).rotateX(-Math.PI / 2).translate(-0.24, LID.deck + 0.002, 0.09),
			mark: new PlaneGeometry(0.4, 0.06).rotateX(-Math.PI / 2).translate(0, LID.deck + 0.003, 0),
			glowPlane: new PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2).translate(0, -0.006, 0),
			drink: drinkDisc()
		}),
		[body]
	);

	const readyRef = useRef(false);
	useEffect(
		() => () => {
			Object.values(geo).flat().forEach((g) => g.dispose?.());
			body.geometry.dispose();
		},
		[geo, body]
	);

	useFrame((state) => {
		const t = state.clock.elapsedTime;
		const cupEl = rig.cupEl;
		if (!cupEl) return;

		// the DOM wrapper is the layout driver (GSAP moves/scales it); follow its box
		const S = cupEl.offsetWidth || 1;
		const unitPx = S / UNITS_ACROSS;
		const stage = state.gl.domElement.getBoundingClientRect();
		const r = cupEl.getBoundingClientRect();
		const dx = (r.left + r.width / 2 - (stage.left + stage.width / 2)) / unitPx;
		const dy = -(r.top + r.height / 2 - (stage.top + stage.height / 2)) / unitPx;
		const k = r.width / S;

		// keep world scale fixed: the visible world height follows the canvas height
		const fov = (2 * Math.atan(size.height / unitPx / 2 / CAM_DIST) * 180) / Math.PI;
		if (Math.abs(camera.fov - fov) > 0.01) {
			camera.fov = fov;
			camera.updateProjectionMatrix();
		}

		const phase = (((rig.frame / 72) % 1) + 1) % 1;
		const el = ((19 + 11 * Math.sin(2 * Math.PI * phase)) * Math.PI) / 180;
		camera.position.set(0, TARGET_Y + CAM_DIST * Math.sin(el), CAM_DIST * Math.cos(el));
		camera.lookAt(0, TARGET_Y, 0);

		/* sealed (cup + lid stacked, centred ~0.43 higher) -> coaster mode */
		const T = clamp01(rig.lidT ?? 0);
		const shift = -0.43 * (1 - sm(0.3, 1, T));
		group.current.scale.setScalar(k);
		group.current.position.set(dx, dy + TARGET_Y * (1 - k) + shift * k, 0);

		const idle = rig.reduce ? 0 : 0.012 * Math.sin(t * 1.4);
		const cupY = HOVER + 0.035 * Math.sin(2 * Math.PI * phase) + idle;
		const cupRot = (-20 * Math.PI) / 180 - (rig.frame / 72) * 2 * Math.PI + (rig.mouse || 0);
		cup.current.position.y = cupY;
		cup.current.rotation.y = cupRot;

		// lid pose along its path
		const lift = sm(0, 0.22, T);
		const side = sm(0.22, 0.5, T);
		const down = sm(0.5, 0.85, T);
		const back = sm(0.85, 1, T);
		const seatY = cupY + LID.seat;
		const flip = sm(0.3, 0.8, T);
		lid.current.position.set(SIDE * side * (1 - back), (seatY + LIFT * lift) * (1 - down), 0);
		// yaw follows the cup while seated; the coaster is rotationally symmetric, so it just lets go
		lid.current.rotation.set(Math.PI * flip, cupRot * (1 - sm(0.18, 0.4, T)), 0.35 * Math.sin(Math.PI * sm(0.2, 0.85, T)), 'YXZ');

		// light: the halo sleeps while the lid is on; the coaster's rings wake as it lands
		const halo = 0.3 + 0.7 * sm(0.3, 1, T);
		const dockOn = sm(0.82, 1, T);
		mats.halo.color.setScalar(halo);
		mats.haloGlow[0].opacity = 0.3 * halo;
		mats.haloGlow[1].opacity = 0.13 * halo;
		mats.lipGlow.opacity = 0.22 * halo;
		mats.ring.color.set(0x4fd2ff).multiplyScalar(0.12 + 0.88 * dockOn);
		mats.dockGlow.opacity = 0.9 * dockOn;

		if (!readyRef.current) {
			readyRef.current = true;
			requestAnimationFrame(() => onReady?.());
		}
	});

	return (
		<group ref={group}>
			{/* the lid; flipped, it is the coaster */}
			<group ref={lid}>
				<mesh geometry={geo.lid} material={[mats.lidTop, mats.lidUnder]} />
				<mesh geometry={geo.slot} material={mats.slot} />
				<mesh geometry={geo.vent} material={mats.slot} />
				<mesh geometry={geo.mark} material={mats.lidMark} renderOrder={4} />
				<mesh geometry={geo.ringA} material={mats.ring} />
				<mesh geometry={geo.ringB} material={mats.ring} />
				<mesh geometry={geo.glowPlane} material={mats.dockGlow} renderOrder={2} />
			</group>

			{/* the cup */}
			<group ref={cup}>
				<mesh geometry={body.geometry} material={[mats.shell, mats.liner, mats.halo]} />
				<mesh geometry={geo.sleeve} material={mats.sleeve} />
				<mesh geometry={geo.drink} material={mats.drink} />
				<mesh geometry={geo.shells[0]} material={mats.haloGlow[0]} renderOrder={3} />
				<mesh geometry={geo.shells[1]} material={mats.haloGlow[1]} renderOrder={3} />
				<mesh geometry={geo.lip} material={mats.lipGlow} renderOrder={3} />
			</group>
		</group>
	);
}

function Studio() {
	/* strip/softbox "lightformers": the reflections that make the metal read as machined */
	return (
		<Environment resolution={512} frames={1}>
			<color attach="background" args={['#05070b']} />
			<Lightformer form="rect" intensity={4} position={[0, 6, 0]} scale={[10, 10, 1]} target={[0, 0, 0]} />
			<Lightformer form="rect" intensity={9} color="#fff4e6" position={[-5, 1.5, 2.5]} scale={[0.9, 9, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={6.5} color="#eaf3ff" position={[5, 1.5, 3]} scale={[0.8, 9, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={6} color="#4fc8ff" position={[5, 2, -5]} scale={[1, 8, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={5} color="#a07bff" position={[-5, 2, -5]} scale={[1, 8, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={1.6} position={[0, 0.5, 7]} scale={[8, 4, 1]} target={[0, 0.5, 0]} />
		</Environment>
	);
}

export default function LevoCanvas({ rig, active = true, onReady }) {
	return (
		<Canvas
			flat
			dpr={[1, 2]}
			frameloop={active ? 'always' : 'never'}
			gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
			camera={{ fov: 24, near: 0.1, far: 60, position: [0, 1.5, 5.2] }}
			style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
		>
			<Studio />
			<Levo rig={rig} onReady={onReady} />
		</Canvas>
	);
}
