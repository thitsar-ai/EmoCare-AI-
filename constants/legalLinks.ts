import { Alert, Linking } from 'react-native';

/** App Store / TestFlight bundle identifier — must match app.json and Apple Developer. */
export const IOS_BUNDLE_ID = 'com.tristarinter.emocare';

/**
 * Public EmoCare app privacy policy (App Store Connect + in-app).
 * Source of truth: legal/emocare-privacy-policy.md
 */
export const PRIVACY_POLICY_URL =
  'https://gilded-cellar-692.notion.site/Privacy-Policy-EmoCare-AI-34d20bec5aae80568727d1c2882788e6';

/** Terms of Service — App Store Connect + onboarding agreement. */
export const TERMS_OF_SERVICE_URL = 'https://emocareai.com/terms';

/** App Store Connect support URL. */
export const SUPPORT_URL = 'https://emocareai.com/support';

export const SUPPORT_EMAIL = 'info@emocareai.com';

function openUrl(url: string, fallbackMessage: string): void {
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open link', fallbackMessage);
  });
}

export function openPrivacyPolicy(): void {
  openUrl(PRIVACY_POLICY_URL, 'Please visit our Privacy Policy in your browser.');
}

export function openTermsOfService(): void {
  openUrl(TERMS_OF_SERVICE_URL, 'Please visit our Terms of Service in your browser.');
}

export function openSupport(): void {
  openUrl(SUPPORT_URL, `Please email us at ${SUPPORT_EMAIL} for help.`);
}
