import styles from './Footer.module.css';

export default function Footer() {
	return (
		<footer className={styles.footer}>
			<div className={styles.big} aria-hidden="true">
				LEVO
			</div>
			<div className={styles.row}>
				<p>© 2026 Levo. A concept product — all details are illustrative.</p>
				<p>
					<a href="#top">Back to top ↑</a>
				</p>
			</div>
		</footer>
	);
}
