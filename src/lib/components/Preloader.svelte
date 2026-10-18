<script>
	let { progress = 0, done = false } = $props();
	const pct = $derived(Math.round(progress * 100));

	$effect(() => {
		document.body.style.overflow = done ? '' : 'hidden';
		return () => (document.body.style.overflow = '');
	});
</script>

<div class="preloader" class:done role="status" aria-live="polite">
	<div class="ring">
		<svg viewBox="0 0 100 100" aria-hidden="true">
			<circle cx="50" cy="50" r="46" class="bg" />
			<circle cx="50" cy="50" r="46" class="fg" style:stroke-dashoffset={289 * (1 - progress)} />
		</svg>
		<div class="count">{pct}<i>%</i></div>
	</div>
	<p>Charging the dock</p>
</div>

<style>
	.preloader {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 2.2rem;
		background: var(--bg);
		transition:
			opacity 0.9s var(--ease),
			visibility 0.9s;
	}
	.preloader.done {
		opacity: 0;
		visibility: hidden;
	}
	.ring {
		position: relative;
		width: min(46vw, 190px);
		aspect-ratio: 1;
		display: grid;
		place-items: center;
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
		filter: drop-shadow(0 0 10px rgba(63, 208, 255, 0.55));
	}
	.bg {
		fill: none;
		stroke: var(--line);
		stroke-width: 1.5;
	}
	.fg {
		fill: none;
		stroke: var(--cyan);
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-dasharray: 289;
		transition: stroke-dashoffset 0.4s ease-out;
	}
	.count {
		font-family: var(--display);
		font-size: 2.8rem;
		font-weight: 300;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.count i {
		font-style: normal;
		font-size: 0.9rem;
		color: var(--muted);
		margin-left: 0.15em;
	}
	p {
		font-family: var(--display);
		font-size: 0.7rem;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
