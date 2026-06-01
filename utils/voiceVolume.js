import AsyncStorage from '@react-native-async-storage/async-storage';

export const VOICE_VOLUME_KEY = 'emoVoiceVolume';

/** In-app voice level 0–1 (device volume still applies on top). */
export async function getVoiceVolume() {
  try {
    const raw = await AsyncStorage.getItem(VOICE_VOLUME_KEY);
    if (raw == null) return 1;
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n)) return 1;
    return Math.min(1, Math.max(0, n));
  } catch {
    return 1;
  }
}

export async function setVoiceVolume(value) {
  const clamped = Math.min(1, Math.max(0, value));
  try {
    await AsyncStorage.setItem(VOICE_VOLUME_KEY, String(clamped));
  } catch {}
  return clamped;
}
