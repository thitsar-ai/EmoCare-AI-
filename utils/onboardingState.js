/**
 * First-launch onboarding persistence.
 * Legacy key `onboarded` is still written for compatibility with exports / older builds.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
export const ONBOARDING_VERSION_KEY = 'onboardingVersion';
export const ONBOARDING_COMPLETED_AT_KEY = 'onboardingCompletedAt';
/** @deprecated Prefer ONBOARDING_COMPLETED_KEY — kept for migration. */
export const LEGACY_ONBOARDED_KEY = 'onboarded';

export const USER_PRONOUNS_KEY = 'userPronouns';

/** Bump only when a major new consent step must be shown again. */
export const CURRENT_ONBOARDING_VERSION = 1;

/**
 * @returns {Promise<{
 *   completed: boolean;
 *   version: number;
 *   completedAt: string | null;
 * }>}
 */
export async function loadOnboardingState() {
  try {
    const pairs = await AsyncStorage.multiGet([
      ONBOARDING_COMPLETED_KEY,
      ONBOARDING_VERSION_KEY,
      ONBOARDING_COMPLETED_AT_KEY,
      LEGACY_ONBOARDED_KEY,
    ]);
    const map = Object.fromEntries(pairs);
    const completedFlag =
      map[ONBOARDING_COMPLETED_KEY] === 'true' || map[LEGACY_ONBOARDED_KEY] === 'true';
    const version = Number.parseInt(String(map[ONBOARDING_VERSION_KEY] || '0'), 10) || 0;
    return {
      completed: completedFlag,
      version,
      completedAt: map[ONBOARDING_COMPLETED_AT_KEY] || null,
    };
  } catch {
    return { completed: false, version: 0, completedAt: null };
  }
}

export async function markOnboardingComplete() {
  const at = new Date().toISOString();
  try {
    await AsyncStorage.multiSet([
      [ONBOARDING_COMPLETED_KEY, 'true'],
      [ONBOARDING_VERSION_KEY, String(CURRENT_ONBOARDING_VERSION)],
      [ONBOARDING_COMPLETED_AT_KEY, at],
      [LEGACY_ONBOARDED_KEY, 'true'],
    ]);
  } catch {}
  return { completed: true, version: CURRENT_ONBOARDING_VERSION, completedAt: at };
}

/**
 * Clears completion so Welcome shows again.
 * Does not delete chat, journal, or profile unless wipeProfile is true.
 * @param {{ wipeProfile?: boolean }} [opts]
 */
export async function resetOnboardingState(opts = {}) {
  try {
    await AsyncStorage.multiSet([
      [ONBOARDING_COMPLETED_KEY, 'false'],
      [LEGACY_ONBOARDED_KEY, 'false'],
    ]);
    await AsyncStorage.multiRemove([ONBOARDING_VERSION_KEY, ONBOARDING_COMPLETED_AT_KEY]);
    if (opts.wipeProfile) {
      await AsyncStorage.multiRemove(['userName', USER_PRONOUNS_KEY]);
    }
  } catch {}
}

export async function loadUserPronouns() {
  try {
    return (await AsyncStorage.getItem(USER_PRONOUNS_KEY))?.trim() || '';
  } catch {
    return '';
  }
}

export async function saveUserPronouns(value) {
  const trimmed = String(value || '').trim();
  try {
    if (!trimmed) await AsyncStorage.removeItem(USER_PRONOUNS_KEY);
    else await AsyncStorage.setItem(USER_PRONOUNS_KEY, trimmed);
  } catch {}
  return trimmed;
}
