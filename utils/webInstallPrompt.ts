import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type WebInstallState = {
  /** Browser offered a one-tap install prompt (Chrome/Edge on desktop). */
  canPrompt: boolean;
  /** Running as an installed PWA or iOS home-screen app. */
  isInstalled: boolean;
  /** User dismissed the floating install banner. */
  bannerDismissed: boolean;
};

const DISMISS_KEY = 'emocarePwaInstallDismissed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let bannerDismissed = false;
let listeners = new Set<(state: WebInstallState) => void>();
let listenersBound = false;

function readBannerDismissed(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function readInstalled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function snapshot(): WebInstallState {
  return {
    canPrompt: !!deferredPrompt && !installed,
    isInstalled: installed,
    bannerDismissed,
  };
}

function notify() {
  const state = snapshot();
  listeners.forEach((listener) => listener(state));
}

function ensureWebInstallListeners() {
  if (listenersBound || Platform.OS !== 'web' || typeof window === 'undefined') return;
  listenersBound = true;
  installed = readInstalled();
  bannerDismissed = readBannerDismissed();

  const onBeforeInstall = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    installed = true;
    deferredPrompt = null;
    notify();
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);
}

export function isWebInstallSupported(): boolean {
  return Platform.OS === 'web';
}

export function getWebInstallInstructions(): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 'Install is available on the web version of EmoCare.';
  }

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);

  if (isIos) {
    return 'Tap Share in Safari, then choose “Add to Home Screen”. EmoCare will open like a native app.';
  }
  if (isMacSafari) {
    return 'In Safari, open the File menu and choose “Add to Dock”, or use Share → “Add to Dock”.';
  }
  return 'Look for the install icon in your browser’s address bar (Chrome or Edge), or open the browser menu and choose “Install EmoCare”.';
}

export async function promptWebInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt || installed) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome;
}

export function dismissWebInstallBanner() {
  bannerDismissed = true;
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {}
  notify();
}

export function useWebInstallPrompt(): WebInstallState & {
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismissBanner: () => void;
  showManualInstallHelp: () => string;
} {
  const [state, setState] = useState<WebInstallState>(() => {
    ensureWebInstallListeners();
    return snapshot();
  });

  useEffect(() => {
    ensureWebInstallListeners();
    setState(snapshot());
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    promptInstall: promptWebInstall,
    dismissBanner: dismissWebInstallBanner,
    showManualInstallHelp: getWebInstallInstructions,
  };
}
