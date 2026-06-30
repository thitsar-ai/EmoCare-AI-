import AsyncStorage from '@react-native-async-storage/async-storage';

/** One-time Anthropic AI disclosure — Apple 5.1.1(i) / 5.1.2(i). */
export const EMOCARE_AI_CONSENT_KEY = 'emocare_ai_consent_v1';

export async function hasAiConsent(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(EMOCARE_AI_CONSENT_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function grantAiConsent(): Promise<void> {
  await AsyncStorage.setItem(EMOCARE_AI_CONSENT_KEY, 'true');
}
