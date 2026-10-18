'use client';

import { getMotion } from '@/lib/motion';
import styles from './Nav.module.css';

async function go(e, id) {
	const target = id === '#top' ? 0 : document.querySelector(id);
	if (target === null) return;
	e.preventDefault();
	const { lenis } = await getMotion();
	if (lenis) lenis.scrollTo(target, { duration: 1.8 });
	else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: 'smooth' });
}

export default function Nav() {
	return (
		<header className={styles.nav}>
			<a className={styles.logo} href="#top" aria-label="Levo — home" onClick={(e) => go(e, '#top')}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="9" fill="none" stroke="var(--cyan)" strokeWidth="1.6" />
					<path d="M12 3a9 9 0 0 1 0 18" fill="none" stroke="var(--amber)" strokeWidth="1.6" />
					<circle cx="12" cy="12" r="2.4" fill="currentColor" />
				</svg>
				<span>Levo</span>
			</a>
			<nav className={styles.links} aria-label="Primary">
				<a href="#story" onClick={(e) => go(e, '#story')}>Technology</a>
				<a href="#details" onClick={(e) => go(e, '#details')}>Details</a>
				<a href="#specs" onClick={(e) => go(e, '#specs')}>Specs</a>
			</nav>
			<a className={`btn btn--solid ${styles.cta}`} href="#reserve" onClick={(e) => go(e, '#reserve')}>
				Reserve <span aria-hidden="true">→</span>
			</a>
		</header>
	);
}
