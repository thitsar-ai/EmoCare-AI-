import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

/** Fluid voice sphere — volume-reactive liquid blob with sanctuary / oracle tone blend. */
export const VOICE_SPHERE_SKSL = `
uniform float2 uResolution;
uniform float uTime;
uniform float uVolume;
uniform float uAmbient;
uniform float uIntent;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

half4 main(float2 fragCoord) {
  float2 uv = (fragCoord - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float dist = length(uv);

  float breathe = sin(uTime * 0.55) * 0.5 + 0.5;
  float ripple = sin(dist * 14.0 - uTime * 2.2 + uVolume * 5.5) * 0.035;
  float n = noise(uv * 3.4 + uTime * 0.18) * 0.04;
  float radius = 0.36 + ripple + n + uVolume * 0.09 + breathe * 0.018;

  float edgeSoft = 0.055 + uVolume * 0.025;
  float alpha = smoothstep(radius + edgeSoft, radius - 0.02, dist);

  vec3 champagne = vec3(0.984, 0.914, 0.824);
  vec3 alabaster = vec3(0.962, 0.948, 0.992);
  vec3 lavender = vec3(0.780, 0.718, 0.894);
  vec3 velvet = vec3(0.165, 0.088, 0.245);
  vec3 deepPurple = vec3(0.098, 0.055, 0.165);

  float oracleMix = 1.0 - uIntent;
  vec3 oracleTone = mix(champagne, alabaster, 0.42);
  oracleTone += lavender * 0.12;

  float sanctuaryMix = uIntent * 0.78 + uAmbient * 0.55;
  vec3 sanctuaryTone = mix(lavender, velvet, 0.62);
  sanctuaryTone = mix(sanctuaryTone, deepPurple, sanctuaryMix * 0.35);

  vec3 color = mix(oracleTone, sanctuaryTone, clamp(sanctuaryMix, 0.0, 1.0));

  float core = exp(-dist * dist * (2.8 - uVolume * 0.8));
  color += mix(champagne, lavender, sanctuaryMix) * core * (0.28 + uVolume * 0.35);

  float ring = sin(dist * 22.0 - uTime * 1.6) * 0.5 + 0.5;
  color += lavender * ring * 0.04 * (1.0 - dist * 1.6) * (0.4 + uVolume);

  return half4(clamp(color, 0.0, 1.0), alpha * 0.9);
}
`;

let compiledShader: SkRuntimeEffect | null | undefined;

export function getVoiceSphereShader(): SkRuntimeEffect | null {
  if (compiledShader !== undefined) return compiledShader;
  compiledShader = Skia.RuntimeEffect.Make(VOICE_SPHERE_SKSL);
  if (!compiledShader) {
    console.warn('[VoiceSanctuarySphere] SkSL compilation failed — using fallback layers.');
  }
  return compiledShader;
}
