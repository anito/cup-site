<script>
	import { asset } from '$app/paths';
	import { reveal } from '$lib/actions.js';

	const features = [
		{
			title: 'The Thermal Halo',
			text: 'A recessed band of light that shifts from cyan to amber with the temperature of your drink. Twelve sensors read it, so the colour is always true.',
			x: 48,
			y: 46
		},
		{
			title: 'Glowing lip',
			text: 'A hair-thin line of light traces the rim while Levo is holding your temperature, and fades the moment you lift it away.',
			x: 30,
			y: 13
		},
		{
			title: 'Levitation dock',
			text: 'Six millimetres of magnetic field. The cup floats, turns freely and re-centres itself. The dock charges it wirelessly.',
			x: 50,
			y: 80
		},
		{
			title: 'Induction liner',
			text: 'Double-wall brushed steel. Heat is induced in the liner itself, so the drink warms evenly with no hot spots and no cord.',
			x: 55,
			y: 10
		}
	];
	let active = $state(0);
</script>

<section class="details" id="details">
	<div class="head reveal" use:reveal>
		<p class="eyebrow">Anatomy</p>
		<h2>Simple on the outside. <em>Clever underneath.</em></h2>
	</div>

	<div class="grid">
		<figure class="fig reveal" use:reveal>
			<img src={asset("/hero-2000.webp")} width="1400" height="1400" loading="lazy" alt="Close render of the Levo cup showing the Thermal Halo band, glowing lip, steel liner and levitation dock" />
			{#each features as f, i}
				<button
					class="hotspot"
					class:active={active === i}
					style:left="{f.x}%"
					style:top="{f.y}%"
					aria-label={f.title}
					onpointerenter={() => (active = i)}
					onfocus={() => (active = i)}
					onclick={() => (active = i)}><span></span></button
				>
			{/each}
		</figure>

		<ul class="list reveal" use:reveal={150}>
			{#each features as f, i}
				<li class:active={active === i} onpointerenter={() => (active = i)}>
					<button type="button" onclick={() => (active = i)}>
						<h3>{f.title}</h3>
						<p>{f.text}</p>
					</button>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.details {
		padding: clamp(5rem, 12vw, 10rem) var(--gutter);
		background: var(--bg);
	}
	.head {
		max-width: 62rem;
		margin: 0 auto clamp(2.5rem, 6vw, 5rem);
	}
	h2 {
		font-family: var(--display);
		font-weight: 500;
		font-size: clamp(2.3rem, 5.4vw, 5rem);
		line-height: 1;
		letter-spacing: -0.04em;
		margin-top: 1.2rem;
	}
	.grid {
		max-width: 76rem;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: clamp(2rem, 6vw, 6rem);
		align-items: center;
	}
	.fig {
		position: relative;
		aspect-ratio: 1;
		border-radius: 2rem;
		overflow: hidden;
		border: 1px solid var(--line);
		background:
			radial-gradient(circle at 50% 45%, rgba(63, 208, 255, 0.2), transparent 62%),
			linear-gradient(160deg, #0d1320, #06080e);
	}
	.fig img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.hotspot {
		position: absolute;
		width: 2.6rem;
		height: 2.6rem;
		margin: -1.3rem 0 0 -1.3rem;
		border: 0;
		background: none;
		padding: 0;
		cursor: pointer;
		display: grid;
		place-items: center;
	}
	.hotspot span {
		position: relative;
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: var(--ink);
		box-shadow: 0 0 0 2px rgba(5, 7, 11, 0.85);
		transition:
			transform 0.4s var(--ease),
			background 0.3s;
	}
	.hotspot span::after {
		content: '';
		position: absolute;
		inset: -9px;
		border-radius: 50%;
		border: 1.5px solid var(--ink);
		animation: ping 2.2s ease-out infinite;
	}
	.hotspot.active span {
		background: var(--cyan);
		transform: scale(1.35);
		box-shadow:
			0 0 0 2px rgba(5, 7, 11, 0.85),
			0 0 18px var(--cyan);
	}
	@keyframes ping {
		from {
			transform: scale(0.55);
			opacity: 0.9;
		}
		to {
			transform: scale(1.5);
			opacity: 0;
		}
	}
	.list li {
		border-left: 1px solid var(--line);
		opacity: 0.42;
		transition:
			opacity 0.4s,
			border-color 0.4s;
	}
	.list li.active {
		opacity: 1;
		border-color: var(--cyan);
	}
	.list button {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: 0;
		cursor: pointer;
		padding: 1.4rem 0 1.4rem 1.6rem;
	}
	h3 {
		font-family: var(--display);
		font-weight: 500;
		font-size: 1.55rem;
		letter-spacing: -0.02em;
		margin-bottom: 0.5rem;
	}
	.list p {
		color: var(--muted);
		max-width: 30rem;
	}
	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hotspot span::after {
			animation: none;
		}
	}
</style>
