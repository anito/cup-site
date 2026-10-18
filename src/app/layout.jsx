import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://anito.github.io/cup-site';
const title = 'Levo — The cup that floats and keeps its heat';
const description =
	'Levo is a levitating smart cup. It hovers above a wireless dock, holds your drink at the exact temperature you choose, and shows it in a ring of light — the Thermal Halo.';

export const metadata = {
	title,
	description,
	icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
	openGraph: {
		type: 'website',
		title: 'Levo — A cup that floats. And keeps its heat.',
		description: 'Magnetic levitation, a Thermal Halo and a four-hour temperature hold. A concept product.',
		images: [`${site}/og.jpg`]
	},
	twitter: { card: 'summary_large_image' }
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#05070b' };

export default function RootLayout({ children }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
			</head>
			<body>{children}</body>
		</html>
	);
}
