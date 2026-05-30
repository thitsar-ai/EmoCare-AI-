import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import LivingCanvas from '../LivingCanvas';
import { SanctuaryRippleRings } from '../SanctuaryRippleRings';
import { useSanctuaryAmbient } from '../SanctuaryAmbientContext';
import { useVoiceStream } from './VoiceStreamContext';
import { isElevenLabsConfigured } from '../../utils/elevenLabs';

const EMO_FACE = require('../../assets/emo-face-transparent.png');

interface VoiceTalkScreenProps {
  userName?: string;
  onClose: () => void;
}

function VoiceFloatingMascot({
  audioVolume,
}: {
  audioVolume: SharedValue<number>;
}) {
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + audioVolume.value * 0.14 }],
    opacity: 0.96 + audioVolume.value * 0.04,
  }));

  return (
    <View style={styles.heroZone} pointerEvents="none">
      <SanctuaryRippleRings size={320} />
      <Animated.View style={[styles.heroFace, faceStyle]}>
        <Image source={EMO_FACE} style={styles.heroImage} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

export function VoiceTalkScreen({ userName, onClose }: VoiceTalkScreenProps) {
  const insets = useSafeAreaInsets();
  const { ambientProgress } = useSanctuaryAmbient();
  const {
    audioVolume,
    statusLabel,
    requiresTextInput,
    enterVoiceMode,
    exitVoiceMode,
    submitVoiceMessage,
    submitVoiceSession,
  } = useVoiceStream();

  const [draft, setDraft] = React.useState('');
  const sessionStarted = React.useRef(false);

  React.useEffect(() => {
    if (sessionStarted.current) return undefined;
    sessionStarted.current = true;
    void enterVoiceMode();
    return () => {
      sessionStarted.current = false;
      exitVoiceMode();
    };
  }, [enterVoiceMode, exitVoiceMode]);

  const displayName = userName?.trim() || 'friend';

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    submitVoiceMessage(text);
    setDraft('');
  };

  return (
    <LivingCanvas ambientProgress={ambientProgress} style={StyleSheet.absoluteFillObject}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Acoustic Sanctuary</Text>
              <Text style={styles.title}>Voice Talk</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <Text style={styles.greeting}>{displayName}</Text>
          <Text style={styles.sub}>{statusLabel}</Text>

          {!isElevenLabsConfigured() ? (
            <View style={styles.voiceKeyNote}>
              <Text style={styles.voiceKeyNoteTitle}>Emo needs her real voice</Text>
              <Text style={styles.voiceKeyNoteText}>
                Add your ElevenLabs API key to .env as EXPO_PUBLIC_ELEVENLABS_API_KEY, then restart the app. Without it, the robotic system voice is used.
              </Text>
            </View>
          ) : null}

          {requiresTextInput ? (
            <View style={styles.expoGoNote}>
              <Text style={styles.expoGoNoteText}>
                Expo Go can&apos;t transcribe speech. Type what you want to say — Emo will speak back.
              </Text>
            </View>
          ) : null}

          <View style={styles.sessionRow}>
            <Pressable
              style={styles.sessionChip}
              onPress={() => submitVoiceSession('meditation')}
            >
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
              <Text style={styles.sessionChipEmoji}>🧘</Text>
              <Text style={styles.sessionChipLabel}>Guided meditation</Text>
              <Text style={styles.sessionChipSub}>~3–4 min · calm breath</Text>
            </Pressable>
            <Pressable
              style={styles.sessionChip}
              onPress={() => submitVoiceSession('story')}
            >
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
              <Text style={styles.sessionChipEmoji}>🌙</Text>
              <Text style={styles.sessionChipLabel}>Calm story</Text>
              <Text style={styles.sessionChipSub}>~2–3 min · soft tale</Text>
            </Pressable>
          </View>

          <View style={styles.heroSlot}>
            <VoiceFloatingMascot audioVolume={audioVolume} />
          </View>

          <View style={styles.controls}>
            {requiresTextInput ? (
              <>
                <View style={styles.inputShell}>
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="What's on your heart?"
                    placeholderTextColor="rgba(107, 79, 168, 0.45)"
                    style={styles.input}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    blurOnSubmit
                    onSubmitEditing={handleSend}
                  />
                </View>
                <Pressable
                  onPress={handleSend}
                  style={[styles.controlChip, !draft.trim() && styles.controlChipDisabled]}
                  disabled={!draft.trim()}
                >
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
                  <Text style={styles.controlChipText}>Send · Emo responds aloud</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.listeningHint}>Listening… speak naturally</Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LivingCanvas>
  );
}

const SERIF = 'Georgia';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 214, 168, 0.2)',
  },
  closeText: {
    fontSize: 26,
    color: '#6B4FA8',
    fontWeight: '300',
    marginTop: -2,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(61,40,88,0.48)',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '400',
    color: '#2A1840',
    letterSpacing: 0.3,
  },
  greeting: {
    fontFamily: SERIF,
    fontSize: 28,
    color: '#2A1840',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.35,
  },
  sub: {
    fontSize: 14,
    color: '#2A1840',
    opacity: 0.68,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },
  expoGoNote: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 214, 168, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 214, 168, 0.35)',
  },
  expoGoNoteText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#4A3568',
    textAlign: 'center',
  },
  voiceKeyNote: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(196, 168, 248, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(157, 92, 255, 0.28)',
  },
  voiceKeyNoteTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D2858',
    textAlign: 'center',
    marginBottom: 4,
  },
  voiceKeyNoteText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5A4578',
    textAlign: 'center',
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  sessionChip: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(196, 168, 248, 0.35)',
    alignItems: 'center',
  },
  sessionChipEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  sessionChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D2858',
    textAlign: 'center',
  },
  sessionChipSub: {
    fontSize: 10,
    color: 'rgba(61,40,88,0.52)',
    marginTop: 2,
    textAlign: 'center',
  },
  heroSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroZone: {
    width: 340,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroFace: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 124,
    height: 124,
    backgroundColor: 'transparent',
  },
  controls: {
    marginTop: 'auto',
    gap: 12,
    alignItems: 'stretch',
    paddingBottom: 4,
  },
  inputShell: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251, 214, 168, 0.2)',
    minHeight: 88,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    color: '#2A1840',
    minHeight: 68,
    textAlignVertical: 'top',
  },
  controlChip: {
    borderRadius: 99,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(251, 214, 168, 0.2)',
    alignItems: 'center',
  },
  controlChipDisabled: {
    opacity: 0.45,
  },
  controlChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B4FA8',
    letterSpacing: 0.2,
  },
  listeningHint: {
    fontSize: 12,
    color: '#6B4FA8',
    textAlign: 'center',
    opacity: 0.72,
  },
});
