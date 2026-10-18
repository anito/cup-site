<script>
	import { reveal, countUp } from '$lib/actions.js';

	const stats = [
		{ label: 'Float height', value: 6, unit: 'mm', note: 'A magnetic cushion between cup and dock.' },
		{ label: 'Hold time', value: 4, unit: 'hours', note: 'Within one degree of your setpoint.' },
		{ label: 'Max temperature', value: 80, unit: '°C', note: 'Adjustable from 20 °C in one-degree steps.' },
		{ label: 'Sensors', value: 12, unit: 'points', note: 'Ring-mounted, reading the liner continuously.' }
	];
	const notes = ['USB-C dock, 15 W', 'Cup is dishwasher-safe', '2-year warranty'];
</script>

<section class="specs" id="specs">
	<div class="head reveal" use:reveal>
		<p class="eyebrow">Specs</p>
		<h2>Small numbers. <em>Big difference.</em></h2>
	</div>
	<dl class="grid">
		{#each stats as s, i}
			<div class="stat reveal" use:reveal={i * 90}>
				<dt>{s.label}</dt>
				<dd><b use:countUp={s.value}>{s.value}</b><small>{s.unit}</small></dd>
				<p>{s.note}</p>
			</div>
		{/each}
	</dl>
	<ul class="notes reveal" use:reveal>
		{#each notes as n}<li>{n}</li>{/each}
	</ul>
</section>

<style>
	.specs {
		padding: clamp(5rem, 12vw, 10rem) var(--gutter);
		background: rgba(10, 14, 22, 0.62);
		border-block: 1px solid var(--line);
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
		grid-template-columns: repeat(4, 1fr);
		gap: clamp(1rem, 2.5vw, 2rem);
	}
	.stat {
		padding-top: 1.4rem;
		border-top: 1px solid var(--ink);
	}
	dt {
		font-family: var(--display);
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--muted);
	}
	dd {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		margin: 0.9rem 0 0.6rem;
		font-family: var(--display);
	}
	b {
		font-weight: 300;
		font-size: clamp(3.2rem, 6.4vw, 6rem);
		line-height: 1;
		letter-spacing: -0.05em;
		font-variant-numeric: tabular-nums;
	}
	small {
		font-size: 0.9rem;
		color: var(--cyan);
	}
	.stat p {
		color: var(--muted);
		font-size: 0.93rem;
		max-width: 15rem;
	}
	.notes {
		max-width: 76rem;
		margin: clamp(2.5rem, 5vw, 4rem) auto 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}
	.notes li {
		padding: 0.6em 1.15em;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 0.86rem;
		color: var(--muted);
	}
	@media (max-width: 860px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
			row-gap: 2.5rem;
		}
	}
</style>
