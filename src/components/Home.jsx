'use client';

import { useCallback, useState } from 'react';
import Preloader from './Preloader';
import Nav from './Nav';
import Stage from './Stage';
import Marquee from './Marquee';
import Promo from './Promo';
import Features from './Features';
import Specs from './Specs';
import Reserve from './Reserve';
import Footer from './Footer';
import Steam from './Steam';

/* page-wide steam behind the sections below the pinned story; idle while the story covers it */
const belowStory = () => (document.querySelector('[data-marquee]')?.getBoundingClientRect().top ?? 0) > innerHeight;

export default function Home() {
	const [progress, setProgress] = useState(0);
	const [ready, setReady] = useState(false);
	const onProgress = useCallback((p) => setProgress(p), []);
	const onReady = useCallback(() => setReady(true), []);

	return (
		<>
			<Preloader progress={progress} done={ready} />
			<Steam fixed intensity={0.16} skip={belowStory} />
			<Nav />
			<main id="top">
				<Stage onProgress={onProgress} onReady={onReady} />
				<Marquee />
				<Promo />
				<Features />
				<Specs />
				<Reserve />
			</main>
			<Footer />
		</>
	);
}
