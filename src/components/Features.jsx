'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';
import { asset } from '@/lib/url';
import styles from './Features.module.css';

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
		title: 'The lid is the coaster',
		text: 'Press-fit lid on top for the commute; flip it and its glass face becomes a wireless coaster with six millimetres of magnetic float. One part, two jobs.',
		x: 50,
		y: 80
	},
	{
		title: 'Cognac leather sleeve',
		text: 'Five fine grooves are cut into a hand-stitched leather sleeve. Where the leather is thin it turns translucent, so the Levo lettering on the cup glows through between the ridges. It keeps the cup comfortable at 65 °C and replaces the handle.',
		x: 36,
		y: 30
	},
	{
		title: 'Induction liner',
		text: 'Double-wall brushed steel. Heat is induced in the liner itself, so the drink warms evenly with no hot spots and no cord.',
		x: 55,
		y: 10
	}
];

export default function Features() {
	const [active, setActive] = useState(0);
	return (
		<section className={styles.details} id="details">
			<Reveal className={styles.head}>
				<p className="eyebrow">Anatomy</p>
				<h2>
					Simple on the outside. <em>Clever underneath.</em>
				</h2>
			</Reveal>

			<div className={styles.grid}>
				<Reveal as="figure" className={styles.fig}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={asset('/hero-2000.webp')}
						width="1400"
						height="1400"
						loading="lazy"
						alt="Close render of the Levo takeaway cup showing the Thermal Halo band, glowing lip, leather sleeve, steel liner and the flipped lid acting as a levitating coaster"
					/>
					{features.map((f, i) => (
						<button
							key={f.title}
							className={`${styles.hotspot} ${active === i ? styles.active : ''}`}
							style={{ left: `${f.x}%`, top: `${f.y}%` }}
							aria-label={f.title}
							onPointerEnter={() => setActive(i)}
							onFocus={() => setActive(i)}
							onClick={() => setActive(i)}
						>
							<span />
						</button>
					))}
				</Reveal>

				<Reveal as="ul" delay={150} className={styles.list}>
					{features.map((f, i) => (
						<li key={f.title} className={active === i ? styles.active : ''} onPointerEnter={() => setActive(i)}>
							<button type="button" onClick={() => setActive(i)}>
								<h3>{f.title}</h3>
								<p>{f.text}</p>
							</button>
						</li>
					))}
				</Reveal>
			</div>
		</section>
	);
}
