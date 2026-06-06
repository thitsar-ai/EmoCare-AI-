import { Alert, Linking } from 'react-native';

/** App Store / TestFlight bundle identifier — must match app.json and Apple Developer. */
export const IOS_BUNDLE_ID = 'com.tristarinter.emocare';

/**
 * Public EmoCare app privacy policy (App Store Connect + in-app).
 * Source of truth: legal/emocare-privacy-policy.md
 */
export const PRIVACY_POLICY_URL =
  'https://gilded-cellar-692.notion.site/Privacy-Policy-EmoCare-AI-34d20bec5aae80568727d1c2882788e6';

export function openPrivacyPolicy(): void {
  Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
    Alert.alert(
      'Could not open link',
      'Please visit our Privacy Policy in your browser.',
    );
  });
}
