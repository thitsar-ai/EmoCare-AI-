import * as Haptics from 'expo-haptics';

export async function hapticLight() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export async function hapticMedium() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/** Rhythmic breath cue — soft pulse on inhale/exhale transitions. */
export async function hapticBreathPulse(phase) {
  try {
    if (phase === 'Inhale') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } else if (phase === 'Exhale') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {}
}
