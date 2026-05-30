/** Default voice pipeline — 16-bit PCM mono little-endian. */
export const VOICE_SAMPLE_RATE = 24000;
export const VOICE_CHANNELS = 1;
export const VOICE_BYTES_PER_SAMPLE = 2;

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** RMS amplitude 0–1 from PCM16 LE base64 chunk. */
export function pcm16Base64Amplitude(base64: string): number {
  if (!base64) return 0;
  try {
    const bytes = base64ToBytes(base64);
    if (bytes.length < 2) return 0;
    let sumSquares = 0;
    const sampleCount = Math.floor(bytes.length / 2);
    for (let i = 0; i < sampleCount; i += 1) {
      const lo = bytes[i * 2];
      const hi = bytes[i * 2 + 1];
      let sample = lo | (hi << 8);
      if (sample >= 0x8000) sample -= 0x10000;
      const normalized = sample / 32768;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / sampleCount);
    return Math.min(1, rms * 4.2);
  } catch {
    return 0;
  }
}

/** Wrap raw PCM16 LE in a minimal WAV container; returns base64 WAV. */
export function pcm16ToWavBase64(
  pcmBase64: string,
  sampleRate = VOICE_SAMPLE_RATE,
  channels = VOICE_CHANNELS,
): string {
  const pcmBytes = base64ToBytes(pcmBase64);
  const byteRate = sampleRate * channels * VOICE_BYTES_PER_SAMPLE;
  const blockAlign = channels * VOICE_BYTES_PER_SAMPLE;
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, 44);
  return bytesToBase64(wavBytes);
}

/** Convert expo-audio metering dB (typically -160…0) to 0–1. */
export function meteringToAmplitude(metering?: number): number {
  if (typeof metering !== 'number' || Number.isNaN(metering)) return 0;
  const clamped = Math.max(-60, Math.min(0, metering));
  return Math.min(1, (clamped + 60) / 60);
}
