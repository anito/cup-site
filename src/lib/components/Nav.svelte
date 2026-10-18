<script>
	import { getMotion } from '$lib/motion.js';

	async function go(e, id) {
		const target = id === '#top' ? 0 : document.querySelector(id);
		if (target === null) return;
		e.preventDefault();
		const { lenis } = await getMotion();
		if (lenis) lenis.scrollTo(target, { duration: 1.8 });
		else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: 'smooth' });
	}
</script>

<header class="nav">
	<a class="logo" href="#top" aria-label="Levo — home" onclick={(e) => go(e, '#top')}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="9" fill="none" stroke="var(--cyan)" stroke-width="1.6" />
			<path d="M12 3a9 9 0 0 1 0 18" fill="none" stroke="var(--amber)" stroke-width="1.6" />
			<circle cx="12" cy="12" r="2.4" fill="currentColor" />
		</svg>
		<span>Levo</span>
	</a>
	<nav aria-label="Primary">
		<a href="#story" onclick={(e) => go(e, '#story')}>Technology</a>
		<a href="#details" onclick={(e) => go(e, '#details')}>Details</a>
		<a href="#specs" onclick={(e) => go(e, '#specs')}>Specs</a>
	</nav>
	<a class="btn btn--solid cta" href="#reserve" onclick={(e) => go(e, '#reserve')}>Reserve <span aria-hidden="true">→</span></a>
</header>

<style>
	.nav {
		position: fixed;
		z-index: 50;
		inset: 0 0 auto 0;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 1.1rem var(--gutter);
	}
	.nav::before {
		content: '';
		position: absolute;
		inset: 0 0 -1.4rem;
		z-index: -1;
		background: rgba(5, 7, 11, 0.4);
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
		-webkit-mask-image: linear-gradient(#000 55%, transparent);
		mask-image: linear-gradient(#000 55%, transparent);
	}
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--display);
		font-size: 1.35rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.logo svg {
		width: 1.55rem;
		height: 1.55rem;
	}
	nav {
		display: flex;
		gap: 2.2rem;
		font-family: var(--display);
		font-size: 0.86rem;
		font-weight: 500;
		letter-spacing: 0.04em;
	}
	nav a {
		position: relative;
		color: var(--muted);
		transition: color 0.3s;
	}
	nav a:hover {
		color: var(--ink);
	}
	.cta {
		justify-self: end;
		padding: 0.65em 1.2em;
		font-size: 0.82rem;
	}
	@media (max-width: 860px) {
		.nav {
			grid-template-columns: 1fr auto;
		}
		nav {
			display: none;
		}
	}
</style>
