import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { classifyEmoIntent } from '../../utils/emoIntent';
import { isElevenLabsConfigured } from '../../utils/elevenLabs';
import { SANCTUARY_SPRING } from '../LivingCanvas';
import { useSanctuaryAmbient } from '../SanctuaryAmbientContext';
import { VoiceStreamClient, type VoiceConnectionState } from './VoiceStreamClient';
import { VoiceLocalConversation } from './VoiceLocalConversation';
import { meteringToAmplitude } from './pcmUtils';

const RELAY_CONNECT_MS = 4500;

export type VoicePipelineMode = 'relay' | 'local';

function resolveVoiceWsUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_VOICE_WS_URL?.trim();
  if (!fromEnv) return null;
  return fromEnv.replace(/^["']|["']$/g, '');
}

export type VoiceIntentMode = 'sanctuary' | 'oracle';

interface VoiceStreamContextValue {
  isVoiceModeActive: SharedValue<number>;
  audioVolume: SharedValue<number>;
  voiceIntent: SharedValue<number>;
  connectionState: VoiceConnectionState;
  pipelineMode: VoicePipelineMode;
  isListening: boolean;
  statusLabel: string;
  requiresTextInput: boolean;
  enterVoiceMode: () => Promise<void>;
  exitVoiceMode: () => void;
  bargeIn: () => void;
  submitVoiceMessage: (text: string) => void;
  submitVoiceSession: (sessionType: 'meditation' | 'story') => void;
}

const VoiceStreamContext = createContext<VoiceStreamContextValue | null>(null);

async function startMicRecording(recorder: ReturnType<typeof useAudioRecorder>): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
  await recorder.prepareToRecordAsync();
  recorder.record();
}

async function stopMicRecording(recorder: ReturnType<typeof useAudioRecorder>): Promise<void> {
  try {
    await recorder.stop();
  } catch {}
}

export function VoiceStreamProvider({ children }: { children: React.ReactNode }) {
  const isVoiceModeActive = useSharedValue(0);
  const audioVolume = useSharedValue(0);
  const voiceIntent = useSharedValue(1);

  const clientRef = useRef<VoiceStreamClient | null>(null);
  const localConversationRef = useRef<VoiceLocalConversation | null>(null);
  const isSpeakingRef = useRef(false);
  const micFallbackRef = useRef(false);
  const voiceSessionActiveRef = useRef(false);

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 60);

  const [connectionState, setConnectionState] = React.useState<VoiceConnectionState>('idle');
  const [pipelineMode, setPipelineMode] = React.useState<VoicePipelineMode>('local');
  const [isListening, setIsListening] = React.useState(false);
  const [statusLabel, setStatusLabel] = React.useState('Acoustic sanctuary');
  const [requiresTextInput, setRequiresTextInput] = React.useState(false);

  const applyIntentMode = useCallback((mode: VoiceIntentMode) => {
    voiceIntent.value = withTiming(mode === 'sanctuary' ? 1 : 0, { duration: 900 });
  }, [voiceIntent]);

  const stopLocalConversation = useCallback(() => {
    localConversationRef.current?.stop();
    localConversationRef.current = null;
  }, []);

  const resumeMicIfNeeded = useCallback(async () => {
    if (!micFallbackRef.current || !voiceSessionActiveRef.current) return;
    try {
      await startMicRecording(recorder);
    } catch {}
  }, [recorder]);

  const pauseMicIfNeeded = useCallback(async () => {
    if (!micFallbackRef.current) return;
    await stopMicRecording(recorder);
  }, [recorder]);

  const activateLocalAcousticMode = useCallback(async () => {
    if (localConversationRef.current) return;

    clientRef.current?.disconnect();
    clientRef.current = null;

    setPipelineMode('local');
    setConnectionState('connected');
    setIsListening(true);
    setStatusLabel(
      isElevenLabsConfigured()
        ? `Emo's voice ready · ElevenLabs`
        : 'Add EXPO_PUBLIC_ELEVENLABS_API_KEY to .env for Emo\'s real voice',
    );

    const conversation = new VoiceLocalConversation({
      onStatus: setStatusLabel,
      onBeforeSpeak: () => {
        isSpeakingRef.current = true;
        void pauseMicIfNeeded();
      },
      onAfterSpeak: () => {
        isSpeakingRef.current = false;
        void resumeMicIfNeeded();
      },
      onFallbackMode: (enabled) => {
        micFallbackRef.current = enabled;
        setRequiresTextInput(enabled);
        if (enabled) {
          void stopMicRecording(recorder);
        } else {
          void resumeMicIfNeeded();
        }
      },
      onInputAmplitude: (amp) => {
        if (!isSpeakingRef.current) {
          audioVolume.value = Math.max(audioVolume.value * 0.45, amp);
        }
      },
      onOutputAmplitude: (amp) => {
        isSpeakingRef.current = amp > 0.04;
        audioVolume.value = amp;
      },
      onIntent: applyIntentMode,
      onVoiceProvider: (provider) => {
        if (provider === 'system' && isElevenLabsConfigured()) {
          setStatusLabel('ElevenLabs failed — using system voice. Restart Metro with --clear.');
        }
      },
    });

    localConversationRef.current = conversation;
    await conversation.start();
  }, [applyIntentMode, audioVolume, pauseMicIfNeeded, resumeMicIfNeeded]);

  useEffect(() => {
    if (!micFallbackRef.current || !isListening || isSpeakingRef.current) return undefined;

    const metering = meteringToAmplitude(recorderState.metering);
    localConversationRef.current?.noteMicActivity(metering);
    if (metering > 0.06) {
      audioVolume.value = Math.max(audioVolume.value * 0.4, metering);
    }

    return undefined;
  }, [audioVolume, isListening, recorderState.metering]);

  const bargeIn = useCallback(() => {
    if (pipelineMode === 'relay') {
      clientRef.current?.bargeIn();
      isSpeakingRef.current = false;
      setStatusLabel('Listening…');
      return;
    }
    localConversationRef.current?.bargeIn();
  }, [pipelineMode]);

  const submitVoiceMessage = useCallback((text: string) => {
    localConversationRef.current?.submitMessage(text);
  }, []);

  const submitVoiceSession = useCallback((sessionType: 'meditation' | 'story') => {
    localConversationRef.current?.submitSession(sessionType);
  }, []);

  const exitVoiceMode = useCallback(() => {
    voiceSessionActiveRef.current = false;
    isVoiceModeActive.value = withSpring(0, SANCTUARY_SPRING);
    audioVolume.value = withTiming(0, { duration: 400 });
    isSpeakingRef.current = false;
    setIsListening(false);
    setStatusLabel('Acoustic sanctuary');
    setPipelineMode('local');

    stopLocalConversation();
    micFallbackRef.current = false;
    setRequiresTextInput(false);
    void stopMicRecording(recorder);
    clientRef.current?.disconnect();
    clientRef.current = null;
    setConnectionState('idle');
  }, [audioVolume, isVoiceModeActive, recorder, stopLocalConversation]);

  const enterVoiceMode = useCallback(async () => {
    if (voiceSessionActiveRef.current) return;
    voiceSessionActiveRef.current = true;

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      voiceSessionActiveRef.current = false;
      setStatusLabel('Microphone permission needed');
      return;
    }

    isVoiceModeActive.value = withSpring(1, SANCTUARY_SPRING);

    const wsUrl = resolveVoiceWsUrl();
    if (wsUrl) {
      setStatusLabel('Connecting…');
      const client = new VoiceStreamClient({
        url: wsUrl,
        onInputAmplitude: (amp) => {
          audioVolume.value = Math.max(audioVolume.value * 0.65, amp);
        },
        onOutputAmplitude: (amp) => {
          audioVolume.value = amp;
          isSpeakingRef.current = amp > 0.04;
        },
        onEvent: (event) => {
          if (event.type === 'connection') {
            setConnectionState(event.state);
            if (event.state === 'connected') {
              setPipelineMode('relay');
              setStatusLabel('Listening…');
              setIsListening(true);
            }
            if (event.state === 'error') {
              void activateLocalAcousticMode();
            }
          }
          if (event.type === 'transcript') {
            const { mode } = classifyEmoIntent(event.text);
            applyIntentMode(mode);
          }
          if (event.type === 'intent') {
            applyIntentMode(event.mode);
          }
        },
      });

      clientRef.current = client;

      try {
        await client.connect(RELAY_CONNECT_MS);
        setPipelineMode('relay');
        setConnectionState('connected');
        setIsListening(true);
        setStatusLabel('Listening…');
        return;
      } catch {
        client.disconnect();
        clientRef.current = null;
      }
    }

    await activateLocalAcousticMode();
  }, [
    activateLocalAcousticMode,
    applyIntentMode,
    audioVolume,
    isVoiceModeActive,
  ]);

  useEffect(() => () => {
    voiceSessionActiveRef.current = false;
    clientRef.current?.disconnect();
    localConversationRef.current?.stop();
  }, []);

  const value = useMemo(
    () => ({
      isVoiceModeActive,
      audioVolume,
      voiceIntent,
      connectionState,
      pipelineMode,
      isListening,
      statusLabel,
      requiresTextInput,
      enterVoiceMode,
      exitVoiceMode,
      bargeIn,
      submitVoiceMessage,
      submitVoiceSession,
    }),
    [
      audioVolume,
      bargeIn,
      connectionState,
      enterVoiceMode,
      exitVoiceMode,
      isListening,
      isVoiceModeActive,
      pipelineMode,
      requiresTextInput,
      statusLabel,
      submitVoiceMessage,
      submitVoiceSession,
      voiceIntent,
    ],
  );

  return (
    <VoiceStreamContext.Provider value={value}>
      {children}
    </VoiceStreamContext.Provider>
  );
}

export function useVoiceStream(): VoiceStreamContextValue {
  const ctx = useContext(VoiceStreamContext);
  if (!ctx) {
    throw new Error('useVoiceStream must be used within VoiceStreamProvider');
  }
  return ctx;
}

export function useVoiceStreamAmbient(): SharedValue<number> {
  return useSanctuaryAmbient().ambientProgress;
}
