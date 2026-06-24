import { Alert, Linking } from 'react-native';

/** App Store / TestFlight bundle identifier — must match app.json and Apple Developer. */
export const IOS_BUNDLE_ID = 'com.tristarinter.emocare';

/** Public legal pages (App Store Connect + in-app). */
export const LEGAL_LINKS = {
  privacyPolicy:
    'https://gilded-cellar-692.notion.site/Privacy-Policy-EmoCare-AI-34d20bec5aae80568727d1c2882788e6',
  termsOfService:
    'https://gilded-cellar-692.notion.site/Terms-of-Service-EmoCare-38920bec5aae801c844efcf0309787eb',
  support:
    'https://gilded-cellar-692.notion.site/EmoCare-Support-38920bec5aae808e9110d4795951c732',
};

/** @deprecated Prefer LEGAL_LINKS.privacyPolicy */
export const PRIVACY_POLICY_URL = LEGAL_LINKS.privacyPolicy;

/** @deprecated Prefer LEGAL_LINKS.termsOfService */
export const TERMS_OF_SERVICE_URL = LEGAL_LINKS.termsOfService;

/** @deprecated Prefer LEGAL_LINKS.support */
export const SUPPORT_URL = LEGAL_LINKS.support;

export const SUPPORT_EMAIL = 'info@emocareai.com';

function openUrl(url: string, fallbackMessage: string): void {
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open link', fallbackMessage);
  });
}

export function openPrivacyPolicy(): void {
  openUrl(LEGAL_LINKS.privacyPolicy, 'Please visit our Privacy Policy in your browser.');
}

export function openTermsOfService(): void {
  openUrl(LEGAL_LINKS.termsOfService, 'Please visit our Terms of Service in your browser.');
}

export function openSupport(): void {
  openUrl(LEGAL_LINKS.support, `Please email us at ${SUPPORT_EMAIL} for help.`);
}
