import { VoicePlaybackEngine } from './VoicePlaybackEngine';
import { pcm16Base64Amplitude, VOICE_SAMPLE_RATE } from './pcmUtils';

export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export type VoiceStreamEvent =
  | { type: 'connection'; state: VoiceConnectionState }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'intent'; mode: 'sanctuary' | 'oracle' }
  | { type: 'error'; message: string };

export interface VoiceStreamClientOptions {
  url: string;
  onEvent?: (event: VoiceStreamEvent) => void;
  onInputAmplitude?: (amplitude: number) => void;
  onOutputAmplitude?: (amplitude: number) => void;
}

/**
 * Stateful WebSocket wrapper for real-time PCM16 voice streaming.
 * Handles provider audio chunks off the render path and supports barge-in.
 */
export class VoiceStreamClient {
  private ws: WebSocket | null = null;

  private playback = new VoicePlaybackEngine();

  private turnId = '';

  private state: VoiceConnectionState = 'idle';

  constructor(private options: VoiceStreamClientOptions) {
    this.playback.setAmplitudeListener((amp) => {
      this.options.onOutputAmplitude?.(amp);
    });
  }

  get connectionState(): VoiceConnectionState {
    return this.state;
  }

  async connect(timeoutMs = 5000): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setState('connecting');
    await this.playback.prepare();

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        try {
          this.ws?.close();
        } catch {}
        this.ws = null;
        this.setState('error');
        finish(() => reject(new Error('Voice connection timeout')));
      }, timeoutMs);

      try {
        this.ws = new WebSocket(this.options.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.turnId = `${Date.now()}`;
          this.sendJson({
            type: 'start',
            sampleRate: VOICE_SAMPLE_RATE,
            encoding: 'pcm16le',
            turnId: this.turnId,
          });
          this.setState('connected');
          finish(resolve);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = () => {
          this.setState('error');
          this.options.onEvent?.({ type: 'error', message: 'Voice connection failed' });
          finish(() => reject(new Error('WebSocket error')));
        };

        this.ws.onclose = () => {
          if (!settled) {
            this.setState('error');
            finish(() => reject(new Error('WebSocket closed')));
            return;
          }
          this.setState('idle');
        };
      } catch (error) {
        this.setState('error');
        finish(() => reject(error));
      }
    });
  }

  disconnect(): void {
    this.sendJson({ type: 'stop', turnId: this.turnId });
    this.ws?.close();
    this.ws = null;
    void this.playback.stop();
    this.setState('idle');
  }

  /** Send mic PCM16 chunk (base64) without blocking UI. */
  sendAudioChunk(base64Pcm: string): void {
    if (!base64Pcm || this.ws?.readyState !== WebSocket.OPEN) return;
    this.options.onInputAmplitude?.(pcm16Base64Amplitude(base64Pcm));
    this.sendJson({
      type: 'audio',
      turnId: this.turnId,
      data: base64Pcm,
      encoding: 'pcm16le',
    });
  }

  /** Barge-in — cut Emo playback and signal server to listen. */
  bargeIn(): void {
    this.playback.bargeIn();
    this.turnId = `${Date.now()}`;
    this.sendJson({ type: 'barge_in', turnId: this.turnId });
  }

  private handleMessage(data: string | ArrayBuffer): void {
    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      this.playback.enqueuePcmChunk(btoa(binary));
      return;
    }

    try {
      const msg = JSON.parse(data as string) as {
        type?: string;
        data?: string;
        text?: string;
        isFinal?: boolean;
        mode?: 'sanctuary' | 'oracle';
      };

      if (msg.type === 'audio' && msg.data) {
        this.playback.enqueuePcmChunk(msg.data);
        return;
      }

      if (msg.type === 'transcript' && msg.text) {
        this.options.onEvent?.({ type: 'transcript', text: msg.text, isFinal: Boolean(msg.isFinal) });
        return;
      }

      if (msg.type === 'intent' && msg.mode) {
        this.options.onEvent?.({ type: 'intent', mode: msg.mode });
      }
    } catch {
      // Ignore malformed frames.
    }
  }

  private sendJson(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private setState(state: VoiceConnectionState): void {
    this.state = state;
    this.options.onEvent?.({ type: 'connection', state });
  }
}
