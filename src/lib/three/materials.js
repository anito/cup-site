import {
	AdditiveBlending,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	DoubleSide
} from 'three';
import { PRINT, labelTexture, latheLinesTexture, dockGlowTexture, verticalGlowTexture, linear } from './geometry.js';

/* shared GLSL: map a local (object-space) position onto the label, so the label stays
   a constant width on the tapered body and has no UV seam */
const LABEL_DECL = /* glsl */ `
varying vec3 vLocal;
uniform sampler2D uLabel;
float labelAlpha(vec3 p){
	float a = atan(-p.z, p.x) - ${PRINT.center.toFixed(6)};
	a -= 6.283185307 * floor((a + 3.141592654) / 6.283185307);
	float u = a * length(p.xz) / ${PRINT.arc.toFixed(5)} + 0.5;
	float v = (p.y - ${PRINT.y0.toFixed(5)}) / ${(PRINT.y1 - PRINT.y0).toFixed(5)};
	// the label only spans about +-0.6 rad; masking the rest hides the mip-selection glitch at the atan wrap
	return texture2D(uLabel, vec2(u, v)).a * step(abs(a), 1.2);
}
`;

function withLabel(material, tex, inject) {
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uLabel = { value: tex };
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
		shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + LABEL_DECL);
		inject(shader);
	};
	material.customProgramCacheKey = () => 'levo-label-' + inject.name;
	return material;
}

export function createMaterials() {
	const label = labelTexture();
	const lines = latheLinesTexture();

	/* anodised champagne titanium; the smoked label is matte black and barely reflective */
	const shell = withLabel(
		new MeshPhysicalMaterial({
			color: linear(0.8, 0.66, 0.49),
			metalness: 1,
			roughness: 0.44,
			anisotropy: 0.6,
			bumpMap: lines,
			bumpScale: 0.6,
			envMapIntensity: 2.1
		}),
		label,
		function shellInject(shader) {
			shader.fragmentShader = shader.fragmentShader
				.replace(
					'#include <color_fragment>',
					`#include <color_fragment>
					float lab = labelAlpha(vLocal) * 0.93;
					diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.004, 0.005, 0.008), lab);`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					'#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, lab);'
				)
				.replace(
					'#include <metalnessmap_fragment>',
					'#include <metalnessmap_fragment>\nmetalnessFactor *= (1.0 - lab);'
				);
		}
	);

	const liner = new MeshPhysicalMaterial({
		color: linear(0.3, 0.31, 0.34),
		metalness: 1,
		roughness: 0.3,
		envMapIntensity: 1.1
	});

	/* the Halo: emissive, dimmed (not hidden) by the label so the ring reads through it */
	const halo = withLabel(
		new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
		label,
		function haloInject(shader) {
			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <color_fragment>',
				`#include <color_fragment>
				diffuseColor.rgb *= 1.15 * (1.0 - 0.66 * labelAlpha(vLocal));`
			);
		}
	);

	const handle = new MeshPhysicalMaterial({
		color: linear(0.8, 0.66, 0.49),
		metalness: 1,
		roughness: 0.4,
		anisotropy: 0.5,
		envMapIntensity: 1.9
	});

	const drink = new MeshPhysicalMaterial({
		color: linear(0.02, 0.012, 0.01),
		roughness: 0.04,
		clearcoat: 1,
		clearcoatRoughness: 0.03
	});

	const dock = new MeshPhysicalMaterial({
		color: linear(0.012, 0.014, 0.02),
		roughness: 0.22,
		clearcoat: 0.8,
		clearcoatRoughness: 0.05,
		envMapIntensity: 2.1
	});

	const ring = new MeshBasicMaterial({ color: 0x4fd2ff, toneMapped: false });

	const additive = (opacity, extra = {}) =>
		new MeshBasicMaterial({
			vertexColors: true,
			transparent: true,
			blending: AdditiveBlending,
			depthWrite: false,
			toneMapped: false,
			opacity,
			...extra
		});
	const haloGlow = [
		additive(0.3, { alphaMap: verticalGlowTexture(), side: DoubleSide }),
		additive(0.13, { alphaMap: verticalGlowTexture(), side: DoubleSide })
	];
	const lipGlow = additive(0.22);
	const dockGlow = new MeshBasicMaterial({
		map: dockGlowTexture(),
		transparent: true,
		blending: AdditiveBlending,
		depthWrite: false,
		toneMapped: false,
		opacity: 0.9
	});

	return { shell, liner, halo, handle, drink, dock, ring, haloGlow, lipGlow, dockGlow };
}
