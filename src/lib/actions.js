/** Fade/slide an element in the first time it scrolls into view. */
export function reveal(node, delay = 0) {
	if (!('IntersectionObserver' in window)) {
		node.classList.add('in');
		return;
	}
	const io = new IntersectionObserver(
		([e]) => {
			if (!e.isIntersecting) return;
			setTimeout(() => node.classList.add('in'), delay);
			io.disconnect();
		},
		{ rootMargin: '0px 0px -10% 0px' }
	);
	io.observe(node);
	return { destroy: () => io.disconnect() };
}

/** Count a number up to `to` when it first scrolls into view. */
export function countUp(node, to) {
	const fmt = (v) => Math.round(v).toLocaleString('en-US');
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	node.textContent = reduce ? fmt(to) : '0';
	if (reduce) return;
	const io = new IntersectionObserver(
		([e]) => {
			if (!e.isIntersecting) return;
			io.disconnect();
			const t0 = performance.now();
			const dur = 1600;
			const tick = (t) => {
				const k = Math.min(1, (t - t0) / dur);
				node.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
				if (k < 1) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		},
		{ threshold: 0.6 }
	);
	io.observe(node);
	return { destroy: () => io.disconnect() };
}
