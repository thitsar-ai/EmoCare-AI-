import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Image,
  Pressable,
  AccessibilityInfo,
  Alert,
  Modal,
  type ViewStyle,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as NativeSplash from 'expo-splash-screen';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { speakAloud, stopSpeaking, describeElevenLabsError } from './components/voice/voiceTts';
import {
  ChevronLeft,
  Heart,
  LayoutGrid,
  Lock,
  Menu,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  MicOff,
  Plus,
  Bookmark,
  BookOpen,
  AudioLines,
  FileText,
  Search,
  Sparkles,
  Trash2,
  Wind,
  X,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { OB_MOODS, type Mood } from './constants/obMoods';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { SanctuaryDashboard } from './components/home/SanctuaryDashboard';
import {
  AppMenuSheet,
  AppNavProvider,
  ProfileNameSheet,
  ScreenNavChrome,
  useAppNav,
  useScreenSwipeNav,
  type MainScreenKey,
  type NavTarget,
} from './components/navigation/AppNavigation';
import { VoiceMicControlSheet } from './components/voice/VoiceMicControlSheet';

// Keep the native launch screen up until our animated splash is mounted (no white flash).
NativeSplash.preventAutoHideAsync().catch(() => {});

// Custom hook: true when the user has "Reduce Motion" enabled.
function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callAnthropicMessages, describeAnthropicError } from './utils/anthropic';
import { streamAnthropicMessages } from './utils/anthropicStream';
import { hapticLight, hapticMedium } from './utils/haptics';
import { buildAnthropicMessagesFromChat } from './utils/chatMedia';
import { getChatSystemPrompt, getCrisisSafetyAppendix, getIntentModeAppendix } from './utils/emoEos';
import { detectCrisisSignals } from './utils/emoCrisis';
import { classifyEmoIntent } from './utils/emoIntent';
import { polishEmoReplyText, splitEmoReplyParagraphs } from './utils/emoReplyFormat';
import { fetchOracleResearchContext, shouldRunOracleSearch } from './utils/oracleSearch';
import { logOracleInquiry } from './utils/oracleTopicLog';
import { HOME_LANDING_MODE_KEY } from './utils/onboardingLanding';
import { SanctuaryAmbientProvider } from './components/SanctuaryAmbientContext';
import { VoiceStreamProvider } from './components/voice/VoiceStreamContext';
import { VoiceTalkScreen } from './components/voice/VoiceTalkScreen';
import { MemoryLedgerSheet } from './components/MemoryLedgerSheet';
import { BreatheExperience } from './components/breathe/BreatheExperience';
import { JournalScreen } from './components/journal/JournalScreen';
import { PENDING_JOURNAL_CONTEXT_KEY } from './utils/journalStorage';
import {
  CircadianThemeProvider,
  DARK_MENU_SURFACE,
  getCircadianPhase,
  getCircadianTheme,
  useCircadianTheme,
  type CircadianPhase,
  type CircadianTheme,
} from './theme/circadianTheme';

const { width, height } = Dimensions.get('window');

/* ------------------------------------------------------------------ *
 * Design tokens
 * ------------------------------------------------------------------ */

const C = {
  bg1: '#0D0720',
  bg2: '#1A0F2E',
  bg3: '#2D1B4A',
  gradientTop: '#1A102F',
  gradientBottom: '#110922',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.1)',
  purple: '#7B6FE8',
  purpleGlow: 'rgba(123,111,232,0.35)',
  purpleLight: 'rgba(123,111,232,0.15)',
  orange: '#F4A261',
  orangeGlow: 'rgba(244,162,97,0.4)',
  white: '#FFFFFF',
  white80: 'rgba(255,255,255,0.8)',
  white60: 'rgba(255,255,255,0.6)',
  white30: 'rgba(255,255,255,0.3)',
  white10: 'rgba(255,255,255,0.08)',
  teal: '#5DCAA5',
  tealGlow: 'rgba(93,202,165,0.2)',
} as const;

/** Height of the floating tab bar content (excludes the bottom safe-area inset). */
const NAV_CONTENT_HEIGHT = 60;

/** Minimum top inset for iPhone notch / Dynamic Island when hooks report 0. */
const IOS_TOP_MIN = 59;

function useTopInset(extra = 0): number {
  const insets = useSafeAreaInsets();
  const top = insets.top ?? 0;
  const metricsTop = initialWindowMetrics?.insets.top ?? 0;
  const rawTop =
    Platform.OS === 'ios'
      ? Math.max(top, metricsTop, IOS_TOP_MIN)
      : Math.max(top, metricsTop, 28);
  return rawTop + extra;
}

/** Pushes screen content below the notch using native safe-area layout (reliable on Simulator). */
function TopChrome({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.flex, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

const AFFIRMATIONS = [
  "You don't have to carry everything at once. You are allowed to move gently.",
  'Your feelings are not too much. They are yours, and they matter.',
  'Rest is not a reward — it is something you already deserve.',
  'You are allowed to take up space, to be heard, and to ask for help.',
  'Even on the hard days, you are doing more than enough.',
  'There is no perfect way to heal. Any step forward is enough.',
  'Be as patient with yourself as you would with someone you love.',
  'Softness is strength. You can pause without falling behind.',
  'You do not need to have it all figured out to be worthy of care.',
  'Your pace is valid. Slow is still forward.',
  'It is okay to need quiet. It is okay to need company.',
  'You have survived every hard day so far — that counts for something.',
  'Let today be lighter than yesterday, even by one small breath.',
  'You are not a burden for feeling deeply.',
  'Gentleness toward yourself is never wasted.',
];

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

type ScreenKey = 'home' | 'talk' | 'voice' | 'chat' | 'breathe' | 'journal' | 'checkin';

function ObMoodIcon({ mood, size = 20 }: { mood: Mood; size?: number }) {
  const Icon = mood.Icon;
  if (!Icon) {
    return <Text style={styles.obMoodIconEmoji}>{mood.emoji}</Text>;
  }
  return (
    <Icon
      size={size}
      color={mood.iconColor ?? '#F5F3FF'}
      strokeWidth={2.5}
      fill={mood.iconFill ?? 'transparent'}
    />
  );
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time: string;
  attachmentUri?: string;
  attachmentKind?: 'photo' | 'file';
  attachmentName?: string;
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ------------------------------------------------------------------ *
 * Structural building blocks (the blueprint)
 * ------------------------------------------------------------------ */

interface GlowOrbProps {
  color: string;
  size: number;
  top: number;
  right: number;
  opacity?: number;
}

function GlowOrb({ color, size, top, right, opacity = 0.55 }: GlowOrbProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        right,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

/**
 * Circadian home gradient — legacy helper (prefer theme/circadianTheme).
 */
function getCircadianGradient(hour: number): [string, string] {
  if (hour >= 6 && hour <= 11) return ['#E8E4F5', '#F0ECF8']; // 6am–11am lavender
  if (hour >= 12 && hour <= 17) return ['#DDD6F3', '#EDE8F5']; // 12pm–5pm soft purple
  if (hour >= 18 && hour <= 21) return ['#2D1B4A', '#1A0F2E']; // 6pm–9pm warm rose-purple
  return ['#0D0720', '#1A0F2E']; // 10pm–5am deep dark
}

interface HomeSanctuaryCopy {
  timeLabel: string;
  subline: string;
  reflectionBody: string;
  reminderEyebrow: string;
}

function getHomeSanctuaryCopy(phase: CircadianPhase): HomeSanctuaryCopy {
  switch (phase) {
    case 'morning':
      return {
        timeLabel: 'Good morning',
        subline: 'Start softly — today is yours. ♡',
        reflectionBody: 'A new day does not need to be perfect — just present. Take this moment slowly.',
        reminderEyebrow: 'Daily reminder',
      };
    case 'afternoon':
      return {
        timeLabel: 'Good afternoon',
        subline: 'Hope your day is treating you gently. ♡',
        reflectionBody: 'You have been moving through a lot. Pause and breathe with intention.',
        reminderEyebrow: 'Daily reminder',
      };
    case 'evening':
      return {
        timeLabel: 'Good evening',
        subline: 'This space is yours tonight. ♡',
        reflectionBody: 'You have been carrying a lot quietly. Take this moment slowly.',
        reminderEyebrow: 'Evening reminder',
      };
    default:
      return {
        timeLabel: 'Good night',
        subline: "You're not alone — rest is enough. ♡",
        reflectionBody: 'The day is done. Whatever remains can wait until morning.',
        reminderEyebrow: 'Night reminder',
      };
  }
}

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
  onContentSizeChange?: () => void;
  contentStyle?: ViewStyle;
  theme?: CircadianTheme;
}

/**
 * Standard screen frame:
 *  1. Absolute-fill gradient background
 *  2. SafeAreaView (top edge) from react-native-safe-area-context
 *  3. ScrollView whose contentContainer reserves room for the floating nav bar
 */
function Screen({ children, scroll = true, scrollRef, onContentSizeChange, contentStyle, theme: themeProp }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const liveTheme = useCircadianTheme();
  const theme = themeProp ?? liveTheme;
  const navOffset = NAV_CONTENT_HEIGHT + (insets.bottom ?? 0);
  const topPad = useTopInset(4);

  if (!scroll) {
    return (
      <View style={styles.flex}>
        <View
          style={[
            styles.flex,
            styles.screenForeground,
            { paddingTop: topPad, paddingBottom: navOffset, paddingHorizontal: 22 },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={[styles.flex, { marginBottom: navOffset }]}
        alwaysBounceVertical
        bounces
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={[
          styles.screenScrollContent,
          { paddingHorizontal: 22, paddingTop: topPad + 8, paddingBottom: 28 },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function GlassCard({
  children,
  style,
  onPress,
  theme,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  theme?: CircadianTheme;
}) {
  const themed = theme ? { backgroundColor: theme.card, borderColor: theme.border } : {};
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.glass, themed, style, pressed && styles.glassPressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.glass, themed, style]}>{children}</View>;
}

/**
 * Robust Emo avatar. Attempts to render the bundled mascot asset and falls back
 * gracefully to an emoji glyph if the image is missing or fails to decode —
 * so it never collapses into a broken white circle.
 */
function EmoAvatar({
  size = 44,
  theme: themeProp,
  plain = false,
  streamLevel = 0,
}: {
  size?: number;
  theme?: CircadianTheme;
  plain?: boolean;
  streamLevel?: number;
}) {
  const theme = themeProp ?? getCircadianTheme();
  const faceSource = theme.emoFace;
  const [failed, setFailed] = useState(false);
  const ringSize = size + 8;
  const streamBoost = 1 + Math.min(1, streamLevel) * 0.1;

  if (plain) {
    return (
      <View style={[styles.avatarPlainWrap, { width: size, height: size, transform: [{ scale: streamBoost }] }]}>
        {failed ? (
          <View
            style={[
              styles.avatarFallback,
              { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.accent },
            ]}
          >
            <Text style={{ fontSize: size * 0.5 }}>🌿</Text>
          </View>
        ) : (
          <Image
            source={faceSource}
            onError={() => setFailed(true)}
            resizeMode="contain"
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.avatarRingWrap, { width: ringSize, height: ringSize, transform: [{ scale: streamBoost }] }]}>
      <LinearGradient
        colors={[...theme.ringGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.avatarRingGradient, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
      />
      <View
        style={[
          styles.avatarRing,
          {
            width: ringSize - 3,
            height: ringSize - 3,
            borderRadius: (ringSize - 3) / 2,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
      >
        {failed ? (
          <View
            style={[
              styles.avatarFallback,
              { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.accent },
            ]}
          >
            <Text style={{ fontSize: size * 0.5 }}>🌿</Text>
          </View>
        ) : (
          <Image
            source={faceSource}
            onError={() => setFailed(true)}
            resizeMode="contain"
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        )}
      </View>
    </View>
  );
}

/**
 * Sanctuary presence orb — chat hero avatar with circadian glow and gentle breath.
 */
function EmoPresenceOrb({
  theme,
  onVoicePress,
}: {
  theme: CircadianTheme;
  onVoicePress?: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReduceMotion();
  const orbSize = 88;
  const glowSize = 128;
  const ringSize = orbSize + 14;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const scale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glowOpacity = reduceMotion ? 0.45 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.62] });
  const haloScale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.presenceOrbWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.presenceOrbHalo,
          {
            width: glowSize + 40,
            height: glowSize + 40,
            borderRadius: (glowSize + 40) / 2,
            backgroundColor: theme.glow,
            opacity: glowOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.presenceOrbGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: theme.glow,
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />
      <LinearGradient
        colors={[...theme.ringGradient]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.presenceOrbRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
      />
      <Animated.View
        style={[
          styles.presenceOrbFacePlate,
          {
            width: orbSize + 6,
            height: orbSize + 6,
            borderRadius: (orbSize + 6) / 2,
            backgroundColor: theme.card,
            borderColor: theme.border,
            transform: [{ scale }],
          },
        ]}
      >
        {failed ? (
          <Text style={{ fontSize: 40 }}>🌿</Text>
        ) : (
          <Image
            source={theme.emoFace}
            onError={() => setFailed(true)}
            resizeMode="contain"
            style={{ width: orbSize, height: orbSize }}
          />
        )}
      </Animated.View>
      {onVoicePress ? (
        <Pressable
          onPress={onVoicePress}
          style={[styles.chatMicBadge, styles.presenceMicBadge, { backgroundColor: theme.accent, borderColor: theme.card }]}
          accessibilityRole="button"
          accessibilityLabel="Start voice talk"
        >
          <Mic size={14} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Emo orb — the mascot face on the home screen with a gentle continuous pulse.
 */
function EmoOrb({ theme: themeProp, compact = false }: { theme?: CircadianTheme; compact?: boolean }) {
  const theme = themeProp ?? getCircadianTheme();
  const faceSource = theme.emoFace;
  const pulse = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReduceMotion();
  const orbSize = compact ? 88 : 116;
  const glowSize = compact ? 98 : 130;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const scale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, compact ? 1.05 : 1.08] });
  const glowOpacity = reduceMotion ? 0.4 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={[styles.orbWrap, compact && styles.orbWrapCompact]}>
      <Animated.View
        style={[
          styles.orbGlow,
          compact && styles.orbGlowCompact,
          {
            opacity: glowOpacity,
            transform: [{ scale }],
            backgroundColor: theme.glow,
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
          },
        ]}
      />
      {failed ? (
        <Animated.View
          style={[
            styles.orbFallback,
            compact && styles.orbFallbackCompact,
            { transform: [{ scale }], backgroundColor: theme.card, width: orbSize, height: orbSize, borderRadius: orbSize / 2 },
          ]}
        >
          <Text style={{ fontSize: compact ? 36 : 52 }}>🌿</Text>
        </Animated.View>
      ) : (
        <Animated.Image
          source={faceSource}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={[
            styles.orbImage,
            compact && styles.orbImageCompact,
            { transform: [{ scale }], width: orbSize, height: orbSize, borderRadius: orbSize / 2 },
          ]}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Page 1 — Splash / Launch Screen
 * ------------------------------------------------------------------ */

// Faint floating particles (deterministic positions) for the night sky feel.
const SPLASH_PARTICLES = [
  { left: 0.12, top: 0.16, size: 3, opacity: 0.45 },
  { left: 0.82, top: 0.13, size: 2, opacity: 0.4 },
  { left: 0.68, top: 0.27, size: 3, opacity: 0.5 },
  { left: 0.22, top: 0.34, size: 2, opacity: 0.35 },
  { left: 0.9, top: 0.4, size: 2, opacity: 0.45 },
  { left: 0.08, top: 0.52, size: 3, opacity: 0.4 },
  { left: 0.78, top: 0.6, size: 2, opacity: 0.5 },
  { left: 0.3, top: 0.64, size: 2, opacity: 0.35 },
  { left: 0.55, top: 0.72, size: 3, opacity: 0.55 },
  { left: 0.16, top: 0.78, size: 2, opacity: 0.45 },
  { left: 0.86, top: 0.8, size: 3, opacity: 0.5 },
  { left: 0.42, top: 0.86, size: 2, opacity: 0.4 },
  { left: 0.64, top: 0.9, size: 2, opacity: 0.45 },
  { left: 0.26, top: 0.92, size: 3, opacity: 0.5 },
] as const;

function SplashScreen({ onDone }: { onDone?: () => void }) {
  const theme = getCircadianTheme();
  const reduceMotion = useReduceMotion();
  const faceSource = theme.emoFace;
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Hand off from the native launch screen now that our splash is on screen.
    NativeSplash.hideAsync().catch(() => {});

    // Gentle entrance
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: reduceMotion ? 1 : 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Slow, calming breathing pulse — skipped when Reduce Motion is on
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    if (!reduceMotion) loop.start();

    // Soft loading bar fills once, then hands off
    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && onDone) onDone();
    });

    return () => loop.stop();
  }, [pulse, progress, fadeIn, onDone, reduceMotion]);

  // When Reduce Motion is on, the face rests still and fully visible.
  const scale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const faceOpacity = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });

  return (
    <View style={styles.flex}>
      {/* Background from CircadianThemeProvider */}
      {SPLASH_PARTICLES.map((p, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width * p.left,
            top: height * p.top,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: theme.isDark ? '#FFFFFF' : theme.accent,
            opacity: p.opacity * (theme.isDark ? 1 : 0.4),
          }}
        />
      ))}

      <Animated.View style={[styles.splashContent, { opacity: fadeIn }]}>
        <View style={styles.splashFaceWrap}>
          {failed ? (
            <Animated.View style={[styles.splashFaceFallback, { transform: [{ scale }], opacity: faceOpacity }]}>
              <Text style={{ fontSize: 84 }}>🌿</Text>
            </Animated.View>
          ) : (
            <Animated.Image
              source={faceSource}
              resizeMode="contain"
              onError={() => setFailed(true)}
              style={[styles.splashFace, { transform: [{ scale }], opacity: faceOpacity }]}
            />
          )}
        </View>

        <Text
          style={[styles.splashTitle, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          EmoCare AI
        </Text>
        <Text
          style={[styles.splashTagline, { color: theme.secondaryText }]}
          numberOfLines={1}
        >
          Intelligence with Soul.
        </Text>

        <View style={[styles.splashBarTrack, { backgroundColor: theme.barTrack }]}>
          <Animated.View
            style={[
              styles.splashBarFill,
              {
                width: barWidth,
                backgroundColor: theme.barFill,
                shadowColor: theme.barFill,
              },
            ]}
          />
        </View>

        <Text
          style={[
            styles.splashSubtitle,
            { color: theme.mutedText, opacity: theme.isDark ? 0.75 : 0.8 },
          ]}
          numberOfLines={1}
        >
          The Emotional Operating System
        </Text>
      </Animated.View>

      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
    </View>
  );
}

function MoodWave() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1;
  return (
    <View style={styles.weekRow}>
      {days.map((d, i) => {
        const isToday = i === adjustedToday;
        const isFuture = i > adjustedToday;
        return (
          <View key={i} style={styles.weekCol}>
            <View
              style={[
                styles.weekDot,
                isFuture && styles.weekDotFuture,
                isToday && styles.weekDotToday,
              ]}
            >
              <Text style={{ fontSize: isToday ? 18 : 14 }}>{isFuture ? '+' : '😊'}</Text>
            </View>
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{d}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Check-in screen
 * ------------------------------------------------------------------ */

function CheckInScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { goBack } = useAppNav();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const onClose = () => goBack();

  const saveGradient = theme.isDark
    ? (['#9473FF', '#6366F1'] as [string, string])
    : ([theme.accent, '#7F77DD'] as [string, string]);

  const save = async () => {
    if (!selected) return;
    void hapticMedium();
    try {
      const saved = await AsyncStorage.getItem('checkIns');
      const all = saved ? JSON.parse(saved) : [];
      await AsyncStorage.setItem(
        'checkIns',
        JSON.stringify([{ id: Date.now(), date: new Date().toISOString(), mood: selected, note }, ...all]),
      );
    } catch {}
    setSelected(null);
    setNote('');
    onClose();
  };

  return (
    <View style={styles.flex}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <TopChrome>
        <ScreenNavChrome theme={theme} compact />

        <View style={styles.ciHeroBlock}>
          <Text style={[styles.ciTitle, { color: theme.text }]}>Check In ✦</Text>
          <Text style={[styles.ciSubtitle, { color: theme.mutedText }]}>
            Take a gentle moment to check in.
          </Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 4,
            paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.obMoodHeaderBlock}>
            <Text style={[styles.obMoodSectionTitle, { color: theme.text }]}>
              How are you feeling right now?
            </Text>
            <Text style={[styles.obMoodSectionSub, { color: theme.mutedText }]}>
              Choose the feeling that feels closest.
            </Text>
          </View>

          <View style={styles.obMoodGridPro}>
            {OB_MOODS.map((m) => {
              const isSelected = selected?.label === m.label;
              return (
                <TouchableOpacity
                  key={m.label}
                  activeOpacity={0.85}
                  style={[
                    styles.obMoodCardPro,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isSelected && {
                      borderColor: m.accentColor ?? theme.accent,
                      backgroundColor: m.accentBg ?? 'rgba(155,123,255,0.16)',
                      shadowColor: m.accentColor ?? theme.accent,
                      shadowOpacity: 0.4,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 0 },
                    },
                  ]}
                  onPress={() => {
                    void hapticLight();
                    setSelected(m);
                  }}
                >
                  <View
                    style={[
                      styles.obMoodIconCircle,
                      {
                        backgroundColor: m.iconBg ?? theme.card,
                        borderColor: m.iconColor ? `${m.iconColor}55` : theme.border,
                        shadowColor: m.accentColor ?? m.iconColor ?? theme.accent,
                        shadowOpacity: isSelected ? 0.65 : 0.45,
                        shadowRadius: isSelected ? 10 : 7,
                        shadowOffset: { width: 0, height: 2 },
                      },
                    ]}
                  >
                    <ObMoodIcon mood={m} />
                  </View>
                  <View style={styles.obMoodCardText}>
                    <Text style={[styles.obMoodCardTitle, { color: theme.text }]}>{m.label}</Text>
                    <Text style={[styles.obMoodCardDesc, { color: theme.mutedText }]} numberOfLines={2}>
                      {m.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <GlassCard theme={theme} style={styles.ciNoteCard}>
            <Text style={[styles.cardTitle, { marginBottom: 6, color: theme.text }]}>
              What's on your heart?
            </Text>
            <Text style={[styles.cardSub, { marginBottom: 12, color: theme.mutedText }]}>
              You can write anything. We're here to hold it.
            </Text>
            <TextInput
              style={[
                styles.ciNoteInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
                },
              ]}
              placeholder="You can begin softly..."
              placeholderTextColor={theme.mutedText}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </GlassCard>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.ciSaveWrap, !selected && styles.btnDisabled]}
            onPress={save}
            disabled={!selected}
          >
            <LinearGradient colors={saveGradient} style={styles.ciSaveBtn}>
              <Text style={styles.primaryBtnText}>✦  Save Check-In</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Pressable onPress={onClose} style={styles.ciBackLink}>
            <Text style={[styles.ciBackLinkText, { color: theme.accent }]}>← Back to Sanctuary</Text>
          </Pressable>

          <Text style={[styles.ciPrivacyNote, { color: theme.mutedText }]}>
            🔒 Your check-in is private and secure
          </Text>
        </ScrollView>
      </TopChrome>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Onboarding — see components/onboarding/OnboardingFlow.tsx
 * ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ *
 * Home
 * ------------------------------------------------------------------ */

function HomeScreen({
  userName,
  onNav,
}: {
  userName: string;
  onNav: (key: MainScreenKey) => void;
}) {
  const { setMenuOpen } = useAppNav();
  return (
    <SanctuaryDashboard
      userName={userName}
      onNav={onNav}
      onOpenMenu={() => setMenuOpen(true)}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Talk (voice sanctuary — separate from text chat)
 * ------------------------------------------------------------------ */

function TalkScreen({ userName }: { userName: string }) {
  return <VoiceTalkScreen userName={userName} />;
}

/* ------------------------------------------------------------------ *
 * Chat (text conversation)
 * ------------------------------------------------------------------ */

const CHAT_USER_GRADIENT = ['#9458E8', '#E87898'] as [string, string];
const CHAT_SEND_GRADIENT = ['#9473FF', '#6366F1'] as [string, string];

const CHAT_MENU_SOLID = '#2A1848';
const CHAT_VOICE_ALOUD_KEY = 'chatVoiceAloudEnabled';
const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';

function makeWelcomeMessage(userName: string): ChatMessage {
  const n = userName.trim() || 'friend';
  return {
    id: 'welcome',
    role: 'bot',
    text: `Hello, ${n}. I'm Emo — intelligence with soul, heart and mind in one place. 💜\n\nAsk me anything, send a photo, plan your day, or just share how you feel. I'm here.`,
    time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
}

function rebuildApiHistory(messages: ChatMessage[]): ApiMessage[] {
  return messages
    .filter((m) => m.id !== 'welcome')
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
}

function EmoChatText({
  text,
  style,
  paragraphGap = 10,
}: {
  text: string;
  style: object;
  paragraphGap?: number;
}) {
  const paragraphs = splitEmoReplyParagraphs(text);
  if (paragraphs.length <= 1) {
    return <Text style={style}>{polishEmoReplyText(text)}</Text>;
  }
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Text key={`${index}-${paragraph.slice(0, 12)}`} style={[style, index > 0 && { marginTop: paragraphGap }]}>
          {paragraph}
        </Text>
      ))}
    </>
  );
}

function ChatMenuSheet({
  visible,
  theme,
  onClose,
  onStart,
  onSave,
  onSaveJournal,
  onDelete,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onStart: () => void;
  onSave: () => void;
  onSaveJournal: () => void;
  onDelete: () => void;
}) {
  const items: {
    label: string;
    Icon: LucideIcon;
    action: () => void;
    destructive?: boolean;
  }[] = [
    { label: 'Start conversation', Icon: MessageSquarePlus, action: onStart },
    { label: 'Save conversation', Icon: Bookmark, action: onSave },
    { label: 'Save to journal', Icon: BookOpen, action: onSaveJournal },
    { label: 'Delete', Icon: Trash2, action: onDelete, destructive: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.chatMenuOverlay} onPress={onClose}>
        <View style={styles.chatMenuAnchor}>
          <View
            style={[
              styles.chatMenuSheet,
              { backgroundColor: CHAT_MENU_SOLID, borderColor: DARK_MENU_SURFACE.border },
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
                  styles.chatMenuItem,
                  index < items.length - 1 && styles.chatMenuItemBorder,
                  pressed && styles.chatMenuItemPressed,
                ]}
              >
                <item.Icon
                  size={17}
                  color={item.destructive ? '#F08A8A' : DARK_MENU_SURFACE.secondaryText}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.chatMenuItemText,
                    { color: item.destructive ? '#F08A8A' : DARK_MENU_SURFACE.text },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function AttachmentMenuSheet({
  visible,
  theme,
  onClose,
  onPhoto,
  onFile,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onPhoto: () => void;
  onFile: () => void;
}) {
  const items = [
    { label: 'Photo from library', Icon: ImageIcon, action: onPhoto },
    { label: 'Choose a file', Icon: FileText, action: onFile },
    { label: 'Cancel', Icon: X, action: onClose, cancel: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.micMenuOverlay} onPress={onClose}>
        <View style={styles.plusMenuAnchor}>
          <View
            style={[
              styles.chatMenuSheet,
              { backgroundColor: CHAT_MENU_SOLID, borderColor: DARK_MENU_SURFACE.border },
            ]}
          >
            {items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  if (!item.cancel) item.action();
                }}
                style={({ pressed }) => [
                  styles.chatMenuItem,
                  index < items.length - 1 && styles.chatMenuItemBorder,
                  pressed && styles.chatMenuItemPressed,
                ]}
              >
                <item.Icon
                  size={17}
                  color={item.cancel ? DARK_MENU_SURFACE.mutedText : DARK_MENU_SURFACE.secondaryText}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.chatMenuItemText,
                    { color: item.cancel ? DARK_MENU_SURFACE.mutedText : DARK_MENU_SURFACE.text },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

type ChatBubbleMenuVariant = 'user' | 'bot';

function ChatBubbleMenuSheet({
  visible,
  theme,
  variant,
  bottomInset,
  onClose,
  onCopy,
  onPaste,
  onEdit,
  onDelete,
  onListen,
}: {
  visible: boolean;
  theme: CircadianTheme;
  variant: ChatBubbleMenuVariant;
  bottomInset: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onListen?: () => void;
}) {
  const items =
    variant === 'user'
      ? [
          { label: 'Copy', action: onCopy },
          { label: 'Paste', action: onPaste },
          { label: 'Edit', action: onEdit },
          { label: 'Delete', action: onDelete, destructive: true },
          { label: 'Cancel', cancel: true },
        ]
      : [
          { label: 'Copy', action: onCopy },
          ...(onListen ? [{ label: 'Listen', action: onListen }] : []),
          { label: 'Cancel', cancel: true },
        ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.chatBubbleMenuOverlay}>
        <Pressable style={styles.chatBubbleMenuBackdrop} onPress={onClose} accessibilityLabel="Close menu" />
        <View
          style={[
            styles.chatBubbleMenuSheet,
            {
              backgroundColor: CHAT_MENU_SOLID,
              borderColor: DARK_MENU_SURFACE.border,
              marginBottom: bottomInset + 12,
            },
          ]}
        >
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                if (!item.cancel && item.action) {
                  item.action();
                }
              }}
              style={({ pressed }) => [
                styles.chatMenuItem,
                index < items.length - 1 && styles.chatMenuItemBorder,
                pressed && styles.chatMenuItemPressed,
              ]}
            >
              <Text
                style={[
                  styles.chatMenuItemText,
                  item.destructive && { color: '#F08A8A' },
                  item.cancel && { color: DARK_MENU_SURFACE.mutedText, fontWeight: '600' },
                  !item.destructive && !item.cancel && { color: DARK_MENU_SURFACE.text },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function ChatScreen({ userName }: { userName: string }) {
  const theme = useCircadianTheme();
  const { goBack, setMenuOpen: setAppMenuOpen } = useAppNav();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [voiceAloudEnabled, setVoiceAloudEnabled] = useState(true);
  const [isEmoSpeaking, setIsEmoSpeaking] = useState(false);
  const [history, setHistory] = useState<ApiMessage[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [micMenuOpen, setMicMenuOpen] = useState(false);
  const [bubbleMenuMsg, setBubbleMenuMsg] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [streamLevel, setStreamLevel] = useState(0);
  const streamDecayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const bumpStreamLevel = () => {
    setStreamLevel(1);
    if (streamDecayRef.current) clearInterval(streamDecayRef.current);
    streamDecayRef.current = setInterval(() => {
      setStreamLevel((level) => {
        const next = level * 0.84;
        if (next < 0.04) {
          if (streamDecayRef.current) clearInterval(streamDecayRef.current);
          return 0;
        }
        return next;
      });
    }, 90);
  };

  useEffect(
    () => () => {
      if (streamDecayRef.current) clearInterval(streamDecayRef.current);
      streamAbortRef.current?.abort();
    },
    [],
  );

  const persistChat = async (msgs: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem('chatCurrent', JSON.stringify(msgs));
    } catch {}
  };

  const loadChat = async () => {
    try {
      const saved = await AsyncStorage.getItem('chatCurrent');
      if (saved) {
        const parsed: ChatMessage[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
          setHistory(rebuildApiHistory(parsed));
          return;
        }
      }
    } catch {}
    const welcome = makeWelcomeMessage(userName);
    setMessages([welcome]);
    setHistory([]);
  };

  useEffect(() => {
    loadChat();
  }, [userName]);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_TALK_QUERY_KEY)
      .then((pending) => {
        if (!pending?.trim()) return;
        setInput(pending.trim());
        inputRef.current?.focus();
        return AsyncStorage.removeItem(PENDING_TALK_QUERY_KEY);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_JOURNAL_CONTEXT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const ctx = JSON.parse(raw) as { text?: string; mood?: { label?: string } };
          const moodLine = ctx.mood?.label ? ` You checked in as ${ctx.mood.label}.` : '';
          const intro = ctx.text?.trim()
            ? `I read what you wrote in your journal.${moodLine}\n\n"${ctx.text.trim()}"\n\nWhat feels most alive in that for you right now?`
            : `I am here with what you wrote in your journal.${moodLine} What would you like to explore together?`;
          const botMsg: ChatMessage = {
            id: `journal-ctx-${Date.now()}`,
            role: 'bot',
            text: intro,
            time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          };
          setMessages((prev) => (prev.length <= 1 ? [prev[0] ?? makeWelcomeMessage(userName), botMsg] : [...prev, botMsg]));
        } catch {}
        return AsyncStorage.removeItem(PENDING_JOURNAL_CONTEXT_KEY);
      })
      .catch(() => {});
  }, [userName]);

  useEffect(() => {
    AsyncStorage.getItem(CHAT_VOICE_ALOUD_KEY)
      .then((raw) => {
        if (raw === '0') setVoiceAloudEnabled(false);
        else if (raw === '1') setVoiceAloudEnabled(true);
      })
      .catch(() => {});
  }, []);

  useEffect(
    () => () => {
      stopSpeaking();
    },
    [],
  );

  const persistVoiceAloud = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(CHAT_VOICE_ALOUD_KEY, enabled ? '1' : '0');
    } catch {}
  };

  const speakEmoReply = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    void speakAloud(trimmed, {
      onStart: () => setIsEmoSpeaking(true),
      onDone: () => setIsEmoSpeaking(false),
      onProvider: (provider) => {
        if (__DEV__ && provider === 'system') {
          console.warn('[Emo voice] Using device voice — check ElevenLabs credits/model');
        }
      },
      onElevenLabsError: (message) => {
        console.warn('[Emo voice]', describeElevenLabsError(message));
      },
    });
  };

  const lastBotReply = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role === 'bot' && msg.text.trim()) return msg.text;
    }
    return '';
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) persistChat(messages);
  }, [messages]);

  const copyMessage = async (msg: ChatMessage) => {
    await Clipboard.setStringAsync(msg.text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const pasteIntoComposer = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (text) {
        setInput(text);
        inputRef.current?.focus();
      }
    } catch {}
  };

  const editUserMessage = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setInput(msg.text);
    inputRef.current?.focus();
  };

  const deleteUserMessage = (msg: ChatMessage) => {
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== msg.id);
      setHistory(rebuildApiHistory(next));
      return next;
    });
    if (editingId === msg.id) {
      setEditingId(null);
      setInput('');
    }
  };

  const openBubbleMenu = (msg: ChatMessage) => {
    setBubbleMenuMsg(msg);
  };

  const closeBubbleMenu = () => {
    setBubbleMenuMsg(null);
  };

  const startFreshChat = () => {
    const welcome = makeWelcomeMessage(userName);
    setMessages([welcome]);
    setHistory([]);
    setEditingId(null);
    setInput('');
  };

  const handleSaveToJournal = async () => {
    const transcript = messages
      .filter((m) => m.text.trim())
      .map((m) => `${m.role === 'bot' ? 'Emo' : 'You'}: ${m.text.trim()}`)
      .join('\n\n');
    if (!transcript.trim()) {
      Alert.alert('Nothing to save', 'Start a conversation first.');
      return;
    }
    try {
      const raw = await AsyncStorage.getItem('journalEntries');
      const entries = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(
        'journalEntries',
        JSON.stringify([
          {
            id: Date.now(),
            date: new Date().toISOString(),
            text: transcript,
            mood: { emoji: '💬', label: 'Conversation' },
          },
          ...entries,
        ]),
      );
      Alert.alert('Saved to journal', 'This conversation was added to your journal.');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  const handleDeleteConversation = () => {
    Alert.alert('Delete conversation', 'Remove all messages in this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: startFreshChat },
    ]);
  };

  const handleStartConversation = () => {
    Alert.alert('Start conversation', 'Begin a fresh conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: startFreshChat },
    ]);
  };

  const handleSave = async () => {
    try {
      const raw = await AsyncStorage.getItem('chatSaved');
      const saved = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(
        'chatSaved',
        JSON.stringify([
          { id: Date.now(), date: new Date().toISOString(), messages },
          ...saved,
        ]),
      );
      Alert.alert('Saved', 'Chat saved on this device.');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  const addAttachment = async (
    uri: string,
    kind: 'photo' | 'file',
    label: string,
    fileName?: string,
  ) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg: ChatMessage = {
      id: `att-${Date.now()}`,
      role: 'user',
      text: label,
      time,
      attachmentUri: uri,
      attachmentKind: kind,
      attachmentName: fileName,
    };
    const newMessages = [...messages, msg];
    setMessages(newMessages);
    await requestEmoReply(newMessages);
  };

  const requestEmoReply = async (chatMessages: ChatMessage[]) => {
    if (isWaiting) return;
    setIsWaiting(true);
    setIsSearching(false);

    try {
      const apiMessages = await buildAnthropicMessagesFromChat(chatMessages);
      if (apiMessages.length === 0) {
        setIsWaiting(false);
        return;
      }

      const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === 'user');
      const crisis = lastUserMsg ? detectCrisisSignals(lastUserMsg.text) : { inCrisis: false };
      const intent = lastUserMsg && !crisis.inCrisis
        ? classifyEmoIntent(lastUserMsg.text)
        : { mode: 'sanctuary' as const };

      let researchBlock = '';
      if (lastUserMsg && !crisis.inCrisis && shouldRunOracleSearch(intent.mode, lastUserMsg.text)) {
        setIsSearching(true);
        try {
          const research = await fetchOracleResearchContext(lastUserMsg.text);
          if (research.hadResults && research.contextBlock) {
            researchBlock = `\n\n${research.contextBlock}`;
            void logOracleInquiry({
              message: lastUserMsg.text,
              query: research.query,
              sources: research.sources as { title: string; url: string }[],
            });
          }
        } catch {
          if (__DEV__) console.warn('[Emo Oracle] Web research failed');
        } finally {
          setIsSearching(false);
        }
      }

      const system = [
        getChatSystemPrompt(userName),
        crisis.inCrisis ? getCrisisSafetyAppendix() : getIntentModeAppendix(intent.mode),
        researchBlock,
      ]
        .filter(Boolean)
        .join('\n\n');

      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const streamId = `b-${Date.now()}`;
      setMessages((prev) => [...prev, { id: streamId, role: 'bot', text: '', time: replyTime }]);

      const result = await streamAnthropicMessages({
        system,
        maxTokens: intent.mode === 'oracle' ? 1600 : 1200,
        messages: apiMessages,
        signal: abort.signal,
        onStart: () => bumpStreamLevel(),
        onTextDelta: (_chunk: string, full: string) => {
          bumpStreamLevel();
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, text: full } : m)),
          );
          scrollRef.current?.scrollToEnd({ animated: true });
        },
        onDone: (fullText: string) => {
          const replyText = polishEmoReplyText(fullText);
          setHistory((prev) => [...prev, { role: 'assistant', content: replyText }]);
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, text: replyText } : m)),
          );
          setStreamLevel(0);
          if (voiceAloudEnabled) speakEmoReply(replyText);
        },
        onError: (message: string) => {
          setStreamLevel(0);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamId
                ? {
                    ...m,
                    text:
                      message ||
                      "I'm still here with you. Something interrupted my reply just now — try sending that again? 💜",
                  }
                : m,
            ),
          );
        },
      });

      if (result.ok === false && !abort.signal.aborted) {
        const aborted = 'aborted' in result && result.aborted;
        if (!aborted) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== streamId || m.text.trim()) return m;
              const errObj = 'error' in result ? result.error : null;
              const errMsg = describeAnthropicError({ error: errObj ?? {} });
              return { ...m, text: errMsg };
            }),
          );
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: 'Something went gently wrong. Please try again. 🌿',
          time: '',
        },
      ]);
    }
    setIsSearching(false);
    setIsWaiting(false);
  };

  const pickPhoto = async () => {
    if (isWaiting) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to share images with Emo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      addAttachment(result.assets[0].uri, 'photo', 'Can you see this photo?');
    }
  };

  const pickFile = async () => {
    if (isWaiting) return;
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]?.uri) {
      const name = result.assets[0].name ?? 'File';
      const isPdf = name.toLowerCase().endsWith('.pdf');
      addAttachment(
        result.assets[0].uri,
        'file',
        isPdf ? `Can you read this PDF? (${name})` : `Can you read this file? (${name})`,
        name,
      );
    }
  };

  const handleSendFiles = () => {
    setPlusMenuOpen(true);
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isWaiting) return;

    stopSpeaking();
    streamAbortRef.current?.abort();

    if (editingId) {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === editingId ? { ...m, text: trimmed } : m));
        setHistory(rebuildApiHistory(next));
        return next;
      });
      setEditingId(null);
      setInput('');
      return;
    }

    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setHistory((prev) => [...prev, { role: 'user', content: trimmed }]);
    await requestEmoReply(newMessages);
  };

  const navBtnStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
  };
  const chatStatusLine = isEmoSpeaking
    ? 'Emo is speaking…'
    : isSearching
      ? 'Oracle · gathering research…'
      : isWaiting
        ? streamLevel > 0.05
          ? 'Emo is writing…'
          : 'Thinking with you…'
        : voiceAloudEnabled
          ? 'Read aloud on'
          : 'Always here with you';

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <TopChrome>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.chatHeaderUnified}>
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                styles.chatNavBtn,
                navBtnStyle,
                pressed && styles.chatNavBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={22} color={theme.text} strokeWidth={2.5} />
            </Pressable>

            <View style={styles.chatHeaderBrand}>
              <EmoAvatar size={44} theme={theme} plain streamLevel={streamLevel} />
              <View style={styles.chatHeaderTextCol}>
                <Text style={[styles.chatHeroTitleCompact, { color: theme.text }]}>Emo</Text>
                <Text style={[styles.chatHeroTaglineInline, { color: theme.secondaryText }]}>
                  {chatStatusLine}
                </Text>
              </View>
            </View>

            <View style={styles.chatClassicTopActions}>
              <Pressable
                onPress={() => setAppMenuOpen(true)}
                style={({ pressed }) => [
                  styles.chatNavBtn,
                  navBtnStyle,
                  pressed && styles.chatNavBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="App menu"
              >
                <LayoutGrid size={18} color={theme.text} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={() => setMenuOpen(true)}
                style={({ pressed }) => [
                  styles.chatNavBtn,
                  navBtnStyle,
                  pressed && styles.chatNavBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Chat menu"
              >
                <Menu size={18} color={theme.text} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.chatMessagesScroll}
            contentContainerStyle={[styles.chatScrollContent, styles.chatScrollContentGrow]}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {messages.map((m) =>
              m.role === 'bot' ? (
                <View key={m.id} style={styles.chatMsgBotClassic}>
                  <Pressable
                    onPress={() => openBubbleMenu(m)}
                    style={({ pressed }) => [styles.chatBotPlain, pressed && styles.chatBubblePressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Emo message options"
                  >
                    <EmoChatText text={m.text} style={[styles.chatBotText, { color: theme.text }]} />
                  </Pressable>
                  {m.time ? (
                    <Text style={[styles.chatMsgTime, { color: theme.mutedText }]}>{m.time}</Text>
                  ) : null}
                </View>
              ) : (
                <View key={m.id} style={styles.chatMsgRowUser}>
                  <Pressable
                    onPress={() => openBubbleMenu(m)}
                    style={({ pressed }) => [pressed && styles.chatBubblePressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Your message options"
                  >
                    <LinearGradient
                      colors={CHAT_USER_GRADIENT}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.chatUserBubble}
                    >
                      {m.attachmentUri && m.attachmentKind === 'photo' ? (
                        <Image
                          source={{ uri: m.attachmentUri }}
                          style={styles.chatAttachmentImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text style={styles.chatUserText}>{m.text}</Text>
                    </LinearGradient>
                  </Pressable>
                  {m.time ? (
                    <Text style={[styles.chatMsgTime, styles.chatMsgTimeUser, { color: theme.mutedText }]}>
                      {m.time} ✓✓
                    </Text>
                  ) : null}
                </View>
              ),
            )}
            {isWaiting ? (
              <View style={styles.chatMsgBotClassic}>
                <Text style={[styles.chatTypingGlyph, { color: theme.accent }]}>···</Text>
              </View>
            ) : null}
          </ScrollView>

          {editingId ? (
            <View style={[styles.chatEditBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.chatEditBannerText, { color: theme.mutedText }]}>Editing message</Text>
              <Pressable
                onPress={() => {
                  setEditingId(null);
                  setInput('');
                }}
              >
                <Text style={{ color: theme.accent, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          <View
            style={[
              styles.chatComposerWrap,
              { paddingBottom: NAV_CONTENT_HEIGHT + (insets.bottom ?? 0) + 6 },
            ]}
          >
            <View
              style={[
                styles.chatComposerPill,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Pressable
                onPress={handleSendFiles}
                style={({ pressed }) => [styles.chatPlusBtn, pressed && styles.chatNavBtnPressed, isWaiting && styles.btnDisabled]}
                disabled={isWaiting}
                accessibilityRole="button"
                accessibilityLabel="Send files and photos"
              >
                <Plus size={20} color={theme.text} strokeWidth={2.5} />
              </Pressable>
              <TextInput
                ref={inputRef}
                style={[styles.chatComposerInput, { color: theme.text }]}
                placeholder="Ask anything, share a feeling, or attach a photo..."
                placeholderTextColor={theme.mutedText}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={send}
                editable={!isWaiting}
                returnKeyType="send"
                submitBehavior="submit"
                blurOnSubmit={false}
                multiline={false}
              />
              <Pressable
                onPress={() => setMicMenuOpen(true)}
                style={({ pressed }) => [
                  styles.chatMicBtn,
                  pressed && styles.chatNavBtnPressed,
                  isWaiting && styles.btnDisabled,
                ]}
                disabled={isWaiting}
                accessibilityRole="button"
                accessibilityLabel="Voice controls"
              >
                {voiceAloudEnabled ? (
                  <Mic size={17} color={theme.accent} strokeWidth={2.4} />
                ) : (
                  <MicOff size={17} color={theme.mutedText} strokeWidth={2.4} />
                )}
              </Pressable>
              <TouchableOpacity
                style={[styles.chatSendWrap, isWaiting && styles.btnDisabled]}
                onPress={send}
                disabled={isWaiting}
                activeOpacity={0.88}
              >
                <LinearGradient colors={CHAT_SEND_GRADIENT} style={styles.chatSendBtn}>
                  <Text style={styles.chatSendGlyph}>↑</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.chatPrivacyRow}>
              <Lock size={12} color={theme.mutedText} strokeWidth={2.2} />
              <Text style={[styles.chatPrivacy, { color: theme.mutedText }]}>
                Your conversations are private and secure
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TopChrome>

      <ChatMenuSheet
        visible={menuOpen}
        theme={theme}
        onClose={() => setMenuOpen(false)}
        onStart={handleStartConversation}
        onSave={handleSave}
        onSaveJournal={handleSaveToJournal}
        onDelete={handleDeleteConversation}
      />

      <AttachmentMenuSheet
        visible={plusMenuOpen}
        theme={theme}
        onClose={() => setPlusMenuOpen(false)}
        onPhoto={pickPhoto}
        onFile={pickFile}
      />

      <VoiceMicControlSheet
        visible={micMenuOpen}
        theme={theme}
        onClose={() => setMicMenuOpen(false)}
        onPause={() => {
          stopSpeaking();
          setIsEmoSpeaking(false);
        }}
        onPlay={() => {
          if (!voiceAloudEnabled) {
            setVoiceAloudEnabled(true);
            void persistVoiceAloud(true);
          }
          if (lastBotReply) speakEmoReply(lastBotReply);
        }}
        onMute={() => {
          setVoiceAloudEnabled(false);
          void persistVoiceAloud(false);
          stopSpeaking();
          setIsEmoSpeaking(false);
        }}
        onStop={() => {
          stopSpeaking();
          setIsEmoSpeaking(false);
        }}
      />

      <ChatBubbleMenuSheet
        visible={bubbleMenuMsg != null}
        theme={theme}
        variant={bubbleMenuMsg?.role === 'user' ? 'user' : 'bot'}
        bottomInset={NAV_CONTENT_HEIGHT + (insets.bottom ?? 0)}
        onClose={closeBubbleMenu}
        onCopy={() => {
          if (bubbleMenuMsg) void copyMessage(bubbleMenuMsg);
        }}
        onPaste={() => {
          void pasteIntoComposer();
        }}
        onEdit={() => {
          if (bubbleMenuMsg?.role === 'user') editUserMessage(bubbleMenuMsg);
        }}
        onDelete={() => {
          if (bubbleMenuMsg?.role === 'user') deleteUserMessage(bubbleMenuMsg);
        }}
        onListen={
          bubbleMenuMsg?.role === 'bot'
            ? () => speakEmoReply(bubbleMenuMsg.text)
            : undefined
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Floating nav bar
 * ------------------------------------------------------------------ */

function NavBarShell() {
  const { immersiveChromeHidden } = useAppNav();
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: immersiveChromeHidden ? 0 : 1,
        duration: 800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: immersiveChromeHidden ? 20 : 0,
        duration: 800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, immersiveChromeHidden, slide]);

  return (
    <Animated.View
      style={{ opacity: fade, transform: [{ translateY: slide }] }}
      pointerEvents={immersiveChromeHidden ? 'none' : 'auto'}
    >
      <NavBar />
    </Animated.View>
  );
}

function NavBar() {
  const insets = useSafeAreaInsets();
  const theme = useCircadianTheme();
  const { screen, navigate } = useAppNav();
  const tabs: { key: MainScreenKey; icon: string; label: string; Icon?: LucideIcon }[] = [
    { key: 'home', icon: '🏠', label: 'Home' },
    { key: 'checkin', icon: '💜', label: 'Check In' },
    { key: 'talk', icon: '💬', label: 'Talk' },
    { key: 'voice', icon: '', label: 'Voice', Icon: AudioLines },
    { key: 'breathe', icon: '🌬️', label: 'Breathe' },
    { key: 'journal', icon: '📓', label: 'Journal' },
  ];
  return (
    <View
      style={[
        styles.navBar,
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: NAV_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: theme.navBar,
          borderTopColor: theme.navBarBorder,
        },
      ]}
    >
      {tabs.map((t) => {
        const isActive = screen === t.key;
        const iconColor = isActive ? theme.accent : theme.mutedText;
        return (
          <TouchableOpacity key={t.key} style={styles.navItem} onPress={() => navigate(t.key)}>
            {t.Icon ? (
              <t.Icon size={20} color={iconColor} strokeWidth={isActive ? 2.4 : 2} />
            ) : (
              <Text style={{ fontSize: 20 }}>{t.icon}</Text>
            )}
            <Text
              style={[
                styles.navLabel,
                { color: theme.mutedText },
                isActive && [styles.navLabelActive, { color: theme.accent }],
              ]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Root
 * ------------------------------------------------------------------ */

function Root() {
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [homeLandingMode, setHomeLandingMode] = useState<'sanctuary' | 'oracle'>('sanctuary');
  const [screen, setScreen] = useState<MainScreenKey>('home');

  useEffect(() => {
    async function bootstrap() {
      const v = await AsyncStorage.getItem('onboarded');
      if (v === 'true') {
        const n = await AsyncStorage.getItem('userName');
        const mode = await AsyncStorage.getItem(HOME_LANDING_MODE_KEY);
        setUserName(n || '');
        setHomeLandingMode(mode === 'oracle' ? 'oracle' : 'sanctuary');
        setOnboarded(true);
      }
      setLoading(false);
      NativeSplash.hideAsync().catch(() => {});
    }
    bootstrap();
  }, []);

  if (loading) {
    return null;
  }

  if (!onboarded) {
    return (
      <OnboardingFlow
        onComplete={({ name, landingMode }) => {
          setUserName(name);
          setHomeLandingMode(landingMode);
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <SanctuaryAmbientProvider>
      <VoiceStreamProvider>
        <AppNavProvider
          userName={userName}
          setUserName={setUserName}
          screen={screen}
          setScreen={setScreen}
        >
          <RootMain homeLandingMode={homeLandingMode} />
        </AppNavProvider>
      </VoiceStreamProvider>
    </SanctuaryAmbientProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <CircadianThemeProvider>
        <Root />
      </CircadianThemeProvider>
    </SafeAreaProvider>
  );
}

function RootMain({ homeLandingMode: _homeLandingMode }: { homeLandingMode: 'sanctuary' | 'oracle' }) {
  const theme = useCircadianTheme();
  const swipe = useScreenSwipeNav();
  const screenFade = useRef(new Animated.Value(1)).current;
  const screenFirstMount = useRef(true);
  const [memoryLedgerOpen, setMemoryLedgerOpen] = useState(false);
  const {
    userName,
    setUserName,
    screen,
    navigate,
    menuOpen,
    setMenuOpen,
    profileOpen,
    setProfileOpen,
    onboardingReviewSlide,
    openOnboardingSlide,
    closeOnboardingReview,
  } = useAppNav();

  useEffect(() => {
    if (screenFirstMount.current) {
      screenFirstMount.current = false;
      return;
    }
    screenFade.setValue(0);
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [screen, screenFade]);

  const handleMenuSelect = (target: NavTarget) => {
    if (target.kind === 'screen') navigate(target.key);
    else openOnboardingSlide(target.slide);
  };

  const saveProfileName = async (name: string) => {
    try {
      await AsyncStorage.setItem('userName', name);
    } catch {}
    setUserName(name);
  };

  if (onboardingReviewSlide) {
    return (
      <OnboardingFlow
        reviewMode
        initialSlide={onboardingReviewSlide}
        onExitReview={closeOnboardingReview}
        onComplete={() => closeOnboardingReview()}
      />
    );
  }

  const screens: Record<MainScreenKey, React.ReactNode> = {
    home: <HomeScreen userName={userName} onNav={navigate} />,
    checkin: <CheckInScreen onNav={navigate} />,
    talk: <ChatScreen userName={userName} />,
    voice: <TalkScreen userName={userName} />,
    breathe: <BreatheExperience />,
    journal: <JournalScreen onNav={navigate} />,
  };

  const statusTheme = theme.isDark ? 'light' : 'dark';

  return (
    <View style={styles.flex} {...swipe.panHandlers}>
      <StatusBar style={statusTheme} />
      <Animated.View style={[styles.flex, { opacity: screenFade }]}>{screens[screen]}</Animated.View>
      <NavBarShell />
      <AppMenuSheet
        visible={menuOpen}
        theme={theme}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenMemoryLedger={() => {
          setMenuOpen(false);
          setMemoryLedgerOpen(true);
        }}
      />
      <ProfileNameSheet
        visible={profileOpen}
        theme={theme}
        userName={userName}
        onClose={() => setProfileOpen(false)}
        onSave={(name) => void saveProfileName(name)}
      />
      <MemoryLedgerSheet
        visible={memoryLedgerOpen}
        theme={theme}
        onClose={() => setMemoryLedgerOpen(false)}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Styles — dynamic vertical paddings, no rigid heights around text
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenForeground: { flex: 1, zIndex: 1 },
  screenScrollContent: { flexGrow: 0 },

  glass: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    overflow: 'hidden',
  },
  glassPressed: { opacity: 0.88 },
  cardPad: { paddingVertical: 16, paddingHorizontal: 16, marginBottom: 16 },
  cardPadLg: { paddingVertical: 18, paddingHorizontal: 18, marginBottom: 16 },

  // Avatar
  avatarPlainWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingGradient: {
    position: 'absolute',
  },
  avatarRing: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat presence orb (circadian hero)
  presenceOrbWrap: {
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  presenceOrbHalo: {
    position: 'absolute',
  },
  presenceOrbGlow: {
    position: 'absolute',
  },
  presenceOrbRing: {
    position: 'absolute',
    opacity: 0.85,
  },
  presenceOrbFacePlate: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  presenceMicBadge: {
    position: 'absolute',
    right: 18,
    top: 18,
  },
  chatMicBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  // Emo orb (home screen pulse)
  orbWrap: { alignItems: 'center', justifyContent: 'center', height: 130, marginTop: 8, marginBottom: 6 },
  orbWrapCompact: { height: 98, marginTop: 0, marginBottom: 0 },
  orbGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: C.purpleGlow },
  orbGlowCompact: {},
  orbImage: { width: 116, height: 116, borderRadius: 58 },
  orbImageCompact: {},
  orbFallback: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleLight,
  },
  orbFallbackCompact: {},

  // Splash / Launch (Page 1)
  splashContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  splashFaceWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  splashFace: { width: 296, height: 296, borderRadius: 148 },
  splashFaceFallback: {
    width: 264,
    height: 264,
    borderRadius: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  splashTagline: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 2, // luxury spacing
    textAlign: 'center',
    marginTop: 26, // ~2 spaces below the title
  },
  splashBarTrack: {
    width: '35%',
    height: 6,
    borderRadius: 999,
    marginTop: 72, // pushed down, sitting just above the subtitle
    overflow: 'hidden',
  },
  splashBarFill: {
    height: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  splashSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 22, // sits just below the bar, near the lower particles
  },
  auroraClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.6,
    overflow: 'hidden',
  },
  auroraWide: {
    position: 'absolute',
    bottom: -height * 0.22,
    alignSelf: 'center',
    width: width * 1.8,
    height: height * 0.62,
    borderRadius: width * 0.9,
  },
  auroraCore: {
    position: 'absolute',
    bottom: -height * 0.1,
    alignSelf: 'center',
    width: width * 0.95,
    height: height * 0.36,
    borderRadius: width * 0.5,
  },

  // Onboarding
  obSlide: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 20 },
  obSlidePage: { flex: 1, justifyContent: 'center' },
  // Welcome (slide 1) — airy layout, button pinned to bottom
  obWelcomeSlide: { paddingTop: 0, paddingBottom: 12 },
  obWelcomeEyebrow: { marginBottom: 14, marginTop: 0 },
  obWelcomeTitle: { marginBottom: 22, fontSize: 25, lineHeight: 34 },
  obWelcomeBody: { marginTop: 2, lineHeight: 24, paddingHorizontal: 6 },
  obWelcomeQuote: { marginTop: 26, lineHeight: 24, paddingHorizontal: 8 },
  obWelcomeNoteCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 28,
    width: '100%',
  },
  obWelcomeBtn: { marginTop: 'auto', marginBottom: 4 },
  // Welcome + Privacy — face sits higher so text below has room to breathe
  welcomeOrbWrapRaised: { marginTop: 0, marginBottom: 22 },
  // Privacy (slide 2) — airy text + button at bottom
  obPrivacySlide: { paddingTop: 0, paddingBottom: 12 },
  obPrivacyEyebrow: { marginBottom: 14, marginTop: 0 },
  obPrivacyTitle: { marginBottom: 20, fontSize: 25, lineHeight: 34 },
  obPrivacyBody: { marginTop: 2, lineHeight: 24, paddingHorizontal: 8, marginBottom: 2 },
  obPrivacyCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginTop: 28,
    width: '100%',
  },
  obPrivacyBtn: { marginTop: 'auto', marginBottom: 4 },

  // Page 4 — Name + First Mood (airy spacing, CTA pinned below)
  obNameSlide: { flex: 0, alignItems: 'stretch', paddingTop: 4, paddingBottom: 12 },
  obNameScrollContent: { paddingHorizontal: 28, paddingBottom: 120 },
  obNameHeaderBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 26,
  },
  obNameEyebrow: { textAlign: 'center', alignSelf: 'center', marginBottom: 14, marginTop: 0 },
  obNameTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  obNameSub: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 0,
  },
  obNameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 0.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 12,
  },
  obNameInputIcon: { marginTop: 1 },
  obNameInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  obMoodHeaderBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  obMoodSectionTitle: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  obMoodSectionSub: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 0,
  },
  obMoodGridPro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: '100%',
    marginBottom: 20,
  },
  obMoodCardPro: {
    width: (width - 56 - 14) / 2,
    flexBasis: (width - 56 - 14) / 2,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
    gap: 10,
    minHeight: 74,
  },
  obMoodIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  obMoodIconEmoji: { fontSize: 17 },
  obMoodCardText: { flex: 1, paddingTop: 3 },
  obMoodCardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 5, lineHeight: 16 },
  obMoodCardDesc: { fontSize: 10, lineHeight: 15 },
  obSanctuaryBtnWrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 'auto',
    marginBottom: 6,
  },
  obSanctuaryBtnPinned: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 28,
  },
  obSanctuaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderRadius: 18,
  },
  obProgressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 14, paddingBottom: 6 },
  obBackBtn: {
    position: 'absolute',
    left: 16,
    top: 52,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  obBackText: { color: C.white80, fontSize: 28, fontWeight: '300', lineHeight: 30 },
  obDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.white10 },
  obDotActive: { width: 20, borderRadius: 4, backgroundColor: C.purple },
  obDotDone: { backgroundColor: C.white30 },
  obOrb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.purpleLight,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  // Welcome (slide 1) — Emo face nestled in a soft breathing halo + sanctuary rings
  welcomeOrbWrap: {
    width: 236,
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  welcomeGlow: {
    position: 'absolute',
    top: 34,
    left: 34,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(155,123,255,0.22)',
    shadowColor: '#9B7BFF',
    shadowOpacity: 0.75,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
  },
  welcomeRingOuter: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: 'rgba(183,157,255,0.16)',
  },
  welcomeRingInner: {
    position: 'absolute',
    top: 25,
    left: 25,
    width: 186,
    height: 186,
    borderRadius: 93,
    borderWidth: 1,
    borderColor: 'rgba(183,157,255,0.30)',
  },
  // Welcome slide — rings + glow nudged down to sit on the face disc (leaf shifts visual center)
  welcomeGlowCompact: { top: 42, left: 34 },
  welcomeRingOuterCompact: { top: 10, left: 3 },
  welcomeRingInnerCompact: { top: 44, left: 25 },
  welcomeFaceCompact: { marginTop: 4 },
  welcomeFace: { width: 152, height: 152, borderRadius: 76 },
  welcomeFaceFallback: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: C.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obBulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  obBulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.purple,
    marginTop: 6,
    marginRight: 11,
  },
  obBulletText: { flex: 1, fontSize: 13, color: C.white80, lineHeight: 20 },
  obEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  obTitle: { fontSize: 26, fontWeight: '700', color: C.white, textAlign: 'center', lineHeight: 36, marginBottom: 18 },
  obBody: { fontSize: 14, color: C.white60, textAlign: 'center', lineHeight: 23 },
  obSoftLine: { fontSize: 14, color: C.white80, textAlign: 'center', fontStyle: 'italic', lineHeight: 23, marginTop: 20 },
  obNoteText: { fontSize: 12, color: C.white30, textAlign: 'center', lineHeight: 19 },
  obBtn: {
    width: '100%',
    backgroundColor: C.purple,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 26,
  },
  obInput: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    backgroundColor: C.card,
    color: C.white,
    textAlign: 'center',
    marginTop: 10,
  },
  obMoodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  obMoodCard: {
    width: (width - 76) / 2,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  obMoodCardSelected: { borderColor: C.purple, backgroundColor: C.purpleLight },
  obMoodLabel: { fontSize: 13, fontWeight: '600', color: C.white80 },
  obMoodDesc: { fontSize: 11, color: C.white30, textAlign: 'center', lineHeight: 16 },

  // Shared text
  sanctuaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  heroGreeting: { fontSize: 34, fontWeight: '700', lineHeight: 44, marginBottom: 8 },
  heroSub: { fontSize: 14, color: C.white60 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: C.white },
  cardSub: { fontSize: 12, color: C.white60, marginTop: 2, lineHeight: 18 },
  chartLabel: { fontSize: 10, color: C.white30 },

  // Mood week
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekCol: { alignItems: 'center', gap: 8 },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.purpleLight,
    borderWidth: 1,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotFuture: { backgroundColor: C.white10, borderColor: C.white10 },
  weekDotToday: { backgroundColor: C.orange, borderColor: C.orange, width: 40, height: 40, borderRadius: 20 },
  weekFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  dayLabel: { fontSize: 10, color: C.white30 },
  dayLabelToday: { color: C.orange, fontWeight: '600' },

  // Home — Sanctuary (Page 5)
  homeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 12,
  },
  homeHeaderCopy: { flex: 1, minWidth: 0 },
  homeHeaderOrb: { marginTop: 2, marginRight: -2 },
  homeAmbientSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  homeAmbientSearchInput: { flex: 1, fontSize: 15, paddingVertical: 2, padding: 0 },
  homeGreetingLine: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: SERIF,
    marginBottom: 2,
  },
  homeNameSerif: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: SERIF,
    marginBottom: 10,
  },
  homeTagline: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  homeSubline: { fontSize: 14, lineHeight: 21 },
  homeModePill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  homeModePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  homeOracleCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  homeOracleEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  homeOracleTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: SERIF,
    marginBottom: 14,
  },
  homeOracleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  homeOracleInput: { flex: 1, fontSize: 14, paddingVertical: 4, padding: 0 },
  homeOracleGo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeOracleGoText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  homeReflectionCalm: { minHeight: 108, marginBottom: 22 },
  homeSanctuarySpacer: { height: 28 },
  homeReflectionCard: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 14,
    overflow: 'hidden',
    minHeight: 132,
  },
  homeReflectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: SERIF,
    marginBottom: 10,
    paddingRight: 72,
  },
  homeReflectionBody: {
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 72,
  },
  homeReflectionGlow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  homeEmoHereCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    gap: 12,
  },
  homeEmoHereContent: { flex: 1, minWidth: 0 },
  homeEmoHereTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: SERIF,
    marginBottom: 6,
  },
  homeEmoHereBody: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  homeEmoHereBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  homeEmoHereBtnText: { fontSize: 13, fontWeight: '600' },
  homeActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  homeActionTile: {
    width: '47.5%',
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: 'hidden',
    minHeight: 108,
  },
  homeActionTileInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  homeActionTileLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  homeActionTileLabelLight: { fontSize: 13, fontWeight: '700', color: C.white },
  lockedTodayCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginTop: 4,
    marginBottom: 8,
    opacity: 0.92,
  },
  lockedTodayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  lockedTodayEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  lockedTodayTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: SERIF,
    marginBottom: 6,
  },
  lockedTodaySub: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  lockedTodaySegments: { gap: 8 },
  lockedTodaySegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  lockedTodayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lockedTodaySegmentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  todayModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  todayModalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  todayModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  todayModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: SERIF,
  },
  homeReminderCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  homeReminderEyebrow: {
    fontWeight: '600',
    letterSpacing: 1,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  homeReminderText: {
    fontSize: 14,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  homeReminderRefreshBtn: { marginTop: 12, alignSelf: 'flex-start' },
  homeReminderRefresh: { fontSize: 13, fontWeight: '600' },

  // Check-in screen
  ciForeground: { zIndex: 1 },
  ciHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingHorizontal: 18,
    gap: 12,
  },
  ciHeaderSpacer: { flex: 1 },
  ciBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  ciBackLabel: { fontSize: 14, fontWeight: '600' },
  ciHeroBlock: {
    paddingHorizontal: 22,
    paddingTop: 2,
    paddingBottom: 20,
    alignItems: 'center',
  },
  ciTitleBlock: { alignItems: 'center', paddingHorizontal: 22, paddingBottom: 12 },
  ciCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ciTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: SERIF,
    textAlign: 'center',
  },
  ciSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  ciNoteCard: { paddingVertical: 18, paddingHorizontal: 18, marginTop: 4, marginBottom: 20 },
  ciNoteInput: {
    fontSize: 14,
    minHeight: 88,
    lineHeight: 21,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ciSaveWrap: { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  ciSaveBtn: { paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', borderRadius: 18 },
  ciBackLink: { alignItems: 'center', marginBottom: 12 },
  ciBackLinkText: { fontSize: 14, fontWeight: '600' },
  ciPrivacyNote: { fontSize: 12, textAlign: 'center', marginBottom: 8 },

  // Buttons
  primaryBtn: { borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18, alignItems: 'center' },
  primaryBtnText: { color: C.white, fontSize: 15, fontWeight: '600' },
  orangeBtn: { backgroundColor: C.orange },
  btnDisabled: { opacity: 0.4 },

  // Chat — text talk screen
  chatHeaderUnified: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 8,
  },
  chatHeaderBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  chatHeaderTextCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  chatClassicTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  chatHeroTaglineInline: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  chatHeroTagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  chatMsgBotClassic: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    marginBottom: 6,
  },
  chatBotBubbleClassic: {
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  chatBotPlain: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chatQuickChipRow: {
    gap: 8,
    paddingBottom: 10,
    paddingRight: 8,
  },
  chatQuickChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  chatQuickChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  chatTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  chatNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatNavBtnPressed: { opacity: 0.82 },
  chatVoiceBtnActive: {
    backgroundColor: 'rgba(148, 115, 255, 0.14)',
  },
  chatHeroTitleCompact: {
    fontSize: 20,
    fontWeight: '400',
    fontFamily: SERIF,
  },
  chatHeroSubCompact: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  chatHero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 4,
  },
  chatHeroTitle: {
    fontSize: 26,
    fontWeight: '600',
    fontFamily: SERIF,
    marginTop: 2,
  },
  chatHeroSub: {
    fontSize: 13,
    color: '#7B6F9E',
    fontWeight: '500',
  },
  chatMessagesScroll: {
    flex: 1,
    minHeight: 0,
  },
  chatScrollContentGrow: {
    flexGrow: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    gap: 18,
  },
  chatMsgRowBot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '88%',
  },
  chatMsgCol: { flexShrink: 1 },
  chatBotBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  chatBotText: {
    fontSize: 14,
    lineHeight: 22,
  },
  chatMsgRowUser: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    marginLeft: 'auto',
  },
  chatUserBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  chatUserText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  chatMsgTime: {
    fontSize: 10,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  chatMsgTimeUser: { textAlign: 'right' },
  chatBubblePressed: { opacity: 0.88 },
  chatBubbleMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatBubbleMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  chatBubbleMenuSheet: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  chatTypingBubble: { paddingVertical: 10, paddingHorizontal: 18 },
  chatTypingGlyph: { fontSize: 18, letterSpacing: 4 },
  chatAttachmentImage: {
    width: 180,
    height: 120,
    borderRadius: 12,
    marginBottom: 6,
  },
  chatEditBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  chatEditBannerText: { fontSize: 12, fontWeight: '500' },
  chatMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  chatMenuAnchor: {
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 14,
  },
  chatMenuSheet: {
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
  chatMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  chatMenuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  chatMenuItemPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  chatMenuItemText: { fontSize: 15, fontWeight: '500', flex: 1 },
  micMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  micMenuAnchor: {
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingBottom: NAV_CONTENT_HEIGHT + 88,
  },
  plusMenuAnchor: {
    alignItems: 'flex-start',
    paddingLeft: 24,
    paddingBottom: NAV_CONTENT_HEIGHT + 88,
  },
  chatComposerWrap: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chatComposerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 0.5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  chatPlusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMicBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatComposerInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  chatSendWrap: { borderRadius: 22, overflow: 'hidden' },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendGlyph: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  chatPrivacy: {
    fontSize: 11,
  },
  chatPrivacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  msgWrap: { maxWidth: '82%', marginBottom: 14 },
  msgWrapUser: { alignSelf: 'flex-end' },
  msgWrapBot: { alignSelf: 'flex-start' },
  bubbleBot: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bubbleUser: {
    backgroundColor: C.purple,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bubbleText: { fontSize: 13, lineHeight: 21, color: C.white80 },
  bubbleTextUser: { color: C.white },
  msgTime: { fontSize: 10, color: C.white30, marginTop: 4, paddingHorizontal: 4 },
  msgTimeUser: { textAlign: 'right' },
  typingBubble: { alignSelf: 'flex-start', marginBottom: 14 },
  typingGlyph: { color: C.white60, fontSize: 18, letterSpacing: 4 },
  chatInputRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'flex-end',
    backgroundColor: C.bg2,
    borderTopWidth: 0.5,
    borderTopColor: C.cardBorder,
  },
  chatInput: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: C.card,
    color: C.white,
    maxHeight: 110,
  },
  sendBtn: {
    width: 38,
    height: 38,
    backgroundColor: C.purple,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: { color: C.white, fontSize: 18 },

  // Nav
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingTop: 10,
    zIndex: 10,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 9 },
  navLabelActive: { fontWeight: '600' },
});
