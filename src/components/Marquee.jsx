import { Fragment } from 'react';
import styles from './Marquee.module.css';

const items = ['Lid + coaster in one', 'Commute Mode', 'Desk Mode', 'Magnetic levitation', 'Thermal Halo', '4-hour hold', 'Leather sleeve'];

export default function Marquee() {
	return (
		<div className={styles.marquee} data-marquee aria-hidden="true">
			<div className={styles.track}>
				{[0, 1].map((k) =>
					items.map((t) => (
						<Fragment key={`${k}-${t}`}>
							<span>{t}</span>
							<b>◦</b>
						</Fragment>
					))
				)}
			</div>
		</div>
	);
}
