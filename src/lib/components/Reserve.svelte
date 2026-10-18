<script>
	import { asset } from '$app/paths';
	import { reveal } from '$lib/actions.js';

	let email = $state('');
	let msg = $state('');

	function submit(e) {
		e.preventDefault();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			msg = 'Please enter a valid email address.';
			return;
		}
		msg = 'You’re on the list — thank you. (Demo form: nothing was sent.)';
		email = '';
	}
</script>

<section class="reserve" id="reserve">
	<div class="card reveal" use:reveal>
		<div class="copy">
			<p class="eyebrow">First production run · autumn</p>
			<h2>Reserve your <em>Levo.</em></h2>
			<p class="sub">Leave your email and we’ll hold a unit for you. No payment now — we’ll write when the dock is ready.</p>
			<form onsubmit={submit} novalidate>
				<label class="sr-only" for="email">Email address</label>
				<input id="email" type="email" placeholder="you@studio.com" autocomplete="email" bind:value={email} required />
				<button class="btn btn--solid" type="submit">Hold a unit</button>
				<p class="msg" role="status" aria-live="polite">{msg}</p>
			</form>
		</div>
		<div class="art" aria-hidden="true">
			<div class="orb"></div>
			<img src={asset("/hero-2000.webp")} width="1000" height="1000" loading="lazy" alt="" />
		</div>
	</div>
</section>

<style>
	.reserve {
		padding: clamp(3rem, 6vw, 5rem) var(--gutter) clamp(5rem, 10vw, 8rem);
		background: var(--bg);
	}
	.card {
		position: relative;
		overflow: hidden;
		max-width: 80rem;
		margin: 0 auto;
		border-radius: clamp(1.6rem, 3vw, 3rem);
		border: 1px solid var(--line);
		background: linear-gradient(135deg, #0c1220, #070a12 60%);
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		align-items: center;
		min-height: 33rem;
	}
	.copy {
		position: relative;
		z-index: 2;
		padding: clamp(2rem, 5vw, 4.5rem);
	}
	h2 {
		font-family: var(--display);
		font-weight: 500;
		font-size: clamp(2.3rem, 5vw, 4.6rem);
		line-height: 1;
		letter-spacing: -0.04em;
		margin-top: 1.1rem;
	}
	.sub {
		margin: 1.4rem 0 2rem;
		max-width: 28rem;
		color: var(--muted);
	}
	form {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		max-width: 30rem;
	}
	input {
		flex: 1 1 14rem;
		min-width: 0;
		padding: 0.95em 1.4em;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: rgba(233, 238, 247, 0.05);
		font-size: 0.95rem;
		transition:
			border-color 0.3s,
			background 0.3s,
			box-shadow 0.3s;
	}
	input::placeholder {
		color: var(--muted);
	}
	input:focus {
		outline: none;
		border-color: var(--cyan);
		box-shadow: 0 0 0 3px rgba(63, 208, 255, 0.18);
	}
	.msg {
		flex-basis: 100%;
		min-height: 1.5em;
		font-size: 0.9rem;
		color: var(--cyan);
	}
	.art {
		position: relative;
		align-self: stretch;
		min-height: 22rem;
	}
	.orb {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 92%;
		aspect-ratio: 1;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: radial-gradient(circle, rgba(63, 208, 255, 0.28), transparent 68%);
	}
	.art img {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 104%;
		max-width: none;
		transform: translate(-50%, -50%);
	}
	@media (max-width: 860px) {
		.card {
			grid-template-columns: 1fr;
		}
		.art {
			min-height: 19rem;
			order: -1;
		}
		.art img {
			width: 90%;
		}
	}
</style>
