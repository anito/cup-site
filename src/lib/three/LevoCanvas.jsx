'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { PlaneGeometry } from 'three';
import {
	cupBody,
	haloShell,
	lipGlow,
	handle as handleGeometry,
	dockBody,
	dockRing,
	drinkDisc
} from './geometry.js';
import { createMaterials } from './materials.js';

const TARGET_Y = 0.5; // the point the camera looks at (centre of the cup)
const CAM_DIST = 5.2;
const HOVER = 0.34;
const UNITS_ACROSS = 2.2; // world units spanned by the square the frames used to fill

function Levo({ rig, onReady }) {
	const group = useRef();
	const cup = useRef();
	const { camera, size } = useThree();

	const mats = useMemo(() => createMaterials(), []);
	const body = useMemo(() => cupBody(), []);
	const geo = useMemo(
		() => ({
			shells: [haloShell(body.points, 0.012), haloShell(body.points, 0.03)],
			lip: lipGlow(0.416, 0.03),
			handle: handleGeometry(),
			dock: dockBody(),
			ringA: dockRing(0.44, 0.011),
			ringB: dockRing(0.55, 0.006),
			drink: drinkDisc(),
			glowPlane: new PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2)
		}),
		[body]
	);

	const readyRef = useRef(false);
	useEffect(() => () => {
		Object.values(geo).flat().forEach((g) => g.dispose?.());
		body.geometry.dispose();
	}, [geo, body]);

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

		const phase = ((rig.frame / 72) % 1 + 1) % 1;
		const el = ((19 + 11 * Math.sin(2 * Math.PI * phase)) * Math.PI) / 180;
		camera.position.set(0, TARGET_Y + CAM_DIST * Math.sin(el), CAM_DIST * Math.cos(el));
		camera.lookAt(0, TARGET_Y, 0);

		group.current.scale.setScalar(k);
		group.current.position.set(dx, dy + TARGET_Y * (1 - k), 0);

		const idle = rig.reduce ? 0 : 0.012 * Math.sin(t * 1.4);
		cup.current.position.y = HOVER + 0.035 * Math.sin(2 * Math.PI * phase) + idle;
		cup.current.rotation.y = (-20 * Math.PI) / 180 - (rig.frame / 72) * 2 * Math.PI + (rig.mouse || 0);

		if (!readyRef.current) {
			readyRef.current = true;
			requestAnimationFrame(() => onReady?.());
		}
	});

	return (
		<group ref={group}>
			{/* dock */}
			<mesh geometry={geo.dock} material={mats.dock} />
			<mesh geometry={geo.ringA} material={mats.ring} />
			<mesh geometry={geo.ringB} material={mats.ring} />
			<mesh geometry={geo.glowPlane} material={mats.dockGlow} position={[0, 0.006, 0]} renderOrder={2} />

			{/* cup */}
			<group ref={cup}>
				<mesh geometry={body.geometry} material={[mats.shell, mats.liner, mats.halo]} />
				<mesh geometry={geo.handle} material={mats.handle} />
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
