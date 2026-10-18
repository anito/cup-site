<script>
	import Preloader from '$lib/components/Preloader.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Stage from '$lib/components/Stage.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import Features from '$lib/components/Features.svelte';
	import Specs from '$lib/components/Specs.svelte';
	import Reserve from '$lib/components/Reserve.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let progress = $state(0);
	let ready = $state(false);
</script>

<Preloader {progress} done={ready} />
<Nav />

<main id="top">
	<Stage onprogress={(p) => (progress = p)} onready={() => (ready = true)} />
	<Marquee />
	<Features />
	<Specs />
	<Reserve />
</main>
<Footer />

<noscript>
	<style>
		:global(.preloader) {
			display: none !important;
		}
	</style>
</noscript>
