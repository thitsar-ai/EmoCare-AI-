import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

/**
 * @returns {Promise<{ available: boolean, enrolled: boolean, label: string }>}
 */
export async function getBiometricSupport() {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    let label = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }

    return {
      available: hasHardware && enrolled,
      enrolled,
      label,
    };
  } catch {
    return { available: false, enrolled: false, label: 'Biometrics' };
  }
}

/**
 * @param {'setup' | 'unlock'} [mode]
 * setup — allow device passcode fallback so enabling Face ID in Settings succeeds.
 * unlock — prefer biometrics only; app passcode keypad remains the fallback.
 * @returns {Promise<{ success: boolean, reason?: string, warning?: string }>}
 */
export async function promptBiometricUnlock(label = 'Biometrics', mode = 'unlock') {
  const support = await getBiometricSupport();
  if (!support.available) {
    return { success: false, reason: 'not_available' };
  }

  const resolvedLabel = label || support.label;
  const forSetup = mode === 'setup';

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: forSetup
      ? `Enable ${resolvedLabel} for EmoCare`
      : `Unlock EmoCare with ${resolvedLabel}`,
    cancelLabel: forSetup ? 'Cancel' : 'Use passcode',
    // Allow iPhone passcode fallback on unlock so the system sheet reliably appears.
    disableDeviceFallback: false,
    fallbackLabel: forSetup ? 'Use device passcode' : 'Use passcode',
  });

  return {
    success: result.success,
    reason: result.success ? undefined : result.error,
    warning: result.success ? undefined : result.warning,
  };
}

/**
 * @param {string | undefined} reason
 * @param {string} label
 */
export function describeBiometricError(reason, label = 'Face ID') {
  switch (reason) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return null;
    case 'not_enrolled':
      return `Set up ${label} in your iPhone Settings → Face ID & Passcode, then try again.`;
    case 'not_available':
      if (IS_EXPO_GO) {
        return `${label} in Expo Go can be unreliable. Install a fresh EmoCare build from TestFlight or a dev build for full ${label} support.`;
      }
      return `${label} is not available in this build. Reinstall the latest EmoCare app, then try again.`;
    case 'lockout':
      return `${label} is temporarily locked. Unlock your iPhone with your device passcode, then try again.`;
    case 'passcode_not_set':
      return 'Set a device passcode on your iPhone first, then enable Face ID in Settings.';
    case 'authentication_failed':
      return `${label} did not recognize you. Try again.`;
    case 'invalid_context':
      return 'Please try again in a moment.';
    default:
      return `Could not verify ${label}. Check your device settings and try again.`;
  }
}

export function isExpoGo() {
  return IS_EXPO_GO;
}
