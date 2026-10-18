/** Mounts the React Three Fiber scene into a DOM node (a React island inside the Svelte page). */
export async function mountLevo(container, rig, { onProgress = () => {}, onReady = () => {} } = {}) {
	onProgress(0.08);
	const [{ createElement }, { createRoot }] = await Promise.all([import('react'), import('react-dom/client')]);
	onProgress(0.35);
	const { default: LevoCanvas } = await import('./LevoCanvas.jsx');
	onProgress(0.8);

	const root = createRoot(container);
	const render = (active) => root.render(createElement(LevoCanvas, { rig, active, onReady: () => (onProgress(1), onReady()) }));
	render(true);
	return { setActive: render, dispose: () => root.unmount() };
}
