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
/*LABEL_END*/
`;

/* leather finishing: patina noise, saddle stitching and a letter mask for the stamped lettering */
const LEATHER_DECL = /* glsl */ `
const float STITCH_PITCH = 0.02;
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
	vec3 i = floor(x), f = fract(x);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.07) + 0.2 * vnoise(p * 4.1); }
/* a row of slanted saddle stitches running along s, centred on line c; w = half width */
float stitchRow(float s, float t, float c, float w){
	float f = fract(s / STITCH_PITCH);
	float slant = (f - 0.5) * 0.0042;
	float along = smoothstep(0.10, 0.20, f) * (1.0 - smoothstep(0.80, 0.90, f));
	return along * (1.0 - smoothstep(w * 0.55, w, abs(t - c - slant)));
}
/* the knocked-out letters of the cup's label (inside the strip), so the sleeve can stamp them */
float letterMask(vec3 p){
	float a = atan(-p.z, p.x) - ${PRINT.center.toFixed(6)};
	a -= 6.283185307 * floor((a + 3.141592654) / 6.283185307);
	float u = a * length(p.xz) / ${PRINT.arc.toFixed(5)} + 0.5;
	float v = (p.y - ${PRINT.y0.toFixed(5)}) / ${(PRINT.y1 - PRINT.y0).toFixed(5)};
	float inStrip = step(0.033, u) * step(u, 0.967);
	return (1.0 - texture2D(uLabel, vec2(u, v)).a) * inStrip * step(abs(a), 1.2);
}
`;

function withLabel(material, tex, inject) {
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uLabel = { value: tex };
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
			.replace('#include <displacementmap_vertex>', '#include <displacementmap_vertex>\nvLocal = transformed;');
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

	/* hand-finished cognac full-grain leather. The sleeve stamps the cup's lettering into the leather where
	   it covers the label, with saddle stitching along both edges and up the seam, burnished rolled edges,
	   patina mottling and the brand debossed on the back. */
	const brand = brandTexture();
	const leatherParams = () => ({
		color: linear(0.23, 0.072, 0.02),
		roughness: 0.46,
		metalness: 0,
		bumpMap: leatherGrainTexture(),
		bumpScale: 2.4,
		clearcoat: 0.1,
		clearcoatRoughness: 0.28,
		sheen: 0.25,
		sheenRoughness: 0.55,
		sheenColor: linear(0.5, 0.24, 0.1),
		envMapIntensity: 1.1
	});
	const NORMAL_BUMP = `
		normal = perturbNormalArb( - vViewPosition, normal, vec2( dFdx( hgt ), dFdy( hgt ) ) * 9.0, faceDirection );`;

	const sleeve = withLabel(
		new MeshPhysicalMaterial(leatherParams()),
		label,
		function sleeveInject(shader) {
			shader.uniforms.uBrand = { value: brand };
			shader.fragmentShader = shader.fragmentShader
				.replace(
					'/*LABEL_END*/',
					`uniform sampler2D uBrand;
					${LEATHER_DECL}
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
					vec3 P = vLocal;
					float rad = length(P.xz);
					float arcLen = atan(-P.z, P.x) * rad;                 // signed arc length from the seam (angle 0)
					float pn = fbm3(P * 30.0);
					diffuseColor.rgb *= 0.84 + 0.32 * pn;                  // patina
					float edge = smoothstep(0.0, 0.009, min(P.y - ${SLEEVE.y0}, ${SLEEVE.y1} - P.y));
					diffuseColor.rgb *= mix(0.5, 1.0, edge);               // burnished, darker rolled edges

					float stamp = letterMask(P);                           // the cup's lettering, stamped into the leather
					diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.26, 0.24, 0.23), stamp);

					// saddle stitching: a row along each edge and a double row up the seam
					float yTop = ${(SLEEVE.y1 - 0.022).toFixed(4)};
					float yBot = ${(SLEEVE.y0 + 0.022).toFixed(4)};
					float rows = max(stitchRow(arcLen, P.y, yTop, 0.0019), stitchRow(arcLen, P.y, yBot, 0.0019));
					float rowsW = max(stitchRow(arcLen, P.y, yTop, 0.0036), stitchRow(arcLen, P.y, yBot, 0.0036));
					float cols = max(stitchRow(P.y - 0.003, arcLen, 0.0105, 0.0019), stitchRow(P.y - 0.003, arcLen, -0.0105, 0.0019));
					float colsW = max(stitchRow(P.y - 0.003, arcLen, 0.0105, 0.0036), stitchRow(P.y - 0.003, arcLen, -0.0105, 0.0036));
					float thread = max(rows, cols);
					float holes = max(rowsW, colsW) * (1.0 - thread);
					float seamLine = 1.0 - smoothstep(0.0005, 0.0016, abs(arcLen));
					diffuseColor.rgb *= 1.0 - 0.4 * holes - 0.35 * seamLine;
					diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.66, 0.45, 0.22) * (0.85 + 0.3 * pn), thread);
					float br = brandAlpha(P);
					diffuseColor.rgb *= 1.0 - 0.7 * br;

					// height field for the relief: stamped letters pressed in, thread raised, holes sunk
					float hgt = -1.0 * stamp + 0.9 * thread - 0.5 * holes - 0.4 * seamLine - 0.8 * br - 0.5 * (1.0 - edge);`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					`#include <roughnessmap_fragment>
					roughnessFactor = mix(roughnessFactor, 0.2, max(stamp, 1.0 - edge));   // burnished
					roughnessFactor = mix(roughnessFactor, 0.75, thread);                    // matte thread`
				)
				.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + NORMAL_BUMP);
		}
	);

	const drink = new MeshPhysicalMaterial({
		color: linear(0.02, 0.012, 0.01),
		roughness: 0.04,
		clearcoat: 1,
		clearcoatRoughness: 0.03
	});

	/* the lid: the same hand-finished leather; a double stitched ring follows the flange as it deforms */
	const lid = withLabel(
		new MeshPhysicalMaterial(leatherParams()),
		label,
		function lidInject(shader) {
			shader.uniforms.uRing = { value: 0.452 };
			lid.userData.shader = shader;
			shader.fragmentShader = shader.fragmentShader
				.replace('/*LABEL_END*/', `uniform float uRing;\n${LEATHER_DECL}`)
				.replace(
					'#include <color_fragment>',
					`#include <color_fragment>
					vec3 P = vLocal;
					float rad = length(P.xz);
					float arcLen = atan(-P.z, P.x) * rad;
					float pn = fbm3(P * 30.0);
					diffuseColor.rgb *= 0.84 + 0.32 * pn;
					float r1 = uRing, r2 = uRing - 0.024;
					float thread = max(stitchRow(arcLen, rad, r1, 0.0019), stitchRow(arcLen, rad, r2, 0.0019));
					float holes = max(stitchRow(arcLen, rad, r1, 0.0036), stitchRow(arcLen, rad, r2, 0.0036)) * (1.0 - thread);
					diffuseColor.rgb *= 1.0 - 0.4 * holes;
					diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.66, 0.45, 0.22) * (0.85 + 0.3 * pn), thread);
					float hgt = 0.9 * thread - 0.5 * holes;`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					'#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.75, thread);'
				)
				.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + NORMAL_BUMP);
		}
	);
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
