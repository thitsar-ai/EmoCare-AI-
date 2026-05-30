import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

/**
 * GPU SkSL — amethyst / lavender / champagne living light field with
 * central aura ripples. Runs entirely on the Skia render thread.
 */
export const LIVING_CANVAS_SKSL = `
uniform float2 uResolution;
uniform float uTime;
uniform float uAmbient;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uResolution;
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  float2 p = uv - float2(0.5, 0.5);
  p.x *= aspect;

  float2 auraCenter = float2(0.0, -0.06);
  float dist = length(p - auraCenter);

  vec3 champagne = vec3(0.984, 0.914, 0.824);
  vec3 amethyst = vec3(0.780, 0.718, 0.894);
  vec3 lavenderMist = vec3(0.918, 0.894, 0.992);
  vec3 softLavender = vec3(0.906, 0.871, 0.976);

  vec3 obsidian = vec3(0.055, 0.045, 0.095);
  vec3 velvetPurple = vec3(0.165, 0.088, 0.245);
  vec3 deepIndigo = vec3(0.098, 0.065, 0.165);
  vec3 nightMist = vec3(0.120, 0.080, 0.180);

  vec3 skyTop = mix(champagne, deepIndigo * 0.45 + velvetPurple * 0.55, uAmbient);
  vec3 skyBottom = mix(amethyst * 0.82 + lavenderMist * 0.18, obsidian + velvetPurple * 0.38, uAmbient);
  vec3 color = mix(skyBottom, skyTop, uv.y);

  float2 goldPos = float2(0.36, -0.40);
  float goldDist = length(p - goldPos);
  float goldGlow = exp(-goldDist * goldDist * 5.2);
  goldGlow *= (1.0 - uAmbient * 0.78);
  color = mix(color, mix(champagne, velvetPurple * 0.28 + champagne * 0.18, uAmbient), goldGlow * 0.62);

  float angle = atan(p.y - auraCenter.y, p.x - auraCenter.x);
  float swirl = sin(angle * 2.4 + uTime * 0.20 + dist * 8.5) * 0.5 + 0.5;
  color += mix(amethyst, velvetPurple, uAmbient) * swirl * 0.035 * (1.0 - uAmbient * 0.45);

  float breath = sin(uTime * 0.42) * 0.5 + 0.5;
  float pulse = 0.90 + breath * 0.10;

  float rings = sin(dist * 20.0 - uTime * 0.85) * 0.5 + 0.5;
  rings *= exp(-dist * 2.0);
  float auraCore = exp(-dist * dist * 3.6 * pulse);
  float auraMid = exp(-dist * 1.55) * (0.32 + breath * 0.28);

  vec3 auraColor = mix(amethyst, velvetPurple + deepIndigo * 0.35, uAmbient);
  vec3 auraGold = mix(champagne, nightMist, uAmbient);
  color += auraColor * auraCore * 0.40;
  color += auraGold * auraMid * 0.16 * (1.0 - uAmbient * 0.42);
  color += mix(lavenderMist, velvetPurple, uAmbient) * rings * 0.11;

  float mist = sin(p.x * 3.8 + uTime * 0.16) * sin(p.y * 2.9 - uTime * 0.12);
  mist = mist * 0.5 + 0.5;
  color = mix(color, mix(softLavender, nightMist, uAmbient), mist * 0.055);

  float vignette = smoothstep(1.15, 0.25, length(p));
  color *= 0.93 + vignette * 0.07;

  return half4(clamp(color, 0.0, 1.0), 1.0);
}
`;

let compiledShader: SkRuntimeEffect | null | undefined;

export function getLivingCanvasShader(): SkRuntimeEffect | null {
  if (compiledShader !== undefined) {
    return compiledShader;
  }
  compiledShader = Skia.RuntimeEffect.Make(LIVING_CANVAS_SKSL);
  if (!compiledShader) {
    console.warn('[LivingCanvas] SkSL shader compilation failed — using gradient fallback.');
  }
  return compiledShader;
}
