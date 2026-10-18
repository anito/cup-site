import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig } from 'vite';

export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	plugins: [
		sveltekit({
			adapter: adapter(),
			alias: { $lib: 'src/lib' }
		})
	]
});
