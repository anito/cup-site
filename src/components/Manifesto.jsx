'use client';

import { useEffect, useRef } from 'react';
import { getMotion } from '@/lib/motion';
import styles from './Manifesto.module.css';

const TEXT =
	'We built a cup that floats, remembers your temperature and flips its own lid into a coaster. It did not ask to be this smart. It just wanted to keep your coffee warm and its feelings private.';

/* a paragraph that lights up word by word as you scroll through it */
export default function Manifesto() {
	const ref = useRef(null);

	useEffect(() => {
		let trigger;
		let ctx;
		(async () => {
			const { gsap, ScrollTrigger, reduce } = await getMotion();
			if (reduce || !ref.current) return;
			ctx = gsap.context(() => {
				const words = ref.current.querySelectorAll('[data-w]');
				gsap.set(words, { opacity: 0.14, y: 12, filter: 'blur(5px)' });
				trigger = gsap.to(words, {
					opacity: 1,
					y: 0,
					filter: 'blur(0px)',
					ease: 'none',
					stagger: 0.12,
					scrollTrigger: { trigger: ref.current, start: 'top 78%', end: 'bottom 38%', scrub: 0.6 }
				});
			}, ref);
			ScrollTrigger.refresh();
		})();
		return () => {
			trigger?.scrollTrigger?.kill();
			ctx?.revert();
		};
	}, []);

	return (
		<section className={styles.manifesto} aria-label="Manifesto">
			<p ref={ref} className={styles.text}>
				{TEXT.split(' ').map((w, i) => (
					<span key={i} data-w className={styles.w}>
						{w}
					</span>
				))}
			</p>
		</section>
	);
}
