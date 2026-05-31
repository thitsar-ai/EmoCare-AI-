import React from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import {
  CircadianBackground,
  useCircadianTheme,
  type CircadianTheme,
} from '../../theme/circadianTheme';
import { getSanctuaryEmoFace, getSanctuaryEmoOrbSize } from '../../theme/sanctuaryEmoFace';
import { useVoiceStream } from './VoiceStreamContext';

const VOICE_MENU_SOLID = '#2A1848';

interface VoiceTalkScreenProps {
  userName?: string;
  onClose: () => void;
}

function VoiceEmoOrb({
  theme,
  audioVolume,
}: {
  theme: CircadianTheme;
  audioVolume: SharedValue<number>;
}) {
  const faceSource = getSanctuaryEmoFace(theme.phase);
  const orbSize = getSanctuaryEmoOrbSize();
  const glowSize = PixelRatio.roundToNearestPixel(orbSize + 14);
  const pulse = React.useRef(new Animated.Value(0)).current;
  const audioStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + audioVolume.value * 0.05 }],
  }));

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

  const breatheScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.48] });

  return (
    <View style={[styles.orbWrap, { width: glowSize + 24, height: glowSize + 24 }]}>
      <View pointerEvents="none" style={[styles.orbRingOuter, { width: glowSize + 18, height: glowSize + 18, borderRadius: (glowSize + 18) / 2 }]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: glowOpacity,
            backgroundColor: theme.glow,
            shadowColor: theme.accent,
          },
        ]}
      />
      <View pointerEvents="none" style={[styles.orbRingInner, { width: glowSize - 8, height: glowSize - 8, borderRadius: (glowSize - 8) / 2 }]} />
      <Reanimated.View style={audioStyle}>
        <Animated.Image
          source={faceSource}
          resizeMode="contain"
          style={{
            width: orbSize,
            height: orbSize,
            backgroundColor: 'transparent',
            transform: [{ scale: breatheScale }],
          }}
        />
      </Reanimated.View>
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

export function VoiceTalkScreen({ userName, onClose }: VoiceTalkScreenProps) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const inputRef = React.useRef<TextInput>(null);
  const {
    audioVolume,
    statusLabel,
    requiresTextInput,
    enterVoiceMode,
    exitVoiceMode,
    submitVoiceMessage,
    submitVoiceSession,
    bargeIn,
    isListening,
  } = useVoiceStream();

  const [draft, setDraft] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(false);
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

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    submitVoiceMessage(text);
    setDraft('');
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const chromeBtnStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
  };

  return (
    <View style={styles.flex}>
      <CircadianBackground theme={theme} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.root}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={onClose}
              style={[styles.iconBtn, chromeBtnStyle]}
              hitSlop={12}
            >
              <Text style={[styles.closeText, { color: theme.text }]}>×</Text>
            </Pressable>
            <View style={styles.headerSpacer} />
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={[styles.iconBtn, chromeBtnStyle]}
              hitSlop={10}
            >
              <Text style={[styles.menuText, { color: theme.text }]}>⋯</Text>
            </Pressable>
          </View>

          <View style={styles.heroSection}>
            <VoiceEmoOrb theme={theme} audioVolume={audioVolume} />

            <View style={styles.copyBlock}>
              <Text style={[styles.brandTitle, { color: theme.text }]}>Emo</Text>
              <Text style={[styles.brandSub, { color: theme.secondaryText }]}>
                Always here for you
              </Text>
              <Text style={[styles.greeting, { color: theme.text }]}>
                Good to hear you, {displayName}
              </Text>
              <Text style={[styles.statusLine, { color: theme.mutedText }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          >
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 12) + 4 },
              ]}
            >
              {requiresTextInput ? (
                <>
                  <Text style={[styles.expoHint, { color: theme.mutedText }]}>
                    Type what you want to say — Emo will speak back aloud.
                  </Text>
                  <Pressable
                    onPress={() => inputRef.current?.focus()}
                    style={[styles.inputShell, chromeBtnStyle]}
                  >
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
                      autoFocus={false}
                      showSoftInputOnFocus
                      autoCorrect
                      autoCapitalize="sentences"
                    />
                  </Pressable>
                  <Pressable
                    onPress={handleSend}
                    style={[
                      styles.actionPill,
                      chromeBtnStyle,
                      !draft.trim() && styles.actionPillDisabled,
                    ]}
                    disabled={!draft.trim()}
                  >
                    <Text style={[styles.actionPillText, { color: theme.accent }]}>
                      Send · Emo responds aloud
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={bargeIn} style={[styles.actionPill, chromeBtnStyle]}>
                  <Text style={[styles.actionPillText, { color: theme.accent }]}>
                    {isListening ? 'Barge-in · speak anytime' : 'Tap to speak with Emo'}
                  </Text>
                </Pressable>
              )}
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
    </View>
  );
}

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerSpacer: { flex: 1 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  closeText: {
    fontSize: 26,
    fontWeight: '300',
    marginTop: -2,
  },
  menuText: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: -4,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 12,
  },
  copyBlock: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 12,
    gap: 4,
  },
  brandTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.15,
    marginTop: 2,
  },
  greeting: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 28,
  },
  statusLine: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginTop: 8,
    lineHeight: 19,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  orbRingOuter: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(183,157,255,0.14)',
  },
  orbGlow: {
    position: 'absolute',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  orbRingInner: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(183,157,255,0.22)',
  },
  footer: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  expoHint: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    fontSize: 15,
  },
  actionPill: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionPillDisabled: { opacity: 0.45 },
  actionPillText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  menuAnchor: {
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 14,
  },
  menuSheet: {
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
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
