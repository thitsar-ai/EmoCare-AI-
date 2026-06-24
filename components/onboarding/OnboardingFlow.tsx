import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { Eye, LockKeyhole, Shield, ShieldCheck, Trash2, User, Sparkles, Check, type LucideIcon } from 'lucide-react-native';
import { OB_MOODS, type Mood } from '../../constants/obMoods';
import { openPrivacyPolicy, openTermsOfService } from '../../constants/legalLinks';
import { SanctuarySplashContent, SplashStarField } from '../shared/SanctuarySplash';
import { MoodPicker } from '../shared/MoodPicker';
import {
  getSanctuaryButtonGradient,
  getSanctuaryButtonGradientDisabled,
  getSanctuaryButtonGradientPressed,
  getSanctuaryLavenderAccent,
  getSanctuaryLavenderBorder,
  getSanctuaryLavenderFieldBg,
  getSanctuaryLavenderLabel,
  getSanctuaryIconAccent,
  getSanctuaryLabelAccent,
} from '../../theme/sanctuaryBrand';
import {
  primaryButtonInner,
  primaryButtonLabel,
  primaryButtonLabelDisabled,
  primaryButtonShell,
} from '../../theme/primaryButton';
import { hapticLight } from '../../utils/haptics';
import {
  getCircadianIconColor,
  useCircadianTheme,
  type CircadianTheme,
} from '../../theme/circadianTheme';
import { CircadianHeroGlow } from '../shared/CircadianHeroGlow';
import {
  ScreenNavChrome,
  useAppNav,
  WELCOME_ONBOARDING_SLIDE,
  OB_AGE_GATE_SLIDE,
  OB_LAST_CONTENT_SLIDE,
  OB_PRIVACY_SLIDE,
} from '../navigation/AppNavigation';
import {
  isAtLeast18,
  parseBirthDate,
  persistAgeVerified,
  readAgeVerified,
  YOUTH_SUPPORT_RESOURCES,
} from '../../utils/ageVerification';
import { openCrisisCall, openCrisisText } from '../../utils/crisisLine';
import {
  HOME_LANDING_MODE_KEY,
  INITIAL_CHECKIN_PAYLOAD_KEY,
  INITIAL_EMO_INTENT_KEY,
  resolveOnboardingSession,
} from '../../utils/onboardingLanding';

const { width, height } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const OB_CONTENT_SLIDES = [2, 3, 4, 5] as const;
const OB_PROGRESS_SLIDES = [2, 3, 4, 5] as const;
const OB_LAST_SLIDE = 5;

const OB_SLIDE_TITLES: Record<number, string> = {
  2: 'Welcome',
  3: 'Age verification',
  4: 'Privacy',
  5: 'Tell Me About You',
};

const PRIVACY_CARDS: { icon: LucideIcon; title: string; desc: string; color: string }[] = [
  {
    icon: LockKeyhole,
    title: 'Encrypted on your device',
    desc: 'Journal entries and Memory Ledger data stay on your device — encrypted and only accessible by you.',
    color: '#9B7BFF',
  },
  {
    icon: Shield,
    title: 'Never sold',
    desc: 'We never sell your information.',
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
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }, style]}>
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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [primaryButtonShell, styles.ctaWrap, disabled && styles.ctaDisabled]}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={
            disabled
              ? getSanctuaryButtonGradientDisabled(theme.phase)
              : pressed
                ? getSanctuaryButtonGradientPressed(theme.phase)
                : getSanctuaryButtonGradient(theme.phase)
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[primaryButtonInner, styles.ctaBtn]}
        >
          <Text style={[primaryButtonLabel, disabled && primaryButtonLabelDisabled]}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function AgeGateSlide({
  theme,
  scrollPad,
  onVerified,
  onBack,
  hideBack,
}: {
  theme: CircadianTheme;
  scrollPad: { paddingBottom: number };
  onVerified: () => void;
  onBack: () => void;
  hideBack?: boolean;
}) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const birthDate = parseBirthDate(month, day, year);
  const fieldsComplete = month.length >= 1 && day.length >= 1 && year.length === 4;
  const validDate = birthDate != null;
  const eligible = validDate && isAtLeast18(birthDate);
  const canContinue = ageConfirmed && fieldsComplete && validDate;

  const handleContinue = async () => {
    setAttempted(true);
    if (!ageConfirmed || !validDate) return;
    if (!isAtLeast18(birthDate)) {
      setBlocked(true);
      return;
    }
    await persistAgeVerified();
    onVerified();
  };

  const openResource = (type: 'phone' | 'sms' | 'info', value: string, smsBody?: string) => {
    if (type === 'info' || !value) return;
    if (type === 'phone') openCrisisCall(value);
    else openCrisisText(value, smsBody);
  };

  if (blocked) {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollPad, scrollPad, styles.ageBlockedPad]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: theme.text }]}>EmoCare is for adults 18+</Text>
        <Text style={[styles.body, { color: theme.mutedText }]}>
          Thank you for being honest. EmoCare is designed for people 18 and older, so we cannot open
          the full experience right now.
        </Text>
        <Text style={[styles.body, { color: theme.mutedText, marginTop: 8 }]}>
          You deserve support that fits your age. These lines are free, private, and staffed by people
          who listen:
        </Text>
        <View style={styles.youthResourceList}>
          {YOUTH_SUPPORT_RESOURCES.US.map((item) => {
            const tappable = item.type === 'phone' || item.type === 'sms';
            return (
              <Pressable
                key={item.label}
                disabled={!tappable}
                onPress={() => {
                  if (item.type === 'phone') openResource('phone', item.value);
                  else if (item.type === 'sms') openResource('sms', item.value, item.smsBody);
                }}
                style={[styles.youthResourceRow, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              >
                <Text style={[styles.youthResourceLabel, { color: theme.text }]}>{item.label}</Text>
                {tappable ? (
                  <Text style={[styles.youthResourceAction, { color: theme.accent }]}>Tap to connect</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {!hideBack ? <LavenderButton label="← Go back" onPress={onBack} theme={theme} /> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollPad, scrollPad]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.eyebrow, { color: getSanctuaryLavenderLabel(theme.phase) }]}>
        BEFORE WE CONTINUE
      </Text>
      <Text style={[styles.headline, { color: theme.text }]}>
        EmoCare is for adults{'\n'}18 and older.
      </Text>
      <Text style={[styles.body, { color: getSanctuaryLavenderLabel(theme.phase), opacity: 0.85 }]}>
        To protect younger users, please confirm your age before we continue. Your answer stays on
        this device — it is not shared or sold.
      </Text>

      <Pressable
        onPress={() => setAgeConfirmed((v) => !v)}
        style={[
          styles.ageConfirmRow,
          {
            borderColor: getSanctuaryLavenderBorder(theme.phase),
            backgroundColor: getSanctuaryLavenderFieldBg(theme.phase),
          },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ageConfirmed }}
      >
        <View
          style={[
            styles.ageConfirmBox,
            { borderColor: ageConfirmed ? getSanctuaryIconAccent(theme) : getSanctuaryLavenderBorder(theme.phase) },
            ageConfirmed && { backgroundColor: `${getSanctuaryLavenderAccent(theme.phase)}28` },
          ]}
        >
          {ageConfirmed ? (
            <Check size={14} color={getSanctuaryIconAccent(theme)} strokeWidth={3} />
          ) : null}
        </View>
        <Text style={[styles.ageConfirmText, { color: theme.text }]}>
          I confirm I am 18 years of age or older.
        </Text>
      </Pressable>

      <Text style={[styles.ageOrDivider, { color: getSanctuaryLavenderAccent(theme.phase) }]}>
        or enter your date of birth
      </Text>

      <Text style={[styles.fieldLabel, { color: getSanctuaryLabelAccent(theme) }]}>
        Date of birth
      </Text>
      <View style={styles.dobRow}>
        <View
          style={[
            styles.dobField,
            {
              backgroundColor: getSanctuaryLavenderFieldBg(theme.phase),
              borderColor: getSanctuaryLavenderBorder(theme.phase),
            },
          ]}
        >
          <TextInput
            style={[styles.dobInput, { color: theme.text }]}
            placeholder="MM"
            placeholderTextColor={theme.mutedText}
            value={month}
            onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Birth month"
          />
        </View>
        <View
          style={[
            styles.dobField,
            {
              backgroundColor: getSanctuaryLavenderFieldBg(theme.phase),
              borderColor: getSanctuaryLavenderBorder(theme.phase),
            },
          ]}
        >
          <TextInput
            style={[styles.dobInput, { color: theme.text }]}
            placeholder="DD"
            placeholderTextColor={theme.mutedText}
            value={day}
            onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Birth day"
          />
        </View>
        <View
          style={[
            styles.dobFieldYear,
            {
              backgroundColor: getSanctuaryLavenderFieldBg(theme.phase),
              borderColor: getSanctuaryLavenderBorder(theme.phase),
            },
          ]}
        >
          <TextInput
            style={[styles.dobInput, { color: theme.text }]}
            placeholder="YYYY"
            placeholderTextColor={theme.mutedText}
            value={year}
            onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Birth year"
          />
        </View>
      </View>

      {attempted && !validDate && fieldsComplete ? (
        <Text style={[styles.ageHint, { color: theme.isDark ? '#F472B6' : '#D46BA8' }]}>
          Please enter a valid date of birth.
        </Text>
      ) : null}

      <LavenderButton
        label="Continue"
        onPress={() => void handleContinue()}
        disabled={!canContinue}
        theme={theme}
      />
      {!canContinue ? (
        <Text style={[styles.ageHint, { color: theme.mutedText }]}>
          Confirm you are 18+ and enter your full date of birth to continue.
        </Text>
      ) : null}
      {fieldsComplete && validDate && !eligible ? (
        <Text style={[styles.ageHint, { color: theme.mutedText }]}>
          You must be 18 or older to use EmoCare.
        </Text>
      ) : null}
    </ScrollView>
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
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    NativeSplash.hideAsync().catch(() => {});

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: reduceMotion ? 1 : 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: 2800,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onContinue();
    });
  }, [fadeIn, onContinue, progress, reduceMotion]);

  return (
    <Pressable style={styles.splashSlide} onPress={onContinue}>
      <SplashStarField theme={theme} variant="sanctuary" />
      <View style={styles.splashBody}>
        <SanctuarySplashContent
          theme={theme}
          fadeIn={fadeIn}
          progress={progress}
          reduceMotion={reduceMotion}
        />
      </View>
    </Pressable>
  );
}

export function OnboardingFlow({
  onComplete,
  reviewMode = false,
  initialSlide = 1,
  onExitReview,
  ageVerificationOnly = false,
  onAgeVerified,
}: {
  onComplete: (args: {
    name: string;
    landingMode: 'sanctuary' | 'oracle';
    intentMode: 'sanctuary' | 'oracle';
  }) => void;
  reviewMode?: boolean;
  initialSlide?: number;
  onExitReview?: () => void;
  /** When true, completing the age gate calls onAgeVerified instead of advancing onboarding. */
  ageVerificationOnly?: boolean;
  onAgeVerified?: () => void;
}) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { onboardingReviewSlide, openOnboardingSlide, closeOnboardingReview, setOnboardingSplashActive, userName, setUserName, goBack, goForward, canGoBack: navCanGoBack, canGoForward: navCanGoForward } =
    useAppNav();
  const [slide, setSlide] = useState(initialSlide);
  const [ageGatePassed, setAgeGatePassed] = useState(false);
  const [ageGateReady, setAgeGateReady] = useState(false);
  const [name, setName] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [journalNote, setJournalNote] = useState('');
  const [moodAckVisible, setMoodAckVisible] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (reviewMode || ageVerificationOnly) {
      setAgeGateReady(true);
      return;
    }
    void readAgeVerified().then((verified) => {
      if (verified) {
        setAgeGatePassed(true);
        setSlide(WELCOME_ONBOARDING_SLIDE);
      }
      setAgeGateReady(true);
    });
  }, [ageVerificationOnly, reviewMode]);

  useEffect(() => {
    if (onboardingReviewSlide == null) return;
    let target = onboardingReviewSlide;
    if (!reviewMode && !ageVerificationOnly && !ageGatePassed && target > OB_AGE_GATE_SLIDE) {
      target = OB_AGE_GATE_SLIDE;
    }
    if (target !== slide) {
      setSlide(target);
    }
  }, [ageGatePassed, ageVerificationOnly, onboardingReviewSlide, reviewMode, slide]);

  useEffect(() => {
    setOnboardingSplashActive(!reviewMode && slide === 1);
    return () => setOnboardingSplashActive(false);
  }, [reviewMode, slide, setOnboardingSplashActive]);

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

  const slideRef = useRef(slide);
  slideRef.current = slide;
  const nameRef = useRef(name);
  nameRef.current = name;

  const persistWelcomeName = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      setUserName(trimmed);
      try {
        await AsyncStorage.setItem('userName', trimmed);
      } catch {}
    },
    [setUserName],
  );

  useEffect(() => {
    if (reviewMode) return;
    AsyncStorage.getItem('userName')
      .then((stored) => {
        if (stored?.trim()) setName(stored.trim());
      })
      .catch(() => {});
  }, [reviewMode]);

  useEffect(() => {
    if (!reviewMode) return;
    setName(userName);
  }, [reviewMode, userName]);

  useEffect(() => {
    if (reviewMode && onboardingReviewSlide === WELCOME_ONBOARDING_SLIDE) {
      setName(userName);
    }
  }, [reviewMode, onboardingReviewSlide, userName]);

  const prevSlideRef = useRef(slide);

  useEffect(() => {
    const prev = prevSlideRef.current;
    if (prev === WELCOME_ONBOARDING_SLIDE && slide !== WELCOME_ONBOARDING_SLIDE) {
      void persistWelcomeName(nameRef.current);
    }
    prevSlideRef.current = slide;
  }, [slide, persistWelcomeName]);

  useEffect(() => {
    if (!reviewMode) return;
    return () => {
      if (slideRef.current === WELCOME_ONBOARDING_SLIDE) {
        void persistWelcomeName(nameRef.current);
      }
    };
  }, [reviewMode, persistWelcomeName]);

  const goTo = (next: number) => {
    if (next === WELCOME_ONBOARDING_SLIDE && slide === WELCOME_ONBOARDING_SLIDE) {
      return;
    }
    let target =
      reviewMode && next === OB_AGE_GATE_SLIDE ? OB_PRIVACY_SLIDE : next;
    if (slide === WELCOME_ONBOARDING_SLIDE && target !== WELCOME_ONBOARDING_SLIDE) {
      void persistWelcomeName(nameRef.current);
    }
    if (target === 1) {
      closeOnboardingReview();
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setSlide(1), 220);
      return;
    }

    if (!reviewMode && !ageVerificationOnly) {
      if (target > OB_AGE_GATE_SLIDE && !ageGatePassed) {
        target = OB_AGE_GATE_SLIDE;
      }
      setSlide(target);
      return;
    }

    if (target === OB_AGE_GATE_SLIDE && !reviewMode) {
      setSlide(OB_AGE_GATE_SLIDE);
      return;
    }
    if (reviewMode && ([2, 4, 5] as readonly number[]).includes(target)) {
      openOnboardingSlide(target as 2 | 4 | 5);
    }
  };

  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (slideRef.current === 1) return false;
        const threshold = slideRef.current >= OB_LAST_SLIDE ? 24 : 12;
        return Math.abs(g.dx) > threshold && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (slideRef.current === 1) return false;
        const threshold = slideRef.current >= OB_LAST_SLIDE ? 24 : 12;
        return Math.abs(g.dx) > threshold && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      },
      onPanResponderRelease: (_, g) => {
        const s = slideRef.current;
        if (g.dx < -45 && s < OB_LAST_SLIDE && s !== OB_AGE_GATE_SLIDE) goToRef.current(s + 1);
        else if (g.dx > 45 && s > 1) goToRef.current(s - 1);
      },
    }),
  ).current;

  const enterSanctuary = async () => {
    if (reviewMode) {
      goForward();
      return;
    }
    if (!selectedMood) return;
    if (!ageGatePassed) return;
    const ageOk = await readAgeVerified();
    if (!ageOk) {
      setSlide(OB_AGE_GATE_SLIDE);
      return;
    }
    const session = resolveOnboardingSession(selectedMood, journalNote);
    closeOnboardingReview();
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
  const tellMeKeyboardOffset = insets.top + 72;

  const showSlideNav = (OB_CONTENT_SLIDES as readonly number[]).includes(slide);

  const handleFirstRunBack = () => {
    if (slide === OB_PRIVACY_SLIDE) goTo(WELCOME_ONBOARDING_SLIDE);
    else if (slide === OB_LAST_CONTENT_SLIDE) goTo(OB_PRIVACY_SLIDE);
    else if (slide === WELCOME_ONBOARDING_SLIDE) goTo(OB_AGE_GATE_SLIDE);
    else if (slide > 1) goTo(slide - 1);
  };

  const firstRunCanGoBack =
    !reviewMode &&
    !ageVerificationOnly &&
    (slide === OB_PRIVACY_SLIDE || slide === OB_LAST_CONTENT_SLIDE || slide === WELCOME_ONBOARDING_SLIDE);

  const handleFirstRunForward = () => {
    if (slide === OB_AGE_GATE_SLIDE && ageGatePassed) goTo(WELCOME_ONBOARDING_SLIDE);
    else if (slide === WELCOME_ONBOARDING_SLIDE) goTo(OB_PRIVACY_SLIDE);
    else if (slide === OB_PRIVACY_SLIDE) goTo(OB_LAST_CONTENT_SLIDE);
    else if (slide < OB_LAST_CONTENT_SLIDE && slide !== OB_AGE_GATE_SLIDE) goTo(slide + 1);
  };

  const firstRunCanGoForward =
    !reviewMode &&
    !ageVerificationOnly &&
    ((slide === OB_AGE_GATE_SLIDE && ageGatePassed) ||
      slide === WELCOME_ONBOARDING_SLIDE ||
      slide === OB_PRIVACY_SLIDE);

  if (!ageGateReady) {
    return (
      <View style={styles.flex}>
        <CircadianHeroGlow theme={theme} />
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (slide === 1) {
    return (
      <View style={styles.flex}>
        <CircadianHeroGlow theme={theme} />
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <SplashSlide theme={theme} onContinue={() => goTo(OB_AGE_GATE_SLIDE)} />
      </View>
    );
  }

  const renderSlide = () => {
    switch (slide) {
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
            <View style={[styles.nameRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <User size={17} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2} />
              <TextInput
                style={[styles.nameInput, { color: theme.text }]}
                placeholder="Your name..."
                placeholderTextColor={theme.mutedText}
                value={name}
                onChangeText={setName}
                maxLength={48}
                autoCorrect={false}
                autoCapitalize="words"
                autoComplete="off"
                textContentType="none"
              />
            </View>

            <Pressable onPress={() => goTo(OB_PRIVACY_SLIDE)} hitSlop={8} style={styles.skipLinkWrap}>
              <Text style={[styles.skipLink, { color: theme.mutedText }]}>Skip for now</Text>
            </Pressable>

            <ObCard theme={theme} style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Shield size={18} color={theme.accent} strokeWidth={2.5} />
                <Text style={[styles.noticeTitle, { color: theme.text }]}>Important Notice</Text>
              </View>
              <Text style={[styles.noticeBody, { color: theme.mutedText }]}>
                EmoCare is an emotional life companion — a private space for reflection, clarity,
                and growth.{'\n\n'}
                It is not a licensed therapist, medical provider, or crisis service. Emo holds clear
                boundaries: no diagnosis, no prescription, no substitute for human relationships.{'\n\n'}
                If you are in immediate danger or experiencing a mental health emergency, please
                contact local emergency services or a qualified crisis professional now.
              </Text>
            </ObCard>

            <LavenderButton
              label="Begin Gently →"
              onPress={() => (reviewMode ? goForward() : goTo(OB_PRIVACY_SLIDE))}
              theme={theme}
            />
          </ScrollView>
        );

      case 3:
        if (reviewMode) return null;
        return (
          <AgeGateSlide
            theme={theme}
            scrollPad={scrollPad}
            hideBack={ageVerificationOnly}
            onVerified={() => {
              setAgeGatePassed(true);
              if (ageVerificationOnly) {
                onAgeVerified?.();
              } else {
                goTo(WELCOME_ONBOARDING_SLIDE);
              }
            }}
            onBack={() => goTo(WELCOME_ONBOARDING_SLIDE)}
          />
        );

      case 4:
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
                <ShieldCheck size={32} color={theme.accent} strokeWidth={2.2} />
              </View>
            </View>

            <Text style={[styles.headline, { color: theme.text }]}>
              Your thoughts{'\n'}stay with you.
            </Text>
            <Text style={[styles.body, { color: theme.mutedText }]}>
              Encrypted on your device.{'\n'}Never sold.
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

            <Text style={[styles.privacyClarify, { color: theme.mutedText }]}>
              Journal entries and Memory Ledger data stay encrypted on your device. When you chat
              with Emo, messages are processed securely by Anthropic's API for that conversation
              and are not stored long-term on our servers.
            </Text>

            <LavenderButton
              label="I Understand →"
              onPress={() => (reviewMode ? goForward() : goTo(5))}
              theme={theme}
            />
          </ScrollView>
        );

      case 5:
      default:
        return (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? tellMeKeyboardOffset : 0}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scrollPad, styles.checkinScroll, { paddingBottom: 12 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <Text style={[styles.checkinSub, { color: theme.mutedText }]}>
                So I can support you in a way that feels personal.
              </Text>
              <Text style={[styles.checkinSection, { color: theme.text }]}>
                How are you feeling today?
              </Text>

              <MoodPicker
                theme={theme}
                selected={selectedMood}
                onSelect={handleMoodSelect}
                variant="onboarding"
                horizontalPadding={28}
              />

              {moodAckVisible ? (
                <ObCard theme={theme} style={styles.moodAckCard}>
                  <Text style={[styles.moodAckLabel, { color: theme.secondaryText }]}>Emo</Text>
                  <Text style={[styles.moodAckText, { color: theme.text }]}>{moodAckVisible}</Text>
                </ObCard>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.tellMeComposer,
                {
                  backgroundColor: theme.isDark ? 'rgba(14,8,32,0.92)' : 'rgba(245,240,252,0.96)',
                  borderTopColor: theme.border,
                  paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12),
                },
              ]}
            >
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
                label="Enter the Sanctuary →"
                onPress={enterSanctuary}
                disabled={!reviewMode && !selectedMood}
                theme={theme}
              />

              {!keyboardVisible ? (
                <Text style={[styles.legalFooter, { color: theme.mutedText }]}>
                  By continuing, you agree to the{' '}
                  <Text
                    style={[styles.legalLink, { color: theme.accent }]}
                    onPress={openTermsOfService}
                    accessibilityRole="link"
                  >
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={[styles.legalLink, { color: theme.accent }]}
                    onPress={openPrivacyPolicy}
                    accessibilityRole="link"
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        );
    }
  };

  return (
    <View style={styles.flex} {...(!reviewMode && !ageVerificationOnly ? panResponder.panHandlers : {})}>
      <CircadianHeroGlow theme={theme} />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <ScreenSafeArea edges={['top', 'left', 'right', 'bottom']} extraTop={4}>
        {showSlideNav ? (
          <View style={styles.reviewChrome}>
            <ScreenNavChrome
              theme={theme}
              title={OB_SLIDE_TITLES[slide] ?? ''}
              showMenu={reviewMode}
              onBack={
                reviewMode
                  ? slide === WELCOME_ONBOARDING_SLIDE
                    ? closeOnboardingReview
                    : goBack
                  : !ageVerificationOnly && showSlideNav
                    ? handleFirstRunBack
                    : undefined
              }
              canGoBack={
                reviewMode
                  ? slide === WELCOME_ONBOARDING_SLIDE
                    ? true
                    : navCanGoBack
                  : firstRunCanGoBack
                    ? true
                    : undefined
              }
              onForward={
                reviewMode
                  ? goForward
                  : !reviewMode && !ageVerificationOnly && showSlideNav
                    ? handleFirstRunForward
                    : undefined
              }
              canGoForward={
                reviewMode
                  ? navCanGoForward
                  : !reviewMode && !ageVerificationOnly && showSlideNav
                    ? firstRunCanGoForward
                    : undefined
              }
            />
          </View>
        ) : null}

        {showSlideNav && !reviewMode && !ageVerificationOnly && slide >= WELCOME_ONBOARDING_SLIDE ? (
          <View style={styles.progressRow}>
            {OB_PROGRESS_SLIDES.map((i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (!ageGatePassed && i > OB_AGE_GATE_SLIDE) return;
                  goTo(i);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Go to step ${i - 1} of ${OB_PROGRESS_SLIDES.length}`}
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

        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>{renderSlide()}</Animated.View>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollPad: { paddingHorizontal: 28, paddingTop: 8 },
  checkinScroll: { paddingTop: 0 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  progressSpacer: { height: 14 },
  reviewChrome: { paddingHorizontal: 8, paddingBottom: 2 },
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
  splashBody: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },

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
  privacyClarify: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 4,
  },

  checkinTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: SERIF,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkinSub: { fontSize: 13, textAlign: 'center', marginTop: 2, marginBottom: 14, lineHeight: 20 },
  checkinSection: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: SERIF,
    textAlign: 'center',
    marginBottom: 16,
  },
  tellMeComposer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 28,
    paddingTop: 12,
    gap: 10,
  },
  journalTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: SERIF,
    marginBottom: 6,
  },
  journalSub: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  journalCard: { padding: 14, marginBottom: 22, minHeight: 110 },
  journalInput: { fontSize: 14, lineHeight: 21, minHeight: 88, padding: 0 },

  ctaWrap: { marginTop: 4, marginBottom: 12 },
  ctaDisabled: { opacity: 1 },
  ctaBtn: {},
  legalFooter: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4, paddingHorizontal: 12 },
  legalLink: { textDecorationLine: 'underline', fontWeight: '600' },
  skipLinkWrap: { alignItems: 'center', marginBottom: 16 },
  skipLink: { fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' },
  moodAckCard: { padding: 14, marginBottom: 16 },
  moodAckLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  moodAckText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  dobRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8 },
  dobField: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14 },
  dobFieldYear: { flex: 1.4, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14 },
  dobInput: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  ageConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  ageConfirmBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageConfirmText: { flex: 1, fontSize: 15, lineHeight: 21 },
  ageOrDivider: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  ageHint: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 10, marginBottom: 4 },
  ageBlockedPad: { paddingTop: 12 },
  youthResourceList: { marginTop: 16, marginBottom: 20, gap: 10 },
  youthResourceRow: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  youthResourceLabel: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  youthResourceAction: { fontSize: 13, fontWeight: '600', marginTop: 6 },
});
