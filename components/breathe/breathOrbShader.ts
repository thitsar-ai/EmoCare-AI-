import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

let cached: SkRuntimeEffect | null | undefined;

export function getBreathOrbShader(): SkRuntimeEffect | null {
  if (cached !== undefined) return cached;
  try {
    cached = Skia.RuntimeEffect.Make(`
uniform float2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uPhase;
uniform float uProgress;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uResolution;
  float2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float angle = atan(p.y, p.x);
  float dist = length(p);

  float wobble =
    sin(angle * 3.0 + uTime * 1.15) * 0.045 +
    sin(angle * 5.0 - uTime * 0.85) * 0.028 +
    cos(angle * 2.0 + uTime * 0.6) * 0.02;

  float holdPulse = 0.0;
  if (uPhase > 0.5 && uPhase < 1.5) {
    holdPulse = sin(uTime * 2.4) * 0.018;
  }
  if (uPhase > 2.5 && uPhase < 3.5) {
    holdPulse = sin(uTime * 1.1) * 0.012;
  }

  float coreRadius = (0.34 + wobble + holdPulse) * uScale;
  float edge = smoothstep(coreRadius + 0.08, coreRadius - 0.02, dist);
  float glow = smoothstep(coreRadius + 0.42, coreRadius - 0.05, dist);

  vec3 violetTeal = vec3(0.42, 0.28, 0.95) * 0.55 + vec3(0.18, 0.72, 0.82) * 0.45;
  vec3 holdGlow = vec3(0.55, 0.38, 0.98) * 0.5 + vec3(0.22, 0.68, 0.88) * 0.5;
  vec3 midnight = vec3(0.08, 0.06, 0.22) * 0.55 + vec3(0.12, 0.10, 0.38) * 0.45;
  vec3 deepIndigo = vec3(0.05, 0.04, 0.16) * 0.6 + vec3(0.18, 0.12, 0.42) * 0.4;

  vec3 inner = violetTeal;
  if (uPhase < 0.5) {
    inner = mix(violetTeal, holdGlow, uProgress * 0.35);
  } else if (uPhase < 1.5) {
    inner = holdGlow;
  } else if (uPhase < 2.5) {
    inner = mix(holdGlow, midnight, uProgress * 0.85);
  } else {
    inner = mix(midnight, deepIndigo, 0.55);
  }

  vec3 outer = inner * 0.35 + vec3(0.02, 0.01, 0.06);
  vec3 color = mix(outer, inner, edge);
  color += glow * inner * 0.55;

  float alpha = glow * 0.92;
  return half4(color, alpha);
}
`);
  } catch {
    cached = null;
  }
  return cached ?? null;
}
