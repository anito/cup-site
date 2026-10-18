import {
	AdditiveBlending,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	DoubleSide
} from 'three';
import {
	BRAND,
	PRINT,
	SLEEVE,
	brandTexture,
	labelTexture,
	latheLinesTexture,
	leatherGrainTexture,
	dockGlowTexture,
	verticalGlowTexture,
	linear
} from './geometry.js';

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

	/* cognac full-grain leather: grooves make it translucent where thin (the cup's label shows through), a hand-stitched seam sits at the
	   old handle position and the brand is debossed on the back */
	const brand = brandTexture();
	const sleeve = withLabel(
		new MeshPhysicalMaterial({
			color: linear(0.22, 0.08, 0.03),
			roughness: 0.55,
			metalness: 0,
			transparent: true,
			bumpMap: leatherGrainTexture(),
			bumpScale: 1.2,
			clearcoat: 0.06,
			clearcoatRoughness: 0.3,
			sheen: 0.4,
			sheenRoughness: 0.5,
			sheenColor: linear(0.5, 0.25, 0.12),
			envMapIntensity: 1.2
		}),
		label,
		function sleeveInject(shader) {
			shader.uniforms.uBrand = { value: brand };
			shader.fragmentShader = shader.fragmentShader
				.replace(
					'#include <common>',
					`#include <common>
					uniform sampler2D uBrand;
					float brandAlpha(vec3 p){
						float a = atan(-p.z, p.x) - ${(PRINT.center + Math.PI).toFixed(6)};
						a -= 6.283185307 * floor((a + 3.141592654) / 6.283185307);
						float u = a * length(p.xz) / ${BRAND.arc.toFixed(3)} + 0.5;
						float v = (p.y - ${BRAND.y.toFixed(3)}) / ${BRAND.height.toFixed(3)} + 0.5;
						return texture2D(uBrand, vec2(u, v)).a * step(abs(a), 1.0);
					}`
				)
				.replace(
					'#include <color_fragment>',
					`#include <color_fragment>
					// leather thickness from the object-space radius; thin leather (the grooves) lets the label show through
					float tt = length(vLocal.xz) - (${SLEEVE.wallR0.toFixed(4)} + ${SLEEVE.wallSlope.toFixed(4)} * (vLocal.y - 0.078)) - 0.0015;
					diffuseColor.a *= mix(0.2, 1.0, smoothstep(0.009, 0.0165, tt));
					diffuseColor.rgb *= 1.0 - 0.7 * brandAlpha(vLocal);
					float ang = atan(-vLocal.z, vLocal.x);
					float seam = smoothstep(0.0065, 0.0035, abs(ang) * length(vLocal.xz));
					float dash = step(0.5, fract(vLocal.y * 55.0));
					diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.5, 0.3), seam * dash * 0.9);`
				);
		}
	);

	const drink = new MeshPhysicalMaterial({
		color: linear(0.02, 0.012, 0.01),
		roughness: 0.04,
		clearcoat: 1,
		clearcoatRoughness: 0.03
	});

	/* the lid: the same cognac leather as the sleeve (opaque) */
	const lid = new MeshPhysicalMaterial({
		color: linear(0.22, 0.08, 0.03),
		roughness: 0.55,
		metalness: 0,
		bumpMap: leatherGrainTexture(),
		bumpScale: 1.2,
		clearcoat: 0.06,
		clearcoatRoughness: 0.3,
		sheen: 0.4,
		sheenRoughness: 0.5,
		sheenColor: linear(0.5, 0.25, 0.12),
		envMapIntensity: 1.2
	});
	const slot = new MeshBasicMaterial({ color: 0x020304 });
	/* champagne foil mark on the sip deck */
	const lidMark = new MeshBasicMaterial({
		map: brandTexture(),
		transparent: true,
		color: 0xe0b98a,
		toneMapped: false,
		depthWrite: false,
		opacity: 0.95
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

	return { shell, liner, halo, sleeve, drink, lid, slot, lidMark, ring, haloGlow, lipGlow, dockGlow };
}
