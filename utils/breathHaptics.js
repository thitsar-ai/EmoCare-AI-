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
 * Gentle breath-synced pulses — a few soft taps per phase, not continuous vibration.
 * @param {'inhale' | 'exhale' | 'hold' | 'holdAfter'} phase
 * @param {number} durationMs
 * @returns {() => void} cleanup
 */
export function runBreathHapticRamp(phase, durationMs) {
  if (phase !== 'inhale' && phase !== 'exhale') return () => {};

  const timeouts = [];
  const marks = phase === 'inhale' ? [0.12, 0.5, 0.88] : [0.12, 0.55, 0.9];

  for (const fraction of marks) {
    timeouts.push(
      setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
      }, durationMs * fraction),
    );
  }

  return () => {
    for (const id of timeouts) clearTimeout(id);
  };
}

/** Occasional soft pulse during post-exhale rest. */
export function runBreathHoldRipple() {
  let id = setInterval(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  }, 2800);
  return () => clearInterval(id);
}

/** Light ambient pulse while holding at peak expansion. */
export function runBreathHoldAmbient() {
  let id = setInterval(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  }, 3200);
  return () => clearInterval(id);
}
