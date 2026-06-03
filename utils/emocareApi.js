import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { cleanEnvKey } from './envKey';

/** @typedef {{ loaded: boolean; anthropic: boolean; elevenLabs: boolean; tavily: boolean; voiceId: string; elevenLabsModel: string }} EmocareConfig */

/** @type {EmocareConfig} */
let cachedConfig = {
  loaded: false,
  anthropic: false,
  elevenLabs: false,
  tavily: false,
  voiceId: '',
  elevenLabsModel: '',
};

function readExpoExtra() {
  return (
    Constants.expoConfig?.extra
    ?? Constants.manifest2?.extra
    ?? Constants.manifest?.extra
    ?? {}
  );
}

/** Public API base URL — the only backend address the client needs. */
export function getEmocareApiUrl() {
  const candidates = [
    cleanEnvKey(process.env.EXPO_PUBLIC_EMOCARE_API_URL),
    cleanEnvKey(readExpoExtra().emocareApiUrl),
  ].filter(Boolean);
  return candidates[0]?.replace(/\/$/, '') || '';
}

export function getEmocareApiSecret() {
  const candidates = [
    cleanEnvKey(process.env.EXPO_PUBLIC_EMOCARE_API_SECRET),
    cleanEnvKey(readExpoExtra().emocareApiSecret),
  ].filter(Boolean);
  return candidates[0] || '';
}

export function isEmocareApiConfigured() {
  return Boolean(getEmocareApiUrl());
}

/** @returns {EmocareConfig} */
export function getEmocareConfigSnapshot() {
  return cachedConfig;
}

export function isAnthropicConfigured() {
  if (!isEmocareApiConfigured()) return false;
  if (!cachedConfig.loaded) return true;
  return cachedConfig.anthropic;
}

export function isElevenLabsConfigured() {
  if (!isEmocareApiConfigured()) return false;
  if (!cachedConfig.loaded) return true;
  return cachedConfig.elevenLabs;
}

export function isTavilyConfigured() {
  if (!isEmocareApiConfigured()) return false;
  if (!cachedConfig.loaded) return true;
  return cachedConfig.tavily;
}

export function getElevenLabsVoiceIdFromConfig() {
  return cachedConfig.voiceId || '21m00Tcm4TlvDq8ikWAM';
}

/** @returns {Promise<EmocareConfig>} */
export async function refreshEmocareConfig() {
  const base = getEmocareApiUrl();
  if (!base) {
    cachedConfig = {
      loaded: true,
      anthropic: false,
      elevenLabs: false,
      tavily: false,
      voiceId: '',
      elevenLabsModel: '',
    };
    return cachedConfig;
  }

  try {
    const res = await emocareFetch('/v1/config', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      cachedConfig = {
        loaded: true,
        anthropic: Boolean(data.anthropic),
        elevenLabs: Boolean(data.elevenLabs),
        tavily: Boolean(data.tavily),
        voiceId: String(data.voiceId || ''),
        elevenLabsModel: String(data.elevenLabsModel || ''),
      };
    }
    // On HTTP error, keep prior cache — don't mark loaded with stale false flags.
  } catch {
    // Network blip at boot — leave loaded false so optimistic checks still allow requests.
  }

  return cachedConfig;
}

/** Refresh config once before Talk/Voice if we haven't loaded yet. */
export async function ensureEmocareConfig() {
  if (cachedConfig.loaded || !isEmocareApiConfigured()) return cachedConfig;
  return refreshEmocareConfig();
}

/** @param {string} path @param {RequestInit} [options] */
export async function emocareFetch(path, options = {}) {
  const base = getEmocareApiUrl();
  if (!base) {
    throw new Error('Missing EXPO_PUBLIC_EMOCARE_API_URL');
  }

  /** @type {Record<string, string>} */
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const secret = getEmocareApiSecret();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  return fetch(`${base}${path}`, {
    ...options,
    headers,
  });
}

/** @returns {Promise<boolean>} */
export async function checkEmocareApiHealth() {
  try {
    const res = await emocareFetch('/health', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Dev-only: log whether the app can reach the sanctuary API. */
export function logEmocareApiDebug() {
  if (!__DEV__) return;
  const url = getEmocareApiUrl();
  const secret = getEmocareApiSecret();
  console.log('[Emo API]', {
    url: url || '(missing)',
    secretSet: Boolean(secret),
    configLoaded: cachedConfig.loaded,
    anthropic: isAnthropicConfigured(),
    elevenLabs: isElevenLabsConfigured(),
  });
}
