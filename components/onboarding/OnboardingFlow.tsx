import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, Lock, Shield, Trash2, User, ChevronLeft, Sparkles, type LucideIcon } from 'lucide-react-native';
import { OB_MOODS, type Mood } from '../../constants/obMoods';
import { hapticLight } from '../../utils/haptics';
import {
  useCircadianTheme,
  type CircadianTheme,
} from '../../theme/circadianTheme';
import {
  HOME_LANDING_MODE_KEY,
  INITIAL_CHECKIN_PAYLOAD_KEY,
  INITIAL_EMO_INTENT_KEY,
  resolveOnboardingSession,
} from '../../utils/onboardingLanding';

const { width, height } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const SPLASH_PARTICLES = [
  { left: 0.12, top: 0.16, size: 3, opacity: 0.45 },
  { left: 0.82, top: 0.13, size: 2, opacity: 0.4 },
  { left: 0.68, top: 0.27, size: 3, opacity: 0.5 },
  { left: 0.22, top: 0.34, size: 2, opacity: 0.35 },
  { left: 0.9, top: 0.4, size: 2, opacity: 0.45 },
  { left: 0.08, top: 0.52, size: 3, opacity: 0.4 },
  { left: 0.78, top: 0.6, size: 2, opacity: 0.5 },
  { left: 0.55, top: 0.72, size: 3, opacity: 0.55 },
] as const;

const PRIVACY_CARDS: { icon: LucideIcon; title: string; desc: string; color: string }[] = [
  {
    icon: Lock,
    title: 'Zero-knowledge storage',
    desc: 'Your data is encrypted and only accessible by you.',
    color: '#34D399',
  },
  {
    icon: Shield,
    title: 'Sovereign personal data',
    desc: 'We never sell or share your information.',
    color: '#4ADE80',
  },
  {
    icon: Trash2,
    title: 'Memory Ledger control',
    desc: 'See, manage, and delete your context data and historical ledger logs anytime.',
    color: '#B79DFF',
  },
  {
    icon: Eye,
    title: 'Full transparency',
    desc: 'We believe in clarity, honesty, and your full control.',
    color: '#60A5FA',
  },
  {
    icon: Sparkles,
    title: 'AI conversations',
    desc: "AI conversations use Anthropic's API — see our privacy policy for details.",
    color: '#A78BFA',
  },
];

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  return reduceMotion;
}

function ObMoodIcon({ mood, size = 18 }: { mood: Mood; size?: number }) {
  const Icon = mood.Icon;
  if (!Icon) return <Text style={styles.moodEmoji}>{mood.emoji}</Text>;
  return (
    <Icon
      size={size}
      color={mood.iconColor ?? '#F5F3FF'}
      strokeWidth={2.5}
      fill={mood.iconFill ?? 'transparent'}
    />
  );
}

function ObCard({
  theme,
  children,
  style,
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

function LavenderButton({
  label,
  onPress,
  disabled,
  theme,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: CircadianTheme;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.ctaWrap, disabled && styles.ctaDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={
          theme.isDark
            ? (['#9473FF', '#6366F1'] as [string, string])
            : ([theme.accent, '#7F77DD'] as [string, string])
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.ctaBtn}
      >
        <Text style={styles.ctaText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function MoodGrid({
  theme,
  selected,
  onSelect,
}: {
  theme: CircadianTheme;
  selected: Mood | null;
  onSelect: (m: Mood) => void;
}) {
  return (
    <View style={styles.moodGrid}>
      {OB_MOODS.map((m) => {
        const isSelected = selected?.label === m.label;
        return (
          <TouchableOpacity
            key={m.label}
            activeOpacity={0.85}
            style={[
              styles.moodCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              isSelected && {
                borderColor: m.accentColor ?? theme.accent,
                backgroundColor: m.accentBg ?? 'rgba(155,123,255,0.16)',
              },
            ]}
            onPress={() => {
              void hapticLight();
              onSelect(m);
            }}
          >
            <View
              style={[
                styles.moodIconCircle,
                {
                  backgroundColor: m.iconBg ?? theme.card,
                  borderColor: m.iconColor ? `${m.iconColor}55` : theme.border,
                },
              ]}
            >
              <ObMoodIcon mood={m} />
            </View>
            <View style={styles.moodCardText}>
              <Text style={[styles.moodCardTitle, { color: theme.text }]}>{m.label}</Text>
              <Text style={[styles.moodCardDesc, { color: theme.mutedText }]} numberOfLines={2}>
                {m.desc}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SplashSlide({
  theme,
  onContinue,
}: {
  theme: CircadianTheme;
  onContinue: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    NativeSplash.hideAsync().catch(() => {});

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: reduceMotion ? 1 : 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (!reduceMotion) {
      Animated.loop(
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
      ).start();
    }

    Animated.timing(progress, {
      toValue: 1,
      duration: 2800,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onContinue();
    });
  }, [fadeIn, onContinue, progress, pulse, reduceMotion]);

  const scale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const faceOpacity = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });

  return (
    <Pressable style={styles.splashSlide} onPress={onContinue}>
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
            backgroundColor: '#FFFFFF',
            opacity: p.opacity,
          }}
        />
      ))}

      <Animated.View style={[styles.splashInner, { opacity: fadeIn }]}>
        <View style={styles.splashGlowOuter} pointerEvents="none">
          <LinearGradient
            colors={['rgba(123,92,255,0.55)', 'rgba(183,157,255,0.08)', 'transparent']}
            style={styles.splashGlowRing}
          />
          <LinearGradient
            colors={['rgba(198,176,255,0.35)', 'rgba(91,61,196,0.06)', 'transparent']}
            style={styles.splashGlowRingInner}
          />
        </View>

        <View style={styles.splashFaceWrap}>
          {failed ? (
            <Animated.View style={{ transform: [{ scale }], opacity: faceOpacity }}>
              <Text style={{ fontSize: 84 }}>🌿</Text>
            </Animated.View>
          ) : (
            <Animated.Image
              source={theme.emoFace}
              resizeMode="contain"
              onError={() => setFailed(true)}
              style={[styles.splashFace, { transform: [{ scale }], opacity: faceOpacity }]}
            />
          )}
        </View>

        <Text style={[styles.splashTitle, { color: theme.text }]}>EmoCare AI</Text>
        <Text style={[styles.splashTagline, { color: theme.secondaryText }]}>
          Intelligence with Soul.
        </Text>

        <View style={[styles.splashBarTrack, { backgroundColor: theme.barTrack }]}>
          <Animated.View
            style={[
              styles.splashBarFill,
              { width: barWidth, backgroundColor: theme.barFill, shadowColor: theme.barFill },
            ]}
          />
        </View>

        <Text style={[styles.splashFooter, { color: theme.mutedText }]}>
          Your Emotional Sanctuary
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function OnboardingFlow({
  onComplete,
  reviewMode = false,
  initialSlide = 1,
  onExitReview,
}: {
  onComplete: (args: {
    name: string;
    landingMode: 'sanctuary' | 'oracle';
    intentMode: 'sanctuary' | 'oracle';
  }) => void;
  reviewMode?: boolean;
  initialSlide?: number;
  onExitReview?: () => void;
}) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const [slide, setSlide] = useState(initialSlide);
  const [name, setName] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [journalNote, setJournalNote] = useState('');
  const [moodAckVisible, setMoodAckVisible] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MOOD_ACKS: Record<string, string> = {
    Heavy: 'Thank you for trusting me with something heavy. We can hold it gently together.',
    Overwhelmed: 'When everything feels like too much, one breath at a time is enough.',
    Neutral: 'Neutral is honest — there is wisdom in simply showing up.',
    Hopeful: 'Hope is a soft light. I see it in you already.',
    Light: 'Lightness is worth celebrating. I am here with you in it.',
    Peaceful: 'Peace is a quiet kind of strength. I am glad you named it.',
    Grateful: 'Gratitude opens the heart. That is beautiful.',
    Joyful: 'Joy is alive in you — I am glad you let yourself feel it.',
  };

  useEffect(
    () => () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    },
    [],
  );

  const handleMoodSelect = (m: Mood) => {
    setSelectedMood(m);
    const full = MOOD_ACKS[m.label] ?? `I hear you — ${m.label.toLowerCase()} is valid, and you are not alone.`;
    setMoodAckVisible('');
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    let idx = 0;
    typewriterRef.current = setInterval(() => {
      idx += 1;
      setMoodAckVisible(full.slice(0, idx));
      if (idx >= full.length && typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    }, 28);
  };

  useEffect(() => {
    AsyncStorage.getItem('userName')
      .then((stored) => {
        if (stored?.trim()) setName(stored.trim());
      })
      .catch(() => {});
  }, []);

  const goTo = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setSlide(next), 220);
  };

  const slideRef = useRef(slide);
  slideRef.current = slide;
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (slideRef.current === 1) return false;
        const threshold = slideRef.current >= 4 ? 24 : 12;
        return Math.abs(g.dx) > threshold && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (slideRef.current === 1) return false;
        const threshold = slideRef.current >= 4 ? 24 : 12;
        return Math.abs(g.dx) > threshold && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      },
      onPanResponderRelease: (_, g) => {
        const s = slideRef.current;
        if (g.dx < -45 && s < 4) goToRef.current(s + 1);
        else if (g.dx > 45 && s > 1) goToRef.current(s - 1);
      },
    }),
  ).current;

  const enterSanctuary = async () => {
    if (!selectedMood) return;
    const session = resolveOnboardingSession(selectedMood, journalNote);
    if (reviewMode) {
      onExitReview?.();
      return;
    }
    try {
      await AsyncStorage.setItem('onboarded', 'true');
      await AsyncStorage.setItem('userName', name.trim());
      await AsyncStorage.setItem(HOME_LANDING_MODE_KEY, session.landingMode);
      await AsyncStorage.setItem(INITIAL_EMO_INTENT_KEY, session.intentMode);
      await AsyncStorage.setItem(INITIAL_CHECKIN_PAYLOAD_KEY, session.payload);
      const saved = await AsyncStorage.getItem('checkIns');
      const all = saved ? JSON.parse(saved) : [];
      await AsyncStorage.setItem(
        'checkIns',
        JSON.stringify([
          {
            id: Date.now(),
            date: new Date().toISOString(),
            mood: selectedMood,
            note: journalNote.trim(),
            landingMode: session.landingMode,
            intentMode: session.intentMode,
          },
          ...all,
        ]),
      );
    } catch {}
    onComplete({
      name: name.trim(),
      landingMode: session.landingMode,
      intentMode: session.intentMode as 'sanctuary' | 'oracle',
    });
  };

  const scrollPad = { paddingBottom: Math.max(insets.bottom, 20) + 16 };

  const renderSlide = () => {
    switch (slide) {
      case 1:
        return <SplashSlide theme={theme} onContinue={() => goTo(2)} />;

      case 2:
        return (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollPad, scrollPad]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>WELCOME TO EMOCARE</Text>
            <Text style={[styles.headline, { color: theme.text }]}>
              A quiet space to{'\n'}return to yourself.
            </Text>
            <Text style={[styles.body, { color: theme.mutedText }]}>
              A private, supportive space for reflection, emotional awareness, and personal growth.
            </Text>
            <Text style={[styles.quote, { color: theme.secondaryText }]}>
              You don't need to have the right words. Just begin.
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>
              What should I call you? (Optional)
            </Text>
            <View style={[styles.nameRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <User size={17} color={theme.mutedText} strokeWidth={2} />
              <TextInput
                style={[styles.nameInput, { color: theme.text }]}
                placeholder="Your name..."
                placeholderTextColor={theme.mutedText}
                value={name}
                onChangeText={setName}
                maxLength={48}
                autoCorrect={false}
                autoCapitalize="words"
                textContentType="name"
              />
            </View>

            <Pressable onPress={() => goTo(3)} hitSlop={8} style={styles.skipLinkWrap}>
              <Text style={[styles.skipLink, { color: theme.mutedText }]}>Skip for now</Text>
            </Pressable>

            <ObCard theme={theme} style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Shield size={18} color={theme.accent} strokeWidth={2.5} />
                <Text style={[styles.noticeTitle, { color: theme.text }]}>Important Notice</Text>
              </View>
              <Text style={[styles.noticeBody, { color: theme.mutedText }]}>
                EmoCare is an architectural life companion — a private space for reflection, clarity,
                and growth.{'\n\n'}
                It is not a licensed therapist, medical provider, or crisis service. Emo holds clear
                boundaries: no diagnosis, no prescription, no substitute for human relationships.{'\n\n'}
                If you are in immediate danger or experiencing a mental health emergency, please
                contact local emergency services or a qualified crisis professional now.
              </Text>
            </ObCard>

            <LavenderButton label="Begin Gently →" onPress={() => goTo(3)} theme={theme} />
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollPad, scrollPad]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.privacyHeroWrap}>
              <LinearGradient
                colors={['rgba(123,92,255,0.45)', 'rgba(183,157,255,0.12)', 'transparent']}
                style={styles.privacyHeroGlow}
              />
              <View style={[styles.privacyHeroIcon, { borderColor: `${theme.accent}55` }]}>
                <Shield size={28} color={theme.accent} strokeWidth={2.2} />
                <View style={styles.privacyHeroLock}>
                  <Lock size={14} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </View>
            </View>

            <Text style={[styles.headline, { color: theme.text }]}>
              Your thoughts{'\n'}stay with you.
            </Text>
            <Text style={[styles.body, { color: theme.mutedText }]}>
              Everything is stored privately on your device.{'\n'}Nothing shared. Nothing sold.
            </Text>

            <View style={styles.privacyList}>
              {PRIVACY_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <ObCard key={card.title} theme={theme} style={styles.privacyCard}>
                    <View style={[styles.privacyIconWrap, { backgroundColor: `${card.color}22` }]}>
                      <Icon size={18} color={card.color} strokeWidth={2.5} />
                    </View>
                    <View style={styles.privacyCardText}>
                      <Text style={[styles.privacyCardTitle, { color: theme.text }]}>{card.title}</Text>
                      <Text style={[styles.privacyCardDesc, { color: theme.mutedText }]}>{card.desc}</Text>
                    </View>
                  </ObCard>
                );
              })}
            </View>

            <LavenderButton label="I Understand →" onPress={() => goTo(4)} theme={theme} />
          </ScrollView>
        );

      case 4:
      default:
        return (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollPad, styles.checkinScroll, scrollPad]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.checkinTitle, { color: theme.text }]}>
              How are you feeling right now?
            </Text>
            <Text style={[styles.checkinSub, { color: theme.mutedText }]}>
              Choose the feeling that feels closest.
            </Text>

            <MoodGrid theme={theme} selected={selectedMood} onSelect={handleMoodSelect} />

            {moodAckVisible ? (
              <ObCard theme={theme} style={styles.moodAckCard}>
                <Text style={[styles.moodAckLabel, { color: theme.secondaryText }]}>Emo</Text>
                <Text style={[styles.moodAckText, { color: theme.text }]}>{moodAckVisible}</Text>
              </ObCard>
            ) : null}

            <Text style={[styles.journalTitle, { color: theme.text }]}>What's on your heart?</Text>
            <ObCard theme={theme} style={styles.journalCard}>
              <TextInput
                style={[styles.journalInput, { color: theme.text }]}
                placeholder="You can begin softly..."
                placeholderTextColor={theme.mutedText}
                value={journalNote}
                onChangeText={setJournalNote}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </ObCard>

            <LavenderButton
              label={reviewMode ? 'Done reviewing →' : 'Enter Your Sanctuary →'}
              onPress={enterSanctuary}
              disabled={!selectedMood}
              theme={theme}
            />

            <Text style={[styles.legalFooter, { color: theme.mutedText }]}>
              By continuing, you agree to the Terms of Service and Privacy Policy.
            </Text>
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.flex} {...panResponder.panHandlers}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {slide > 1 ? (
          <View style={styles.progressRow}>
            {[2, 3, 4].map((i) => (
              <Pressable
                key={i}
                onPress={() => goTo(i)}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Go to step ${i - 1} of 3`}
              >
                <View
                  style={[
                    styles.dot,
                    slide === i && [styles.dotActive, { backgroundColor: theme.accent }],
                    slide > i && { backgroundColor: theme.secondaryText },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.progressSpacer} />
        )}

        {slide > 1 ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (reviewMode && slide === 2) {
                onExitReview?.();
                return;
              }
              goTo(slide - 1);
            }}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={theme.text} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : null}

        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>{renderSlide()}</Animated.View>
      </SafeAreaView>
    </View>
  );
}

const CARD_W = (width - 56 - 14) / 2;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollPad: { paddingHorizontal: 28, paddingTop: 8 },
  checkinScroll: { paddingTop: 4 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  progressSpacer: { height: 14 },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 48,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backText: { fontSize: 28, fontWeight: '300', lineHeight: 30 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotActive: { width: 20, borderRadius: 4 },

  splashSlide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, width: '100%' },
  splashGlowOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    top: '22%',
  },
  splashGlowRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  splashGlowRingInner: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  splashFaceWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: 16, zIndex: 2 },
  splashFace: { width: 240, height: 240 },
  splashTitle: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: SERIF,
  },
  splashTagline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 20,
  },
  splashBarTrack: {
    width: '38%',
    height: 5,
    borderRadius: 999,
    marginTop: 56,
    overflow: 'hidden',
  },
  splashBarFill: {
    height: 5,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
  },
  splashFooter: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 20,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: 14,
  },
  headline: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: SERIF,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  quote: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  nameInput: { flex: 1, fontSize: 15, padding: 0 },
  noticeCard: { padding: 18, marginBottom: 24 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  noticeTitle: { fontSize: 15, fontWeight: '700' },
  noticeBody: { fontSize: 12, lineHeight: 19 },

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  privacyHeroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    marginTop: 4,
    height: 96,
  },
  privacyHeroGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  privacyHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,92,255,0.22)',
    borderWidth: 1,
  },
  privacyHeroLock: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(91,61,196,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyList: { gap: 10, marginBottom: 24, marginTop: 8 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  privacyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCardText: { flex: 1 },
  privacyCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  privacyCardDesc: { fontSize: 12, lineHeight: 18 },

  checkinTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: SERIF,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkinSub: { fontSize: 13, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: '100%',
    marginBottom: 22,
  },
  moodCard: {
    width: CARD_W,
    flexBasis: CARD_W,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
    gap: 10,
    minHeight: 74,
  },
  moodIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  moodEmoji: { fontSize: 17 },
  moodCardText: { flex: 1, paddingTop: 3 },
  moodCardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4, lineHeight: 16 },
  moodCardDesc: { fontSize: 10, lineHeight: 15 },

  journalTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: SERIF,
    marginBottom: 6,
  },
  journalSub: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  journalCard: { padding: 14, marginBottom: 22, minHeight: 110 },
  journalInput: { fontSize: 14, lineHeight: 21, minHeight: 88, padding: 0 },

  ctaWrap: { borderRadius: 18, overflow: 'hidden', marginTop: 4, marginBottom: 12 },
  ctaDisabled: { opacity: 0.45 },
  ctaBtn: { paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', borderRadius: 18 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  legalFooter: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4, paddingHorizontal: 12 },
  skipLinkWrap: { alignItems: 'center', marginBottom: 16 },
  skipLink: { fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' },
  moodAckCard: { padding: 14, marginBottom: 16 },
  moodAckLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  moodAckText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
});
