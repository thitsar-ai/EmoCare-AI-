/**
 * Canonical first-run onboarding order (visible slides).
 * Age verification (slide 3) is an interstitial after Privacy, not a menu step.
 *
 * New user: Splash → Welcome → Privacy → Age (if needed) → About You → Feeling → Ready → Home
 * Returning user (onboardingCompleted): Home
 */

export const OB_CONTENT_SLIDES = [2, 4, 5, 6, 7];

export const OB_SLIDE = {
  welcome: 2,
  ageGate: 3,
  privacy: 4,
  aboutYou: 5,
  feeling: 6,
  ready: 7,
};

/**
 * @param {number} current
 * @returns {number | null}
 */
export function nextContentSlide(current) {
  const idx = OB_CONTENT_SLIDES.indexOf(current);
  if (idx < 0 || idx >= OB_CONTENT_SLIDES.length - 1) return null;
  return OB_CONTENT_SLIDES[idx + 1];
}

/**
 * @param {number} current
 * @returns {number | null}
 */
export function prevContentSlide(current) {
  const idx = OB_CONTENT_SLIDES.indexOf(current);
  if (idx <= 0) return null;
  return OB_CONTENT_SLIDES[idx - 1];
}

/**
 * Where Root should land after bootstrap.
 * @param {{ completed: boolean }} onboarding
 * @returns {'welcome' | 'home'}
 */
export function resolveBootDestination(onboarding) {
  return onboarding?.completed ? 'home' : 'welcome';
}
