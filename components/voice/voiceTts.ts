import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  fetchElevenLabsMp3,
  fetchElevenLabsPcm,
  getElevenLabsDebugInfo,
  getElevenLabsVoiceId,
  isElevenLabsConfigured,
} from '../../utils/elevenLabs';
import { getVoiceVolume } from '../../utils/voiceVolume';
import { bytesToBase64, pcm16ToWavBase64, VOICE_SAMPLE_RATE } from './pcmUtils';

export interface SpeakAloudOptions {
  onStart?: () => void;
  onDone?: () => void;
  onAmplitude?: (amplitude: number) => void;
  onProvider?: (provider: 'elevenlabs' | 'system') => void;
  onElevenLabsError?: (message: string) => void;
  /** Slower, dreamier voice for meditations and stories. */
  sanctuarySession?: boolean;
  /** Soft, slow breath-guide delivery. */
  breathGuide?: boolean;
  /** Called before each segment in a long session (1-based index). */
  onSegmentStart?: (index: number, total: number) => void;
  /** After playback, restore mic-friendly audio mode (voice sanctuary). */
  restoreRecordMode?: boolean;
}

const SESSION_SEGMENT_PAUSE_MS = 1400;
const SESSION_CHUNK_TIMEOUT_MS = 240000;

let activeAbort: AbortController | null = null;
let activePlayer: AudioPlayer | null = null;
let ampInterval: ReturnType<typeof setInterval> | null = null;
/** Serializes playback so only one voice source runs at a time. */
let speakChain: Promise<void> = Promise.resolve();
let speakGeneration = 0;

/** expo-audio file playback is unreliable on iOS Simulator — use system TTS there. */
function isIosSimulator(): boolean {
  return Platform.OS === 'ios' && Constants.isDevice === false;
}

async function enterPlaybackMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: isIosSimulator() ? 'duckOthers' : 'doNotMix',
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

async function finishPlayback(options: SpeakAloudOptions): Promise<void> {
  if (options.restoreRecordMode) {
    await enterRecordMode().catch(() => {});
  } else {
    await enterPlaybackMode().catch(() => {});
  }
  options.onAmplitude?.(0);
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
  const vol = Math.max(await getVoiceVolume(), isIosSimulator() ? 1 : 0);
  const rate = options.breathGuide ? 0.8 : options.sanctuarySession ? 0.86 : 0.92;
  const pitch = options.breathGuide ? 1 : options.sanctuarySession ? 1.02 : 1.08;

  return new Promise<void>((resolve) => {
    Speech.speak(trimmed, {
      language: 'en-US',
      rate,
      pitch,
      volume: options.breathGuide ? vol * 0.82 : vol,
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
        void finishPlayback(options).finally(() => {
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
        void finishPlayback(options).finally(() => {
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
        void finishPlayback(options).finally(() => {
          options.onDone?.();
          resolve();
        });
      },
    });
  });
}

async function playElevenLabsFile(
  fileUri: string,
  generation: number,
  controller: AbortController,
  options: SpeakAloudOptions,
  finishTimeoutMs: number,
): Promise<void> {
  stopActivePlayer();
  const vol = await getVoiceVolume();
  activePlayer = createAudioPlayer({ uri: fileUri }, { updateInterval: 40 });
  await waitForPlayerReady(activePlayer);
  if (!isSpeakGenerationActive(generation) || controller.signal.aborted) {
    stopActivePlayer();
    throw new Error('Voice playback superseded');
  }
  activePlayer.volume = options.breathGuide ? vol * 0.75 : vol;
  activePlayer.play();

  // expo-audio often "plays" silently on iOS Simulator — detect and fall back to system TTS.
  await new Promise((resolve) => setTimeout(resolve, 320));
  const started = activePlayer.currentStatus;
  if (
    !controller.signal.aborted
    && isSpeakGenerationActive(generation)
    && !started.playing
    && !started.isBuffering
    && started.currentTime < 0.05
  ) {
    stopActivePlayer();
    throw new Error('Audio player did not start (simulator or session conflict)');
  }

  if (__DEV__) {
    console.log('[Emo voice] ElevenLabs playing', getElevenLabsVoiceId(), fileUri.slice(-8));
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
  await finishPlayback(options);
}

async function speakWithElevenLabs(trimmed: string, options: SpeakAloudOptions, finishTimeoutMs = 90000): Promise<void> {
  const generation = speakGeneration;
  haltAllVoiceOutput();
  const controller = new AbortController();
  activeAbort = controller;

  await enterPlaybackMode();

  options.onProvider?.('elevenlabs');
  options.onStart?.();

  let lastError: Error | null = null;

  // 1) PCM → WAV (most reliable on iOS simulator/device)
  try {
    const pcmBytes = await fetchElevenLabsPcm(trimmed, controller.signal, {
      sanctuarySession: options.sanctuarySession,
      breathGuide: options.breathGuide,
    });
    if (!pcmBytes?.length || controller.signal.aborted || !isSpeakGenerationActive(generation)) {
      throw new Error('Empty ElevenLabs PCM audio');
    }
    const wavBase64 = pcm16ToWavBase64(bytesToBase64(pcmBytes), VOICE_SAMPLE_RATE);
    const wavUri = `${FileSystem.cacheDirectory}emo-voice-${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(wavUri, wavBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await playElevenLabsFile(wavUri, generation, controller, options, finishTimeoutMs);
    return;
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    if (__DEV__) {
      console.warn('[Emo voice] PCM/WAV path failed:', lastError.message);
    }
  }

  // 2) MP3 fallback
  try {
    const mp3Bytes = await fetchElevenLabsMp3(trimmed, controller.signal, {
      sanctuarySession: options.sanctuarySession,
      breathGuide: options.breathGuide,
    });
    if (!mp3Bytes?.length || controller.signal.aborted || !isSpeakGenerationActive(generation)) {
      throw new Error('Empty ElevenLabs MP3 audio');
    }
    const mp3Uri = `${FileSystem.cacheDirectory}emo-voice-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(mp3Uri, bytesToBase64(mp3Bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    await playElevenLabsFile(mp3Uri, generation, controller, options, finishTimeoutMs);
    return;
  } catch (err) {
    const mp3Error = err instanceof Error ? err : new Error(String(err));
    if (__DEV__) {
      console.warn('[Emo voice] MP3 path failed:', mp3Error.message);
    }
    throw lastError ?? mp3Error;
  }
}

export function speakAloud(text: string, options: SpeakAloudOptions = {}): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();

  return enqueueSpeak(async () => {
    const generation = bumpSpeakGeneration();
    const useElevenLabs = isElevenLabsConfigured() && !isIosSimulator();

    if (useElevenLabs) {
      try {
        await speakWithElevenLabs(trimmed, options);
        if (isSpeakGenerationActive(generation)) {
          options.onDone?.();
        }
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ElevenLabs unavailable';
        options.onElevenLabsError?.(message);
        if (__DEV__) {
          console.warn('[Emo voice] ElevenLabs failed:', message, getElevenLabsDebugInfo());
        }
        if (!isSpeakGenerationActive(generation)) return;
        haltAllVoiceOutput();
        if (__DEV__) {
          console.warn('[Emo voice] ElevenLabs failed:', message, getElevenLabsDebugInfo());
        }
        options.onElevenLabsError?.(message);
        options.onDone?.();
        return;
      }
    }

    if (isIosSimulator()) {
      if (__DEV__) {
        console.log('[Emo voice] iOS Simulator — using system voice (ElevenLabs file playback is unreliable here)');
      }
      await speakWithExpoSpeech(trimmed, options);
      return;
    }

    if (__DEV__ && !isElevenLabsConfigured()) {
      console.warn('[Emo voice] ElevenLabs not configured', getElevenLabsDebugInfo());
    }

    options.onElevenLabsError?.('ElevenLabs not configured');
    options.onDone?.();
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

      if (isElevenLabsConfigured() && !isIosSimulator()) {
        try {
          await speakWithElevenLabs(parts[i], segmentOptions, SESSION_CHUNK_TIMEOUT_MS);
        } catch (err) {
          if (!isSpeakGenerationActive(generation)) break;
          if (__DEV__) console.warn('[Emo voice] session segment failed:', err);
          haltAllVoiceOutput();
          options.onElevenLabsError?.(err instanceof Error ? err.message : 'ElevenLabs unavailable');
        }
      } else if (isIosSimulator()) {
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

export function describeElevenLabsError(message: string): string {
  if (/quota|credit/i.test(message)) {
    return 'Emo voice credits are low — add credits at elevenlabs.io';
  }
  if (/invalid.*api|authentication|401|403/i.test(message)) {
    return 'Emo voice unavailable — check the sanctuary server and ElevenLabs config in server/.env';
  }
  return 'Emo voice unavailable — using device voice';
}

export function isUsingElevenLabsVoice(): boolean {
  return isElevenLabsConfigured();
}
