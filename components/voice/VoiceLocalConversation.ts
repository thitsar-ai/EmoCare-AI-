import AsyncStorage from '@react-native-async-storage/async-storage';
import { classifyEmoIntent } from '../../utils/emoIntent';
import { generateVoiceGreeting, generateVoiceReply } from '../../utils/emoVoiceReply';
import { getSyncFallbackOpening } from '../../utils/emoOpening';
import {
  detectVoiceSessionType,
  generateVoiceSession,
  getSessionStarterText,
  getSessionStatusLabel,
} from '../../utils/emoVoiceSession';
import {
  getSpeechRecognitionModule,
  isSpeechRecognitionSupported,
} from './speechRecognitionBridge';
import { isElevenLabsConfigured } from '../../utils/elevenLabs';
import { speakAloud, speakAloudSession, stopSpeaking, describeElevenLabsError } from './voiceTts';

type IntentMode = 'sanctuary' | 'oracle';
type VoiceSessionType = 'meditation' | 'story';

export interface VoiceLocalConversationOptions {
  onStatus?: (label: string) => void;
  onInputAmplitude?: (amplitude: number) => void;
  onOutputAmplitude?: (amplitude: number) => void;
  onIntent?: (mode: IntentMode) => void;
  onBeforeSpeak?: () => void;
  onAfterSpeak?: () => void;
  /** When true, parent should pipe mic metering into noteMicActivity. */
  onFallbackMode?: (enabled: boolean) => void;
  onVoiceProvider?: (provider: 'elevenlabs' | 'system') => void;
}

const RESPONSE_COOLDOWN_MS = 2800;
/** Ignore mic input briefly after Emo speaks — prevents speaker→mic echo loops. */
const POST_SPEAK_MUTE_MS = 5000;

/**
 * On-device voice loop: speech recognition → Anthropic → TTS.
 * Expo Go fallback: speak, then tap button — mic resumes after Emo finishes.
 */
export class VoiceLocalConversation {
  private options: VoiceLocalConversationOptions;

  private active = false;

  private processing = false;

  private speaking = false;

  private outputMuted = false;

  private fallbackMode = false;

  private hasGreeted = false;

  private userName = 'friend';

  private listeners: { remove: () => void }[] = [];

  private ampPulse: ReturnType<typeof setInterval> | null = null;

  private lastInterim = '';

  private lastResponseAt = 0;

  /** Last text Emo spoke — used to reject echo transcripts. */
  private lastSpokenText = '';

  private postSpeakMuteUntil = 0;

  /** Continuous STT off by default; Voice Talk is type-first (tap Emo / type). */
  private continuousListen = false;

  constructor(options: VoiceLocalConversationOptions = {}) {
    this.options = options;
  }

  noteMicActivity(amplitude: number): void {
    if (!this.active || this.speaking || this.processing || !this.fallbackMode) return;
    if (amplitude > 0.08) {
      this.options.onInputAmplitude?.(amplitude);
    }
  }

  async start(): Promise<boolean> {
    if (this.active) return true;

    const stored = await AsyncStorage.getItem('userName');
    this.userName = stored?.trim() || 'friend';
    this.active = true;

    const speechModule = getSpeechRecognitionModule();
    const sttReady = speechModule && isSpeechRecognitionSupported();

    if (sttReady && speechModule) {
      const perms = await speechModule.requestPermissionsAsync();
      if (perms.granted) {
        this.attachListeners(speechModule);
      }
    }

    // Type-first: do not leave the mic open — speaker output was re-triggering replies.
    this.fallbackMode = true;
    this.continuousListen = false;
    this.options.onFallbackMode?.(true);
    this.options.onStatus?.('Tap Emo or type a message');
    return true;
  }

  async playWelcomeGreeting(): Promise<void> {
    if (!this.active || this.processing || this.speaking) return;

    this.outputMuted = false;

    const speechModule = getSpeechRecognitionModule();
    try {
      speechModule?.abort();
    } catch {}
    try {
      speechModule?.stop();
    } catch {}

    // Brief pause lets iOS release the mic before playback.
    await new Promise((resolve) => setTimeout(resolve, 180));

    if (!this.active || this.processing || this.speaking) return;

    this.processing = true;
    this.options.onStatus?.('Emo is preparing…');

    let greeting = '';
    try {
      greeting = await generateVoiceGreeting(this.userName);
    } catch {
      greeting = getSyncFallbackOpening(this.userName, 'voice');
    }

    if (!this.active) {
      this.processing = false;
      return;
    }

    this.hasGreeted = true;
    try {
      await this.speak(greeting.trim() || getSyncFallbackOpening(this.userName, 'voice'));
    } finally {
      if (!this.speaking) {
        this.processing = false;
      }
    }
  }

  submitMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || !this.active || this.processing || this.speaking) return;
    void this.handleUtterance(trimmed);
  }

  submitSession(sessionType: VoiceSessionType): void {
    if (!this.active || this.processing || this.speaking) return;
    void this.handleUtterance(getSessionStarterText(sessionType), sessionType);
  }

  stop(): void {
    this.active = false;
    this.processing = false;
    this.speaking = false;
    this.fallbackMode = false;
    this.outputMuted = false;
    this.hasGreeted = false;
    this.options.onFallbackMode?.(false);
    this.stopAmpPulse();
    stopSpeaking();

    const speechModule = getSpeechRecognitionModule();
    try {
      speechModule?.abort();
    } catch {}

    this.listeners.forEach((sub) => sub.remove());
    this.listeners = [];
  }

  bargeIn(): void {
    if (this.processing || this.speaking) {
      this.interruptSpeaking();
    }

    const pending = this.lastInterim.trim();
    this.lastInterim = '';

    if (pending.length > 2) {
      void this.handleUtterance(pending);
      return;
    }

    if (this.fallbackMode) {
      this.options.onStatus?.('Type your message · Emo speaks back');
      return;
    }

    const speechModule = getSpeechRecognitionModule();
    this.options.onStatus?.('Listening…');
    if (speechModule) {
      this.beginListening(speechModule);
    }
  }

  interruptSpeaking(): void {
    stopSpeaking();
    this.speaking = false;
    this.processing = false;
    this.stopAmpPulse();
    this.options.onOutputAmplitude?.(0);
    this.options.onAfterSpeak?.();
  }

  setOutputMuted(muted: boolean): void {
    this.outputMuted = muted;
    if (muted) {
      this.interruptSpeaking();
    }
  }

  private attachListeners(speechModule: NonNullable<ReturnType<typeof getSpeechRecognitionModule>>): void {
    const onResult = (event: unknown) => {
      if (this.speaking || this.processing) return;
      const payload = event as {
        results?: Array<{ transcript?: string }>;
        isFinal?: boolean;
      };
      const transcript = payload.results?.[0]?.transcript?.trim() || '';
      if (!transcript) return;
      if (Date.now() < this.postSpeakMuteUntil) return;
      if (this.isEchoOfLastReply(transcript)) return;
      this.lastInterim = transcript;
      this.options.onInputAmplitude?.(0.25 + Math.min(0.65, transcript.length / 80));

      if (payload.isFinal) {
        void this.handleUtterance(transcript);
      }
    };

    const onEnd = () => {
      if (!this.active || this.speaking || this.processing || this.fallbackMode || !this.continuousListen) {
        return;
      }
      this.options.onStatus?.('Listening…');
      setTimeout(() => {
        if (this.active && !this.speaking && !this.processing && !this.fallbackMode) {
          this.beginListening(speechModule);
        }
      }, 400);
    };

    const onError = () => {
      if (!this.active || this.speaking || this.fallbackMode || !this.continuousListen) return;
      setTimeout(() => {
        if (this.active && !this.speaking && !this.processing && !this.fallbackMode) {
          this.beginListening(speechModule);
        }
      }, 700);
    };

    this.listeners.push(
      speechModule.addListener('result', onResult),
      speechModule.addListener('end', onEnd),
      speechModule.addListener('error', onError),
    );
  }

  private beginListening(speechModule: NonNullable<ReturnType<typeof getSpeechRecognitionModule>>): void {
    if (!this.active || this.speaking || this.processing || this.fallbackMode) return;
    try {
      speechModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false,
      });
      this.options.onStatus?.('Listening…');
    } catch {
      this.options.onStatus?.('Listening…');
    }
  }

  private isEchoOfLastReply(text: string): boolean {
    const t = text.trim().toLowerCase();
    const last = this.lastSpokenText;
    if (!t || !last) return false;
    if (t === last) return true;
    const snippet = last.slice(0, Math.min(48, last.length));
    if (snippet.length >= 16 && t.includes(snippet)) return true;
    if (t.length >= 16 && last.includes(t.slice(0, Math.min(48, t.length)))) return true;
    return false;
  }

  private markSpoken(text: string): void {
    this.lastSpokenText = text.trim().toLowerCase();
    this.postSpeakMuteUntil = Date.now() + POST_SPEAK_MUTE_MS;
  }

  private async resumeListeningIfNeeded(): Promise<void> {
    if (!this.active || this.fallbackMode || !this.continuousListen) {
      this.options.onStatus?.('Tap Emo or type a message');
      return;
    }
    const speechModule = getSpeechRecognitionModule();
    if (speechModule) {
      await new Promise((resolve) => setTimeout(resolve, POST_SPEAK_MUTE_MS));
      if (this.active && !this.speaking && !this.processing && !this.fallbackMode) {
        this.beginListening(speechModule);
      }
    }
  }

  private async releaseListeningForPlayback(): Promise<void> {
    if (this.speaking) {
      this.interruptSpeaking();
    }
    const speechModule = getSpeechRecognitionModule();
    try {
      speechModule?.abort();
    } catch {}
    try {
      speechModule?.stop();
    } catch {}
    stopSpeaking();
    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  private async handleUtterance(
    transcript: string,
    forcedSession?: VoiceSessionType,
  ): Promise<void> {
    const text = transcript.trim();
    if (!text || this.processing || this.speaking || !this.active) return;

    if (Date.now() < this.postSpeakMuteUntil) return;
    if (this.isEchoOfLastReply(text)) return;

    const now = Date.now();
    if (now - this.lastResponseAt < RESPONSE_COOLDOWN_MS) return;

    this.processing = true;
    this.lastInterim = '';
    this.lastResponseAt = now;

    await this.releaseListeningForPlayback();
    if (!this.active || this.speaking) {
      this.processing = false;
      return;
    }

    this.options.onInputAmplitude?.(0);

    const sessionType = forcedSession || detectVoiceSessionType(text);
    if (sessionType === 'meditation' || sessionType === 'story') {
      await this.speakSession(sessionType, text);
      return;
    }

    this.options.onStatus?.('Thinking…');
    const { mode } = classifyEmoIntent(text);
    this.options.onIntent?.(mode);

    try {
      const reply = await generateVoiceReply({ userText: text, userName: this.userName });
      if (!this.active) {
        this.processing = false;
        return;
      }
      await this.speak(reply);
    } catch (err) {
      if (__DEV__) console.warn('[Emo voice] handleUtterance failed:', err);
      if (this.active) {
        await this.speak("I'm right here with you. Could you say that once more?");
      }
    } finally {
      if (!this.speaking) {
        this.processing = false;
      }
    }
  }

  private async speakSession(sessionType: VoiceSessionType, userText: string): Promise<void> {
    this.options.onStatus?.(getSessionStatusLabel(sessionType, 'generating'));

    try {
      const session = await generateVoiceSession({
        sessionType,
        userText,
        userName: this.userName,
      });

      if (!this.active) {
        this.processing = false;
        return;
      }

      if (!session?.segments?.length) {
        await this.speak('Close your eyes if you like. Breathe in slowly... and let a soft exhale carry the day away.');
        return;
      }

      this.markSpoken(session.segments.join(' '));

      if (this.outputMuted) {
        this.processing = false;
        this.options.onStatus?.('Muted');
        return;
      }

      this.speaking = true;
      this.processing = false;
      this.options.onBeforeSpeak?.();
      this.options.onStatus?.(
        `${getSessionStatusLabel(sessionType, 'speaking')} · ~${session.estimatedMinutes} min`,
      );

      if (!isElevenLabsConfigured()) {
        this.startAmpPulse();
      }

      await speakAloudSession(session.segments, {
        restoreRecordMode: true,
        sanctuarySession: true,
        onProvider: (provider) => {
          this.options.onVoiceProvider?.(provider);
        },
        onSegmentStart: (index, total) => {
          this.options.onStatus?.(
            `${getSessionStatusLabel(sessionType, 'speaking')} · part ${index} of ${total}`,
          );
        },
        onAmplitude: (amp) => {
          this.stopAmpPulse();
          this.options.onOutputAmplitude?.(amp);
        },
        onDone: () => {
          this.finishSpeaking();
        },
      });
    } catch {
      if (!this.active) {
        this.processing = false;
        return;
      }
      await this.speak('Let us pause together. One breath in... and a gentle breath out.');
      return;
    }

    if (!this.active) return;

    if (this.fallbackMode) {
      this.options.onStatus?.('Tap Emo or type a message');
      return;
    }

    await this.resumeListeningIfNeeded();
  }

  private async speak(text: string): Promise<void> {
    if (!this.active || !text.trim()) return;

    this.markSpoken(text);

    if (this.outputMuted) {
      this.processing = false;
      this.options.onStatus?.('Muted');
      this.options.onAfterSpeak?.();
      return;
    }

    this.speaking = true;
    this.processing = false;
    this.options.onBeforeSpeak?.();
    this.options.onStatus?.('Emo is speaking…');
    if (!isElevenLabsConfigured()) {
      this.startAmpPulse();
    }

    await speakAloud(text, {
      restoreRecordMode: true,
      onStart: () => {
        this.options.onStatus?.('Emo is speaking…');
      },
      onProvider: (provider) => {
        this.options.onVoiceProvider?.(provider);
        if (provider === 'elevenlabs') {
          this.options.onStatus?.('Emo is speaking…');
        } else {
          this.options.onStatus?.('Emo is speaking · device voice');
        }
      },
      onElevenLabsError: (message) => {
        this.options.onStatus?.(describeElevenLabsError(message));
      },
      onAmplitude: (amp) => {
        this.stopAmpPulse();
        this.options.onOutputAmplitude?.(amp);
      },
      onDone: () => {
        this.finishSpeaking();
      },
    });

    if (!this.active) return;

    if (this.fallbackMode) {
      this.options.onStatus?.('Tap Emo or type a message');
      return;
    }

    await this.resumeListeningIfNeeded();
  }

  private finishSpeaking(): void {
    this.speaking = false;
    this.processing = false;
    this.stopAmpPulse();
    this.options.onOutputAmplitude?.(0);
    this.options.onAfterSpeak?.();
  }

  private startAmpPulse(): void {
    this.stopAmpPulse();
    this.ampPulse = setInterval(() => {
      this.options.onOutputAmplitude?.(0.22 + Math.random() * 0.48);
    }, 90);
  }

  private stopAmpPulse(): void {
    if (this.ampPulse) {
      clearInterval(this.ampPulse);
      this.ampPulse = null;
    }
  }
}
