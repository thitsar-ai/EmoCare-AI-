import { NativeModules } from 'react-native';

type SpeechRecognitionModule = {
  isRecognitionAvailable?: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, handler: (event: unknown) => void) => { remove: () => void };
};

let cachedModule: SpeechRecognitionModule | null | undefined;

/**
 * Lazy-load expo-speech-recognition only when the native module exists (dev build).
 * Avoids crashing Expo Go where ExpoSpeechRecognition is not linked.
 */
export function getSpeechRecognitionModule(): SpeechRecognitionModule | null {
  if (cachedModule !== undefined) return cachedModule;

  const native = NativeModules.ExpoSpeechRecognition ?? NativeModules.ExpoSpeechRecognitionModule;
  if (!native) {
    cachedModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const pkg = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: SpeechRecognitionModule;
    };
    cachedModule = pkg.ExpoSpeechRecognitionModule;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  const mod = getSpeechRecognitionModule();
  if (!mod) return false;
  try {
    return mod.isRecognitionAvailable?.() ?? true;
  } catch {
    return false;
  }
}
