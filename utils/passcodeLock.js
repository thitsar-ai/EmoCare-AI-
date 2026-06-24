import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export const PASSCODE_HASH_KEY = 'emocarePasscodeHash';
export const PASSCODE_LENGTH = 4;

/** @type {((enabled: boolean) => void) | null} */
let changeListener = null;

/** @param {((enabled: boolean) => void) | null} listener */
export function setPasscodeChangeListener(listener) {
  changeListener = listener;
}

/** @param {boolean} enabled */
export function notifyPasscodeChanged(enabled) {
  changeListener?.(enabled);
}

/**
 * @param {string} pin
 * @returns {Promise<string>}
 */
async function hashPasscode(pin) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `emocare-passcode-v1:${pin}`,
  );
}

/** @param {string} pin */
export function isValidPasscode(pin) {
  return typeof pin === 'string' && new RegExp(`^\\d{${PASSCODE_LENGTH}}$`).test(pin);
}

export async function isPasscodeEnabled() {
  try {
    const hash = await SecureStore.getItemAsync(PASSCODE_HASH_KEY);
    return !!hash;
  } catch {
    return false;
  }
}

/** @param {string} pin */
export async function setPasscode(pin) {
  if (!isValidPasscode(pin)) {
    throw new Error('Passcode must be 4 digits.');
  }
  const hash = await hashPasscode(pin);
  await SecureStore.setItemAsync(PASSCODE_HASH_KEY, hash);
  notifyPasscodeChanged(true);
}

/** @param {string} pin */
export async function verifyPasscode(pin) {
  if (!isValidPasscode(pin)) return false;
  try {
    const stored = await SecureStore.getItemAsync(PASSCODE_HASH_KEY);
    if (!stored) return false;
    const hash = await hashPasscode(pin);
    return hash === stored;
  } catch {
    return false;
  }
}

export async function clearPasscode() {
  try {
    await SecureStore.deleteItemAsync(PASSCODE_HASH_KEY);
  } catch {}
  notifyPasscodeChanged(false);
}
