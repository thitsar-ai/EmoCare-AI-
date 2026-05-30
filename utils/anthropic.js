import Constants from 'expo-constants';

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

function readExpoExtra() {
  return (
    Constants.expoConfig?.extra
    ?? Constants.manifest2?.extra
    ?? Constants.manifest?.extra
    ?? {}
  );
}

export function getAnthropicApiKey() {
  const fromPublicEnv = cleanEnvKey(process.env.EXPO_PUBLIC_ANTHROPIC_KEY);
  if (fromPublicEnv.startsWith('sk-ant-')) return fromPublicEnv;

  const fromExtra = cleanEnvKey(readExpoExtra().anthropicApiKey);
  if (fromExtra.startsWith('sk-ant-')) return fromExtra;

  return fromPublicEnv || fromExtra;
}

export function describeAnthropicError(data) {
  const type = data?.error?.type;
  const message = data?.error?.message || 'Anthropic request failed';

  if (type === 'authentication_error') {
    return 'Anthropic authentication failed. Confirm EXPO_PUBLIC_ANTHROPIC_KEY in .env, then restart Metro with cache cleared (npm run ios -- --clear).';
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
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: {
        type: 'authentication_error',
        message: 'Missing EXPO_PUBLIC_ANTHROPIC_KEY',
      },
      missingApiKey: true,
    };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
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
