<script>
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { getMotion } from '$lib/motion.js';
	import Hud from './Hud.svelte';

	let { onprogress = () => {}, onready = () => {} } = $props();

	const FRAMES = 72;
	const framePath = (i) => asset(`/frames/f${String(i).padStart(3, "0")}.webp`);

	const chapters = [
		{
			num: '01',
			title: 'Float',
			side: 'right',
			text: 'Six millimetres above everything. A magnetic field lifts Levo off its dock and lets it spin freely. Lift it away and it sleeps — set it down and it wakes.'
		},
		{
			num: '02',
			title: 'Halo',
			side: 'left',
			text: 'The Thermal Halo. A band of light around the body shifts from cyan to amber as your drink warms, so you can read its temperature from across the room.'
		},
		{
			num: '03',
			title: 'Hold',
			side: 'right',
			text: 'Choose any temperature from 20 to 80 °C. Induction in the steel liner holds it there for up to four hours, to within a single degree.'
		},
		{
			num: '04',
			title: 'Rest',
			side: 'center',
			text: 'When you lift it away, the halo dims and the dock goes quiet. Come back, and your drink is exactly as you left it.'
		}
	];
	const railLabels = ['Intro', 'Float', 'Halo', 'Hold', 'Rest'];

	/* scene palette, one entry per chapter */
	const PAL = [
		{ bg: '#05070b', accent: '#3fd0ff' },
		{ bg: '#060a14', accent: '#5b8cff' },
		{ bg: '#0b0714', accent: '#d05cff' },
		{ bg: '#120905', accent: '#ffab3c' },
		{ bg: '#04060a', accent: '#3fd0ff' }
	];
	const AT = [0, 0.13, 0.35, 0.57, 0.79];

	let stageEl, cupEl, canvasEl, floorEl, wordmarkEl, heroEl, dustEl, r1, r2, r3;
	let temp = $state(22);
	let railIndex = $state(0);
	let isStatic = $state(false);

	onMount(() => {
		let disposed = false;
		let ctx;
		let cleanup = () => {};

		(async () => {
			/* 1 ── load frames */
			const images = new Array(FRAMES);
			await new Promise((resolve) => {
				let done = 0;
				const tick = () => {
					done++;
					onprogress(done / FRAMES);
					if (done === FRAMES) resolve();
				};
				for (let i = 0; i < FRAMES; i++) {
					const img = new Image();
					img.decoding = 'async';
					img.onload = img.onerror = tick;
					img.src = framePath(i);
					images[i] = img;
				}
			});
			if (disposed) return;

			const { gsap, ScrollTrigger, reduce } = await getMotion();
			if (disposed) return;
			const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
			const c2d = canvasEl.getContext('2d');

			/* 2 ── canvas renderer: cross-fades the two nearest frames */
			const state = { frame: 0 };
			const mouse = { v: 0 };
			let heroWeight = 1;
			let lastKey = -1;
			const draw = () => {
				let f = state.frame + mouse.v * heroWeight;
				f = ((f % FRAMES) + FRAMES) % FRAMES;
				const key = Math.round(f * 50);
				if (key === lastKey) return;
				lastKey = key;
				const i = Math.floor(f);
				const frac = f - i;
				const a = images[i];
				const b = images[(i + 1) % FRAMES];
				c2d.clearRect(0, 0, canvasEl.width, canvasEl.height);
				if (a?.naturalWidth) c2d.drawImage(a, 0, 0, canvasEl.width, canvasEl.height);
				if (frac > 0.04 && b?.naturalWidth) {
					c2d.globalAlpha = frac;
					c2d.drawImage(b, 0, 0, canvasEl.width, canvasEl.height);
					c2d.globalAlpha = 1;
				}
			};
			draw();

			if (reduce) {
				isStatic = true;
				onready();
				return;
			}

			const isMobile = () => innerWidth <= 860;
			const vw = (n) => () => innerWidth * (n / 100);

			ctx = gsap.context(() => {
				gsap.set(cupEl, { xPercent: -50, yPercent: -50 });
				const cupY = () => (isMobile() ? -innerHeight * 0.1 : -innerHeight * 0.01);
				gsap.set(cupEl, { y: cupY });
				gsap.set(stageEl, { '--bg': PAL[0].bg, '--accent': PAL[0].accent });

				/* ambient loops: orbit rings, dust */
				gsap.to(r1, { rotation: 360, duration: 60, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				gsap.to(r2, { rotation: -360, duration: 90, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				gsap.to(r3, { rotation: 360, duration: 140, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				dustEl.querySelectorAll('i').forEach((d) => {
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
						trigger: stageEl.parentElement,
						start: 'top top',
						end: () => '+=' + Math.round(innerHeight * 7.4),
						pin: stageEl,
						scrub: 0.9,
						anticipatePin: 1,
						invalidateOnRefresh: true,
						onUpdate: (self) => {
							const p = self.progress;
							heroWeight = clamp(1 - p / 0.06, 0, 1);
							const k = clamp((p - 0.1) / 0.62, 0, 1);
							temp = Math.round(22 + 43 * (k * k * (3 - 2 * k)));
							let idx = 0;
							AT.forEach((t, i) => {
								if (p >= t - 0.001) idx = i;
							});
							railIndex = idx;
						}
					}
				});

				tl.to(state, { frame: FRAMES * 2, duration: 1 }, 0);
				tl.to(heroEl, { opacity: 0, y: -30, duration: 0.06, ease: 'power1.in' }, 0.015);
				tl.to(wordmarkEl, { yPercent: -18, scale: 1.1, duration: 0.3 }, 0);
				tl.to(wordmarkEl, { opacity: 0, duration: 0.12 }, 0.12);
				tl.to(floorEl, { backgroundPositionY: '1600px', duration: 1 }, 0);

				const m = isMobile();
				const path = [
					{ x: m ? 0 : vw(-23), y: m ? () => -innerHeight * 0.2 : () => 0, scale: m ? 0.92 : 1.04 },
					{ x: m ? 0 : vw(23), y: m ? () => -innerHeight * 0.2 : () => 0, scale: m ? 0.95 : 1.1 },
					{ x: m ? 0 : vw(-19), y: m ? () => -innerHeight * 0.2 : () => -innerHeight * 0.01, scale: m ? 1.02 : 1.2 },
					{ x: 0, y: m ? () => -innerHeight * 0.22 : () => -innerHeight * 0.1, scale: m ? 1.0 : 0.88 }
				];
				path.forEach((p, i) =>
					tl.to(cupEl, { ...p, duration: 0.09, ease: 'power2.inOut' }, AT[i + 1] - 0.055)
				);
				PAL.slice(1).forEach((p, i) =>
					tl.to(stageEl, { '--bg': p.bg, '--accent': p.accent, duration: 0.09, ease: 'power1.inOut' }, AT[i + 1] - 0.06)
				);
				tl.to(dustEl, { opacity: 1, duration: 0.05 }, AT[3] - 0.02);
				tl.fromTo([r1, r3], { scale: 0.9 }, { scale: 1.25, duration: 1 }, 0);

				stageEl.querySelectorAll('.chapter').forEach((el, i) => {
					const start = AT[i + 1];
					const last = i === 3;
					const dy = 34;
					tl.fromTo(el, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.045, ease: 'power2.out' }, start);
					if (!last) tl.to(el, { opacity: 0, y: -dy, duration: 0.04, ease: 'power2.in' }, AT[i + 2] - 0.065);
				});

				gsap.ticker.add(draw);
				if (matchMedia('(pointer:fine)').matches) {
					const qx = gsap.quickTo(mouse, 'v', { duration: 0.9, ease: 'power3.out' });
					const onMove = (e) => qx((e.clientX / innerWidth - 0.5) * 5);
					addEventListener('pointermove', onMove);
					cleanup = () => {
						removeEventListener('pointermove', onMove);
						gsap.ticker.remove(draw);
					};
				} else cleanup = () => gsap.ticker.remove(draw);

				/* intro */
				const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.35 });
				intro
					.from(canvasEl, { scale: 0.86, opacity: 0, duration: 1.6 }, 0)
					.from(wordmarkEl, { yPercent: 12, opacity: 0, duration: 1.6 }, 0)
					.from('.glow', { opacity: 0, duration: 2 }, 0)
					.from('.hero-left > *', { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.5)
					.from('.hero-right > *', { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.7)
					.from('.hud', { opacity: 0, x: 20, duration: 1 }, 1);
				gsap.to(canvasEl, { y: '-1.4%', duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });
			}, stageEl);

			onready();
			addEventListener('load', () => ScrollTrigger.refresh());
		})();

		return () => {
			disposed = true;
			cleanup();
			ctx?.revert();
		};
	});
</script>

<section class="story" id="story" aria-label="How Levo works">
	<div class="stage" class:static={isStatic} bind:this={stageEl}>
		<div class="glow" aria-hidden="true"></div>
		<div class="floor" bind:this={floorEl} aria-hidden="true"></div>
		<div class="wordmark" bind:this={wordmarkEl} aria-hidden="true">LEVO</div>
		<div class="dust" bind:this={dustEl} aria-hidden="true">
			{#each Array(26) as _, i}
				<i style:left="{(i * 37) % 100}%" style:--s="{2 + ((i * 7) % 4)}px"></i>
			{/each}
		</div>

		<div class="cup" bind:this={cupEl}>
			<svg class="rings" viewBox="-100 -100 200 200" aria-hidden="true">
				<g bind:this={r1}>
					<circle r="46" class="r r-a" />
					<circle r="46" class="r r-arc" />
					<circle cx="46" cy="0" r="1.4" class="dot" />
				</g>
				<g bind:this={r2}>
					<circle r="62" class="r r-b" />
					<circle cx="-62" cy="0" r="1.1" class="dot" />
					<circle cx="0" cy="62" r="1.1" class="dot dim" />
				</g>
				<g bind:this={r3}>
					<circle r="82" class="r r-c" />
					<circle r="82" class="r r-arc2" />
				</g>
			</svg>
			<canvas
				bind:this={canvasEl}
				width="840"
				height="840"
				role="img"
				aria-label="A satin-white cup with a glowing Thermal Halo band, levitating above a round dark dock"
			></canvas>
		</div>

		<Hud {temp} />

		<div class="copy hero" bind:this={heroEl}>
			<div class="hero-left">
				<p class="eyebrow">Levo One · Concept</p>
				<h1>A cup that floats.<br /><em>And keeps its heat.</em></h1>
			</div>
			<div class="hero-right">
				<p class="lede">
					Levo hovers above its dock, holds your drink at the exact temperature you choose, and shows it in a ring of
					light.
				</p>
				<div class="actions">
					<a class="btn btn--solid" href="#reserve">Reserve — $189</a>
					<a class="btn btn--ghost" href="#details">See how it works</a>
				</div>
			</div>
		</div>

		{#each chapters as c}
			<article class="copy chapter {c.side}">
				<span class="num">{c.num}</span>
				<h2>{c.title}</h2>
				<p>{c.text}</p>
			</article>
		{/each}

		<ol class="rail" aria-hidden="true">
			{#each railLabels as l, i}
				<li class:active={railIndex === i}><i></i><span>{l}</span></li>
			{/each}
		</ol>
	</div>
</section>

<style>
	.story {
		position: relative;
		background: var(--bg);
	}
	.stage {
		--bg: #05070b;
		--accent: #3fd0ff;
		position: relative;
		height: 100vh;
		height: 100svh;
		overflow: hidden;
		background: var(--bg);
		isolation: isolate;
	}
	.glow {
		position: absolute;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(ellipse 52% 56% at 50% 46%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 70%),
			radial-gradient(ellipse 90% 40% at 50% 100%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%);
	}
	.floor {
		position: absolute;
		z-index: 1;
		left: -60%;
		right: -60%;
		bottom: -2vh;
		height: 62vh;
		background-image:
			linear-gradient(color-mix(in srgb, var(--accent) 34%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--accent) 34%, transparent) 1px, transparent 1px);
		background-size: 90px 90px;
		transform: perspective(520px) rotateX(66deg);
		transform-origin: 50% 100%;
		-webkit-mask-image: linear-gradient(to top, #000 8%, transparent 78%);
		mask-image: linear-gradient(to top, #000 8%, transparent 78%);
		pointer-events: none;
	}
	.wordmark {
		position: absolute;
		z-index: 1;
		left: 50%;
		top: 4vh;
		transform: translateX(-50%);
		font-family: var(--display);
		font-weight: 700;
		font-size: min(36vw, 54vh);
		line-height: 0.85;
		letter-spacing: -0.04em;
		white-space: nowrap;
		color: transparent;
		-webkit-text-stroke: 1px color-mix(in srgb, var(--accent) 38%, transparent);
		user-select: none;
		pointer-events: none;
	}
	.dust {
		position: absolute;
		inset: 0;
		z-index: 3;
		opacity: 0.45;
		pointer-events: none;
	}
	.dust i {
		position: absolute;
		bottom: 8%;
		width: var(--s);
		height: var(--s);
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 10px 1px var(--accent);
		opacity: 0;
	}
	.cup {
		position: absolute;
		z-index: 4;
		left: 50%;
		top: 50%;
		width: min(94vw, 84vh);
		aspect-ratio: 1;
		pointer-events: none;
		will-change: transform;
	}
	.cup canvas {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.rings {
		position: absolute;
		inset: -22%;
		width: 144%;
		max-width: none;
		height: 144%;
		overflow: visible;
	}
	.r {
		fill: none;
		stroke: var(--accent);
		stroke-width: 0.25;
		vector-effect: non-scaling-stroke;
		stroke-width: 1;
	}
	.r-a {
		opacity: 0.35;
	}
	.r-b {
		opacity: 0.2;
		stroke-dasharray: 1 5;
	}
	.r-c {
		opacity: 0.12;
	}
	.r-arc {
		stroke-width: 2.4;
		opacity: 0.9;
		stroke-dasharray: 38 251;
		stroke-linecap: round;
	}
	.r-arc2 {
		stroke-width: 1.6;
		opacity: 0.55;
		stroke-dasharray: 90 425;
		stroke-linecap: round;
	}
	.dot {
		fill: #fff;
		filter: drop-shadow(0 0 3px var(--accent));
	}
	.dot.dim {
		opacity: 0.5;
	}

	.copy {
		position: absolute;
		z-index: 6;
	}
	.hero {
		left: var(--gutter);
		right: var(--gutter);
		bottom: max(5vh, 2.2rem);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 2rem;
	}
	.hero-left .eyebrow {
		margin-bottom: 1.1rem;
	}
	h1 {
		font-family: var(--display);
		font-weight: 500;
		font-size: clamp(2.4rem, 5vw, 5rem);
		line-height: 1;
		letter-spacing: -0.035em;
	}
	.hero-right {
		max-width: 24rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1.4rem;
	}
	.lede {
		color: var(--muted);
		font-size: 1rem;
	}
	.actions {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
	}
	.chapter {
		opacity: 0;
		width: min(27rem, 34vw);
	}
	.chapter.right {
		right: var(--gutter);
		top: 50%;
		translate: 0 -50%;
	}
	.chapter.left {
		left: calc(var(--gutter) + 1.6rem);
		top: 50%;
		translate: 0 -50%;
	}
	.chapter.center {
		left: 50%;
		bottom: max(7vh, 2.5rem);
		width: min(34rem, 86vw);
		text-align: center;
		translate: -50% 0;
	}
	.num {
		display: block;
		font-family: var(--display);
		font-size: 0.8rem;
		letter-spacing: 0.22em;
		color: var(--accent);
		margin-bottom: 0.9rem;
	}
	.chapter h2 {
		font-family: var(--display);
		font-weight: 500;
		font-size: clamp(3rem, 6.4vw, 6.2rem);
		line-height: 0.92;
		letter-spacing: -0.045em;
		margin-bottom: 1.2rem;
	}
	.chapter p {
		color: var(--muted);
		font-size: 1.02rem;
		max-width: 26rem;
	}
	.chapter.center p {
		margin-inline: auto;
	}

	.rail {
		position: absolute;
		z-index: 6;
		left: clamp(0.7rem, 1.6vw, 1.5rem);
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 1.05rem;
	}
	.rail li {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-family: var(--display);
		font-size: 0.64rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
		opacity: 0.5;
		transition: opacity 0.4s;
	}
	.rail i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		transition:
			background 0.4s,
			transform 0.4s var(--ease);
	}
	.rail span {
		opacity: 0;
		transform: translateX(-6px);
		transition:
			opacity 0.4s,
			transform 0.5s var(--ease);
	}
	.rail li.active {
		opacity: 1;
		color: var(--accent);
	}
	.rail li.active i {
		background: currentColor;
		transform: scale(1.5);
		box-shadow: 0 0 10px currentColor;
	}
	.rail li.active span {
		opacity: 1;
		transform: none;
	}

	/* reduced motion: no pin, stacked layout */
	.stage.static {
		height: auto;
		min-height: 100svh;
		padding: 6rem var(--gutter) 3rem;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}
	.stage.static .cup,
	.stage.static .copy {
		position: relative;
		inset: auto;
		left: auto;
		right: auto;
		top: auto;
		bottom: auto;
		translate: none;
		width: auto;
		opacity: 1;
	}
	.stage.static .cup {
		margin: 0 auto;
		width: min(90vw, 34rem);
	}
	.stage.static .rail,
	.stage.static .floor,
	.stage.static .wordmark {
		display: none;
	}

	@media (max-width: 860px) {
		.hero {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.1rem;
		}
		h1 {
			font-size: clamp(2.1rem, 9.6vw, 3.2rem);
		}
		.hero-right {
			max-width: none;
			gap: 1rem;
		}
		.lede {
			font-size: 0.95rem;
		}
		.hero-left .eyebrow {
			margin-bottom: 0.8rem;
		}
		.cup {
			width: min(120vw, 60vh);
		}
		.wordmark {
			font-size: 40vw;
			top: 10vh;
		}
		.chapter,
		.chapter.right,
		.chapter.left,
		.chapter.center {
			left: var(--gutter);
			right: var(--gutter);
			top: auto;
			bottom: max(6vh, 1.8rem);
			width: auto;
			translate: none;
			text-align: left;
		}
		.chapter.center p {
			margin-inline: 0;
		}
		.chapter h2 {
			font-size: clamp(2.8rem, 14vw, 4.2rem);
			margin-bottom: 0.7rem;
		}
		.chapter p {
			max-width: none;
			font-size: 0.96rem;
		}
		.rail {
			display: none;
		}
	}
</style>
