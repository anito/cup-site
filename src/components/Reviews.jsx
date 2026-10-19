import { Fragment } from 'react';
import styles from './Reviews.module.css';

const ROW_A = [
	['“My coffee has never been so stable.”', 'A. Barista, probably'],
	['“I asked it to hold 64 °C. It held 64 °C. I wept.”', 'Someone with a spreadsheet'],
	['“Finally, a cup with a better sleep schedule than me.”', 'Tired, N.'],
	['“The coaster is also the lid. I am still processing this.”', 'Kim, 34'],
	['“Gerald does good work.”', 'Leather enthusiast']
];
const ROW_B = [
	['“It floats. I do not know why I needed that. I need it.”', 'Desk person'],
	['“Eight out of ten cats approve.”', 'The Cat Board'],
	['“Glows at night. My tea feels seen.”', 'Pat'],
	['“Sat on my desk, now my desk feels expensive.”', 'M., design lead'],
	['“Would float again.”', 'Everyone, eventually']
];

const Row = ({ items, rev }) => (
	<div className={`${styles.row} ${rev ? styles.rev : ''}`}>
		<div className={styles.track}>
			{[0, 1].map((k) => (
				<Fragment key={k}>
					{items.map(([q, who]) => (
						<figure key={k + q} className={styles.card}>
							<blockquote>{q}</blockquote>
							<figcaption>— {who}</figcaption>
						</figure>
					))}
				</Fragment>
			))}
		</div>
	</div>
);

export default function Reviews() {
	return (
		<section className={styles.reviews} aria-label="What people say (fictional)">
			<p className={`eyebrow ${styles.eyebrow}`}>Reviews we made up with love</p>
			<Row items={ROW_A} />
			<Row items={ROW_B} rev />
		</section>
	);
}
