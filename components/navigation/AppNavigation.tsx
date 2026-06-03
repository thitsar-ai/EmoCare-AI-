import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

/** Tab bar order follows FULL_APP_FLOW (subset). Voice/Breathe use nearest tab highlight. */
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
  if (screen === 'breathe') return 'journal';
  return screen;
}

/** Bottom tab bar height (excluding safe area). Keep in sync with App.tsx NavBar. */
export const TAB_BAR_HEIGHT = 60;

const SWIPE_EDGE_WIDTH = Platform.OS === 'ios' ? 36 : 28;
const SWIPE_DISTANCE_PX = 24;
const SWIPE_VELOCITY = 200;

/** Linear back / forward order — Welcome → Privacy → Mood → Home → … → Settings. */
export type FlowStep =
  | { kind: 'onboarding'; slide: 2 | 4 | 5 }
  | { kind: 'screen'; key: MainScreenKey };

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

function flowIndex(key: MainScreenKey): number {
  return APP_SCREEN_FLOW.indexOf(key);
}

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

export type OnboardingSlideKey = 'ob-welcome' | 'ob-privacy' | 'ob-checkin';

export type NavTarget =
  | { kind: 'screen'; key: MainScreenKey }
  | { kind: 'onboarding'; slide: 1 | 2 | 3 | 4 | 5 };

type HistoryEntry = MainScreenKey;

type AppNavContextValue = {
  screen: MainScreenKey;
  navigate: (key: MainScreenKey) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
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

  const applyFlowStep = useCallback(
    (index: number) => {
      const step = FULL_APP_FLOW[index];
      if (!step) return;
      setMenuOpen(false);
      if (step.kind === 'onboarding') {
        setOnboardingReviewSlide(step.slide);
      } else {
        setOnboardingReviewSlide(null);
        setScreen(step.key);
      }
    },
    [setScreen],
  );

  const currentFlowIndex = useCallback(
    () => findFlowIndex(onboardingReviewSlide, screen),
    [onboardingReviewSlide, screen],
  );

  const navigate = useCallback(
    (key: MainScreenKey) => {
      const idx = FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === key);
      if (idx >= 0) applyFlowStep(idx);
    },
    [applyFlowStep],
  );

  const goBack = useCallback(() => {
    const idx = currentFlowIndex();
    if (idx > 0) applyFlowStep(idx - 1);
  }, [applyFlowStep, currentFlowIndex]);

  const goForward = useCallback(() => {
    const idx = currentFlowIndex();
    if (idx < FULL_APP_FLOW.length - 1) applyFlowStep(idx + 1);
  }, [applyFlowStep, currentFlowIndex]);

  const flowIdx = onboardingSplashActive ? -1 : currentFlowIndex();
  const canGoBack = flowIdx > 0;
  const canGoForward = flowIdx >= 0 && flowIdx < FULL_APP_FLOW.length - 1;

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

  const value = useMemo(
    () => ({
      screen,
      navigate,
      goBack,
      goForward,
      canGoBack,
      canGoForward,
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
      goBack,
      goForward,
      canGoBack,
      canGoForward,
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
  {
    label: 'Today Dashboard',
    Icon: CalendarDays,
    accent: '#2A9D8F',
    target: { kind: 'screen', key: 'today' },
  },
  { label: 'Talk', Icon: MessageCircle, accent: '#9B7BFF', target: { kind: 'screen', key: 'talk' } },
  { label: 'Voice Talk', Icon: AudioLines, accent: '#7BC67E', target: { kind: 'screen', key: 'voice' } },
  { label: 'Journal', Icon: BookOpen, accent: '#D4A574', target: { kind: 'screen', key: 'journal' } },
  { label: 'Breathe', Icon: Wind, accent: '#6B7FD7', target: { kind: 'screen', key: 'breathe' } },
  { label: 'Oracle Search', Icon: Sparkles, accent: '#3DBDA8', target: { kind: 'screen', key: 'oracle' } },
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
  const insets = useSafeAreaInsets();
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
            </ScrollView>
            <View style={styles.menuDivider} />
            {renderMenuItem(SETTINGS_MENU_ITEM, true)}
            {renderMenuItem(
              { ...PROFILE_MENU_ITEM, onPress: onOpenProfile },
              false,
            )}
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
        <View style={styles.chromeCenter}>{centerContent}</View>
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
export function ScreenSwipeEdgeOverlay({ enabled = true }: { enabled?: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { screen, goBack, goForward, canGoBack, canGoForward } = useAppNav();
  const navRef = useRef({ goBack, goForward, canGoBack, canGoForward });
  navRef.current = { goBack, goForward, canGoBack, canGoForward };
  const showTabBar = TAB_BAR_SCREENS.includes(screen);
  const edgeHeight = height - (showTabBar ? insets.bottom + TAB_BAR_HEIGHT : insets.bottom);

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
          style={[styles.swipeEdge, { width: SWIPE_EDGE_WIDTH, height: edgeHeight }]}
          {...leftResponder.panHandlers}
        />
      ) : null}
      {canGoForward ? (
        <View
          style={[
            styles.swipeEdge,
            styles.swipeEdgeRight,
            { width: SWIPE_EDGE_WIDTH, height: edgeHeight, left: width - SWIPE_EDGE_WIDTH },
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
  },
  menuScroll: { flexGrow: 0, flexShrink: 1 },
  menuScrollContent: { flexGrow: 0 },
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
