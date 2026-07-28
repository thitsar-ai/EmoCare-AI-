import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { useUiCopy } from '../i18n/UiCopyProvider';
import {
  ChevronDown,
  Eye,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  Sparkles,
  Check,
  type LucideIcon,
} from 'lucide-react-native';
import { OB_MOODS, type Mood } from '../../constants/obMoods';
import { openPrivacyPolicy, openTermsOfService } from '../../constants/legalLinks';
import { SanctuarySplashContent, SplashStarField } from '../shared/SanctuarySplash';
import { MoodPicker } from '../shared/MoodPicker';
import { PrimaryActionButton } from '../shared/PrimaryActionButton';
import {
  getSanctuaryLavenderAccent,
  getSanctuaryLavenderBorder,
  getSanctuaryLavenderFieldBg,
  getSanctuaryLavenderLabel,
  getSanctuaryIconAccent,
  getSanctuaryLabelAccent,
} from '../../theme/sanctuaryBrand';
import { tokens } from '../../theme/tokens';
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
  OB_PRIVACY_SLIDE,
  OB_ABOUT_YOU_SLIDE,
  OB_FEELING_SLIDE,
  OB_READY_SLIDE,
  OB_LAST_CONTENT_SLIDE,
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
import {
  markOnboardingComplete,
  loadUserPronouns,
  saveUserPronouns,
} from '../../utils/onboardingState';
import {
  OB_CONTENT_SLIDES,
  nextContentSlide,
  prevContentSlide,
} from '../../utils/onboardingFlowOrder';
import { loadSettings, saveSettings } from '../../utils/settingsStorage';
import { getChatLanguageOptionsForUi, normalizeChatLanguage } from '../../utils/chatLanguage';
import { MIRA_LANGUAGE_OPTIONS, normalizeMiraLanguage } from '../../utils/miraLanguage';

const { width, height } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/** Visible first-run path: Welcome → Privacy → Tell Me About You (age is interstitial). */
const OB_PROGRESS_SLIDES = OB_CONTENT_SLIDES;
const OB_LAST_SLIDE = OB_READY_SLIDE;

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function obSlideTitle(slide: number, t: Translate): string {
  if (slide === 2) return t('onboarding.slideWelcome');
  if (slide === 3) return t('onboarding.slideAge');
  if (slide === 4) return t('onboarding.slidePrivacy');
  if (slide === 5) return t('onboarding.slideAboutYou');
  if (slide === 6) return t('onboarding.slideFeeling');
  if (slide === 7) return t('onboarding.slideReady');
  return '';
}

function privacyCards(t: Translate): { icon: LucideIcon; title: string; desc: string; color: string }[] {
  return [
    {
      icon: LockKeyhole,
      title: t('onboarding.encryptedDevice'),
      desc: t('onboarding.privacyCardBody1'),
      color: '#9B7BFF',
    },
    {
      icon: Shield,
      title: t('onboarding.neverSold'),
      desc: t('onboarding.privacyCardBody2'),
      color: '#4ADE80',
    },
    {
      icon: Trash2,
      title: t('onboarding.memoryLedgerControl'),
      desc: t('onboarding.memoryLedgerControlBody'),
      color: '#B79DFF',
    },
    {
      icon: Eye,
      title: t('onboarding.fullTransparency'),
      desc: t('onboarding.fullTransparencyBody'),
      color: '#60A5FA',
    },
    {
      icon: Sparkles,
      title: t('onboarding.aiMayProcess'),
      desc: t('onboarding.privacyCardBody3'),
      color: '#A78BFA',
    },
  ];
}

const MOOD_ACK_KEYS: Record<string, string> = {
  Heavy: 'onboarding.moodAckHeavy',
  Overwhelmed: 'onboarding.moodAckOverwhelmed',
  Neutral: 'onboarding.moodAckNeutral',
  Hopeful: 'onboarding.moodAckHopeful',
  Light: 'onboarding.moodAckLight',
  Peaceful: 'onboarding.moodAckPeaceful',
  Grateful: 'onboarding.moodAckGrateful',
  Joyful: 'onboarding.moodAckJoyful',
};

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
  disabledHint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: CircadianTheme;
  disabledHint?: string;
}) {
  return (
    <PrimaryActionButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      disabledHint={disabledHint}
      theme={theme}
      style={styles.ctaWrap}
    />
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
  const { t } = useUiCopy();
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
  const canContinue = ageConfirmed || (fieldsComplete && validDate && eligible);

  const continueHint =
    fieldsComplete && !validDate
      ? t('onboarding.validDob')
      : fieldsComplete && validDate && !eligible && !ageConfirmed
        ? t('onboarding.ageMustBe18')
        : t('onboarding.ageContinueHint');

  const handleContinue = async () => {
    setAttempted(true);
    if (validDate && birthDate) {
      if (!isAtLeast18(birthDate)) {
        setBlocked(true);
        return;
      }
      await persistAgeVerified();
      onVerified();
      return;
    }
    if (ageConfirmed) {
      await persistAgeVerified();
      onVerified();
    }
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
        <Text style={[styles.headline, { color: theme.text }]}>{t('onboarding.ageBlockedTitle')}</Text>
        <Text style={[styles.body, { color: theme.mutedText }]}>{t('onboarding.ageBlockedBody')}</Text>
        <Text style={[styles.body, { color: theme.mutedText, marginTop: 8 }]}>
          {t('onboarding.ageBlockedSupport')}
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
                  <Text style={[styles.youthResourceAction, { color: theme.accent }]}>
                    {t('onboarding.tapToConnect')}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {!hideBack ? <LavenderButton label={t('onboarding.goBack')} onPress={onBack} theme={theme} /> : null}
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
        {t('onboarding.ageEyebrow')}
      </Text>
      <Text style={[styles.headline, { color: theme.text }]}>{t('onboarding.ageTitle')}</Text>
      <Text style={[styles.body, { color: getSanctuaryLavenderLabel(theme.phase), opacity: 0.85 }]}>
        {t('onboarding.ageBody')}
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
            {
              borderColor: ageConfirmed ? getSanctuaryIconAccent(theme) : tokens.border.active,
              backgroundColor: ageConfirmed
                ? `${getSanctuaryLavenderAccent(theme.phase)}28`
                : tokens.surface.inset,
            },
          ]}
        >
          {ageConfirmed ? (
            <Check size={15} color={getSanctuaryIconAccent(theme)} strokeWidth={3} />
          ) : null}
        </View>
        <Text style={[styles.ageConfirmText, { color: theme.text }]}>{t('onboarding.ageConfirm')}</Text>
      </Pressable>

      <Text style={[styles.ageOrDivider, { color: getSanctuaryLavenderAccent(theme.phase) }]}>
        {t('onboarding.orEnterDob')}
      </Text>

      <Text style={[styles.fieldLabel, { color: getSanctuaryLabelAccent(theme) }]}>
        {t('onboarding.dateOfBirth')}
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
            placeholder={t('onboarding.dobMonth')}
            placeholderTextColor={theme.mutedText}
            value={month}
            onChangeText={(v) => setMonth(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel={t('onboarding.birthMonthA11y')}
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
            placeholder={t('onboarding.dobDay')}
            placeholderTextColor={theme.mutedText}
            value={day}
            onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel={t('onboarding.birthDayA11y')}
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
            placeholder={t('onboarding.dobYear')}
            placeholderTextColor={theme.mutedText}
            value={year}
            onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel={t('onboarding.birthYearA11y')}
          />
        </View>
      </View>

      {attempted && !validDate && fieldsComplete ? (
        <Text style={[styles.ageHint, { color: theme.isDark ? '#F472B6' : '#D46BA8' }]}>
          {t('onboarding.validDob')}
        </Text>
      ) : null}

      <LavenderButton
        label={t('onboarding.continueArrow')}
        onPress={() => void handleContinue()}
        disabled={!canContinue}
        theme={theme}
        disabledHint={!canContinue ? continueHint : undefined}
      />
      {attempted && fieldsComplete && validDate && !eligible && !ageConfirmed ? (
        <Text style={[styles.ageHint, { color: theme.mutedText }]}>{t('onboarding.ageMustBe18')}</Text>
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
  const { t, locale, setUiLocaleFromChatLanguage } = useUiCopy();
  const myanmarUi = locale === 'my';
  const insets = useSafeAreaInsets();
  const { onboardingReviewSlide, openOnboardingSlide, closeOnboardingReview, setOnboardingSplashActive, userName, setUserName, goBack, goForward, canGoBack: navCanGoBack, canGoForward: navCanGoForward } =
    useAppNav();
  const [slide, setSlide] = useState(initialSlide);
  const [ageGatePassed, setAgeGatePassed] = useState(false);
  const [ageGateReady, setAgeGateReady] = useState(false);
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [pronounCustomMode, setPronounCustomMode] = useState(false);
  const [pronounPickerOpen, setPronounPickerOpen] = useState(false);
  const [emoLanguage, setEmoLanguage] = useState('auto');
  const [miraLanguage, setMiraLanguage] = useState('auto');
  const [privacyAcked, setPrivacyAcked] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [journalNote, setJournalNote] = useState('');
  const [moodAckVisible, setMoodAckVisible] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  /** After age gate, resume here (Privacy → About You path). */
  const pendingAfterAgeRef = useRef<number | null>(null);

  const emoLanguageOptions = useMemo(
    () => getChatLanguageOptionsForUi(locale),
    [locale],
  );

  const pronounOptions = useMemo(
    () => [
      { id: 'she', label: t('onboarding.pronounShe') },
      { id: 'he', label: t('onboarding.pronounHe') },
      { id: 'they', label: t('onboarding.pronounThey') },
      { id: 'useName', label: t('onboarding.pronounUseName') },
      { id: 'preferNot', label: t('onboarding.pronounPreferNot') },
      { id: 'custom', label: t('onboarding.pronounCustom') },
    ],
    [t],
  );

  const miraLanguageOptions = useMemo(() => {
    if (locale !== 'my') return MIRA_LANGUAGE_OPTIONS;
    return MIRA_LANGUAGE_OPTIONS.map((opt) =>
      opt.id === 'auto'
        ? { ...opt, label: 'အလိုအလျောက်', shortLabel: 'အလိုအလျောက်' }
        : opt.id === 'id'
          ? { ...opt, shortLabel: 'Bahasa Indonesia' }
          : opt,
    );
  }, [locale]);

  const pronounFieldLabel = pronounCustomMode
    ? t('onboarding.pronounCustom')
    : pronouns.trim() || t('onboarding.pronounsSelect');

  /** Apply Emo language immediately — UI chrome follows chatLanguage (same as Settings). */
  const applyEmoLanguage = useCallback(
    (id: string) => {
      const next = normalizeChatLanguage(id);
      setEmoLanguage(next);
      setUiLocaleFromChatLanguage(next);
      void saveSettings({ chatLanguage: next });
    },
    [setUiLocaleFromChatLanguage],
  );

  const applyMiraLanguage = useCallback((id: string) => {
    const next = normalizeMiraLanguage(id);
    setMiraLanguage(next);
    void saveSettings({ miraLanguage: next });
  }, []);

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
      if (verified) setAgeGatePassed(true);
      setAgeGateReady(true);
    });
    void loadSettings().then((s) => {
      const chatLang = normalizeChatLanguage(s.chatLanguage);
      setEmoLanguage(chatLang);
      setUiLocaleFromChatLanguage(chatLang);
      setMiraLanguage(normalizeMiraLanguage(s.miraLanguage));
    });
    void loadUserPronouns().then(setPronouns);
  }, [ageVerificationOnly, reviewMode, setUiLocaleFromChatLanguage]);

  useEffect(() => {
    if (onboardingReviewSlide == null) return;
    if (onboardingReviewSlide !== slide) {
      setSlide(onboardingReviewSlide);
    }
  }, [onboardingReviewSlide, slide]);

  useEffect(() => {
    setOnboardingSplashActive(!reviewMode && slide === 1);
    return () => setOnboardingSplashActive(false);
  }, [reviewMode, slide, setOnboardingSplashActive]);

  useEffect(
    () => () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    },
    [],
  );

  const resolveMoodAck = useCallback(
    (m: Mood) => {
      const ackKey = MOOD_ACK_KEYS[m.label];
      const moodLabelKey = `mood.${m.label.toLowerCase()}`;
      const localizedMood = t(moodLabelKey);
      const moodWord =
        localizedMood === moodLabelKey ? m.label.toLowerCase() : localizedMood.toLowerCase();
      return ackKey ? t(ackKey) : t('onboarding.moodAckFallback', { mood: moodWord });
    },
    [t],
  );

  const handleMoodSelect = useCallback(
    (m: Mood) => {
      setSelectedMood(m);
      const full = resolveMoodAck(m);
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      // Myanmar: show full message immediately (avoid grapheme-unsafe typewriter slicing).
      if (locale === 'my') {
        setMoodAckVisible(full);
        return;
      }
      setMoodAckVisible('');
      let idx = 0;
      typewriterRef.current = setInterval(() => {
        idx += 1;
        setMoodAckVisible(full.slice(0, idx));
        if (idx >= full.length && typewriterRef.current) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }, 28);
    },
    [locale, resolveMoodAck],
  );

  // Refresh supportive copy when UI language changes while a mood is selected.
  useEffect(() => {
    if (!selectedMood) {
      setMoodAckVisible('');
      return;
    }
    if (locale === 'my') {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      setMoodAckVisible(resolveMoodAck(selectedMood));
    }
  }, [locale, selectedMood, resolveMoodAck]);

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
    // Legacy splash (slide 1) is not part of first-run — send to Welcome.
    if (target === 1) {
      setSlide(WELCOME_ONBOARDING_SLIDE);
      return;
    }

    // Age gate is interstitial only (Privacy → About You / finish). Never open via swipe +1.
    if (
      target === OB_AGE_GATE_SLIDE &&
      !ageVerificationOnly &&
      !reviewMode
    ) {
      return;
    }

    // Privacy acknowledgement required before Tell Me About You.
    if (
      !reviewMode &&
      !ageVerificationOnly &&
      slide === OB_PRIVACY_SLIDE &&
      target === OB_ABOUT_YOU_SLIDE &&
      !privacyAcked
    ) {
      return;
    }

    // Age gate only when leaving Privacy toward Tell Me About You (not before Welcome).
    if (
      !reviewMode &&
      !ageVerificationOnly &&
      !ageGatePassed &&
      target === OB_ABOUT_YOU_SLIDE &&
      slide === OB_PRIVACY_SLIDE
    ) {
      pendingAfterAgeRef.current = OB_ABOUT_YOU_SLIDE;
      setSlide(OB_AGE_GATE_SLIDE);
      return;
    }

    if (!reviewMode && !ageVerificationOnly) {
      setSlide(target);
      return;
    }

    if (target === OB_AGE_GATE_SLIDE && !reviewMode) {
      setSlide(OB_AGE_GATE_SLIDE);
      return;
    }
    if (reviewMode && ([2, 4, 5, 6, 7] as readonly number[]).includes(target)) {
      openOnboardingSlide(target as 2 | 4 | 5 | 6 | 7);
    }
  };

  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const privacyAckedRef = useRef(privacyAcked);
  privacyAckedRef.current = privacyAcked;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (slideRef.current === 1 || slideRef.current === OB_AGE_GATE_SLIDE) return false;
        const threshold = slideRef.current >= OB_LAST_SLIDE ? 24 : 12;
        return Math.abs(g.dx) > threshold && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (slideRef.current === 1 || slideRef.current === OB_AGE_GATE_SLIDE) return false;
        const threshold = slideRef.current >= OB_LAST_SLIDE ? 24 : 12;
        return Math.abs(g.dx) > threshold && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      },
      onPanResponderRelease: (_, g) => {
        const s = slideRef.current;
        // Use content order (2→4→5), never numeric +1 (that skipped Privacy via 2→3).
        if (g.dx < -45) {
          const next = nextContentSlide(s);
          if (next == null) return;
          if (s === OB_PRIVACY_SLIDE && !privacyAckedRef.current) return;
          goToRef.current(next);
        } else if (g.dx > 45) {
          const prev = prevContentSlide(s);
          if (prev != null) goToRef.current(prev);
        }
      },
    }),
  ).current;

  const finishOnboarding = async (opts?: { skipped?: boolean }) => {
    if (reviewMode) {
      goForward();
      return;
    }
    const ageOk = await readAgeVerified();
    if (!ageOk) {
      pendingAfterAgeRef.current = -1; // signal: finish after age
      setSlide(OB_AGE_GATE_SLIDE);
      return;
    }
    const mood = selectedMood || OB_MOODS.find((m) => m.label === 'Neutral') || OB_MOODS[0];
    const session = resolveOnboardingSession(mood, journalNote);
    closeOnboardingReview();
    try {
      await markOnboardingComplete();
      await AsyncStorage.setItem('userName', name.trim());
      await saveUserPronouns(
        pronouns === t('onboarding.pronounPreferNot') || pronouns === t('onboarding.pronounCustom')
          ? ''
          : pronouns.trim(),
      );
      await saveSettings({
        chatLanguage: normalizeChatLanguage(emoLanguage),
        miraLanguage: normalizeMiraLanguage(miraLanguage),
      });
      await AsyncStorage.setItem(HOME_LANDING_MODE_KEY, 'sanctuary');
      await AsyncStorage.setItem(INITIAL_EMO_INTENT_KEY, session.intentMode);
      await AsyncStorage.setItem(INITIAL_CHECKIN_PAYLOAD_KEY, session.payload);
      if (!opts?.skipped && selectedMood) {
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
              landingMode: 'sanctuary',
              intentMode: session.intentMode,
            },
            ...all,
          ]),
        );
      }
    } catch {}
    onComplete({
      name: name.trim(),
      landingMode: 'sanctuary',
      intentMode: session.intentMode as 'sanctuary' | 'oracle',
    });
  };

  const enterSanctuary = () => void finishOnboarding({ skipped: !selectedMood });

  const scrollPad = { paddingBottom: Math.max(insets.bottom, 20) + 16 };
  const tellMeKeyboardOffset = insets.top + 72;

  const showSlideNav = (OB_CONTENT_SLIDES as readonly number[]).includes(slide);

  const handleFirstRunBack = () => {
    if (slide === OB_PRIVACY_SLIDE) goTo(WELCOME_ONBOARDING_SLIDE);
    else if (slide === OB_ABOUT_YOU_SLIDE) goTo(OB_PRIVACY_SLIDE);
    else if (slide === OB_FEELING_SLIDE) goTo(OB_ABOUT_YOU_SLIDE);
    else if (slide === OB_READY_SLIDE) goTo(OB_FEELING_SLIDE);
    else if (slide === OB_AGE_GATE_SLIDE) goTo(OB_PRIVACY_SLIDE);
  };

  const firstRunCanGoBack =
    !reviewMode &&
    !ageVerificationOnly &&
    (slide === OB_PRIVACY_SLIDE ||
      slide === OB_ABOUT_YOU_SLIDE ||
      slide === OB_FEELING_SLIDE ||
      slide === OB_READY_SLIDE ||
      slide === OB_AGE_GATE_SLIDE);

  const handleFirstRunForward = () => {
    if (slide === WELCOME_ONBOARDING_SLIDE) goTo(OB_PRIVACY_SLIDE);
    else if (slide === OB_PRIVACY_SLIDE) {
      if (!privacyAcked) return;
      goTo(OB_ABOUT_YOU_SLIDE);
    } else if (slide === OB_ABOUT_YOU_SLIDE) {
      goTo(OB_FEELING_SLIDE);
    } else if (slide === OB_FEELING_SLIDE) {
      goTo(OB_READY_SLIDE);
    } else if (slide === OB_AGE_GATE_SLIDE && ageGatePassed) {
      goTo(
        pendingAfterAgeRef.current === -1
          ? OB_ABOUT_YOU_SLIDE
          : pendingAfterAgeRef.current || OB_ABOUT_YOU_SLIDE,
      );
    }
  };

  const firstRunCanGoForward =
    !reviewMode &&
    !ageVerificationOnly &&
    ((slide === OB_AGE_GATE_SLIDE && ageGatePassed) ||
      slide === WELCOME_ONBOARDING_SLIDE ||
      (slide === OB_PRIVACY_SLIDE && privacyAcked) ||
      slide === OB_ABOUT_YOU_SLIDE ||
      slide === OB_FEELING_SLIDE);

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
        <SplashSlide theme={theme} onContinue={() => goTo(WELCOME_ONBOARDING_SLIDE)} />
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
            <Text
              style={[
                styles.eyebrow,
                myanmarUi && styles.eyebrowMy,
                { color: theme.secondaryText },
              ]}
            >
              {t('onboarding.welcomeEyebrow')}
            </Text>
            <Text
              style={[styles.headline, myanmarUi && styles.headlineMy, { color: theme.text }]}
            >
              {t('onboarding.welcomeTitle')}
            </Text>
            <Text style={[styles.body, myanmarUi && styles.bodyMy, { color: theme.mutedText }]}>
              {t('onboarding.welcomeBody')}
            </Text>
            <ObCard theme={theme} style={styles.noticeCard}>
              <Text
                style={[
                  styles.noticeTitle,
                  myanmarUi && styles.noticeTitleMy,
                  { color: theme.text, marginBottom: 10 },
                ]}
              >
                {t('onboarding.companionsTitle')}
              </Text>
              <Text
                style={[
                  styles.noticeBody,
                  myanmarUi && styles.noticeBodyMy,
                  { color: theme.mutedText, marginBottom: 10 },
                ]}
              >
                {t('onboarding.emoCompanion')}
              </Text>
              <Text
                style={[
                  styles.noticeBody,
                  myanmarUi && styles.noticeBodyMy,
                  { color: theme.mutedText },
                ]}
              >
                {t('onboarding.miraCompanion')}
              </Text>
            </ObCard>
            <Text
              style={[styles.quote, myanmarUi && styles.quoteMy, { color: theme.secondaryText }]}
            >
              {t('onboarding.welcomeSafety')}
            </Text>
            <LavenderButton
              label={t('common.continue')}
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
                return;
              }
              const pending = pendingAfterAgeRef.current;
              pendingAfterAgeRef.current = null;
              if (pending === -1) {
                void finishOnboarding({ skipped: !selectedMood });
                return;
              }
              goTo(pending || OB_ABOUT_YOU_SLIDE);
            }}
            onBack={() => goTo(OB_PRIVACY_SLIDE)}
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

            <Text
              style={[
                styles.headline,
                myanmarUi && styles.headlineMy,
                { color: theme.text },
              ]}
            >
              {t('onboarding.privacyTitle')}
            </Text>
            <Text
              style={[styles.body, myanmarUi && styles.bodyMy, { color: theme.mutedText }]}
            >
              {t('onboarding.privacyLead')}
            </Text>

            <View style={styles.privacyList}>
              {privacyCards(t).map((card) => {
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
              {t('onboarding.privacyClarify')}
            </Text>

            <Pressable
              onPress={() => {
                void hapticLight();
                setPrivacyAcked((v) => !v);
              }}
              style={styles.privacyAckRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: privacyAcked }}
              accessibilityLabel={t('onboarding.privacyAckA11y')}
            >
              <View
                style={[
                  styles.privacyCheckbox,
                  {
                    borderColor: privacyAcked ? theme.accent : theme.border,
                    backgroundColor: privacyAcked ? theme.accent : 'transparent',
                  },
                ]}
              >
                {privacyAcked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.privacyAckText, { color: theme.text }]}>
                {t('onboarding.privacyAck')}
              </Text>
            </Pressable>

            <LavenderButton
              label={t('onboarding.privacyUnderstand')}
              disabled={!reviewMode && !privacyAcked}
              onPress={() => (reviewMode ? goForward() : goTo(OB_ABOUT_YOU_SLIDE))}
              theme={theme}
            />
          </ScrollView>
        );

      case 5:
        return (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? tellMeKeyboardOffset : 0}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scrollPad, scrollPad, { paddingBottom: 28 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <Text
                style={[
                  styles.headline,
                  myanmarUi && styles.headlineMy,
                  { color: theme.text, marginBottom: 10 },
                ]}
              >
                {t('onboarding.aboutYouTitle')}
              </Text>
              <Text
                style={[
                  styles.checkinSub,
                  myanmarUi && styles.bodyMy,
                  { color: theme.mutedText },
                ]}
              >
                {t('onboarding.aboutYouSub')}
              </Text>

              <Text
                style={[
                  styles.fieldLabel,
                  myanmarUi && styles.fieldLabelMy,
                  { color: theme.secondaryText },
                ]}
              >
                {t('onboarding.preferredName')}
              </Text>
              <View style={[styles.nameRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <User size={17} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2} />
                <TextInput
                  style={[styles.nameInput, { color: theme.text }]}
                  placeholder={t('onboarding.preferredNamePlaceholder')}
                  placeholderTextColor={theme.mutedText}
                  value={name}
                  onChangeText={setName}
                  maxLength={48}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  myanmarUi && styles.fieldLabelMy,
                  { color: theme.secondaryText },
                ]}
              >
                {t('onboarding.pronouns')}
              </Text>
              {t('onboarding.pronounsHelper') ? (
                <Text
                  style={[
                    styles.pronounHelper,
                    myanmarUi && styles.bodyMy,
                    { color: theme.mutedText },
                  ]}
                >
                  {t('onboarding.pronounsHelper')}
                </Text>
              ) : null}
              <Pressable
                onPress={() => {
                  void hapticLight();
                  setPronounPickerOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.pronouns')}
                style={[
                  styles.nameRow,
                  styles.pronounDropdown,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <Text
                  style={[
                    styles.nameInput,
                    {
                      color:
                        pronounCustomMode || pronouns.trim() ? theme.text : theme.mutedText,
                      paddingLeft: 4,
                    },
                    myanmarUi && styles.pronounDropdownTextMy,
                  ]}
                  numberOfLines={1}
                >
                  {pronounFieldLabel}
                </Text>
                <ChevronDown size={18} color={theme.mutedText} strokeWidth={2.2} />
              </Pressable>
              {pronounCustomMode ? (
                <View
                  style={[
                    styles.nameRow,
                    styles.pronounCustomRow,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.nameInput,
                      { color: theme.text, paddingLeft: 4 },
                      myanmarUi && styles.pronounDropdownTextMy,
                    ]}
                    placeholder={t('onboarding.pronounsPlaceholder')}
                    placeholderTextColor={theme.mutedText}
                    value={pronouns}
                    onChangeText={setPronouns}
                    maxLength={40}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
              ) : null}

              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>
                {t('onboarding.emoLanguage')}
              </Text>
              <View style={styles.langChipRow}>
                {emoLanguageOptions.map((opt) => {
                  const selected = emoLanguage === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        void hapticLight();
                        applyEmoLanguage(opt.id);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={opt.label}
                      style={[
                        styles.langChip,
                        {
                          borderColor: selected ? theme.accent : theme.border,
                          backgroundColor: selected ? `${theme.accent}22` : theme.card,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.langChipText,
                          myanmarUi && styles.langChipTextMy,
                          { color: selected ? theme.accent : theme.text },
                        ]}
                      >
                        {opt.shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  myanmarUi && styles.fieldLabelMy,
                  { color: theme.secondaryText },
                ]}
              >
                {t('onboarding.miraLanguage')}
              </Text>
              <View style={styles.langChipRow}>
                {miraLanguageOptions.map((opt) => {
                  const selected = miraLanguage === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        void hapticLight();
                        applyMiraLanguage(opt.id);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={opt.label}
                      style={[
                        styles.langChip,
                        {
                          borderColor: selected ? tokens.oracle.accent : theme.border,
                          backgroundColor: selected ? `${tokens.oracle.accent}22` : theme.card,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.langChipText,
                          myanmarUi && styles.langChipTextMy,
                          { color: selected ? tokens.oracle.accent : theme.text },
                        ]}
                      >
                        {opt.shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <LavenderButton
                label={t('common.continue')}
                onPress={() => (reviewMode ? goForward() : goTo(OB_FEELING_SLIDE))}
                theme={theme}
              />

              <Text style={[styles.legalFooter, { color: theme.mutedText }]}>
                {(() => {
                  const termsLabel = t('common.terms');
                  const privacyLabel = t('common.privacyPolicy');
                  const raw = t('onboarding.legalAgree', { terms: '<<T>>', privacy: '<<P>>' });
                  const nodes: React.ReactNode[] = [];
                  const re = /<<T>>|<<P>>/g;
                  let last = 0;
                  let match: RegExpExecArray | null;
                  let i = 0;
                  while ((match = re.exec(raw))) {
                    if (match.index > last) nodes.push(raw.slice(last, match.index));
                    if (match[0] === '<<T>>') {
                      nodes.push(
                        <Text
                          key={`terms-${i++}`}
                          style={[styles.legalLink, { color: theme.accent }]}
                          onPress={openTermsOfService}
                        >
                          {termsLabel}
                        </Text>,
                      );
                    } else {
                      nodes.push(
                        <Text
                          key={`privacy-${i++}`}
                          style={[styles.legalLink, { color: theme.accent }]}
                          onPress={openPrivacyPolicy}
                        >
                          {privacyLabel}
                        </Text>,
                      );
                    }
                    last = match.index + match[0].length;
                  }
                  if (last < raw.length) nodes.push(raw.slice(last));
                  return nodes;
                })()}
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        );

      case 6:
        return (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollPad, scrollPad, { paddingBottom: 28 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.headline,
                myanmarUi && styles.headlineMy,
                { color: theme.text, marginBottom: 10 },
              ]}
            >
              {t('onboarding.feelingTitle')}
            </Text>
            <Text style={[styles.checkinSub, myanmarUi && styles.bodyMy, { color: theme.mutedText }]}>
              {t('onboarding.feelingSub')}
            </Text>
            <Text
              style={[
                styles.feelingOptional,
                myanmarUi && styles.bodyMy,
                { color: theme.mutedText },
              ]}
            >
              {t('onboarding.feelingOptional')}
            </Text>
            <MoodPicker
              theme={theme}
              selected={selectedMood}
              onSelect={handleMoodSelect}
              variant="onboarding"
              horizontalPadding={28}
            />
            {selectedMood && moodAckVisible ? (
              <ObCard theme={theme} style={styles.moodAckCard}>
                <Text
                  style={[
                    styles.moodAckLabel,
                    myanmarUi && styles.moodAckLabelMy,
                    { color: theme.secondaryText },
                  ]}
                >
                  {t('onboarding.emoLabel')}
                </Text>
                <Text
                  style={[
                    styles.moodAckText,
                    myanmarUi && styles.moodAckTextMy,
                    { color: theme.text },
                  ]}
                >
                  {moodAckVisible}
                </Text>
              </ObCard>
            ) : null}
            <LavenderButton
              label={t('common.continue')}
              onPress={() => (reviewMode ? goForward() : goTo(OB_READY_SLIDE))}
              theme={theme}
            />
            <Pressable
              onPress={() => {
                if (reviewMode) {
                  goForward();
                  return;
                }
                setSelectedMood(null);
                setMoodAckVisible('');
                goTo(OB_READY_SLIDE);
              }}
              hitSlop={8}
              style={styles.skipLinkWrap}
            >
              <Text style={[styles.skipLink, myanmarUi && styles.skipLinkMy, { color: theme.mutedText }]}>
                {t('onboarding.skipForNow')}
              </Text>
            </Pressable>
          </ScrollView>
        );

      case 7:
      default:
        return (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollPad, scrollPad]}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.headline,
                myanmarUi && styles.headlineMy,
                { color: theme.text, marginBottom: 10 },
              ]}
            >
              {t('onboarding.readyTitle')}
            </Text>
            <Text style={[styles.body, myanmarUi && styles.bodyMy, { color: theme.mutedText }]}>
              {t('onboarding.readyBody')}
            </Text>
            <Text
              style={[
                styles.quote,
                myanmarUi && styles.quoteMy,
                { color: theme.secondaryText, marginTop: 8 },
              ]}
            >
              {t('onboarding.readyReassurance')}
            </Text>
            <LavenderButton
              label={t('onboarding.start')}
              onPress={() => (reviewMode ? goForward() : enterSanctuary())}
              theme={theme}
            />
          </ScrollView>
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
              title={obSlideTitle(slide, t)}
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
                  // Age is required only before Tell Me About You.
                  if (!ageGatePassed && i >= OB_ABOUT_YOU_SLIDE) return;
                  if (!privacyAcked && i >= OB_ABOUT_YOU_SLIDE) return;
                  goTo(i);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                accessibilityRole="button"
                  accessibilityLabel={t('onboarding.stepA11y', {
                    current: OB_PROGRESS_SLIDES.indexOf(i) + 1,
                    total: OB_PROGRESS_SLIDES.length,
                  })}
              >
                <View
                  style={[
                    styles.dot,
                    slide === i && [styles.dotActive, { backgroundColor: theme.accent }],
                    OB_PROGRESS_SLIDES.indexOf(slide as 2 | 4 | 5) >
                      OB_PROGRESS_SLIDES.indexOf(i) && {
                      backgroundColor: theme.secondaryText,
                    },
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

      <Modal
        visible={pronounPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPronounPickerOpen(false)}
      >
        <Pressable style={styles.pronounOverlay} onPress={() => setPronounPickerOpen(false)}>
          <View
            style={[styles.pronounSheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.pronounSheetTitle, myanmarUi && styles.pronounSheetTitleMy, { color: theme.text }]}>
              {t('onboarding.pronouns')}
            </Text>
            {pronounOptions.map((opt) => {
              const selected =
                opt.id === 'custom'
                  ? pronounCustomMode
                  : !pronounCustomMode && pronouns === opt.label;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    void hapticLight();
                    if (opt.id === 'custom') {
                      setPronounCustomMode(true);
                      setPronouns('');
                    } else {
                      setPronounCustomMode(false);
                      setPronouns(opt.label);
                    }
                    setPronounPickerOpen(false);
                  }}
                  style={[
                    styles.pronounOption,
                    {
                      borderColor: selected ? theme.accent : theme.border,
                      backgroundColor: selected ? `${theme.accent}18` : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.pronounOptionText,
                      myanmarUi && styles.pronounOptionTextMy,
                      { color: selected ? theme.accent : theme.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? <Check size={16} color={theme.accent} strokeWidth={2.6} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
  privacyAckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
    marginTop: 8,
    minHeight: 44,
  },
  privacyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  privacyAckText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  langChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  langChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },

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
  eyebrowMy: { letterSpacing: 0, lineHeight: 22, paddingTop: 2, fontFamily: undefined },
  headlineMy: { letterSpacing: 0, lineHeight: 40, paddingTop: 4, fontFamily: undefined },
  bodyMy: { letterSpacing: 0, lineHeight: 26, paddingTop: 2, fontFamily: undefined },
  noticeTitleMy: { letterSpacing: 0, lineHeight: 28, paddingTop: 2, fontFamily: undefined },
  noticeBodyMy: { letterSpacing: 0, lineHeight: 26, paddingTop: 2, fontFamily: undefined },
  quoteMy: { letterSpacing: 0, lineHeight: 26, paddingTop: 2, fontFamily: undefined, fontStyle: 'normal' },
  fieldLabelMy: { letterSpacing: 0, lineHeight: 24, paddingTop: 2, fontFamily: undefined },
  pronounHelper: { fontSize: 13, lineHeight: 20, marginBottom: 8, marginTop: -4 },
  feelingOptional: { fontSize: 13, lineHeight: 20, marginBottom: 14, fontStyle: 'italic' },
  skipLinkMy: { letterSpacing: 0, lineHeight: 22, fontFamily: undefined },
  moodAckCard: { padding: 14, marginBottom: 16 },
  moodAckLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  moodAckLabelMy: {
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 13,
    lineHeight: 22,
    paddingTop: 2,
    fontFamily: undefined,
  },
  pronounCustomRow: {
    marginTop: 8,
  },
  langChipText: {
    fontWeight: '600',
    fontSize: 12,
  },
  langChipTextMy: {
    letterSpacing: 0,
    lineHeight: 20,
    paddingTop: 1,
    fontFamily: undefined,
  },
  moodAckText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  moodAckTextMy: {
    fontStyle: 'normal',
    fontSize: 14,
    lineHeight: 26,
    paddingTop: 3,
    paddingBottom: 2,
    fontFamily: undefined,
  },
  pronounDropdown: {
    justifyContent: 'space-between',
  },
  pronounDropdownTextMy: {
    lineHeight: 24,
    paddingTop: 2,
    fontFamily: undefined,
  },
  pronounOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 28, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  pronounSheet: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  pronounSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  pronounSheetTitleMy: {
    lineHeight: 28,
    paddingTop: 3,
    fontFamily: undefined,
  },
  pronounOption: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pronounOptionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  pronounOptionTextMy: {
    lineHeight: 26,
    paddingTop: 2,
    fontFamily: undefined,
  },
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
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
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
