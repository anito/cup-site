import { Reveal } from './Reveal';
import styles from './Promo.module.css';

const LidIcon = () => (
	<svg viewBox="0 0 64 64" aria-hidden="true">
		<ellipse cx="32" cy="38" rx="26" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />
		<path d="M14 36c0-10 8-16 18-16s18 6 18 16" fill="none" stroke="currentColor" strokeWidth="2" />
		<ellipse cx="32" cy="22" rx="11" ry="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
		<path d="M38 22l5 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
	</svg>
);
const CoasterIcon = () => (
	<svg viewBox="0 0 64 64" aria-hidden="true">
		<ellipse cx="32" cy="44" rx="26" ry="9" fill="none" stroke="currentColor" strokeWidth="2" />
		<ellipse cx="32" cy="43" rx="14" ry="4.5" fill="none" stroke="var(--cyan)" strokeWidth="2.4" />
		<path d="M20 30l1-12h22l1 12c0 3-5 5-12 5s-12-2-12-5z" fill="none" stroke="currentColor" strokeWidth="2" />
		<path d="M26 8v4M32 5v5M38 8v4" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
	</svg>
);

export default function Promo() {
	return (
		<section className={styles.promo} id="promo">
			<Reveal className={styles.head}>
				<p className="eyebrow">Two products. One part.</p>
				<h2>
					Lid on. Lid off. <em>Same lid.</em>
				</h2>
			</Reveal>

			<div className={styles.grid}>
				<Reveal as="article" className={styles.card}>
					<div className={styles.tag}>
						<LidIcon />
						<span>Lid on · Commute Mode</span>
					</div>
					<p className={styles.stat}>
						98<small>%</small>
					</p>
					<p className={styles.claim}>of car cup holders*</p>
					<p className={styles.copy}>
						Press it on and it seals: no drips, no slosh, four hours of heat. The sip slot is sized for one calm
						mouthful and one very unbothered commute.
					</p>
					<p className={styles.fine}>*of the ones we tried. Results may vary, as may cup holders.</p>
				</Reveal>

				<Reveal as="article" className={styles.card} delay={120}>
					<div className={styles.tag}>
						<CoasterIcon />
						<span>Lid off · Desk Mode</span>
					</div>
					<p className={styles.stat}>
						15<small>W</small>
					</p>
					<p className={styles.claim}>wireless, zero cables</p>
					<p className={styles.copy}>
						Flip it and the lid softens into a flat leather coaster that charges and levitates your cup. It replaces your coaster
						drawer, your trivet and that one coaster that never quite fit.
					</p>
					<p className={styles.fine}>Coaster drawer not included, because you will no longer need it.</p>
				</Reveal>
			</div>

			<Reveal className={styles.offer}>
				<div>
					<p className={styles.ribbon}>Founders’ offer · first 500 reservations</p>
					<h3>
						A free engraved lid <em>and</em> a spare leather sleeve.
					</h3>
					<p>Your name, a date or a tiny inside joke on the sip deck. Reserve before the kiln cools. (We do not have a kiln.)</p>
				</div>
				<a className="btn btn--solid" href="#reserve">
					Claim the offer <span aria-hidden="true">→</span>
				</a>
			</Reveal>
		</section>
	);
}
