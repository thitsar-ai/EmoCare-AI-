import * as Haptics from 'expo-haptics';

/** Distinct dual-tap at phase transitions. */
export async function hapticBreathTransition() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    await new Promise((r) => setTimeout(r, 85));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

/**
 * Continuous ramp — intensity builds on inhale, decays on exhale.
 * @param {'inhale' | 'exhale' | 'hold' | 'holdAfter'} phase
 * @param {number} durationMs
 * @returns {() => void} cleanup
 */
export function runBreathHapticRamp(phase, durationMs) {
  if (phase !== 'inhale' && phase !== 'exhale') return () => {};

  const started = Date.now();
  const tick = () => {
    const t = Math.min(1, (Date.now() - started) / durationMs);
    if (phase === 'inhale') {
      if (t < 0.35) void Haptics.selectionAsync().catch(() => {});
      else if (t < 0.7) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      if (t < 0.35) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      else if (t < 0.7) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
      else void Haptics.selectionAsync().catch(() => {});
    }
  };

  tick();
  const id = setInterval(tick, 320);
  return () => clearInterval(id);
}

/** Low-frequency ripple during post-exhale hold. */
export function runBreathHoldRipple() {
  const id = setInterval(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  }, 1400);
  return () => clearInterval(id);
}

/** Ambient wavy pulse while holding at peak expansion. */
export function runBreathHoldAmbient() {
  const id = setInterval(() => {
    void Haptics.selectionAsync().catch(() => {});
  }, 900);
  return () => clearInterval(id);
}
