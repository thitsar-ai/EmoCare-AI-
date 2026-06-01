import React from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, MicOff } from 'lucide-react-native';
import { ScreenNavChrome } from '../navigation/AppNavigation';
import {
  useCircadianTheme,
  type CircadianTheme,
} from '../../theme/circadianTheme';
import { getSanctuaryEmoFace, getSanctuaryEmoOrbSize } from '../../theme/sanctuaryEmoFace';
import { useVoiceStream } from './VoiceStreamContext';
import { VoiceMicControlSheet } from './VoiceMicControlSheet';

const VOICE_MENU_SOLID = '#2A1848';
const NAV_CONTENT_HEIGHT = 60;

interface VoiceTalkScreenProps {
  userName?: string;
}

function VoiceEmoFaceOrb({
  theme,
  isSpeaking,
  onPress,
}: {
  theme: CircadianTheme;
  isSpeaking: boolean;
  onPress: () => void;
}) {
  const faceSource = getSanctuaryEmoFace(theme.phase);
  const faceSize = getSanctuaryEmoOrbSize(1.45);
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.52] });
  const faceScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View style={styles.orbStage}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbRing,
          styles.orbRingOuter,
          { borderColor: `${theme.accent}28`, opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbRing,
          styles.orbRingMid,
          { borderColor: `${theme.accent}44`, opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.facePressable, pressed && styles.facePressed]}
        accessibilityRole="button"
        accessibilityLabel={isSpeaking ? 'Stop Emo speaking' : 'Play Emo welcome'}
      >
        <Animated.Image
          source={faceSource}
          resizeMode="contain"
          style={{
            width: faceSize,
            height: faceSize,
            transform: [{ scale: faceScale }],
          }}
        />
      </Pressable>
    </View>
  );
}

function VoiceMenuDropdown({
  visible,
  theme,
  onClose,
  onMeditation,
  onStory,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onMeditation: () => void;
  onStory: () => void;
}) {
  const items = [
    { label: '🧘  Guided meditation', action: onMeditation },
    { label: '🌙  Calm story', action: onStory },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={styles.menuAnchor}>
          <View
            style={[
              styles.menuSheet,
              { backgroundColor: VOICE_MENU_SOLID, borderColor: theme.border },
            ]}
          >
            {items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  item.action();
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  index < items.length - 1 && styles.menuItemBorder,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={[styles.menuItemText, { color: theme.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function VoiceTalkScreen({ userName }: VoiceTalkScreenProps) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const inputRef = React.useRef<TextInput>(null);
  const {
    statusLabel,
    enterVoiceMode,
    exitVoiceMode,
    submitVoiceMessage,
    submitVoiceSession,
    playWelcomeGreeting,
    isEmoSpeaking,
    isMicMuted,
    toggleMicMute,
    stopEmoSpeech,
  } = useVoiceStream();

  const [draft, setDraft] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [micMenuOpen, setMicMenuOpen] = React.useState(false);
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

  React.useEffect(() => {
    Keyboard.dismiss();
  }, []);

  const displayName = userName?.trim() || 'friend';
  const statusLine = isMicMuted
    ? 'Muted'
    : isEmoSpeaking
      ? 'Emo is speaking…'
      : statusLabel || 'Tap Emo when you\'re ready';

  const handleFacePress = () => {
    if (isEmoSpeaking) {
      stopEmoSpeech();
      return;
    }
    playWelcomeGreeting();
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    if (isMicMuted) {
      toggleMicMute();
    }
    submitVoiceMessage(text);
    setDraft('');
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const chromeBtnStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
  };

  const navPad = NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 8);

  return (
    <View style={styles.flex}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.root}>
          <ScreenNavChrome
            theme={theme}
            showBack={false}
            showForward={false}
            extraRight={
              <Pressable
                onPress={() => setMenuOpen(true)}
                style={({ pressed }) => [
                  styles.chromeBtn,
                  chromeBtnStyle,
                  pressed && styles.chromeBtnPressed,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Voice talk menu"
              >
                <Text style={[styles.menuDots, { color: theme.text }]}>⋯</Text>
              </Pressable>
            }
          />

          <View style={styles.content}>
            <View style={styles.titleBlock}>
              <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>ACOUSTIC SANCTUARY</Text>
              <Text style={[styles.greetingLead, { color: theme.text }]}>
                Good to hear you,
              </Text>
              <Text style={[styles.greetingName, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.statusLine, { color: theme.mutedText }]}>{statusLine}</Text>
            </View>

            <View style={styles.centerStage}>
              <VoiceEmoFaceOrb theme={theme} isSpeaking={isEmoSpeaking} onPress={handleFacePress} />
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          >
            <View style={[styles.footer, { paddingBottom: navPad }]}>
              <View style={[styles.inputCard, chromeBtnStyle]}>
                <Text style={[styles.inputLabel, { color: theme.mutedText, opacity: 0.62 }]}>
                  Type your message - Emo will speak back
                </Text>
                <View style={[styles.inputRow, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: theme.border }]}>
                  <TextInput
                    ref={inputRef}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="What's on your heart?"
                    placeholderTextColor={theme.mutedText}
                    style={[styles.input, { color: theme.text }]}
                    returnKeyType="send"
                    submitBehavior="submit"
                    blurOnSubmit={false}
                    onSubmitEditing={handleSend}
                    multiline={false}
                    autoCorrect
                    autoCapitalize="sentences"
                  />
                  <Pressable
                    onPress={() => setMicMenuOpen(true)}
                    style={styles.micBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Voice controls"
                  >
                    {isMicMuted ? (
                      <MicOff size={17} color={theme.mutedText} strokeWidth={2.4} />
                    ) : (
                      <Mic size={17} color={theme.accent} strokeWidth={2.4} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>

      <VoiceMenuDropdown
        visible={menuOpen}
        theme={theme}
        onClose={() => setMenuOpen(false)}
        onMeditation={() => submitVoiceSession('meditation')}
        onStory={() => submitVoiceSession('story')}
      />

      <VoiceMicControlSheet
        visible={micMenuOpen}
        theme={theme}
        onClose={() => setMicMenuOpen(false)}
        onPause={stopEmoSpeech}
        onPlay={playWelcomeGreeting}
        onMute={toggleMicMute}
        onStop={stopEmoSpeech}
      />
    </View>
  );
}

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  chromeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeBtnPressed: { opacity: 0.82 },
  menuDots: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: -2,
  },
  titleBlock: {
    paddingTop: 22,
    paddingBottom: 12,
    gap: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 8,
  },
  greetingLead: {
    fontFamily: SERIF,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  greetingName: {
    fontFamily: SERIF,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0.25,
    fontWeight: '400',
    marginTop: 2,
    marginBottom: 4,
  },
  statusLine: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    marginTop: 2,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  orbStage: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 999,
  },
  orbRingOuter: {
    width: 230,
    height: 230,
  },
  orbRingMid: {
    width: 190,
    height: 190,
  },
  facePressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  facePressed: { opacity: 0.88 },
  footer: {
    paddingTop: 4,
    paddingHorizontal: 22,
  },
  inputCard: {
    borderRadius: 22,
    borderWidth: 0.5,
    padding: 16,
    gap: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    padding: 0,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  menuAnchor: {
    alignItems: 'flex-end',
    paddingTop: 52,
    paddingRight: 16,
  },
  menuSheet: {
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  menuItemPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  menuItemText: { fontSize: 15, fontWeight: '500' },
});
