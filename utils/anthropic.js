import {
  emocareFetch,
  ensureEmocareConfig,
  isAnthropicConfigured,
  isEmocareApiConfigured,
} from './emocareApi';
import { cleanEnvKey } from './envKey';

export { cleanEnvKey, isAnthropicConfigured, isEmocareApiConfigured };

/** User-requested model id (see utils/anthropic.js). */
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const ANTHROPIC_VERSION = '2023-06-01';

/** @deprecated Keys live on the server — use isAnthropicConfigured() instead. */
export function getAnthropicApiKey() {
  return isAnthropicConfigured() ? 'proxy' : '';
}

export function describeAnthropicError(data) {
  const error = data?.error ?? data;
  const type = error?.type;
  const message = error?.message || 'Anthropic request failed';

  if (type === 'authentication_error') {
    if (/x-api-key|invalid authentication/i.test(message)) {
      return 'Emo\'s brain key needs updating on the sanctuary server. In Railway Variables, set ANTHROPIC_API_KEY to your latest sk-ant- key from console.anthropic.com, then redeploy.';
    }
    if (/unauthorized/i.test(message)) {
      return 'Sanctuary server auth failed. Check EXPO_PUBLIC_EMOCARE_API_SECRET matches EMOCARE_API_SECRET on Railway.';
    }
    return 'Emo could not reach the sanctuary server. Check EXPO_PUBLIC_EMOCARE_API_URL and that the API is running.';
  }
  if (type === 'not_found_error' && /model/i.test(message)) {
    return message;
  }
  return message;
}

export async function callAnthropicMessages({
  system,
  messages,
  maxTokens = 700,
  model = ANTHROPIC_MODEL,
}) {
  await ensureEmocareConfig();

  if (!isEmocareApiConfigured()) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: {
        type: 'authentication_error',
        message: 'Missing EXPO_PUBLIC_EMOCARE_API_URL',
      },
      missingApiKey: true,
    };
  }

  if (!isAnthropicConfigured()) {
    return {
      ok: false,
      status: 503,
      data: null,
      error: {
        type: 'authentication_error',
        message: 'Anthropic not configured on sanctuary server',
      },
      missingApiKey: true,
    };
  }

  const response = await emocareFetch('/v1/anthropic/messages', {
    method: 'POST',
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: data?.error ?? null,
    missingApiKey: false,
  };
}
