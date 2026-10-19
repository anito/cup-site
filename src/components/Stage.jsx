'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getMotion } from '@/lib/motion';
import Hud from './Hud';
import Steam from './Steam';
import styles from './Stage.module.css';

/* the live 3D cup (React Three Fiber); client-only, loaded on demand */
const LevoCanvas = dynamic(() => import('@/lib/three/LevoCanvas'), { ssr: false });

const chapters = [
	{
		num: '01',
		title: 'Seal',
		side: 'right',
		text: 'Lid on for the commute. A press-fit lid seals in the heat and stops the drips, with a sip slot sized for one calm mouthful.',
		ad: ['Commute Mode', 'Fits 98% of car cup holders*'],
		fine: '*of the ones we tried'
	},
	{
		num: '02',
		title: 'Flip',
		side: 'left',
		text: 'One lid, two lives. Lift it off, flip it over, set it down: the lid flexes flat and is now a wireless leather coaster.',
		ad: ['New', 'Replaces your coaster drawer']
	},
	{
		num: '03',
		title: 'Float',
		side: 'right',
		text: 'Six millimetres above everything. A magnetic field lifts Levo off its lid-coaster and lets it spin freely. Lift it away and it sleeps — set it down and it wakes.',
		ad: ['Desk Mode', '15 W wireless, zero cables']
	},
	{
		num: '04',
		title: 'Halo',
		side: 'left',
		text: 'The Thermal Halo shifts from cyan to amber as your drink warms, and induction in the steel liner holds your chosen temperature, from 20 to 80 °C, for four hours.',
		ad: ['As featured on', 'The Imaginary Morning Show']
	},
	{
		num: '05',
		title: 'Pack',
		side: 'center',
		text: 'Leaving? Lift the cup, flip the lid back on, and the halo sleeps. Come back and your drink is exactly as you left it.',
		ad: ['Founders’ offer', 'Engraved lid + spare sleeve, free']
	}
];
const railLabels = ['Intro', 'Seal', 'Flip', 'Float', 'Halo', 'Pack'];

/* scene palette, one entry per chapter */
const PAL = [
	{ bg: '#05070b', accent: '#3fd0ff' },
	{ bg: '#060a14', accent: '#5b8cff' },
	{ bg: '#0b0714', accent: '#d05cff' },
	{ bg: '#051012', accent: '#3fe0c8' },
	{ bg: '#120905', accent: '#ffab3c' },
	{ bg: '#04060a', accent: '#3fd0ff' }
];
const AT = [0, 0.1, 0.27, 0.45, 0.63, 0.82];

export default function Stage({ onProgress = () => {}, onReady = () => {} }) {
	const stageRef = useRef(null);
	const cupRef = useRef(null);
	const glRef = useRef(null);
	const glowRef = useRef(null);
	const floorRef = useRef(null);
	const wordmarkRef = useRef(null);
	const heroRef = useRef(null);
	const heroLeftRef = useRef(null);
	const heroRightRef = useRef(null);
	const hudRef = useRef(null);
	const dustRef = useRef(null);
	const ringRefs = [useRef(null), useRef(null), useRef(null)];
	const chapterRefs = useRef([]);

	/* shared with the 3D scene, which reads it every frame (no React re-render) */
	const rig = useRef({ frame: 0, mouse: 0, lidT: 0, topT: 1, cupEl: null, reduce: false }).current;

	const [temp, setTemp] = useState(22);
	const [railIndex, setRailIndex] = useState(0);
	const [isStatic, setIsStatic] = useState(false);
	const [active, setActive] = useState(true);
	const readyRef = useRef(false);

	/* loader: the model has no files to fetch, so ease towards ~90% while the 3D chunk loads */
	useEffect(() => {
		let p = 0.05;
		onProgress(p);
		const id = setInterval(() => {
			if (readyRef.current) return clearInterval(id);
			p += (0.92 - p) * 0.1;
			onProgress(p);
		}, 90);
		return () => clearInterval(id);
	}, [onProgress]);

	const handleGlReady = () => {
		if (readyRef.current) return;
		readyRef.current = true;
		onProgress(1);
		onReady();
	};

	/* pause rendering while the stage is far off screen */
	useEffect(() => {
		const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '200px' });
		io.observe(stageRef.current.parentElement);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		let disposed = false;
		let ctx;
		let cleanup = () => {};
		rig.cupEl = cupRef.current;

		(async () => {
			const { gsap, ScrollTrigger, reduce } = await getMotion();
			if (disposed) return;
			rig.reduce = reduce;
			if (reduce) rig.topT = 0;
			const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
			let heroWeight = 1;

			if (reduce) {
				setIsStatic(true);
				return;
			}

			const isMobile = () => innerWidth <= 860;
			const vw = (n) => () => innerWidth * (n / 100);
			const stage = stageRef.current;
			const cup = cupRef.current;

			ctx = gsap.context(() => {
				gsap.set(cup, { xPercent: -50, yPercent: -50 });
				const cupY = () => (isMobile() ? -innerHeight * 0.1 : -innerHeight * 0.01);
				gsap.set(cup, { y: cupY });
				gsap.set(stage, { '--bg': PAL[0].bg, '--accent': PAL[0].accent });

				/* ambient loops: orbit rings, dust */
				const [r1, r2, r3] = ringRefs.map((r) => r.current);
				gsap.to(r1, { rotation: 360, duration: 60, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				gsap.to(r2, { rotation: -360, duration: 90, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				gsap.to(r3, { rotation: 360, duration: 140, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				dustRef.current.querySelectorAll('i').forEach((d) => {
					gsap.fromTo(
						d,
						{ y: 0, opacity: 0 },
						{
							y: () => -gsap.utils.random(innerHeight * 0.3, innerHeight * 0.9),
							x: () => gsap.utils.random(-40, 40),
							opacity: gsap.utils.random(0.25, 0.8),
							duration: gsap.utils.random(6, 12),
							delay: gsap.utils.random(0, 8),
							repeat: -1,
							ease: 'sine.inOut'
						}
					);
				});

				/* the pinned, scrubbed story */
				const tl = gsap.timeline({
					defaults: { ease: 'none' },
					scrollTrigger: {
						trigger: stage.parentElement,
						start: 'top top',
						end: () => '+=' + Math.round(innerHeight * 7.4),
						pin: stage,
						scrub: 0.9,
						anticipatePin: 1,
						invalidateOnRefresh: true,
						onUpdate: (self) => {
							const p = self.progress;
							heroWeight = clamp(1 - p / 0.06, 0, 1);
							const k = clamp((p - 0.3) / 0.42, 0, 1);
							setTemp(Math.round(22 + 43 * (k * k * (3 - 2 * k))));
							let idx = 0;
							AT.forEach((t, i) => {
								if (p >= t - 0.001) idx = i;
							});
							setRailIndex(idx);
						}
					}
				});

				tl.to(rig, { frame: 144, duration: 1 }, 0);
				// the opening: a top-down view of the saddlery desk that tilts into the side view
				tl.to(rig, { topT: 0, duration: 0.1, ease: 'power2.inOut' }, 0.005);
				tl.to(heroRef.current, { opacity: 0, y: -30, duration: 0.06, ease: 'power1.in' }, 0.015);
				tl.to(wordmarkRef.current, { yPercent: -18, scale: 1.1, duration: 0.3 }, 0);
				tl.to(wordmarkRef.current, { opacity: 0, duration: 0.12 }, 0.12);
				tl.to(floorRef.current, { backgroundPositionY: '1600px', duration: 1 }, 0);

				const m = isMobile();
				const path = [
					{ x: m ? 0 : vw(-23), y: m ? () => -innerHeight * 0.2 : () => 0, scale: m ? 0.92 : 1.04 },
					{ x: 0, y: m ? () => -innerHeight * 0.2 : () => 0, scale: m ? 0.95 : 1.0 },
					{ x: m ? 0 : vw(-23), y: m ? () => -innerHeight * 0.2 : () => 0, scale: m ? 0.98 : 1.1 },
					{ x: m ? 0 : vw(22), y: m ? () => -innerHeight * 0.2 : () => -innerHeight * 0.01, scale: m ? 1.02 : 1.16 },
					{ x: 0, y: m ? () => -innerHeight * 0.22 : () => -innerHeight * 0.1, scale: m ? 1.0 : 0.88 }
				];
				path.forEach((p, i) => tl.to(cup, { ...p, duration: 0.09, ease: 'power2.inOut' }, AT[i + 1] - 0.055));
				// the lid: off and flipped into the coaster during "Flip", back on during "Pack"
				tl.to(rig, { lidT: 1, duration: 0.17, ease: 'none' }, AT[2] - 0.01);
				tl.to(rig, { lidT: 0, duration: 0.15, ease: 'none' }, AT[5] - 0.02);
				PAL.slice(1).forEach((p, i) =>
					tl.to(stage, { '--bg': p.bg, '--accent': p.accent, duration: 0.09, ease: 'power1.inOut' }, AT[i + 1] - 0.06)
				);
				tl.to(dustRef.current, { opacity: 1, duration: 0.05 }, AT[3] - 0.02);
				tl.fromTo([r1, r3], { scale: 0.9 }, { scale: 1.25, duration: 1 }, 0);

				chapterRefs.current.forEach((el, i) => {
					const start = AT[i + 1];
					const last = i === chapters.length - 1;
					const dy = 34;
					tl.fromTo(el, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.045, ease: 'power2.out' }, start);
					if (!last) tl.to(el, { opacity: 0, y: -dy, duration: 0.04, ease: 'power2.in' }, AT[i + 2] - 0.065);
				});

				/* pointer: a little extra turn of the cup near the top of the page */
				const pointer = { v: 0 };
				const tick = () => (rig.mouse = pointer.v * heroWeight);
				gsap.ticker.add(tick);
				cleanup = () => gsap.ticker.remove(tick);
				if (matchMedia('(pointer:fine)').matches) {
					const qx = gsap.quickTo(pointer, 'v', { duration: 0.9, ease: 'power3.out' });
					const onMove = (e) => qx((e.clientX / innerWidth - 0.5) * 0.9);
					addEventListener('pointermove', onMove);
					const prev = cleanup;
					cleanup = () => {
						removeEventListener('pointermove', onMove);
						prev();
					};
				}

				/* intro */
				const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.35 });
				intro
					.from(glRef.current, { opacity: 0, duration: 1.6 }, 0.1)
					.from(wordmarkRef.current, { yPercent: 12, opacity: 0, duration: 1.6 }, 0)
					.from(glowRef.current, { opacity: 0, duration: 2 }, 0)
					.from(heroLeftRef.current.children, { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.5)
					.from(heroRightRef.current.children, { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.7)
					.from(hudRef.current, { opacity: 0, x: 20, duration: 1 }, 1);
			}, stage);

			const refresh = () => ScrollTrigger.refresh();
			addEventListener('load', refresh);
			const prev = cleanup;
			cleanup = () => {
				removeEventListener('load', refresh);
				prev();
			};
		})();

		return () => {
			disposed = true;
			cleanup();
			ctx?.revert();
		};
	}, [rig]);

	return (
		<section className={styles.story} id="story" aria-label="How Levo works">
			<div className={`${styles.stage} ${isStatic ? styles.static : ''}`} ref={stageRef}>
				<div className={styles.glow} ref={glowRef} aria-hidden="true" />
				<Steam intensity={0.26} />
				<div className={styles.floor} ref={floorRef} aria-hidden="true" />
				<div className={styles.wordmark} ref={wordmarkRef} aria-hidden="true">
					LEVO
				</div>
				<div className={styles.dust} ref={dustRef} aria-hidden="true">
					{Array.from({ length: 26 }, (_, i) => (
						<i key={i} style={{ left: `${(i * 37) % 100}%`, '--s': `${2 + ((i * 7) % 4)}px` }} />
					))}
				</div>

				{/* the DOM box GSAP moves/scales; the 3D group follows it, and the rings live inside it */}
				<div className={styles.cup} ref={cupRef}>
					<svg className={styles.rings} viewBox="-100 -100 200 200" aria-hidden="true">
						<g ref={ringRefs[0]}>
							<circle r="46" className={`${styles.r} ${styles['r-a']}`} />
							<circle r="46" className={`${styles.r} ${styles['r-arc']}`} />
							<circle cx="46" cy="0" r="1.4" className={styles.dot} />
						</g>
						<g ref={ringRefs[1]}>
							<circle r="62" className={`${styles.r} ${styles['r-b']}`} />
							<circle cx="-62" cy="0" r="1.1" className={styles.dot} />
							<circle cx="0" cy="62" r="1.1" className={`${styles.dot} ${styles.dim}`} />
						</g>
						<g ref={ringRefs[2]}>
							<circle r="82" className={`${styles.r} ${styles['r-c']}`} />
							<circle r="82" className={`${styles.r} ${styles['r-arc2']}`} />
						</g>
					</svg>
				</div>

				<div
					className={styles.gl}
					ref={glRef}
					role="img"
					aria-label="A champagne-titanium takeaway cup with a leather sleeve, a full-height smoked LEVO label and a glowing Thermal Halo band, its lid flipping into a coaster"
				>
					<LevoCanvas rig={rig} active={active} onReady={handleGlReady} />
				</div>

				<Hud temp={temp} ref={hudRef} />

				<div className={`${styles.copy} ${styles.hero}`} ref={heroRef}>
					<div className={styles['hero-left']} ref={heroLeftRef}>
						<p className={`eyebrow ${styles.eyebrow}`}>Levo One · Concept</p>
						<h1>
							A cup that floats.
							<br />
							<em>And keeps its heat.</em>
						</h1>
					</div>
					<div className={styles['hero-right']} ref={heroRightRef}>
						<p className={styles.lede}>
							A cup, a lid and a levitating coaster in two parts. Lid on for the commute; flip it and Levo floats on your
							desk, holding the exact temperature you choose.
						</p>
						<div className={styles.actions}>
							<a className="btn btn--solid" href="#reserve">
								Reserve — $189
							</a>
							<a className="btn btn--ghost" href="#details">
								See how it works
							</a>
						</div>
					</div>
				</div>

				{chapters.map((c, i) => (
					<article
						key={c.num}
						ref={(el) => (chapterRefs.current[i] = el)}
						className={`${styles.copy} ${styles.chapter} ${styles[c.side]}`}
					>
						<span className={styles.num}>{c.num}</span>
						<h2>{c.title}</h2>
						<p>{c.text}</p>
						<p className={styles.ad}>
							<b>{c.ad[0]}</b>
							<span>{c.ad[1]}</span>
						</p>
						{c.fine && <small className={styles.fine}>{c.fine}</small>}
					</article>
				))}

				<ol className={styles.rail} aria-hidden="true">
					{railLabels.map((l, i) => (
						<li key={l} className={railIndex === i ? styles.active : ''}>
							<i />
							<span>{l}</span>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
