import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Image,
  AccessibilityInfo,
  PanResponder,
  type ViewStyle,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as NativeSplash from 'expo-splash-screen';
import * as Speech from 'expo-speech';
import {
  Bird,
  CloudMoon,
  CloudRain,
  CloudSun,
  Heart,
  Sparkles,
  Sprout,
  User,
  WavesHorizontal,
  type LucideIcon,
} from 'lucide-react-native';

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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callAnthropicMessages, describeAnthropicError } from './utils/anthropic';

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

const SYSTEM_PROMPT =
  'You are Emo, a warm and emotionally intelligent companion inside Emocare. Your role is to listen deeply, reflect back with care, and gently guide the person toward their own insight. You are not a therapist or doctor. You never diagnose, prescribe, or give clinical advice. Your tone is calm, soft, unhurried, non-judgmental, and validating. Ask one gentle follow-up question at a time. Keep responses to 2-4 sentences. Never use bullet points. You may use one emoji per message (💜 🌿 🌸) but sparingly.';

const AFFIRMATIONS = [
  '"You don\'t have to carry everything at once. You are allowed to move gently."',
  '"Your feelings are not too much. They are yours, and they matter."',
  '"Rest is not a reward — it is something you already deserve."',
  '"You are allowed to take up space, to be heard, and to ask for help."',
  '"Even on the hard days, you are doing more than enough."',
  '"There is no perfect way to heal. Any step forward is enough."',
  '"Be as patient with yourself as you would with someone you love."',
];

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

type ScreenKey = 'home' | 'chat' | 'breathe' | 'journal';

interface Mood {
  emoji: string;
  label: string;
  desc: string;
  color?: string;
  iconBg?: string;
  iconColor?: string;
  iconFill?: string;
  accentColor?: string;
  accentBg?: string;
  Icon?: LucideIcon;
}

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
  role: 'user' | 'bot';
  text: string;
  time: string;
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface JournalEntry {
  id: number;
  date: string;
  text: string;
  mood: { emoji: string; label: string };
}

const OB_MOODS: Mood[] = [
  {
    emoji: '🌧️',
    label: 'Heavy',
    desc: 'Feeling burdened, exhausted, or low.',
    iconBg: 'rgba(139,92,246,0.38)',
    iconColor: '#EDE9FE',
    iconFill: 'rgba(196,181,253,0.55)',
    accentColor: '#8B5CF6',
    accentBg: 'rgba(139,92,246,0.18)',
    Icon: CloudRain,
  },
  {
    emoji: '🌊',
    label: 'Overwhelmed',
    desc: 'Too much happening at once.',
    iconBg: 'rgba(59,130,246,0.36)',
    iconColor: '#DBEAFE',
    iconFill: 'rgba(147,197,253,0.5)',
    accentColor: '#3B82F6',
    accentBg: 'rgba(59,130,246,0.18)',
    Icon: WavesHorizontal,
  },
  {
    emoji: '☁️',
    label: 'Neutral',
    desc: 'Just getting through the day.',
    iconBg: 'rgba(167,139,250,0.32)',
    iconColor: '#F5F3FF',
    iconFill: 'rgba(221,214,254,0.45)',
    accentColor: '#A78BFA',
    accentBg: 'rgba(167,139,250,0.18)',
    Icon: CloudMoon,
  },
  {
    emoji: '🌱',
    label: 'Hopeful',
    desc: 'A gentle optimism ahead.',
    iconBg: 'rgba(52,211,153,0.36)',
    iconColor: '#D1FAE5',
    iconFill: 'rgba(110,231,183,0.5)',
    accentColor: '#34D399',
    accentBg: 'rgba(52,211,153,0.18)',
    Icon: Sprout,
  },
  {
    emoji: '🌤️',
    label: 'Light',
    desc: 'Uplifted, brighter, or a little lighter.',
    iconBg: 'rgba(251,191,36,0.38)',
    iconColor: '#FEF9C3',
    iconFill: 'rgba(253,224,71,0.55)',
    accentColor: '#FBBF24',
    accentBg: 'rgba(251,191,36,0.2)',
    Icon: CloudSun,
  },
  {
    emoji: '🕊️',
    label: 'Peaceful',
    desc: 'Calm, grounded, at ease.',
    iconBg: 'rgba(56,189,248,0.36)',
    iconColor: '#E0F2FE',
    iconFill: 'rgba(125,211,252,0.5)',
    accentColor: '#38BDF8',
    accentBg: 'rgba(56,189,248,0.18)',
    Icon: Bird,
  },
  {
    emoji: '💜',
    label: 'Grateful',
    desc: 'Noticing something good today.',
    iconBg: 'rgba(192,132,252,0.36)',
    iconColor: '#FAE8FF',
    iconFill: 'rgba(233,213,255,0.5)',
    accentColor: '#C084FC',
    accentBg: 'rgba(192,132,252,0.18)',
    Icon: Heart,
  },
  {
    emoji: '✨',
    label: 'Joyful',
    desc: 'Light-hearted, bright, or energized.',
    iconBg: 'rgba(251,146,60,0.38)',
    iconColor: '#FFEDD5',
    iconFill: 'rgba(253,186,116,0.55)',
    accentColor: '#FB923C',
    accentBg: 'rgba(251,146,60,0.2)',
    Icon: Sparkles,
  },
];

const CHECK_IN_MOODS: Mood[] = [
  { emoji: '😊', label: 'Peaceful', desc: 'I feel calm and grounded.', color: '#A78BFA' },
  { emoji: '🙂', label: 'Light', desc: 'I feel okay, steady or hopeful.', color: '#F4A261' },
  { emoji: '😔', label: 'Heavy', desc: 'I feel sad, tired or emotionally low.', color: '#818CF8' },
  { emoji: '😟', label: 'Anxious', desc: 'My mind feels busy or unsettled.', color: '#F472B6' },
  { emoji: '😩', label: 'Overwhelmed', desc: 'Everything feels like too much.', color: '#C084FC' },
  { emoji: '🙏', label: 'Grateful', desc: 'I notice something good today.', color: '#34D399' },
];

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
 * Full-bleed gradient backdrop. Sits behind every screen as an absolute fill
 * so the purple never reads flat, and ambient orbs add depth.
 */
function ScreenBackground({ orbs = true, colors }: { orbs?: boolean; colors?: [string, string] }) {
  return (
    <>
      <LinearGradient
        colors={colors ?? [C.gradientTop, C.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {orbs ? (
        <>
          <GlowOrb color={C.purpleGlow} size={320} top={-80} right={-60} />
          <GlowOrb color={C.orangeGlow} size={200} top={height * 0.4} right={width * 0.6} opacity={0.28} />
          <GlowOrb color={C.tealGlow} size={220} top={height * 0.72} right={-50} opacity={0.25} />
        </>
      ) : null}
    </>
  );
}

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
  onContentSizeChange?: () => void;
  contentStyle?: ViewStyle;
  theme?: CircadianTheme;
  backgroundColors?: [string, string];
}

/**
 * Circadian home gradient — shifts the background by the device's local hour.
 */
function getCircadianGradient(hour: number): [string, string] {
  if (hour >= 6 && hour <= 11) return ['#E8E4F5', '#F0ECF8']; // 6am–11am lavender
  if (hour >= 12 && hour <= 17) return ['#DDD6F3', '#EDE8F5']; // 12pm–5pm soft purple
  if (hour >= 18 && hour <= 21) return ['#2D1B4A', '#1A0F2E']; // 6pm–9pm warm rose-purple
  return ['#0D0720', '#1A0F2E']; // 10pm–5am deep dark
}

/**
 * Full circadian theme — gradient + readable colors for both light & dark periods.
 * Used by the splash screen (and available for future pages).
 */
type CircadianTheme = {
  gradient: readonly [string, string];
  splashGradient: readonly string[]; // seamless 3-stop blend for the splash
  isDark: boolean;
  text: string; // primary text
  secondaryText: string; // tagline
  mutedText: string; // subtitle
  card: string;
  border: string;
  accent: string;
  glow: string; // face halo
  barTrack: string;
  barFill: string;
};

function getCircadianTheme(date: Date = new Date()): CircadianTheme {
  const hour = date.getHours();

  // Morning — 6am–11am
  if (hour >= 6 && hour <= 11) {
    return {
      gradient: ['#E8E4F5', '#F0ECF8'],
      splashGradient: ['#F0ECF8', '#E9E4F6', '#E0D8F2'],
      isDark: false,
      text: '#4E3A85',
      secondaryText: '#7F77DD',
      mutedText: '#615A82', // darkened for readable contrast on pale lavender
      card: 'rgba(255,255,255,0.55)',
      border: 'rgba(126,110,180,0.15)',
      accent: '#9B7BFF',
      glow: 'rgba(155,123,255,0.30)',
      barTrack: '#DCCFF9',
      barFill: '#9B7BFF',
    };
  }

  // Afternoon — 12pm–5pm
  if (hour >= 12 && hour <= 17) {
    return {
      gradient: ['#DDD6F3', '#EDE8F5'],
      splashGradient: ['#EDE8F5', '#E4DDF4', '#D8CFF1'],
      isDark: false,
      text: '#4A377E',
      secondaryText: '#7767D4',
      mutedText: '#5E5680', // darkened for readable contrast on pale lavender
      card: 'rgba(255,255,255,0.50)',
      border: 'rgba(126,110,180,0.15)',
      accent: '#9473FF',
      glow: 'rgba(148,115,255,0.30)',
      barTrack: '#DCCFF9',
      barFill: '#9473FF',
    };
  }

  // Evening — 6pm–9pm
  if (hour >= 18 && hour <= 21) {
    return {
      gradient: ['#2D1B4A', '#1A0F2E'],
      splashGradient: ['#34184F', '#23123C', '#160B26'],
      isDark: true,
      text: '#FFFFFF',
      secondaryText: '#B9A6F8',
      mutedText: '#9D92C5',
      card: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.10)',
      accent: '#B79DFF',
      glow: 'rgba(183,157,255,0.35)',
      barTrack: 'rgba(255,255,255,0.15)',
      barFill: '#B79DFF',
    };
  }

  // Night — 10pm–5am
  return {
    gradient: ['#0D0720', '#1A0F2E'],
    splashGradient: ['#2A1350', '#1C0F38', '#130429'],
    isDark: true,
    text: '#FFFFFF',
    secondaryText: '#C4B7FF',
    mutedText: '#A99CCF',
    card: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#C6B0FF',
    glow: 'rgba(198,176,255,0.35)',
    barTrack: 'rgba(255,255,255,0.15)',
    barFill: '#B79DFF',
  };
}

// Circadian Emo faces — lavender for daylight, glowing dark for evening/night.
const EMO_FACE_DAY: ImageSourcePropType = require('./assets/emo-face-day.png');
const EMO_FACE_NIGHT: ImageSourcePropType = require('./assets/emo-face-night.png');

/** Shared 3-stop circadian backdrop — single source of truth for all themed screens. */
function CircadianBackground({ theme, orbs = false }: { theme: CircadianTheme; orbs?: boolean }) {
  const auroraA = theme.isDark ? 1 : 0.45;
  return (
    <>
      <LinearGradient
        colors={theme.splashGradient as string[]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {!theme.isDark ? (
        <View pointerEvents="none" style={styles.auroraClip}>
          <View
            style={[styles.auroraWide, { backgroundColor: `rgba(170,132,255,${0.4 * auroraA})` }]}
          />
          <View
            style={[styles.auroraCore, { backgroundColor: `rgba(226,198,255,${0.5 * auroraA})` }]}
          />
          <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      {orbs ? (
        <>
          <GlowOrb color={theme.glow} size={320} top={-80} right={-60} />
          <GlowOrb color={theme.glow} size={200} top={height * 0.4} right={width * 0.6} opacity={0.28} />
        </>
      ) : null}
    </>
  );
}

/**
 * Standard screen frame:
 *  1. Absolute-fill gradient background
 *  2. SafeAreaView (top edge) from react-native-safe-area-context
 *  3. ScrollView whose contentContainer reserves room for the floating nav bar
 */
function Screen({ children, scroll = true, scrollRef, onContentSizeChange, contentStyle, theme, backgroundColors }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomClearance = NAV_CONTENT_HEIGHT + insets.bottom + 24;

  return (
    <View style={styles.flex}>
      {theme ? (
        <CircadianBackground theme={theme} />
      ) : (
        <ScreenBackground colors={backgroundColors} />
      )}
      <SafeAreaView style={styles.flex} edges={['top']}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={onContentSizeChange}
            contentContainerStyle={[
              { padding: 22, paddingBottom: bottomClearance },
              contentStyle,
            ]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
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
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.glass, themed, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.glass, themed, style]}>{children}</View>;
}

/**
 * Robust Emo avatar. Attempts to render the bundled mascot asset and falls back
 * gracefully to an emoji glyph if the image is missing or fails to decode —
 * so it never collapses into a broken white circle.
 */
function EmoAvatar({ size = 44, theme: themeProp }: { size?: number; theme?: CircadianTheme }) {
  const theme = themeProp ?? getCircadianTheme();
  const faceSource = theme.isDark ? EMO_FACE_NIGHT : EMO_FACE_DAY;
  const [failed, setFailed] = useState(false);
  const ringSize = size + 8;

  return (
    <View
      style={[
        styles.avatarRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: theme.accent,
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
  );
}

/**
 * Emo orb — the mascot face on the home screen with a gentle continuous pulse.
 */
function EmoOrb({ theme: themeProp }: { theme?: CircadianTheme }) {
  const theme = themeProp ?? getCircadianTheme();
  const faceSource = theme.isDark ? EMO_FACE_NIGHT : EMO_FACE_DAY;
  const pulse = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReduceMotion();

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

  const scale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = reduceMotion ? 0.4 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={styles.orbWrap}>
      <Animated.View
        style={[
          styles.orbGlow,
          { opacity: glowOpacity, transform: [{ scale }], backgroundColor: theme.glow },
        ]}
      />
      {failed ? (
        <Animated.View style={[styles.orbFallback, { transform: [{ scale }], backgroundColor: theme.card }]}>
          <Text style={{ fontSize: 52 }}>🌿</Text>
        </Animated.View>
      ) : (
        <Animated.Image
          source={faceSource}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={[styles.orbImage, { transform: [{ scale }] }]}
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
  const faceSource = theme.isDark ? EMO_FACE_NIGHT : EMO_FACE_DAY;
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
      <CircadianBackground theme={theme} />

      {/* Floating particles */}
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
 * Check-in modal
 * ------------------------------------------------------------------ */

function CheckInModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const save = async () => {
    if (!selected) return;
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <ScreenBackground orbs={false} />
          <GlowOrb color={C.purpleGlow} size={260} top={-60} right={-40} />
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.ciHeader}>
              <TouchableOpacity style={styles.ciCircleBtn} onPress={onClose}>
                <Text style={styles.ciCircleGlyph}>←</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.ciTitle}>Check In ✦</Text>
                <Text style={styles.ciSubtitle}>Take a gentle moment to check in.</Text>
              </View>
              <TouchableOpacity style={styles.ciCircleBtn} onPress={onClose}>
                <Text style={styles.ciCircleGlyph}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <GlassCard style={styles.cardPad}>
                <Text style={[styles.cardTitle, { marginBottom: 4 }]}>How are you feeling right now?</Text>
                <Text style={[styles.cardSub, { marginBottom: 14 }]}>Choose what feels closest.</Text>
                <View style={styles.moodGrid}>
                  {CHECK_IN_MOODS.map((m) => {
                    const isSelected = selected?.label === m.label;
                    return (
                      <TouchableOpacity
                        key={m.label}
                        activeOpacity={0.85}
                        style={[
                          styles.moodGridCard,
                          isSelected && m.color
                            ? { borderColor: m.color, backgroundColor: m.color + '20' }
                            : null,
                        ]}
                        onPress={() => setSelected(m)}
                      >
                        {isSelected && m.color ? (
                          <View style={[styles.checkMark, { backgroundColor: m.color }]}>
                            <Text style={styles.checkMarkGlyph}>✓</Text>
                          </View>
                        ) : null}
                        <View style={styles.moodGlowEmoji}>
                          <Text style={{ fontSize: 30 }}>{m.emoji}</Text>
                        </View>
                        <Text style={styles.moodGridLabel}>{m.label}</Text>
                        <Text style={styles.moodGridDesc}>{m.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassCard>

              <GlassCard style={styles.cardPad}>
                <Text style={[styles.cardTitle, { marginBottom: 6 }]}>What's on your heart?</Text>
                <Text style={[styles.cardSub, { marginBottom: 12 }]}>You can write anything. We're here to hold it.</Text>
                <View style={styles.innerInputCard}>
                  <TextInput
                    style={styles.checkInNote}
                    placeholder="You can begin softly..."
                    placeholderTextColor={C.white30}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </GlassCard>

              <TouchableOpacity
                style={[styles.primaryBtn, styles.orangeBtn, !selected && styles.btnDisabled]}
                onPress={save}
                disabled={!selected}
              >
                <Text style={styles.primaryBtnText}>✦  Save Check-In</Text>
              </TouchableOpacity>
              <Text style={[styles.cardSub, { textAlign: 'center', marginTop: 12 }]}>
                🔒 Your check-in is private and secure
              </Text>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ *
 * Onboarding
 * ------------------------------------------------------------------ */

function OnboardingScreen({ onComplete }: { onComplete: (args: { name: string }) => void }) {
  const theme = getCircadianTheme();
  const faceSource = theme.isDark ? EMO_FACE_NIGHT : EMO_FACE_DAY;
  const [slide, setSlide] = useState(1);
  const [name, setName] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [faceFailed, setFaceFailed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Gentle breathing halo for the Welcome Emo face — calmed when Reduce Motion is on.
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
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
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const faceScale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const haloScale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const haloOpacity = reduceMotion ? 0.5 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.62] });

  const goTo = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setSlide(next), 180);
  };

  // Swipe between onboarding slides (simulator + device). Ref keeps handler in sync with slide.
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderRelease: (_, g) => {
        const s = slideRef.current;
        if (g.dx < -55 && s < 3) goToRef.current(s + 1);
        else if (g.dx > 55 && s > 1) goToRef.current(s - 1);
      },
    }),
  ).current;

  const enter = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    await AsyncStorage.setItem('userName', name.trim());
    onComplete({ name: name.trim() });
  };

  const renderSanctuaryButton = () => (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.obSanctuaryBtnWrap, styles.obSanctuaryBtnPinned, !selectedMood && styles.btnDisabled]}
      onPress={enter}
      disabled={!selectedMood}
    >
      <LinearGradient
        colors={
          theme.isDark
            ? (['#9473FF', '#6366F1'] as [string, string])
            : ([theme.accent, '#7F77DD'] as [string, string])
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.obSanctuaryBtn}
      >
        <Text style={styles.primaryBtnText}>Enter Your Sanctuary →</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Shared Emo face nestled in a breathing halo (Welcome & Privacy)
  const renderFaceOrb = (variant: 'welcome' | 'privacy' = 'privacy') => {
    const isWelcome = variant === 'welcome';
    return (
    <View
      style={[
        styles.welcomeOrbWrap,
        styles.welcomeOrbWrapRaised,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.welcomeGlow,
          isWelcome && styles.welcomeGlowCompact,
          {
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
            backgroundColor: theme.glow,
            shadowColor: theme.accent,
          },
        ]}
      />
      {/* Inner ring only on dark themes — day face already has its own lavender disc */}
      {theme.isDark ? (
        <View
          pointerEvents="none"
          style={[
            styles.welcomeRingInner,
            isWelcome && styles.welcomeRingInnerCompact,
            { borderColor: 'rgba(183,157,255,0.30)' },
          ]}
        />
      ) : null}
      {faceFailed ? (
        <View style={[styles.welcomeFaceFallback, { backgroundColor: theme.card }]}>
          <Text style={{ fontSize: 64 }}>🌿</Text>
        </View>
      ) : (
        <Animated.Image
          source={faceSource}
          resizeMode="contain"
          onError={() => setFaceFailed(true)}
          style={[
            styles.welcomeFace,
            isWelcome && styles.welcomeFaceCompact,
            { transform: [{ scale: faceScale }] },
          ]}
        />
      )}
    </View>
    );
  };

  const slides: Record<number, React.ReactNode> = {
    1: (
      <View style={[styles.obSlide, styles.obWelcomeSlide]}>
        {renderFaceOrb('welcome')}
        <Text style={[styles.obEyebrow, styles.obWelcomeEyebrow, { color: theme.secondaryText }]}>
          Welcome to Emocare
        </Text>
        <Text style={[styles.obTitle, styles.obWelcomeTitle, { color: theme.text }]}>
          A quiet space to{'\n'}return to yourself.
        </Text>
        <Text style={[styles.obBody, styles.obWelcomeBody, { color: theme.mutedText }]}>
          A quiet, private space to gently check in with yourself — whenever you need it.
        </Text>
        <Text style={[styles.obSoftLine, styles.obWelcomeQuote, { color: theme.secondaryText }]}>
          "You don't need to have the right words. Just begin."
        </Text>
        <GlassCard
          theme={theme}
          style={styles.obWelcomeNoteCard}
        >
          <Text style={[styles.obNoteText, { color: theme.mutedText, lineHeight: 20 }]}>
            Emocare offers gentle emotional support and reflection. It is not a substitute for professional care.
          </Text>
        </GlassCard>
        <TouchableOpacity
          style={[styles.obBtn, styles.obWelcomeBtn, { backgroundColor: theme.accent }]}
          onPress={() => goTo(2)}
        >
          <Text style={styles.primaryBtnText}>Let's begin gently →</Text>
        </TouchableOpacity>
      </View>
    ),
    2: (
      <View style={[styles.obSlide, styles.obPrivacySlide]}>
        {renderFaceOrb('privacy')}
        <Text style={[styles.obEyebrow, styles.obPrivacyEyebrow, { color: theme.secondaryText }]}>
          Your privacy
        </Text>
        <Text style={[styles.obTitle, styles.obPrivacyTitle, { color: theme.text }]}>
          Your thoughts{'\n'}stay with you.
        </Text>
        <Text style={[styles.obBody, styles.obPrivacyBody, { color: theme.mutedText }]}>
          Everything is stored privately on your device.{'\n'}Nothing shared. Nothing sold.
        </Text>
        <GlassCard theme={theme} style={styles.obPrivacyCard}>
          <View style={styles.obBulletRow}>
            <View style={[styles.obBulletDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.obBulletText, { color: theme.secondaryText, lineHeight: 21 }]}>
              Zero‑knowledge storage. Sovereign data.
            </Text>
          </View>
          <View style={[styles.obBulletRow, { marginTop: 14 }]}>
            <View style={[styles.obBulletDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.obBulletText, { color: theme.secondaryText, lineHeight: 21 }]}>
              Memory Ledger — see &amp; delete what Emo holds, with a single tap.
            </Text>
          </View>
        </GlassCard>
        <TouchableOpacity
          style={[styles.obBtn, styles.obPrivacyBtn, { backgroundColor: theme.accent }]}
          onPress={() => goTo(3)}
        >
          <Text style={styles.primaryBtnText}>That feels good →</Text>
        </TouchableOpacity>
      </View>
    ),
    3: (
      <View style={[styles.obSlide, styles.obNameSlide]}>
        <View style={styles.obNameHeaderBlock}>
          <Text style={[styles.obEyebrow, styles.obNameEyebrow, { color: theme.secondaryText }]}>
            One last thing
          </Text>
          <Text style={[styles.obNameTitle, { color: theme.text }]}>Welcome to Emo</Text>
          <Text style={[styles.obNameSub, { color: theme.secondaryText }]}>
            Let's personalize your experience.
          </Text>
        </View>

        <View
          style={[
            styles.obNameInputRow,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <User size={17} color={theme.mutedText} strokeWidth={2} style={styles.obNameInputIcon} />
          <TextInput
            style={[styles.obNameInput, { color: theme.text }]}
            placeholder="What should I call you? (optional)"
            placeholderTextColor={theme.mutedText}
            value={name}
            onChangeText={setName}
            maxLength={30}
          />
        </View>

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
            const selected = selectedMood?.label === m.label;
            return (
              <TouchableOpacity
                key={m.label}
                activeOpacity={0.85}
                style={[
                  styles.obMoodCardPro,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  selected && {
                    borderColor: m.accentColor ?? theme.accent,
                    backgroundColor: m.accentBg ?? 'rgba(155,123,255,0.16)',
                    shadowColor: m.accentColor ?? theme.accent,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
                onPress={() => setSelectedMood(m)}
              >
                <View
                  style={[
                    styles.obMoodIconCircle,
                    {
                      backgroundColor: m.iconBg ?? theme.card,
                      borderColor: m.iconColor ? `${m.iconColor}55` : theme.border,
                      shadowColor: m.accentColor ?? m.iconColor ?? theme.accent,
                      shadowOpacity: selected ? 0.65 : 0.45,
                      shadowRadius: selected ? 10 : 7,
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
      </View>
    ),
  };

  return (
    <View style={styles.flex}>
      <CircadianBackground theme={theme} />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.obProgressRow}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.obDot,
                { backgroundColor: theme.isDark ? C.white10 : 'rgba(126,110,180,0.20)' },
                slide === i && [styles.obDotActive, { backgroundColor: theme.accent }],
                slide > i && { backgroundColor: theme.secondaryText },
              ]}
            />
          ))}
        </View>
        {slide > 1 ? (
          <TouchableOpacity
            style={styles.obBackBtn}
            onPress={() => goTo(slide - 1)}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityLabel="Go back"
          >
            <Text style={[styles.obBackText, { color: theme.text }]}>←</Text>
          </TouchableOpacity>
        ) : null}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }} {...panResponder.panHandlers}>
          {slide === 3 ? (
            <View style={styles.flex}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.obNameScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {slides[slide]}
              </ScrollView>
              {renderSanctuaryButton()}
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {slides[slide]}
            </ScrollView>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Home
 * ------------------------------------------------------------------ */

function HomeScreen({ userName, onNav }: { userName: string; onNav: (key: ScreenKey) => void }) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [affIdx, setAffIdx] = useState(0);
  const theme = getCircadianTheme();
  const hour = new Date().getHours();
  const timeLabel =
    hour >= 5 && hour < 12
      ? 'Good morning'
      : hour >= 12 && hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <Screen theme={theme}>
      <EmoOrb theme={theme} />
      <View style={{ marginTop: 10, marginBottom: 26 }}>
        <Text style={[styles.sanctuaryLabel, { color: theme.secondaryText }]}>Intelligence with Soul</Text>
        <Text style={[styles.heroGreeting, { color: theme.text }]}>
          {timeLabel},{'\n'}
          {userName || 'friend'} 💜
        </Text>
        <Text style={[styles.heroSub, { color: theme.mutedText }]}>This is your sanctuary. ♡</Text>
      </View>

      <GlassCard theme={theme} style={styles.cardPadLg}>
        <Text style={[styles.cardTitle, { marginBottom: 4, color: theme.text }]}>How are you feeling today?</Text>
        <Text style={[styles.cardSub, { fontStyle: 'italic', marginBottom: 18, color: theme.mutedText }]}>
          Has your heart been feeling steadier lately?
        </Text>
        <MoodWave />
        <View style={styles.weekFootRow}>
          <Text style={[styles.chartLabel, { color: theme.mutedText }]}>Over</Text>
          <Text style={[styles.chartLabel, { color: theme.mutedText }]}>Week</Text>
          <Text style={[styles.chartLabel, { color: theme.mutedText }]}>01</Text>
        </View>
      </GlassCard>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.checkInBtn} activeOpacity={0.85} onPress={() => setShowCheckIn(true)}>
          <Text style={{ fontSize: 16 }}>🤍</Text>
          <Text style={styles.checkInBtnText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionSmallBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          activeOpacity={0.85}
          onPress={() => onNav('journal')}
        >
          <Text style={{ fontSize: 16 }}>📖</Text>
          <Text style={[styles.actionSmallText, { color: theme.text }]}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionSmallBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          activeOpacity={0.85}
          onPress={() => onNav('breathe')}
        >
          <Text style={{ fontSize: 16 }}>🌬️</Text>
          <Text style={[styles.actionSmallText, { color: theme.text }]}>Breathe</Text>
        </TouchableOpacity>
      </View>

      <GlassCard theme={theme} style={{ marginBottom: 16 }} onPress={() => onNav('chat')}>
        <View style={styles.emoCard}>
          <EmoAvatar size={44} theme={theme} />
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { fontSize: 17, color: theme.text }]}>Talk to EmoAI</Text>
            <Text style={[styles.cardSub, { marginTop: 4, color: theme.mutedText }]}>
              I'm here to listen, support and guide you.
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.secondaryText }]}>›</Text>
        </View>
      </GlassCard>

      <GlassCard theme={theme} style={styles.cardPadLg}>
        <Text style={[styles.reminderEyebrow, { color: theme.secondaryText }]}>A gentle reminder</Text>
        <Text style={[styles.affirmationText, { color: theme.text }]}>{AFFIRMATIONS[affIdx]}</Text>
        <TouchableOpacity onPress={() => setAffIdx((affIdx + 1) % AFFIRMATIONS.length)} style={{ marginTop: 12 }}>
          <Text style={[styles.reminderRefresh, { color: theme.accent }]}>Another reminder ↻</Text>
        </TouchableOpacity>
      </GlassCard>

      <CheckInModal visible={showCheckIn} onClose={() => setShowCheckIn(false)} />
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Chat
 * ------------------------------------------------------------------ */

function ChatScreen({ userName }: { userName: string }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [history, setHistory] = useState<ApiMessage[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const n = userName ? `, ${userName}` : '';
    setMessages([
      {
        role: 'bot',
        text: `Hello${n}. I'm really glad you're here. 💜\n\nYou don't need to have the right words. Just share what feels true right now — I'm listening.`,
        time: 'Just now',
      },
    ]);
  }, [userName]);

  const send = async () => {
    if (!input.trim() || isWaiting) return;
    const msg = input.trim();
    setInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: msg, time }];
    setMessages(newMessages);
    const newHistory: ApiMessage[] = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    setIsWaiting(true);
    try {
      const result = await callAnthropicMessages({
        system: SYSTEM_PROMPT,
        maxTokens: 1000,
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
      });

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (result.ok && result.data?.content?.[0]?.text) {
        const replyText: string = result.data.content[0].text;
        setHistory([...newHistory, { role: 'assistant', content: replyText }]);
        setMessages([...newMessages, { role: 'bot', text: replyText, time: replyTime }]);
        Speech.speak(replyText, { pitch: 0.9, rate: 0.85 });
      } else {
        const reason = describeAnthropicError(result.data ?? { error: result.error });
        console.warn('[EmoCare] Anthropic chat failed:', result.status, reason);
        setMessages([
          ...newMessages,
          {
            role: 'bot',
            text: "I'm still here with you. Something interrupted my reply just now — try sending that again? 💜",
            time: replyTime,
          },
        ]);
      }
    } catch (err) {
      console.warn('[EmoCare] Anthropic chat threw:', err);
      setMessages([
        ...newMessages,
        { role: 'bot', text: 'Something went gently wrong. Please try again. 🌿', time: '' },
      ]);
    }
    setIsWaiting(false);
  };

  return (
    <View style={styles.flex}>
      <ScreenBackground />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 8}
        >
          <View style={styles.chatHeader}>
            <EmoAvatar size={38} />
            <View>
              <Text style={[styles.cardTitle, { fontSize: 15 }]}>Emo</Text>
              <Text style={styles.cardSub}>{isWaiting ? 'Emo is here with you...' : 'Always here with you ✨'}</Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m, i) => (
              <View
                key={i}
                style={[styles.msgWrap, m.role === 'user' ? styles.msgWrapUser : styles.msgWrapBot]}
              >
                <View style={m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                  <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : null]}>
                    {m.text}
                  </Text>
                </View>
                {m.time ? (
                  <Text style={[styles.msgTime, m.role === 'user' && styles.msgTimeUser]}>{m.time}</Text>
                ) : null}
              </View>
            ))}
            {isWaiting ? (
              <View style={[styles.bubbleBot, styles.typingBubble]}>
                <Text style={styles.typingGlyph}>···</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Input row reserves space for the floating nav bar so it is never blocked. */}
          <View style={[styles.chatInputRow, { marginBottom: NAV_CONTENT_HEIGHT + insets.bottom }]}>
            <TextInput
              style={styles.chatInput}
              placeholder="What's on your heart today..."
              placeholderTextColor={C.white30}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              editable={!isWaiting}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, isWaiting && styles.btnDisabled]}
              onPress={send}
              disabled={isWaiting}
            >
              <Text style={styles.sendGlyph}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Breathe
 * ------------------------------------------------------------------ */

function BreatheScreen() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('Tap to begin');
  const [selected, setSelected] = useState('Box');
  const circleSize = useRef(new Animated.Value(140)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseIdx = useRef(0);
  const phases = ['Inhale', 'Hold', 'Exhale', 'Hold'];

  const tick = () => {
    const p = phases[phaseIdx.current % 4];
    setPhase(p);
    Animated.parallel([
      Animated.timing(circleSize, { toValue: p === 'Inhale' ? 175 : 140, duration: 3800, useNativeDriver: false }),
      Animated.timing(glowOpacity, { toValue: p === 'Inhale' ? 0.7 : 0.3, duration: 3800, useNativeDriver: false }),
    ]).start();
    phaseIdx.current++;
  };

  const toggle = () => {
    if (running) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunning(false);
      setPhase('Tap to begin');
      circleSize.setValue(140);
      glowOpacity.setValue(0.3);
    } else {
      setRunning(true);
      phaseIdx.current = 0;
      tick();
      timerRef.current = setInterval(tick, 4000);
    }
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return (
    <Screen scroll={false} contentStyle={styles.breatheRoot}>
      <Text style={styles.sanctuaryLabel}>Breathing exercise</Text>
      <Text style={styles.heroGreeting}>Box breathing</Text>
      <View style={styles.breatheStage}>
        <Animated.View
          style={[
            styles.breatheGlow,
            { width: circleSize, height: circleSize, opacity: glowOpacity },
          ]}
        />
        <Animated.View style={[styles.breatheCircle, { width: circleSize, height: circleSize }]}>
          <Text style={styles.breathePhase}>{phase}</Text>
        </Animated.View>
      </View>
      <Text style={[styles.cardSub, { textAlign: 'center' }]}>
        Inhale · 4  ·  Hold · 4  ·  Exhale · 4  ·  Hold · 4
      </Text>
      <View style={styles.techRow}>
        {['Box', '4-7-8', 'Calm'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.techPill, selected === t && styles.techPillActive]}
            onPress={() => {
              setSelected(t);
              if (running) toggle();
            }}
          >
            <Text style={[styles.techPillText, selected === t && styles.techPillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.breatheBtn} onPress={toggle}>
        <Text style={styles.primaryBtnText}>{running ? 'Stop' : 'Begin'}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Journal
 * ------------------------------------------------------------------ */

function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('journalEntries').then((d) => {
      if (d) setEntries(JSON.parse(d));
    });
  }, []);

  const save = async () => {
    if (!text.trim()) return;
    const entry: JournalEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: text.trim(),
      mood: { emoji: '🙂', label: 'Light' },
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    await AsyncStorage.setItem('journalEntries', JSON.stringify(updated));
    setText('');
  };

  const deleteEntry = async (id: number) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await AsyncStorage.setItem('journalEntries', JSON.stringify(updated));
  };

  const prompts = [
    'What am I grateful for?',
    'What emotion am I carrying?',
    'What do I need to let go of?',
    'What went well today?',
  ];

  if (viewing !== null) {
    const e = entries[viewing];
    return (
      <View style={styles.flex}>
        <ScreenBackground />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setViewing(null)} style={{ padding: 4 }}>
              <Text style={styles.backGlyph}>←</Text>
            </TouchableOpacity>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>
                {new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={styles.cardSub}>
                {e.mood.emoji} {e.mood.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                deleteEntry(e.id);
                setViewing(null);
              }}
              style={{ padding: 8 }}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 24 }}>
            <Text style={styles.journalReadText}>{e.text}</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenBackground />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.heroGreeting}>My Journal</Text>
            <Text style={[styles.cardSub, { marginBottom: 18 }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={[styles.sanctuaryLabel, { marginBottom: 10 }]}>A prompt to begin</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {prompts.map((p) => (
                <TouchableOpacity key={p} style={styles.promptChip} onPress={() => setText(p + '\n\n')}>
                  <Text style={styles.promptChipText}>{p.split(' ').slice(0, 3).join(' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <GlassCard style={{ marginBottom: 12 }}>
              <TextInput
                style={styles.journalInput}
                multiline
                placeholder="This space is yours. Write freely — no one else will see this."
                placeholderTextColor={C.white30}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
            </GlassCard>
            <TouchableOpacity style={styles.obBtn} onPress={save}>
              <Text style={styles.primaryBtnText}>✦  Save this entry</Text>
            </TouchableOpacity>
            <GlassCard style={styles.privacyCard}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={[styles.cardSub, styles.flex]}>
                Your entries are stored privately on this device only.
              </Text>
            </GlassCard>
            {entries.length > 0 ? (
              <Text style={[styles.sanctuaryLabel, { marginBottom: 12 }]}>Past entries</Text>
            ) : null}
            {entries.map((e, i) => (
              <TouchableOpacity key={e.id} activeOpacity={0.85} onPress={() => setViewing(i)}>
                <GlassCard style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={[styles.cardTitle, { fontSize: 13 }]}>
                      {new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <View style={styles.entryHeaderRight}>
                      <Text style={styles.cardSub}>
                        {e.mood.emoji} {e.mood.label}
                      </Text>
                      <TouchableOpacity onPress={() => deleteEntry(e.id)}>
                        <Text style={styles.deleteGlyph}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.cardSub, { lineHeight: 18 }]} numberOfLines={2}>
                    {e.text}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Floating nav bar
 * ------------------------------------------------------------------ */

function NavBar({ active, onNav }: { active: ScreenKey; onNav: (key: ScreenKey) => void }) {
  const insets = useSafeAreaInsets();
  const tabs: { key: ScreenKey; icon: string; label: string }[] = [
    { key: 'home', icon: '🏠', label: 'Home' },
    { key: 'chat', icon: '💬', label: 'Talk' },
    { key: 'breathe', icon: '🌬️', label: 'Breathe' },
    { key: 'journal', icon: '📓', label: 'Journal' },
  ];
  return (
    <View style={[styles.navBar, { height: NAV_CONTENT_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabs.map((t) => (
        <TouchableOpacity key={t.key} style={styles.navItem} onPress={() => onNav(t.key)}>
          <Text style={{ fontSize: 22 }}>{t.icon}</Text>
          <Text style={[styles.navLabel, active === t.key && styles.navLabelActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Root
 * ------------------------------------------------------------------ */

function Root() {
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [userName, setUserName] = useState('');
  const [screen, setScreen] = useState<ScreenKey>('home');

  useEffect(() => {
    AsyncStorage.getItem('onboarded').then((v) => {
      if (v === 'true') {
        AsyncStorage.getItem('userName').then((n) => {
          setUserName(n || '');
          setOnboarded(true);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Page 1 — show the splash until data has loaded AND the splash animation finishes.
  if (loading || !splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onComplete={({ name }) => {
          setUserName(name);
          setOnboarded(true);
        }}
      />
    );
  }

  const screens: Record<ScreenKey, React.ReactNode> = {
    home: <HomeScreen userName={userName} onNav={setScreen} />,
    chat: <ChatScreen userName={userName} />,
    breathe: <BreatheScreen />,
    journal: <JournalScreen />,
  };

  const theme = getCircadianTheme();

  return (
    <View style={styles.flex}>
      <StatusBar style={screen === 'home' ? (theme.isDark ? 'light' : 'dark') : 'light'} />
      <View style={styles.flex}>{screens[screen]}</View>
      <NavBar active={screen} onNav={setScreen} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

/* ------------------------------------------------------------------ *
 * Styles — dynamic vertical paddings, no rigid heights around text
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  glass: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    overflow: 'hidden',
  },
  cardPad: { paddingVertical: 16, paddingHorizontal: 16, marginBottom: 16 },
  cardPadLg: { paddingVertical: 18, paddingHorizontal: 18, marginBottom: 16 },

  // Avatar
  avatarRing: {
    borderWidth: 1.5,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleLight,
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Emo orb (home screen pulse)
  orbWrap: { alignItems: 'center', justifyContent: 'center', height: 130, marginTop: 8, marginBottom: 6 },
  orbGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: C.purpleGlow },
  orbImage: { width: 116, height: 116, borderRadius: 58 },
  orbFallback: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleLight,
  },

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
  obNameSlide: { alignItems: 'stretch', paddingTop: 4, paddingBottom: 12 },
  obNameScrollContent: { paddingBottom: 16 },
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
    marginBottom: 22,
  },
  obMoodSectionTitle: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 10,
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
    marginBottom: 12,
  },
  obMoodCardPro: {
    width: (width - 70) / 2,
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
    top: 8,
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
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  heroGreeting: { fontSize: 34, fontWeight: '700', color: C.white, lineHeight: 44, marginBottom: 8 },
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

  // Home actions
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  checkInBtn: {
    flex: 1.2,
    backgroundColor: C.orange,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  checkInBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  actionSmallBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
  },
  actionSmallText: { fontSize: 12, fontWeight: '600', color: C.white },
  emoCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  chevron: { color: C.white60, fontSize: 20 },
  reminderEyebrow: {
    color: C.teal,
    fontWeight: '600',
    letterSpacing: 1,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  affirmationText: { fontSize: 14, color: C.white80, lineHeight: 24, fontStyle: 'italic' },
  reminderRefresh: { color: C.teal, fontSize: 12 },

  // Check-in modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  ciHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  ciCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ciCircleGlyph: { color: C.white, fontSize: 16 },
  ciTitle: { fontSize: 20, fontWeight: '700', color: C.white },
  ciSubtitle: { fontSize: 12, color: C.white60, marginTop: 4, textAlign: 'center' },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodGridCard: {
    width: (width - 88) / 3,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  moodGlowEmoji: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white10,
  },
  moodGridLabel: { fontSize: 13, fontWeight: '600', color: C.white, textAlign: 'center' },
  moodGridDesc: { fontSize: 10, color: C.white30, textAlign: 'center', lineHeight: 14 },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkGlyph: { color: C.white, fontSize: 10 },
  innerInputCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  checkInNote: { fontSize: 13, color: C.white, minHeight: 70, lineHeight: 21 },

  // Buttons
  primaryBtn: { borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18, alignItems: 'center' },
  primaryBtnText: { color: C.white, fontSize: 15, fontWeight: '600' },
  orangeBtn: { backgroundColor: C.orange },
  btnDisabled: { opacity: 0.4 },

  // Chat
  chatHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderBottomWidth: 0.5,
    borderBottomColor: C.cardBorder,
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

  // Breathe
  breatheRoot: { alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 24 },
  breatheStage: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  breatheGlow: { position: 'absolute', borderRadius: 100, backgroundColor: C.purpleGlow },
  breatheCircle: {
    borderRadius: 100,
    backgroundColor: C.purpleLight,
    borderWidth: 1,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathePhase: { fontSize: 15, fontWeight: '500', color: C.white },
  techRow: { flexDirection: 'row', gap: 8 },
  techPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
  },
  techPillActive: { backgroundColor: C.purple, borderColor: C.purple },
  techPillText: { fontSize: 12, fontWeight: '500', color: C.purple },
  techPillTextActive: { color: C.white },
  breatheBtn: { backgroundColor: C.purple, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 48 },

  // Journal
  journalInput: { paddingVertical: 16, paddingHorizontal: 16, fontSize: 13, color: C.white, minHeight: 140, lineHeight: 22 },
  journalReadText: { fontSize: 14, color: C.white80, lineHeight: 26 },
  promptChip: {
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  promptChipText: { fontSize: 11, color: C.white60 },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, marginTop: 12, marginBottom: 20 },
  entryCard: { paddingVertical: 14, paddingHorizontal: 14, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  entryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backGlyph: { fontSize: 20, color: C.purple },
  deleteText: { color: '#F472B6', fontSize: 13 },
  deleteGlyph: { color: '#F472B6', fontSize: 12 },

  // Nav
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17,9,34,0.92)',
    borderTopWidth: 0.5,
    borderTopColor: C.cardBorder,
    paddingTop: 10,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 10, color: C.white30 },
  navLabelActive: { color: C.purple },
});
