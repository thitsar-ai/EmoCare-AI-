import Constants from 'expo-constants';
import { cleanEnvKey } from './anthropic';
import { bytesToBase64, base64ToBytes } from '../components/voice/pcmUtils';

/**
 * Rachel — warm, clear ElevenLabs premade voice (Human Acoustic Layer).
 */
export const ELEVENLABS_DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

/** Default TTS model — flash uses the fewest credits (multilingual_v2 often fails on free tier). */
export const ELEVENLABS_MODEL =
  cleanEnvKey(process.env.EXPO_PUBLIC_ELEVENLABS_MODEL) || 'eleven_flash_v2_5';

/** Sanctuary delivery — soft, unhurried, kind. */
export const EMO_VOICE_SETTINGS = {
  stability: 0.42,
  similarity_boost: 0.88,
  use_speaker_boost: true,
};

/** Even slower, dreamier delivery for meditations and stories. */
export const EMO_SESSION_VOICE_SETTINGS = {
  stability: 0.36,
  similarity_boost: 0.9,
  use_speaker_boost: true,
};

function readExpoExtra() {
  return (
    Constants.expoConfig?.extra
    ?? Constants.manifest2?.extra
    ?? Constants.manifest?.extra
    ?? {}
  );
}

export function getElevenLabsApiKey() {
  const candidates = [
    cleanEnvKey(process.env.EXPO_PUBLIC_ELEVENLABS_KEY),
    cleanEnvKey(process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY),
    cleanEnvKey(readExpoExtra().elevenLabsApiKey),
  ].filter((key) => key.length >= 20);
  return candidates.sort((a, b) => b.length - a.length)[0] || '';
}

export function getElevenLabsVoiceId() {
  const candidates = [
    cleanEnvKey(process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID),
    cleanEnvKey(readExpoExtra().elevenLabsVoiceId),
  ].filter(Boolean);
  return candidates[0] || ELEVENLABS_DEFAULT_VOICE_ID;
}

export function getElevenLabsDebugInfo() {
  const key = getElevenLabsApiKey();
  return {
    configured: Boolean(key),
    keyLength: key.length,
    voiceId: getElevenLabsVoiceId(),
    fromEnv: Boolean(cleanEnvKey(process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY)),
    fromExtra: Boolean(cleanEnvKey(readExpoExtra().elevenLabsApiKey)),
  };
}

export function isElevenLabsConfigured() {
  return Boolean(getElevenLabsApiKey());
}

/** Gentle pacing for calm, soothing delivery. */
export function prepareSanctuarySpeechText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1  ')
    .replace(/[,;]\s*/g, ', ');
}

async function requestElevenLabsAudio(text, outputFormat, signal, { sanctuarySession = false } = {}) {
  const trimmed = prepareSanctuarySpeechText(text);
  if (!trimmed) return null;

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_ELEVENLABS_KEY');
  }

  const voiceId = getElevenLabsVoiceId();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${outputFormat}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/*',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: ELEVENLABS_MODEL,
      voice_settings: sanctuarySession ? EMO_SESSION_VOICE_SETTINGS : EMO_VOICE_SETTINGS,
    }),
    signal,
  });

  if (!response.ok) {
    let detail = `ElevenLabs TTS failed (${response.status})`;
    try {
      const err = await response.json();
      const nested = err?.detail;
      const code = typeof nested === 'object' ? nested?.code : null;
      const message = nested?.message || nested || err?.message;
      if (code === 'quota_exceeded') {
        detail =
          'ElevenLabs voice credits are low. Add credits at elevenlabs.io or set EXPO_PUBLIC_ELEVENLABS_MODEL=eleven_flash_v2_5 in .env.';
      } else if (typeof message === 'string' && message.length) {
        detail = message;
      }
    } catch {}
    throw new Error(typeof detail === 'string' ? detail : 'ElevenLabs TTS failed');
  }

  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Full-quality MP3 — one continuous file for smooth, human playback (no chunk gaps).
 */
export async function fetchElevenLabsMp3(text, signal, options) {
  return requestElevenLabsAudio(text, 'mp3_44100_128', signal, options);
}

/** PCM @ 24 kHz — reliable on iOS via WAV wrapper. */
export async function fetchElevenLabsPcm(text, signal, options) {
  return requestElevenLabsAudio(text, 'pcm_24000', signal, options);
}

const PCM_CHUNK_BYTES = 9600; // ~200 ms @ 24 kHz — larger chunks = fewer playback seams

/**
 * Stream PCM for low-latency relay mode.
 */
export async function streamElevenLabsSpeech({ text, onPcmChunk, signal }) {
  const trimmed = prepareSanctuarySpeechText(text);
  if (!trimmed) return;

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY');

  const voiceId = getElevenLabsVoiceId();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=pcm_24000`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/pcm',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: ELEVENLABS_MODEL,
      voice_settings: EMO_VOICE_SETTINGS,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs stream failed (${response.status})`);
  }

  const emitFromBuffer = (buffer, flushRemainder = false) => {
    let offset = 0;
    while (offset + PCM_CHUNK_BYTES <= buffer.length) {
      onPcmChunk(bytesToBase64(buffer.slice(offset, offset + PCM_CHUNK_BYTES)));
      offset += PCM_CHUNK_BYTES;
    }
    if (flushRemainder && offset < buffer.length) {
      onPcmChunk(bytesToBase64(buffer.slice(offset)));
      return new Uint8Array(0);
    }
    return buffer.slice(offset);
  };

  const reader = response.body?.getReader?.();
  if (reader) {
    let pending = new Uint8Array(0);
    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;
      const merged = new Uint8Array(pending.length + value.length);
      merged.set(pending);
      merged.set(value, pending.length);
      pending = emitFromBuffer(merged);
    }
    emitFromBuffer(pending, true);
    return;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  emitFromBuffer(bytes, true);
}

export { base64ToBytes, bytesToBase64 };
