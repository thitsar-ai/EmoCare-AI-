import { fetch } from 'expo/fetch';
import {
  ANTHROPIC_MODEL,
  callAnthropicMessages,
  describeAnthropicError,
} from './anthropic';
import { emocareFetch, isAnthropicConfigured, isEmocareApiConfigured } from './emocareApi';

async function deliverFallbackReply(text, signal, onStart, onTextDelta, onDone) {
  onStart?.();
  const parts = text.match(/\S+\s*|\s+/g) ?? [text];
  let fullText = '';
  for (const part of parts) {
    if (signal?.aborted) break;
    fullText += part;
    onTextDelta?.(part, fullText);
    await new Promise((resolve) => setTimeout(resolve, 18));
  }
  onDone?.(fullText);
  return { ok: true, text: fullText, streamed: false };
}

/**
 * Stream Anthropic Messages API (SSE) via sanctuary server proxy.
 */
export async function streamAnthropicMessages({
  system,
  messages,
  maxTokens = 700,
  model = ANTHROPIC_MODEL,
  signal,
  onTextDelta,
  onStart,
  onDone,
  onError,
}) {
  if (!isEmocareApiConfigured() || !isAnthropicConfigured()) {
    const err = {
      type: 'authentication_error',
      message: 'Missing EXPO_PUBLIC_EMOCARE_API_URL or Anthropic on server',
    };
    onError?.(describeAnthropicError({ error: err }), err);
    return { ok: false, error: err };
  }

  let response;
  try {
    response = await emocareFetch('/v1/anthropic/messages/stream', {
      method: 'POST',
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages,
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return { ok: false, aborted: true };
    onError?.(err instanceof Error ? err.message : 'Network error', null);
    return { ok: false, error: err };
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {}
    const message = describeAnthropicError(data ?? { error: { message: `HTTP ${response.status}` } });
    if (__DEV__) {
      console.warn('[Emo chat] Anthropic HTTP', response.status, data?.error ?? data);
    }
    onError?.(message, data?.error ?? null);
    return { ok: false, status: response.status, error: data?.error ?? null };
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    if (__DEV__) console.warn('[Emo chat] Stream reader unavailable — using buffered fallback');
    const fallback = await callAnthropicMessages({ system, messages, maxTokens, model });
    if (!fallback.ok) {
      const message = describeAnthropicError(
        fallback.data ?? { error: fallback.error ?? { message: `HTTP ${fallback.status}` } },
      );
      onError?.(message, fallback.error ?? null);
      return { ok: false, status: fallback.status, error: fallback.error ?? null };
    }
    const text = fallback.data?.content?.find((b) => b.type === 'text')?.text?.trim() ?? '';
    if (!text) {
      onError?.('Emo returned an empty reply', null);
      return { ok: false, error: { message: 'Empty reply' } };
    }
    return deliverFallbackReply(text, signal, onStart, onTextDelta, onDone);
  }

  onStart?.();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const processLine = (line) => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let event;
    try {
      event = JSON.parse(payload);
    } catch {
      return;
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const chunk = event.delta.text ?? '';
      if (chunk) {
        fullText += chunk;
        onTextDelta?.(chunk, fullText);
      }
    }
    if (event.type === 'error') {
      throw new Error(event.error?.message || 'Stream error');
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('event:')) continue;
        processLine(line.trim());
      }
    }
    if (buffer.trim()) processLine(buffer.trim());

    if (!fullText.trim()) {
      onError?.('Emo returned an empty reply', null);
      return { ok: false, error: { message: 'Empty stream reply' } };
    }

    onDone?.(fullText);
    return { ok: true, text: fullText };
  } catch (err) {
    if (signal?.aborted) return { ok: false, aborted: true };
    if (__DEV__) console.warn('[Emo chat] Stream interrupted:', err);
    onError?.(err instanceof Error ? err.message : 'Stream interrupted', null);
    return { ok: false, error: err };
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
}
