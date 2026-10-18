import { Reveal, CountUp } from './Reveal';
import styles from './Specs.module.css';

const stats = [
	{ label: 'Float height', value: 6, unit: 'mm', note: 'A magnetic cushion between cup and lid-coaster.' },
	{ label: 'Hold time', value: 4, unit: 'hours', note: 'Within one degree of your setpoint.' },
	{ label: 'Max temperature', value: 80, unit: '°C', note: 'Adjustable from 20 °C in one-degree steps.' },
	{ label: 'Parts', value: 2, unit: 'pieces', note: 'A cup, and a lid that is also the coaster.' }
];
const notes = ['Lid-coaster charges over USB-C, 15 W', 'Cup is dishwasher-safe', 'Fits 98% of car cup holders*', '2-year warranty'];

export default function Specs() {
	return (
		<section className={styles.specs} id="specs">
			<Reveal className={styles.head}>
				<p className="eyebrow">Specs</p>
				<h2>
					Small numbers. <em>Big difference.</em>
				</h2>
			</Reveal>
			<dl className={styles.grid}>
				{stats.map((s, i) => (
					<Reveal key={s.label} delay={i * 90} className={styles.stat}>
						<dt>{s.label}</dt>
						<dd>
							<CountUp to={s.value} />
							<small>{s.unit}</small>
						</dd>
						<p>{s.note}</p>
					</Reveal>
				))}
			</dl>
			<Reveal as="ul" className={styles.notes}>
				{notes.map((n) => (
					<li key={n}>{n}</li>
				))}
			</Reveal>
		</section>
	);
}
