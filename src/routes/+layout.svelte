<script>
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/inter';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Levo — The cup that floats and keeps its heat</title>
	<meta
		name="description"
		content="Levo is a levitating smart cup. It hovers above a wireless dock, holds your drink at the exact temperature you choose, and shows it in a ring of light — the Thermal Halo."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Levo — A cup that floats. And keeps its heat." />
	<meta property="og:description" content="Magnetic levitation, a Thermal Halo and a four-hour temperature hold. A concept product." />
	<meta property="og:image" content="/og.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
