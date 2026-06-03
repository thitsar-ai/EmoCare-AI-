import {
  emocareFetch,
  isAnthropicConfigured,
  isEmocareApiConfigured,
} from './emocareApi';

/** User-requested model id (see utils/anthropic.js). */
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const ANTHROPIC_VERSION = '2023-06-01';

export function cleanEnvKey(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\uFEFF]/g, '');
}

/** @deprecated Keys live on the server — use isAnthropicConfigured() instead. */
export function getAnthropicApiKey() {
  return isAnthropicConfigured() ? 'proxy' : '';
}

export function describeAnthropicError(data) {
  const error = data?.error ?? data;
  const type = error?.type;
  const message = error?.message || 'Anthropic request failed';

  if (type === 'authentication_error') {
    return 'Emo could not reach the sanctuary server. Check EXPO_PUBLIC_EMOCARE_API_URL and that npm run api-server is running.';
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
