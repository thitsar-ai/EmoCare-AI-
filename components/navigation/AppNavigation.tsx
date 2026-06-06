import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLayoutInsets } from '../../utils/safeAreaInsets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticLight } from '../../utils/haptics';
import {
  AudioLines,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  LayoutGrid,
  MessageCircle,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getCircadianIconColor } from '../../theme/circadianTheme';
import { pressNavChromeStyle } from '../../utils/pressFeedback';
import { DARK_MENU_SURFACE } from '../../theme/circadianTheme';

export type MainScreenKey =
  | 'home'
  | 'checkin'
  | 'talk'
  | 'voice'
  | 'breathe'
  | 'journal'
  | 'insights'
  | 'memoryledger'
  | 'settings'
  | 'oracle'
  | 'today';

/** Tab bar order (subset of main screens). Voice/Breathe use nearest tab highlight. */
export const TAB_BAR_TAB_ORDER: MainScreenKey[] = [
  'home',
  'checkin',
  'today',
  'talk',
  'journal',
];

/** Screens that show the bottom tab bar. */
export const TAB_BAR_SCREENS: MainScreenKey[] = [
  ...TAB_BAR_TAB_ORDER,
  'voice',
  'breathe',
];

export function tabBarHighlightKey(screen: MainScreenKey): MainScreenKey {
  if (screen === 'voice') return 'talk';
  // Breathe is not a tab root — avoid highlighting Journal when user is in Breathe.
  if (screen === 'breathe') return 'breathe';
  return screen;
}

/** Bottom tab bar height (excluding safe area). Keep in sync with App.tsx NavBar. */
export const TAB_BAR_HEIGHT = 72;

const SWIPE_EDGE_WIDTH = Platform.OS === 'ios' ? 36 : 28;
const SWIPE_DISTANCE_PX = 24;
const SWIPE_VELOCITY = 200;

/** Linear back / forward order — Welcome → Privacy → Mood → Home → … → Settings. */
export type FlowStep =
  | { kind: 'onboarding'; slide: 2 | 4 | 5 }
  | { kind: 'screen'; key: MainScreenKey };

/** Guided tour order for onboarding review + forward chevron (not used for back on main screens). */
export const FULL_APP_FLOW: FlowStep[] = [
  { kind: 'onboarding', slide: 2 },
  { kind: 'onboarding', slide: 4 },
  { kind: 'onboarding', slide: 5 },
  { kind: 'screen', key: 'home' },
  { kind: 'screen', key: 'checkin' },
  { kind: 'screen', key: 'today' },
  { kind: 'screen', key: 'talk' },
  { kind: 'screen', key: 'voice' },
  { kind: 'screen', key: 'journal' },
  { kind: 'screen', key: 'breathe' },
  { kind: 'screen', key: 'oracle' },
  { kind: 'screen', key: 'insights' },
  { kind: 'screen', key: 'memoryledger' },
  { kind: 'screen', key: 'settings' },
];

/** Main-app screens only (excludes onboarding). */
export const APP_SCREEN_FLOW: MainScreenKey[] = FULL_APP_FLOW.filter(
  (s): s is { kind: 'screen'; key: MainScreenKey } => s.kind === 'screen',
).map((s) => s.key);

export const WELCOME_ONBOARDING_SLIDE = 2 as const;
/** Onboarding content the user can step through with back / forward (excludes splash + age gate). */
export const OB_FIRST_CONTENT_SLIDE = 2 as const;
export const OB_LAST_CONTENT_SLIDE = 5 as const;
/** First-run only — after Welcome, before Privacy. */
export const OB_AGE_GATE_SLIDE = 3 as const;
export const OB_PRIVACY_SLIDE = 4 as const;

function findFlowIndex(onboardingSlide: number | null, screenKey: MainScreenKey): number {
  if (onboardingSlide != null) {
    const obIdx = FULL_APP_FLOW.findIndex(
      (s) => s.kind === 'onboarding' && s.slide === onboardingSlide,
    );
    if (obIdx >= 0) return obIdx;
  }
  const screenIdx = FULL_APP_FLOW.findIndex(
    (s) => s.kind === 'screen' && s.key === screenKey,
  );
  if (screenIdx >= 0) return screenIdx;
  return FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === 'home');
}

function getHomeFlowIndex(): number {
  return FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === 'home');
}

function getOnboardingStepBeforeHome(): number | null {
  const homeIdx = getHomeFlowIndex();
  if (homeIdx <= 0) return null;
  return homeIdx - 1;
}

function canEnterOnboardingFromHome(screenKey: MainScreenKey): boolean {
  return screenKey === 'home' && getOnboardingStepBeforeHome() != null;
}

function getNextScreenInFlow(current: MainScreenKey): MainScreenKey | null {
  const start = FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === current);
  if (start < 0) return null;
  for (let i = start + 1; i < FULL_APP_FLOW.length; i++) {
    const step = FULL_APP_FLOW[i];
    if (step.kind === 'screen') return step.key;
  }
  return null;
}

export type OnboardingSlideKey = 'ob-welcome' | 'ob-privacy' | 'ob-checkin';

export type NavTarget =
  | { kind: 'screen'; key: MainScreenKey }
  | { kind: 'onboarding'; slide: 1 | 2 | 3 | 4 | 5 };

type AppNavContextValue = {
  screen: MainScreenKey;
  navigate: (key: MainScreenKey) => void;
  /** Open Check In — pass true to load today's saved mood/note for editing. */
  navigateToCheckIn: (editToday?: boolean) => void;
  consumeCheckInPrefill: () => boolean;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  resetNavigation: (key?: MainScreenKey) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  onboardingReviewSlide: number | null;
  onboardingSplashActive: boolean;
  setOnboardingSplashActive: (active: boolean) => void;
  openOnboardingSlide: (slide: 1 | 2 | 3 | 4 | 5) => void;
  closeOnboardingReview: () => void;
  userName: string;
  setUserName: (name: string) => void;
  immersiveChromeHidden: boolean;
  setImmersiveChromeHidden: (hidden: boolean) => void;
};

const AppNavContext = createContext<AppNavContextValue | null>(null);

export function useAppNav(): AppNavContextValue {
  const ctx = useContext(AppNavContext);
  if (!ctx) throw new Error('useAppNav must be used within AppNavProvider');
  return ctx;
}

export function AppNavProvider({
  userName,
  setUserName,
  screen,
  setScreen,
  children,
}: {
  userName: string;
  setUserName: (name: string) => void;
  screen: MainScreenKey;
  setScreen: (key: MainScreenKey) => void;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [onboardingReviewSlide, setOnboardingReviewSlide] = useState<number | null>(null);
  const [onboardingSplashActive, setOnboardingSplashActive] = useState(false);
  const [immersiveChromeHidden, setImmersiveChromeHidden] = useState(false);
  const [navRevision, setNavRevision] = useState(0);
  const screenHistoryRef = useRef<MainScreenKey[]>([screen]);
  const forwardHistoryRef = useRef<MainScreenKey[]>([]);
  const checkInPrefillRef = useRef(false);

  const bumpNav = useCallback(() => setNavRevision((v) => v + 1), []);

  const consumeCheckInPrefill = useCallback(() => {
    const prefill = checkInPrefillRef.current;
    checkInPrefillRef.current = false;
    return prefill;
  }, []);

  const applyFlowStep = useCallback(
    (index: number) => {
      const step = FULL_APP_FLOW[index];
      if (!step) return;
      setMenuOpen(false);
      if (step.kind === 'onboarding') {
        setOnboardingReviewSlide(step.slide);
      } else {
        setOnboardingReviewSlide(null);
        screenHistoryRef.current = [step.key];
        forwardHistoryRef.current = [];
        setScreen(step.key);
        bumpNav();
      }
    },
    [bumpNav, setScreen],
  );

  const currentFlowIndex = useCallback(
    () => findFlowIndex(onboardingReviewSlide, screen),
    [onboardingReviewSlide, screen],
  );

  const resetNavigation = useCallback(
    (key: MainScreenKey = 'home') => {
      screenHistoryRef.current = [key];
      forwardHistoryRef.current = [];
      setOnboardingReviewSlide(null);
      setMenuOpen(false);
      setScreen(key);
      bumpNav();
    },
    [bumpNav, setScreen],
  );

  const navigate = useCallback(
    (key: MainScreenKey) => {
      setMenuOpen(false);
      setOnboardingReviewSlide(null);
      const history = screenHistoryRef.current;
      const current = history[history.length - 1] ?? screen;
      if (current === key) return;

      // Tab switch: jump to an existing tab root instead of stacking duplicates (e.g. home → journal → home).
      if (TAB_BAR_TAB_ORDER.includes(key)) {
        const existingIdx = history.lastIndexOf(key);
        if (existingIdx >= 0) {
          const popped = history.slice(existingIdx + 1);
          screenHistoryRef.current = history.slice(0, existingIdx + 1);
          if (popped.length > 0) {
            forwardHistoryRef.current = [...popped, ...forwardHistoryRef.current];
          }
          setScreen(key);
          bumpNav();
          return;
        }
      }

      screenHistoryRef.current = [...history, key];
      forwardHistoryRef.current = [];
      setScreen(key);
      bumpNav();
    },
    [bumpNav, screen, setScreen],
  );

  const navigateToCheckIn = useCallback(
    (editToday = false) => {
      checkInPrefillRef.current = editToday;
      navigate('checkin');
    },
    [navigate],
  );

  const goBack = useCallback(() => {
    if (onboardingReviewSlide != null) {
      const idx = currentFlowIndex();
      if (idx > 0) applyFlowStep(idx - 1);
      return;
    }
    const history = screenHistoryRef.current;
    if (history.length > 1) {
      const current = history[history.length - 1];
      const previous = history[history.length - 2];
      screenHistoryRef.current = history.slice(0, -1);
      forwardHistoryRef.current = [current, ...forwardHistoryRef.current];
      setScreen(previous);
      bumpNav();
      return;
    }
    const obStep = getOnboardingStepBeforeHome();
    if (screen === 'home' && obStep != null) {
      applyFlowStep(obStep);
    }
  }, [applyFlowStep, bumpNav, currentFlowIndex, onboardingReviewSlide, screen, setScreen]);

  const goForward = useCallback(() => {
    if (onboardingReviewSlide != null) {
      const idx = currentFlowIndex();
      if (idx < FULL_APP_FLOW.length - 1) applyFlowStep(idx + 1);
      return;
    }

    const forward = forwardHistoryRef.current;
    if (forward.length > 0) {
      const next = forward[0];
      forwardHistoryRef.current = forward.slice(1);
      screenHistoryRef.current = [...screenHistoryRef.current, next];
      setScreen(next);
      bumpNav();
      return;
    }

    const nextInFlow = getNextScreenInFlow(screen);
    if (!nextInFlow) return;
    screenHistoryRef.current = [...screenHistoryRef.current, nextInFlow];
    forwardHistoryRef.current = [];
    setScreen(nextInFlow);
    bumpNav();
  }, [applyFlowStep, bumpNav, currentFlowIndex, onboardingReviewSlide, screen, setScreen]);

  const flowIdx = onboardingSplashActive ? -1 : currentFlowIndex();
  const canGoBack =
    onboardingReviewSlide != null
      ? flowIdx > 0
      : screenHistoryRef.current.length > 1 || canEnterOnboardingFromHome(screen);
  const canGoForward =
    onboardingReviewSlide != null
      ? flowIdx >= 0 && flowIdx < FULL_APP_FLOW.length - 1
      : forwardHistoryRef.current.length > 0 || getNextScreenInFlow(screen) != null;

  const openOnboardingSlide = useCallback(
    (slide: 1 | 2 | 3 | 4 | 5) => {
      if (slide === 1) {
        setMenuOpen(false);
        setOnboardingReviewSlide(null);
        return;
      }
      if (slide === OB_AGE_GATE_SLIDE) {
        setMenuOpen(false);
        setOnboardingReviewSlide(null);
        return;
      }
      const idx = FULL_APP_FLOW.findIndex((s) => s.kind === 'onboarding' && s.slide === slide);
      if (idx >= 0) applyFlowStep(idx);
    },
    [applyFlowStep],
  );

  const closeOnboardingReview = useCallback(() => {
    setOnboardingReviewSlide(null);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      if (profileOpen) {
        setProfileOpen(false);
        return true;
      }
      if (canGoBack) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, goBack, menuOpen, profileOpen]);

  const value = useMemo(
    () => ({
      screen,
      navigate,
      navigateToCheckIn,
      consumeCheckInPrefill,
      goBack,
      goForward,
      canGoBack,
      canGoForward,
      resetNavigation,
      menuOpen,
      setMenuOpen,
      profileOpen,
      setProfileOpen,
      onboardingReviewSlide,
      onboardingSplashActive,
      setOnboardingSplashActive,
      openOnboardingSlide,
      closeOnboardingReview,
      userName,
      setUserName,
      immersiveChromeHidden,
      setImmersiveChromeHidden,
    }),
    [
      screen,
      navigate,
      navigateToCheckIn,
      consumeCheckInPrefill,
      goBack,
      goForward,
      canGoBack,
      canGoForward,
      resetNavigation,
      navRevision,
      menuOpen,
      profileOpen,
      onboardingReviewSlide,
      onboardingSplashActive,
      openOnboardingSlide,
      closeOnboardingReview,
      userName,
      setUserName,
      immersiveChromeHidden,
    ],
  );

  return <AppNavContext.Provider value={value}>{children}</AppNavContext.Provider>;
}

const MENU_SOLID = '#2A1848';

/** Main app destinations — Welcome through Memory (Settings below divider). */
export const MAIN_APP_MENU: {
  label: string;
  Icon: LucideIcon;
  accent: string;
  target: NavTarget;
}[] = [
  { label: 'Welcome', Icon: Sparkles, accent: '#E89B5C', target: { kind: 'onboarding', slide: 2 } },
  { label: 'Privacy', Icon: Shield, accent: '#7BC67E', target: { kind: 'onboarding', slide: 4 } },
  { label: 'Tell Me About You', Icon: Heart, accent: '#B79DFF', target: { kind: 'onboarding', slide: 5 } },
  { label: 'Home', Icon: Home, accent: '#B79DFF', target: { kind: 'screen', key: 'home' } },
  { label: 'Check In', Icon: Heart, accent: '#E89B5C', target: { kind: 'screen', key: 'checkin' } },
  { label: 'Today', Icon: CalendarDays, accent: '#2A9D8F', target: { kind: 'screen', key: 'today' } },
  { label: 'Talk', Icon: MessageCircle, accent: '#9B7BFF', target: { kind: 'screen', key: 'talk' } },
  { label: 'Voice Talk', Icon: AudioLines, accent: '#7BC67E', target: { kind: 'screen', key: 'voice' } },
  { label: 'Journal', Icon: BookOpen, accent: '#D4A574', target: { kind: 'screen', key: 'journal' } },
  { label: 'Breathe', Icon: Wind, accent: '#6B7FD7', target: { kind: 'screen', key: 'breathe' } },
  { label: 'Oracle', Icon: Sparkles, accent: '#3DBDA8', target: { kind: 'screen', key: 'oracle' } },
  { label: 'Insights', Icon: TrendingUp, accent: '#6B7FD7', target: { kind: 'screen', key: 'insights' } },
  { label: 'Memory Ledger', Icon: Brain, accent: '#C4A35A', target: { kind: 'screen', key: 'memoryledger' } },
];

const SETTINGS_MENU_ITEM = {
  label: 'Settings',
  Icon: Settings,
  accent: '#C4B7FF',
  target: { kind: 'screen' as const, key: 'settings' as MainScreenKey },
};

const PROFILE_MENU_ITEM = {
  label: 'Your name & profile',
  Icon: User,
  accent: '#B79DFF',
  isProfile: true as const,
};

export function AppMenuSheet({
  visible,
  theme,
  onClose,
  onSelect,
  onOpenProfile,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onSelect: (target: NavTarget) => void;
  onOpenProfile: () => void;
}) {
  const insets = useLayoutInsets();
  const { height: windowHeight } = useWindowDimensions();
  const menuTop = insets.top + 52;
  const menuMaxHeight = Math.min(windowHeight * 0.62, windowHeight - menuTop - insets.bottom - 20);

  const renderMenuItem = (
    item: {
      label: string;
      Icon: LucideIcon;
      accent: string;
      target?: NavTarget;
      onPress?: () => void;
    },
    bordered: boolean,
  ) => (
    <Pressable
      key={item.label}
      onPress={() => {
        onClose();
        if (item.onPress) item.onPress();
        else if (item.target) onSelect(item.target);
      }}
      style={({ pressed }) => [
        styles.menuItem,
        bordered && styles.menuItemBorder,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: `${item.accent}20`, borderColor: `${item.accent}44` }]}>
        <item.Icon size={16} color={item.accent} strokeWidth={2.2} />
      </View>
      <Text style={[styles.menuItemText, { color: DARK_MENU_SURFACE.text }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View
          pointerEvents="box-none"
          style={[styles.menuAnchor, { paddingTop: menuTop, paddingRight: 14 }]}
        >
          <Pressable
            style={[
              styles.menuSheet,
              { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border, maxHeight: menuMaxHeight },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.menuHeader}>
              <LayoutGrid size={16} color={theme.accent} strokeWidth={2.2} />
              <Text style={[styles.menuHeaderText, { color: DARK_MENU_SURFACE.text }]}>EmoCare</Text>
            </View>
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {MAIN_APP_MENU.map((item, idx) =>
                renderMenuItem(item, idx < MAIN_APP_MENU.length - 1),
              )}
              <View style={styles.menuDivider} />
              {renderMenuItem(SETTINGS_MENU_ITEM, true)}
              {renderMenuItem(
                { ...PROFILE_MENU_ITEM, onPress: onOpenProfile },
                false,
              )}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export function ProfileNameSheet({
  visible,
  theme,
  userName,
  onClose,
  onSave,
}: {
  visible: boolean;
  theme: CircadianTheme;
  userName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [draft, setDraft] = useState(userName);

  React.useEffect(() => {
    if (visible) setDraft(userName);
  }, [visible, userName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={styles.profileAnchor}>
          <Pressable
            style={[styles.profileSheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.profileTitle, { color: DARK_MENU_SURFACE.text }]}>What should Emo call you?</Text>
            <Text style={[styles.profileHint, { color: DARK_MENU_SURFACE.mutedText }]}>
              Saved on this device only. Emo remembers your name across Talk and Voice Talk.
            </Text>
            <TextInput
              style={[
                styles.profileInput,
                {
                  color: DARK_MENU_SURFACE.text,
                  borderColor: DARK_MENU_SURFACE.border,
                  backgroundColor: DARK_MENU_SURFACE.card,
                },
              ]}
              placeholder="Your name (optional)"
              placeholderTextColor={DARK_MENU_SURFACE.mutedText}
              value={draft}
              onChangeText={setDraft}
              maxLength={48}
              autoCapitalize="words"
            />
            <View style={styles.profileActions}>
              <Pressable onPress={onClose} style={styles.profileBtnGhost}>
                <Text style={{ color: DARK_MENU_SURFACE.mutedText, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onSave(draft.trim());
                  onClose();
                }}
                style={[styles.profileBtnSave, { backgroundColor: theme.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const NAV_BTN_SIZE = 36;
const NAV_BTN_GAP = 6;

type NavChromeBtnProps = {
  theme: CircadianTheme;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
};

export function NavChromeBtn({ theme, onPress, disabled, accessibilityLabel, children }: NavChromeBtnProps) {
  const btnStyle = { backgroundColor: theme.card, borderColor: theme.border };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.chromeBtn,
        btnStyle,
        disabled && styles.chromeBtnDisabled,
        !disabled && pressNavChromeStyle(theme, pressed),
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

/** Right-side toolbar: optional screen actions → forward → app menu. Single horizontal row. */
function NavActionToolbar({
  theme,
  showForward = true,
  showMenu = true,
  canGoForward,
  onForward,
  onMenu,
  beforeNav,
}: {
  theme: CircadianTheme;
  showForward?: boolean;
  showMenu?: boolean;
  canGoForward?: boolean;
  onForward?: () => void;
  onMenu?: () => void;
  beforeNav?: React.ReactNode;
}) {
  const { goForward, canGoForward: flowCanForward, setMenuOpen } = useAppNav();
  const forwardEnabled = canGoForward ?? flowCanForward;
  const handleForward = onForward ?? goForward;
  const handleMenu = onMenu ?? (() => setMenuOpen(true));

  return (
    <View style={styles.navToolbar}>
      {beforeNav}
      {showForward ? (
        <NavChromeBtn
          theme={theme}
          onPress={handleForward}
          disabled={!forwardEnabled}
          accessibilityLabel="Go forward"
        >
          <ChevronRight
            size={19}
            color={forwardEnabled ? theme.text : getCircadianIconColor(theme, 'muted')}
            strokeWidth={2.4}
          />
        </NavChromeBtn>
      ) : null}
      {showMenu ? (
        <NavChromeBtn theme={theme} onPress={handleMenu} accessibilityLabel="Open app menu">
          <LayoutGrid size={17} color={theme.text} strokeWidth={2.2} />
        </NavChromeBtn>
      ) : null}
    </View>
  );
}

export function ScreenNavChrome({
  theme,
  title,
  titleFontSize = 14,
  titleColor,
  showBack = true,
  showForward = true,
  showMenu = true,
  onBack,
  onForward,
  onMenu,
  canGoBack: canGoBackOverride,
  canGoForward: canGoForwardOverride,
  centerContent,
  centerAlign = 'center',
  /** Screen-specific actions placed before forward + app menu (e.g. bell, chat options). */
  actionsBeforeNav,
  /** @deprecated Use actionsBeforeNav */
  extraRight,
  /** @deprecated Use actionsBeforeNav */
  extraTop,
  compact = false,
}: {
  theme: CircadianTheme;
  title?: string;
  titleFontSize?: number;
  titleColor?: string;
  showBack?: boolean;
  showForward?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onMenu?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  centerContent?: React.ReactNode;
  centerAlign?: 'center' | 'start';
  actionsBeforeNav?: React.ReactNode;
  extraRight?: React.ReactNode;
  extraTop?: React.ReactNode;
  compact?: boolean;
}) {
  const { goBack, goForward, canGoBack, canGoForward, setMenuOpen } = useAppNav();
  const backEnabled = canGoBackOverride ?? canGoBack;
  const forwardEnabled = canGoForwardOverride ?? canGoForward;
  const handleBack = onBack ?? goBack;
  const handleForward = onForward ?? goForward;
  const handleMenu = onMenu ?? (() => setMenuOpen(true));
  const hasCenter = Boolean(centerContent || title);
  const actionsOnly = !showBack && !hasCenter;
  const leadingActions = actionsBeforeNav ?? extraRight ?? extraTop;

  return (
    <View style={[styles.chromeRow, compact && styles.chromeRowCompact, actionsOnly && styles.chromeRowEnd]}>
      <View style={styles.chromeLeft}>
        {showBack ? (
          <NavChromeBtn
            theme={theme}
            onPress={handleBack}
            disabled={!backEnabled}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={19} color={backEnabled ? theme.text : getCircadianIconColor(theme, 'muted')} strokeWidth={2.4} />
          </NavChromeBtn>
        ) : (
          <View style={styles.chromeSideSpacer} />
        )}
      </View>

      {centerContent ? (
        <View style={[styles.chromeCenter, centerAlign === 'start' && styles.chromeCenterStart]}>
          {centerContent}
        </View>
      ) : title ? (
        <Text
          style={[styles.chromeTitle, { color: titleColor ?? theme.text, fontSize: titleFontSize }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.chromeTitleSpacer} />
      )}

      <View style={styles.chromeRight}>
        <NavActionToolbar
          theme={theme}
          showForward={showForward}
          showMenu={showMenu}
          canGoForward={forwardEnabled}
          onForward={handleForward}
          onMenu={handleMenu}
          beforeNav={leadingActions}
        />
      </View>
    </View>
  );
}

function useEdgeSwipeResponder(
  direction: 'back' | 'forward',
  active: boolean,
  onTrigger: () => void,
) {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (!active) return false;
          if (Math.abs(g.dy) > 24 && Math.abs(g.dy) > Math.abs(g.dx)) return false;
          if (direction === 'back') return g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
          return g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onMoveShouldSetPanResponderCapture: (_, g) => {
          if (!active) return false;
          if (Math.abs(g.dy) > 24 && Math.abs(g.dy) > Math.abs(g.dx)) return false;
          if (direction === 'back') return g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
          return g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onPanResponderRelease: (_, g) => {
          if (direction === 'back') {
            if (g.dx > SWIPE_DISTANCE_PX || g.vx > SWIPE_VELOCITY / 1000) onTriggerRef.current();
          } else if (g.dx < -SWIPE_DISTANCE_PX || g.vx < -SWIPE_VELOCITY / 1000) {
            onTriggerRef.current();
          }
        },
      }),
    [active, direction],
  );
}

/**
 * Full-height left/right edge zones for back/forward swipes (Expo Go compatible).
 */
/** Space below status bar reserved for nav chrome — keeps edge swipes off header buttons. */
const SWIPE_CHROME_CLEARANCE = 80;

export function ScreenSwipeEdgeOverlay({ enabled = true }: { enabled?: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useLayoutInsets();
  const { screen, goBack, goForward, canGoBack, canGoForward } = useAppNav();
  const navRef = useRef({ goBack, goForward, canGoBack, canGoForward });
  navRef.current = { goBack, goForward, canGoBack, canGoForward };
  const showTabBar = TAB_BAR_SCREENS.includes(screen);
  const topOffset = insets.top + SWIPE_CHROME_CLEARANCE;
  const edgeHeight =
    height - topOffset - (showTabBar ? insets.bottom + TAB_BAR_HEIGHT : insets.bottom);

  const triggerBack = useCallback(() => {
    if (!navRef.current.canGoBack) return;
    void hapticLight();
    navRef.current.goBack();
  }, []);

  const triggerForward = useCallback(() => {
    if (!navRef.current.canGoForward) return;
    void hapticLight();
    navRef.current.goForward();
  }, []);

  const leftResponder = useEdgeSwipeResponder('back', enabled && canGoBack, triggerBack);
  const rightResponder = useEdgeSwipeResponder('forward', enabled && canGoForward, triggerForward);

  if (!enabled) return null;

  return (
    <View style={styles.swipeEdgeHost} pointerEvents="box-none">
      {canGoBack ? (
        <View
          style={[styles.swipeEdge, { width: SWIPE_EDGE_WIDTH, height: edgeHeight, top: topOffset }]}
          {...leftResponder.panHandlers}
        />
      ) : null}
      {canGoForward ? (
        <View
          style={[
            styles.swipeEdge,
            styles.swipeEdgeRight,
            {
              width: SWIPE_EDGE_WIDTH,
              height: edgeHeight,
              top: topOffset,
              left: width - SWIPE_EDGE_WIDTH,
            },
          ]}
          {...rightResponder.panHandlers}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuAnchor: { width: '100%', alignItems: 'flex-end' },
  menuSheet: {
    width: 272,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    flexDirection: 'column',
  },
  menuScroll: { flexGrow: 0, flexShrink: 1 },
  menuScrollContent: { flexGrow: 0, paddingBottom: 4 },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  menuHeaderText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  menuItemPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  menuItemText: { fontSize: 15, fontWeight: '500', flex: 1 },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 18,
    marginVertical: 4,
  },
  profileAnchor: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  profileSheet: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 10 },
  profileTitle: { fontSize: 18, fontWeight: '700' },
  profileHint: { fontSize: 12, lineHeight: 18 },
  profileInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 4,
  },
  profileActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  profileBtnGhost: { paddingVertical: 10, paddingHorizontal: 14 },
  profileBtnSave: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: NAV_BTN_SIZE + 12,
    gap: 4,
  },
  chromeRowCompact: {
    paddingVertical: 4,
    minHeight: NAV_BTN_SIZE + 8,
  },
  chromeRowEnd: { justifyContent: 'flex-end' },
  chromeLeft: {
    width: NAV_BTN_SIZE,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  chromeSideSpacer: { width: NAV_BTN_SIZE, height: NAV_BTN_SIZE },
  chromeBtn: {
    width: NAV_BTN_SIZE,
    height: NAV_BTN_SIZE,
    borderRadius: NAV_BTN_SIZE / 2,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  chromeBtnDisabled: { opacity: 0.58 },
  chromeTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  chromeTitleSpacer: { flex: 1 },
  chromeCenter: { flex: 1, minWidth: 0, justifyContent: 'center' },
  chromeCenterStart: { alignItems: 'flex-start', justifyContent: 'center' },
  chromeRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  navToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: NAV_BTN_GAP,
  },
  swipeEdgeHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  swipeEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'transparent',
  },
  swipeEdgeRight: {},
});
