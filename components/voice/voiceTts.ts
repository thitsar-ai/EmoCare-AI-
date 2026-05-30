import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import {
  fetchElevenLabsPcm,
  getElevenLabsVoiceId,
  isElevenLabsConfigured,
} from '../../utils/elevenLabs';
import { bytesToBase64, pcm16ToWavBase64, VOICE_SAMPLE_RATE } from './pcmUtils';

export interface SpeakAloudOptions {
  onStart?: () => void;
  onDone?: () => void;
  onAmplitude?: (amplitude: number) => void;
  onProvider?: (provider: 'elevenlabs' | 'system') => void;
  /** Slower, dreamier voice for meditations and stories. */
  sanctuarySession?: boolean;
  /** Called before each segment in a long session (1-based index). */
  onSegmentStart?: (index: number, total: number) => void;
}

const SESSION_SEGMENT_PAUSE_MS = 1400;
const SESSION_CHUNK_TIMEOUT_MS = 240000;

let activeAbort: AbortController | null = null;
let activePlayer: AudioPlayer | null = null;
let ampInterval: ReturnType<typeof setInterval> | null = null;
/** Serializes playback so only one voice source runs at a time. */
let speakChain: Promise<void> = Promise.resolve();
let speakGeneration = 0;

async function enterPlaybackMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'doNotMix',
  });
}

async function enterRecordMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
}

function clearAmpPulse(): void {
  if (ampInterval) {
    clearInterval(ampInterval);
    ampInterval = null;
  }
}

function stopActivePlayer(): void {
  clearAmpPulse();
  try {
    activePlayer?.pause();
    activePlayer?.remove();
  } catch {}
  activePlayer = null;
}

function bumpSpeakGeneration(): number {
  speakGeneration += 1;
  return speakGeneration;
}

function isSpeakGenerationActive(generation: number): boolean {
  return generation === speakGeneration;
}

/** Stop every active voice source before starting another. */
function haltAllVoiceOutput(): void {
  activeAbort?.abort();
  activeAbort = null;
  stopActivePlayer();
  try {
    Speech.stop();
  } catch {}
}

export function stopSpeaking(): void {
  bumpSpeakGeneration();
  haltAllVoiceOutput();
}

function enqueueSpeak<T>(task: () => Promise<T>): Promise<T> {
  const run = speakChain.then(task, task);
  speakChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function waitForPlayerReady(player: AudioPlayer, timeoutMs = 12000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = setInterval(() => {
      const status = player.currentStatus;
      if (status.isLoaded) {
        clearInterval(tick);
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(tick);
        reject(new Error('Voice audio failed to load'));
      }
    }, 40);
  });
}

function hasPlayerFinished(status: AudioPlayer['currentStatus']): boolean {
  if (status.didJustFinish) return true;
  if (!status.isLoaded || status.playing || status.isBuffering) return false;
  if (status.duration > 0.2) {
    return status.currentTime >= status.duration - 0.18;
  }
  return false;
}

async function waitForPlayerFinish(player: AudioPlayer, signal: AbortSignal, timeoutMs = 90000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = setInterval(() => {
      if (signal.aborted || !player) {
        clearInterval(tick);
        resolve();
        return;
      }
      const status = player.currentStatus;
      if (hasPlayerFinished(status)) {
        clearInterval(tick);
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(tick);
        resolve();
      }
    }, 45);
  });
}

async function speakWithExpoSpeech(trimmed: string, options: SpeakAloudOptions): Promise<void> {
  const generation = speakGeneration;
  haltAllVoiceOutput();
  options.onProvider?.('system');
  await enterPlaybackMode();

  return new Promise<void>((resolve) => {
    Speech.speak(trimmed, {
      language: 'en-US',
      rate: 0.92,
      pitch: 1.08,
      volume: 1.0,
      onStart: () => {
        if (!isSpeakGenerationActive(generation)) return;
        options.onStart?.();
        ampInterval = setInterval(() => {
          options.onAmplitude?.(0.18 + Math.random() * 0.22);
        }, 90);
      },
      onDone: () => {
        if (!isSpeakGenerationActive(generation)) {
          resolve();
          return;
        }
        clearAmpPulse();
        void enterRecordMode().finally(() => {
          options.onAmplitude?.(0);
          options.onDone?.();
          resolve();
        });
      },
      onStopped: () => {
        if (!isSpeakGenerationActive(generation)) {
          resolve();
          return;
        }
        clearAmpPulse();
        void enterRecordMode().finally(() => {
          options.onAmplitude?.(0);
          options.onDone?.();
          resolve();
        });
      },
      onError: () => {
        if (!isSpeakGenerationActive(generation)) {
          resolve();
          return;
        }
        clearAmpPulse();
        void enterRecordMode().finally(() => {
          options.onAmplitude?.(0);
          options.onDone?.();
          resolve();
        });
      },
    });
  });
}

async function speakWithElevenLabs(trimmed: string, options: SpeakAloudOptions, finishTimeoutMs = 90000): Promise<void> {
  const generation = speakGeneration;
  haltAllVoiceOutput();
  const controller = new AbortController();
  activeAbort = controller;

  await enterPlaybackMode();

  options.onProvider?.('elevenlabs');
  options.onStart?.();

  const pcmBytes = await fetchElevenLabsPcm(trimmed, controller.signal, {
    sanctuarySession: options.sanctuarySession,
  });
  if (!pcmBytes?.length || controller.signal.aborted || !isSpeakGenerationActive(generation)) {
    throw new Error('Empty ElevenLabs audio');
  }

  const pcmBase64 = bytesToBase64(pcmBytes);
  const wavBase64 = pcm16ToWavBase64(pcmBase64, VOICE_SAMPLE_RATE);
  const fileUri = `${FileSystem.cacheDirectory}emo-voice-${Date.now()}.wav`;

  await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!isSpeakGenerationActive(generation)) {
    throw new Error('Voice playback superseded');
  }

  stopActivePlayer();
  activePlayer = createAudioPlayer({ uri: fileUri }, { updateInterval: 40 });
  await waitForPlayerReady(activePlayer);
  if (!isSpeakGenerationActive(generation) || controller.signal.aborted) {
    stopActivePlayer();
    throw new Error('Voice playback superseded');
  }
  activePlayer.play();

  if (__DEV__) {
    console.log('[Emo voice] ElevenLabs playing', getElevenLabsVoiceId());
  }

  ampInterval = setInterval(() => {
    if (!activePlayer || controller.signal.aborted) return;
    const status = activePlayer.currentStatus;
    if (status.playing) {
      options.onAmplitude?.(0.28 + Math.random() * 0.38);
    }
  }, 75);

  await waitForPlayerFinish(activePlayer, controller.signal, finishTimeoutMs);

  FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});

  if (!isSpeakGenerationActive(generation)) return;

  clearAmpPulse();
  stopActivePlayer();
  await enterRecordMode().catch(() => {});
  options.onAmplitude?.(0);
}

export function speakAloud(text: string, options: SpeakAloudOptions = {}): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();

  return enqueueSpeak(async () => {
    const generation = bumpSpeakGeneration();

    if (isElevenLabsConfigured()) {
      try {
        await speakWithElevenLabs(trimmed, options);
        if (isSpeakGenerationActive(generation)) {
          options.onDone?.();
        }
        return;
      } catch (err) {
        if (__DEV__) {
          console.warn('[Emo voice] ElevenLabs failed:', err?.message);
        }
        if (!isSpeakGenerationActive(generation)) return;
        haltAllVoiceOutput();
        options.onProvider?.('system');
        await speakWithExpoSpeech(trimmed, options);
        return;
      }
    }

    await speakWithExpoSpeech(trimmed, options);
  });
}

/** Speak a long meditation or story in sequential calm segments. */
export async function speakAloudSession(segments: string[], options: SpeakAloudOptions = {}): Promise<void> {
  const parts = segments.map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return;

  return enqueueSpeak(async () => {
    const generation = bumpSpeakGeneration();
    let started = false;

    for (let i = 0; i < parts.length; i += 1) {
      if (!isSpeakGenerationActive(generation) || activeAbort?.signal.aborted) break;

      options.onSegmentStart?.(i + 1, parts.length);
      if (!started) {
        options.onStart?.();
        started = true;
      }

      const segmentOptions: SpeakAloudOptions = {
        ...options,
        sanctuarySession: true,
        onStart: undefined,
        onDone: undefined,
      };

      if (isElevenLabsConfigured()) {
        try {
          await speakWithElevenLabs(parts[i], segmentOptions, SESSION_CHUNK_TIMEOUT_MS);
        } catch (err) {
          if (!isSpeakGenerationActive(generation)) break;
          if (__DEV__) console.warn('[Emo voice] session segment failed:', err);
          haltAllVoiceOutput();
          await speakWithExpoSpeech(parts[i], segmentOptions);
        }
      } else {
        await speakWithExpoSpeech(parts[i], segmentOptions);
      }

      if (i < parts.length - 1 && isSpeakGenerationActive(generation) && !activeAbort?.signal.aborted) {
        await new Promise((r) => setTimeout(r, SESSION_SEGMENT_PAUSE_MS));
      }
    }

    if (isSpeakGenerationActive(generation)) {
      options.onDone?.();
    }
  });
}

export function isUsingElevenLabsVoice(): boolean {
  return isElevenLabsConfigured();
}
