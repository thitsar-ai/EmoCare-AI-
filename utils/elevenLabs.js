import { bytesToBase64, base64ToBytes } from '../components/voice/pcmUtils';
import { emocareFetch, getElevenLabsVoiceIdFromConfig, isElevenLabsConfigured } from './emocareApi';

/**
 * Rachel — warm, clear ElevenLabs premade voice (Human Acoustic Layer).
 */
export const ELEVENLABS_DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

/** Default TTS model — flash uses the fewest credits. */
export const ELEVENLABS_MODEL = 'eleven_flash_v2_5';

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

/** Soft breath guide — stable, warm, unhurried (no speaker boost). */
export const EMO_BREATH_VOICE_SETTINGS = {
  stability: 0.72,
  similarity_boost: 0.76,
  use_speaker_boost: false,
  speed: 0.84,
};

/** @deprecated Keys live on the server. */
export function getElevenLabsApiKey() {
  return isElevenLabsConfigured() ? 'proxy' : '';
}

export function getElevenLabsVoiceId() {
  const fromConfig = getElevenLabsVoiceIdFromConfig();
  return fromConfig || ELEVENLABS_DEFAULT_VOICE_ID;
}

export function getElevenLabsDebugInfo() {
  return {
    configured: isElevenLabsConfigured(),
    keyLength: isElevenLabsConfigured() ? 5 : 0,
    voiceId: getElevenLabsVoiceId(),
    fromEnv: false,
    fromExtra: false,
  };
}

export { isElevenLabsConfigured };

/** Gentle pacing for calm, soothing delivery. */
export function prepareSanctuarySpeechText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1  ')
    .replace(/[,;]\s*/g, ', ');
}

/** Extra spacing for short breath cues — smoother phrase endings. */
export function prepareBreathSpeechText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1   ')
    .replace(/[,;]\s*/g, ',  ')
    .replace(/\.\.\./g, '… ');
}

async function requestElevenLabsAudio(
  text,
  outputFormat,
  signal,
  { sanctuarySession = false, breathGuide = false } = {},
) {
  const trimmed = breathGuide ? prepareBreathSpeechText(text) : prepareSanctuarySpeechText(text);
  if (!trimmed) return null;

  if (!isElevenLabsConfigured()) {
    throw new Error('ElevenLabs not configured on sanctuary server');
  }

  const response = await emocareFetch('/v1/elevenlabs/tts', {
    method: 'POST',
    body: JSON.stringify({
      text: trimmed,
      output_format: outputFormat,
      sanctuarySession,
      breathGuide,
      voice_id: getElevenLabsVoiceId(),
    }),
    signal,
  });

  if (!response.ok) {
    let detail = `ElevenLabs TTS failed (${response.status})`;
    try {
      const err = await response.json();
      if (typeof err?.error?.message === 'string' && err.error.message.length) {
        detail = err.error.message;
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

  if (!isElevenLabsConfigured()) {
    throw new Error('ElevenLabs not configured on sanctuary server');
  }

  const response = await emocareFetch('/v1/elevenlabs/tts', {
    method: 'POST',
    body: JSON.stringify({
      text: trimmed,
      output_format: 'pcm_24000',
      voice_id: getElevenLabsVoiceId(),
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
