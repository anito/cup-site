'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';
import { asset } from '@/lib/url';
import styles from './Reserve.module.css';

export default function Reserve() {
	const [email, setEmail] = useState('');
	const [msg, setMsg] = useState('');

	function submit(e) {
		e.preventDefault();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			setMsg('Please enter a valid email address.');
			return;
		}
		setMsg('You’re on the list — thank you. (Demo form: nothing was sent.)');
		setEmail('');
	}

	return (
		<section className={styles.reserve} id="reserve">
			<Reveal className={styles.card}>
				<div className={styles.copy}>
					<p className="eyebrow">Founders’ offer · first 500 reservations</p>
					<h2>
						Reserve your <em>Levo.</em>
					</h2>
					<p className={styles.sub}>
						Leave your email and we’ll hold a unit, with a free engraved lid and a spare leather sleeve while the offer lasts. No payment now — we’ll write when the lid-coaster is ready.
					</p>
					<form onSubmit={submit} noValidate>
						<label className="sr-only" htmlFor="email">
							Email address
						</label>
						<input
							id="email"
							type="email"
							placeholder="you@studio.com"
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
						<button className="btn btn--solid" type="submit">
							Hold a unit
						</button>
						<p className={styles.msg} role="status" aria-live="polite">
							{msg}
						</p>
					</form>
				</div>
				<div className={styles.art} aria-hidden="true">
					<div className={styles.orb} />
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={asset('/reserve.webp')} width="1000" height="1000" loading="lazy" alt="" />
				</div>
			</Reveal>
		</section>
	);
}
