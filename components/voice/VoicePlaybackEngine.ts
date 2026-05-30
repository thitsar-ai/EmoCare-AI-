import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import {
  pcm16Base64Amplitude,
  pcm16ToWavBase64,
  VOICE_SAMPLE_RATE,
} from './pcmUtils';

export type PlaybackAmplitudeListener = (amplitude: number) => void;

/**
 * Non-blocking PCM16 playback queue with barge-in support.
 * Chunks are written to cache as WAV segments and played sequentially off the JS thread's async queue.
 */
export class VoicePlaybackEngine {
  private queue: string[] = [];

  private playing = false;

  private bargeInActive = false;

  private player: AudioPlayer | null = null;

  private currentFile: string | null = null;

  private onAmplitude: PlaybackAmplitudeListener | null = null;

  async prepare(): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
  }

  setAmplitudeListener(listener: PlaybackAmplitudeListener | null): void {
    this.onAmplitude = listener;
  }

  /** Push incoming provider PCM chunk — safe to call from WebSocket handler. */
  enqueuePcmChunk(base64Pcm: string): void {
    if (this.bargeInActive || !base64Pcm) return;
    this.onAmplitude?.(pcm16Base64Amplitude(base64Pcm));
    this.queue.push(base64Pcm);
    void this.drainQueue();
  }

  /** Immediately dampen and cut playback for barge-in. */
  bargeIn(): void {
    this.bargeInActive = true;
    this.queue = [];
    this.playing = false;
    this.onAmplitude?.(0);

    try {
      this.player?.pause();
      this.player?.remove();
    } catch {}
    this.player = null;

    if (this.currentFile) {
      FileSystem.deleteAsync(this.currentFile, { idempotent: true }).catch(() => {});
      this.currentFile = null;
    }

    setTimeout(() => {
      this.bargeInActive = false;
    }, 80);
  }

  async stop(): Promise<void> {
    this.bargeIn();
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }

  /** Resolves once the queue has finished playing (or barge-in). */
  waitUntilIdle(timeoutMs = 120000): Promise<void> {
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (this.bargeInActive || (!this.playing && this.queue.length === 0)) {
          resolve();
          return;
        }
        if (Date.now() - started > timeoutMs) {
          resolve();
          return;
        }
        setTimeout(tick, 40);
      };
      tick();
    });
  }

  private async drainQueue(): Promise<void> {
    if (this.playing || this.bargeInActive || !this.queue.length) return;
    this.playing = true;

    while (this.queue.length && !this.bargeInActive) {
      const chunk = this.queue.shift();
      if (!chunk) break;

      try {
        await this.playChunk(chunk);
      } catch {
        // Skip corrupt chunk; continue pipeline.
      }
    }

    this.playing = false;
    this.onAmplitude?.(0);

    if (this.queue.length && !this.bargeInActive) {
      void this.drainQueue();
    }
  }

  private async playChunk(base64Pcm: string): Promise<void> {
    const wavBase64 = pcm16ToWavBase64(base64Pcm, VOICE_SAMPLE_RATE);
    const fileUri = `${FileSystem.cacheDirectory}emo-voice-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;

    await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (this.currentFile) {
      FileSystem.deleteAsync(this.currentFile, { idempotent: true }).catch(() => {});
    }
    this.currentFile = fileUri;

    if (this.player) {
      this.player.remove();
    }

    this.player = createAudioPlayer({ uri: fileUri }, { updateInterval: 40 });
    this.player.play();

    await new Promise<void>((resolve) => {
      const started = Date.now();
      const tick = setInterval(() => {
        if (!this.player || this.bargeInActive) {
          clearInterval(tick);
          resolve();
          return;
        }
        const status = this.player.currentStatus;
        if (status.didJustFinish || (status.isLoaded && !status.playing && status.currentTime > 0.02)) {
          clearInterval(tick);
          resolve();
          return;
        }
        if (Date.now() - started > 12000) {
          clearInterval(tick);
          resolve();
        }
      }, 45);
    });
  }
}
