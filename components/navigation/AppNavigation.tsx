import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AudioLines,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  LayoutGrid,
  MessageCircle,
  Shield,
  Sparkles,
  User,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE } from '../../theme/circadianTheme';

export type MainScreenKey =
  | 'home'
  | 'checkin'
  | 'talk'
  | 'voice'
  | 'breathe'
  | 'journal';

export type OnboardingSlideKey = 'ob-welcome' | 'ob-privacy' | 'ob-checkin';

export type NavTarget =
  | { kind: 'screen'; key: MainScreenKey }
  | { kind: 'onboarding'; slide: 1 | 2 | 3 | 4 };

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
  openOnboardingSlide: (slide: 1 | 2 | 3 | 4) => void;
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
  const [navState, setNavState] = useState({ history: ['home'] as HistoryEntry[], index: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [onboardingReviewSlide, setOnboardingReviewSlide] = useState<number | null>(null);
  const [immersiveChromeHidden, setImmersiveChromeHidden] = useState(false);

  const navigate = useCallback(
    (key: MainScreenKey) => {
      setScreen(key);
      setNavState((prev) => {
        const base = prev.history.slice(0, prev.index + 1);
        if (base[base.length - 1] === key) return prev;
        const history = [...base, key];
        return { history, index: history.length - 1 };
      });
    },
    [setScreen],
  );

  const goBack = useCallback(() => {
    setNavState((prev) => {
      if (prev.index <= 0) return prev;
      const nextIndex = prev.index - 1;
      setScreen(prev.history[nextIndex]);
      return { ...prev, index: nextIndex };
    });
  }, [setScreen]);

  const goForward = useCallback(() => {
    setNavState((prev) => {
      if (prev.index >= prev.history.length - 1) return prev;
      const nextIndex = prev.index + 1;
      setScreen(prev.history[nextIndex]);
      return { ...prev, index: nextIndex };
    });
  }, [setScreen]);

  const openOnboardingSlide = useCallback((slide: 1 | 2 | 3 | 4) => {
    setMenuOpen(false);
    setOnboardingReviewSlide(slide);
  }, []);

  const closeOnboardingReview = useCallback(() => {
    setOnboardingReviewSlide(null);
  }, []);

  const value = useMemo(
    () => ({
      screen,
      navigate,
      goBack,
      goForward,
      canGoBack: navState.index > 0,
      canGoForward: navState.index < navState.history.length - 1,
      menuOpen,
      setMenuOpen,
      profileOpen,
      setProfileOpen,
      onboardingReviewSlide,
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
      navState.index,
      navState.history.length,
      menuOpen,
      profileOpen,
      onboardingReviewSlide,
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

const MENU_ITEMS: {
  label: string;
  Icon: LucideIcon;
  target: NavTarget;
}[] = [
  { label: 'Welcome', Icon: Sparkles, target: { kind: 'onboarding', slide: 2 } },
  { label: 'Privacy', Icon: Shield, target: { kind: 'onboarding', slide: 3 } },
  { label: 'Check-in (onboarding)', Icon: Heart, target: { kind: 'onboarding', slide: 4 } },
  { label: 'Home', Icon: Home, target: { kind: 'screen', key: 'home' } },
  { label: 'Check In', Icon: Heart, target: { kind: 'screen', key: 'checkin' } },
  { label: 'Talk', Icon: MessageCircle, target: { kind: 'screen', key: 'talk' } },
  { label: 'Voice Talk', Icon: AudioLines, target: { kind: 'screen', key: 'voice' } },
  { label: 'Breathe', Icon: Wind, target: { kind: 'screen', key: 'breathe' } },
  { label: 'Journal', Icon: BookOpen, target: { kind: 'screen', key: 'journal' } },
  { label: 'Memory Ledger', Icon: Shield, target: { kind: 'screen', key: 'home' } },
  { label: 'Your name & profile', Icon: User, target: { kind: 'screen', key: 'home' } },
];

export function AppMenuSheet({
  visible,
  theme,
  onClose,
  onSelect,
  onOpenProfile,
  onOpenMemoryLedger,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onSelect: (target: NavTarget) => void;
  onOpenProfile: () => void;
  onOpenMemoryLedger?: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={styles.menuAnchor}>
          <View style={[styles.menuSheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}>
            <View style={styles.menuHeader}>
              <LayoutGrid size={16} color={theme.accent} strokeWidth={2.2} />
              <Text style={[styles.menuHeaderText, { color: DARK_MENU_SURFACE.text }]}>Go anywhere</Text>
            </View>
            {MENU_ITEMS.map((item, idx) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  if (item.label === 'Your name & profile') {
                    onOpenProfile();
                    return;
                  }
                  if (item.label === 'Memory Ledger') {
                    onOpenMemoryLedger?.();
                    return;
                  }
                  onSelect(item.target);
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  idx < MENU_ITEMS.length - 1 && styles.menuItemBorder,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <item.Icon size={17} color={DARK_MENU_SURFACE.secondaryText} strokeWidth={2.2} />
                <Text style={[styles.menuItemText, { color: DARK_MENU_SURFACE.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
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

export function ScreenNavChrome({
  theme,
  title,
  showBack = true,
  showForward = true,
  onMenu,
  extraRight,
  compact = false,
}: {
  theme: CircadianTheme;
  title?: string;
  showBack?: boolean;
  showForward?: boolean;
  onMenu?: () => void;
  extraRight?: React.ReactNode;
  compact?: boolean;
}) {
  const { goBack, goForward, canGoBack, canGoForward, setMenuOpen } = useAppNav();
  const btnStyle = { backgroundColor: theme.card, borderColor: theme.border };
  const actionsOnly = !showBack && !title;

  return (
    <View style={[styles.chromeRow, compact && styles.chromeRowCompact, actionsOnly && styles.chromeRowEnd]}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          disabled={!canGoBack}
          style={({ pressed }) => [
            styles.chromeBtn,
            btnStyle,
            !canGoBack && styles.chromeBtnDisabled,
            pressed && canGoBack && styles.chromeBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={20} color={canGoBack ? theme.text : theme.mutedText} strokeWidth={2.5} />
        </Pressable>
      ) : title ? (
        <View style={styles.chromeBtnPlaceholder} />
      ) : null}

      {title ? (
        <Text style={[styles.chromeTitle, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : !actionsOnly ? (
        <View style={styles.chromeTitleSpacer} />
      ) : null}

      <View style={styles.chromeRight}>
        {showForward ? (
          <Pressable
            onPress={goForward}
            disabled={!canGoForward}
            style={({ pressed }) => [
              styles.chromeBtn,
              btnStyle,
              !canGoForward && styles.chromeBtnDisabled,
              pressed && canGoForward && styles.chromeBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go forward"
          >
            <ChevronRight size={20} color={canGoForward ? theme.text : theme.mutedText} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        {extraRight}
        <Pressable
          onPress={onMenu ?? (() => setMenuOpen(true))}
          style={({ pressed }) => [styles.chromeBtn, btnStyle, pressed && styles.chromeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <LayoutGrid size={18} color={theme.text} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

/** Horizontal swipe to go back / forward (main app screens). */
export function useScreenSwipeNav(enabled = true) {
  const { goBack, goForward, canGoBack, canGoForward } = useAppNav();
  const navRef = useRef({ goBack, goForward, canGoBack, canGoForward });
  navRef.current = { goBack, goForward, canGoBack, canGoForward };

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          enabled && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderRelease: (_, g) => {
          if (!enabled) return;
          if (g.dx > 56 && navRef.current.canGoBack) navRef.current.goBack();
          else if (g.dx < -56 && navRef.current.canGoForward) navRef.current.goForward();
        },
      }),
    [enabled],
  );
}

const styles = StyleSheet.create({
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  menuAnchor: { alignItems: 'flex-end', paddingTop: 56, paddingRight: 14 },
  menuSheet: {
    minWidth: 260,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chromeRowCompact: {
    paddingBottom: 2,
  },
  chromeRowEnd: { justifyContent: 'flex-end' },
  chromeBtnPlaceholder: { width: 38, height: 38 },
  chromeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeBtnDisabled: { opacity: 0.45 },
  chromeBtnPressed: { opacity: 0.82 },
  chromeTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  chromeTitleSpacer: { flex: 1 },
  chromeRight: { flexDirection: 'row', gap: 6 },
});
