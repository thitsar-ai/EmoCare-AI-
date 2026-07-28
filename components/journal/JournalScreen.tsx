import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import {
  ScreenNavChrome,
  TAB_BAR_HEIGHT,
  useAppNav,
  type MainScreenKey,
} from '../navigation/AppNavigation';
import { useCircadianTheme, getCircadianIconColor } from '../../theme/circadianTheme';
import { CircadianGlassCard, CircadianHeroGlow, SERIF } from '../shared/CircadianHeroGlow';
import {
  getSanctuaryButtonGradient,
  getSanctuaryLabelAccent,
} from '../../theme/sanctuaryBrand';
import {
  primaryButtonInner,
  primaryButtonLabel,
  primaryButtonShell,
} from '../../theme/primaryButton';
import { tokens } from '../../theme/tokens';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { pressPrimaryStyle, primaryRestingShadow } from '../../utils/pressFeedback';
import { getTodayCheckIn } from '../../utils/sanctuaryHome';
import {
  buildJourneyLine,
  JOURNAL_BG,
  JOURNAL_EDITOR_SURFACE,
  loadJournalEntries,
  pickDailyJournalPrompt,
  PENDING_JOURNAL_CONTEXT_KEY,
  saveJournalEntries,
} from '../../utils/journalStorage';
import { moodCheckInCardShadow, selectableCardStyle } from '../../theme/glassSurfaces';
import { JournalSaveOverlay } from './JournalSaveOverlay';

const H_PAD = 22;
const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';

const EDITOR_PLACEHOLDER =
  'Begin wherever feels easiest.\n\nA thought.\nA feeling.\nA moment.\n\nThere is no right way to begin.';

export type JournalEntry = {
  id: number;
  date: string;
  text: string;
  mood: { emoji: string; label: string };
};

function moodEmoji(entry: JournalEntry) {
  return entry.mood?.emoji || '💜';
}

export function JournalScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { setImmersiveChromeHidden } = useAppNav();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const savingRef = useRef(false);
  const labelAccent = getSanctuaryLabelAccent(theme);

  const [text, setText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [todayMood, setTodayMood] = useState<{ emoji: string; label: string } | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const dailyPrompt = useMemo(() => pickDailyJournalPrompt(), []);
  const recentEntries = useMemo(() => entries.slice(0, 3), [entries]);
  const journeyLine = useMemo(() => buildJourneyLine(entries), [entries]);
  const canSave = text.trim().length > 0;

  /**
   * When the keyboard is open, size the editor to the remaining space above it.
   * A fixed % of windowHeight was taller than the visible area on iPad, so typed
   * lines disappeared under the keyboard.
   */
  const editorHeight = useMemo(() => {
    if (!keyboardOpen) {
      return Math.max(200, Math.round(windowHeight * 0.28));
    }
    const navChrome = insets.top + 56;
    const promptBlock = 78;
    const saveFooter = 68;
    const gaps = 36;
    const reserved = navChrome + promptBlock + saveFooter + gaps + keyboardHeight;
    return Math.max(140, windowHeight - reserved);
  }, [keyboardOpen, keyboardHeight, windowHeight, insets.top]);

  const bottomPad = keyboardOpen
    ? 16
    : TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 16;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      setImmersiveChromeHidden(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
      setImmersiveChromeHidden(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      setImmersiveChromeHidden(false);
    };
  }, [setImmersiveChromeHidden]);

  const refreshEntries = useCallback(async () => {
    const loaded = await loadJournalEntries();
    setEntries(loaded as JournalEntry[]);
  }, []);

  useEffect(() => {
    void refreshEntries();
  }, [refreshEntries]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshEntries();
    });
    return () => sub.remove();
  }, [refreshEntries]);

  useEffect(() => {
    AsyncStorage.getItem('checkIns').then((raw) => {
      if (!raw) return;
      try {
        const checkIns = JSON.parse(raw);
        const today = getTodayCheckIn(checkIns);
        if (today?.mood?.label) {
          setTodayMood({ emoji: today.mood.emoji || '💜', label: today.mood.label });
        }
      } catch {}
    });
  }, []);

  const askEmoAboutEntry = async (entry: JournalEntry) => {
    try {
      await AsyncStorage.setItem(
        PENDING_JOURNAL_CONTEXT_KEY,
        JSON.stringify({ text: entry.text, mood: entry.mood }),
      );
    } catch {}
    onNav('talk');
  };

  const reflectWithEmo = async () => {
    void hapticLight();
    const draft = text.trim();
    const prompt = draft
      ? `I'm journaling and could use help finding the words. Here's what I have so far:\n\n"${draft}"\n\nCan you guide me gently?`
      : `I'd like help finding the words for my journal today. The reflection prompt is: "${dailyPrompt}"\n\nCan you guide me gently?`;
    try {
      await AsyncStorage.setItem(PENDING_TALK_QUERY_KEY, prompt);
    } catch {}
    onNav('talk');
  };

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed || savingRef.current) return;
    savingRef.current = true;
    void hapticMedium();
    Keyboard.dismiss();
    try {
      const mood = todayMood || { emoji: '💜', label: 'Reflective' };
      const entry: JournalEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        text: trimmed,
        mood,
      };
      const updated = [entry, ...entries];
      setEntries(updated);
      await saveJournalEntries(updated);
      setText('');
      setShowSaved(true);
    } finally {
      savingRef.current = false;
    }
  };

  /** Always responds — empty draft focuses the editor instead of feeling frozen. */
  const onSavePress = () => {
    if (!canSave) {
      void hapticLight();
      inputRef.current?.focus();
      return;
    }
    void save();
  };

  const deleteEntry = async (id: number) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await saveJournalEntries(updated);
  };

  useEffect(() => {
    if (viewingId === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setViewingId(null);
      return true;
    });
    return () => sub.remove();
  }, [viewingId]);

  const viewingEntry = viewingId != null ? entries.find((e) => e.id === viewingId) : null;

  if (viewingEntry) {
    const e = viewingEntry;
    return (
      <View style={[styles.flex, { backgroundColor: JOURNAL_BG }]}>
        <CircadianHeroGlow theme={theme} />
        <ScreenSafeArea extraTop={4}>
          <View style={[styles.detailHeader, { borderBottomColor: tokens.border.standard }]}>
            <TouchableOpacity onPress={() => setViewingId(null)} style={styles.backBtn}>
              <Text style={[styles.backGlyph, { color: theme.accent }]}>←</Text>
            </TouchableOpacity>
            <View style={styles.flex}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>
                {new Date(e.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Text style={[styles.detailMood, { color: theme.secondaryText }]}>
                {moodEmoji(e)} {e.mood?.label ?? 'Reflective'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Delete this reflection?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      void deleteEntry(e.id);
                      setViewingId(null);
                    },
                  },
                ]);
              }}
              style={styles.deleteBtn}
            >
              <Text style={[styles.deleteText, { color: theme.isDark ? '#F472B6' : '#D46BA8' }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{
              padding: H_PAD,
              paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24,
            }}
          >
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.readCard}>
              <Text style={[styles.journalReadText, { color: theme.text }]}>{e.text}</Text>
            </CircadianGlassCard>
            <Pressable
              onPress={() => void askEmoAboutEntry(e)}
              style={({ pressed }) => [
                primaryButtonShell,
                styles.askEmoBtn,
                primaryRestingShadow(theme),
                pressPrimaryStyle(theme, pressed),
              ]}
            >
              <LinearGradient
                colors={getSanctuaryButtonGradient(theme.phase)}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[primaryButtonInner, styles.askEmoGradient]}
              >
                <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={primaryButtonLabel}>Reflect with Emo</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </ScreenSafeArea>
      </View>
    );
  }

  const saveButton = (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSavePress}
      accessibilityRole="button"
      accessibilityLabel={canSave ? 'Save reflection' : 'Write first, then save'}
      style={[styles.saveTouch, primaryRestingShadow(theme)]}
    >
      <LinearGradient
        colors={
          canSave ? getSanctuaryButtonGradient(theme.phase) : ['#C4B7E8', '#B5A6DE']
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.saveInner}
      >
        <Text style={styles.saveLabel}>Save Reflection →</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.flex, { backgroundColor: JOURNAL_BG }]}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4} edges={['top', 'left', 'right']}>
        <View style={styles.flex}>
          <View style={styles.chromeWrap}>
            <ScreenNavChrome theme={theme} title="Your Journal" />
          </View>

          {!keyboardOpen ? (
            <View style={styles.headerBlock}>
              <Text style={[styles.headerSubtitle, { color: theme.mutedText }]}>
                A private space for reflection, growth, and self-discovery.
              </Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPad },
              keyboardOpen && styles.scrollContentTyping,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
          >
            <CircadianGlassCard
              theme={theme}
              variant="todayInsights"
              style={keyboardOpen ? styles.heroCardCompact : styles.heroCard}
            >
              <Text style={[styles.heroEyebrow, { color: tokens.text.secondary }]}>
                ✨ Today's Reflection
              </Text>
              <Text
                style={[
                  keyboardOpen ? styles.heroPromptCompact : styles.heroPrompt,
                  { color: theme.text },
                ]}
                numberOfLines={keyboardOpen ? 2 : undefined}
              >
                {dailyPrompt}
              </Text>
            </CircadianGlassCard>

            <View
              style={[
                styles.editorShell,
                {
                  borderColor: tokens.border.standard,
                  backgroundColor: JOURNAL_EDITOR_SURFACE,
                  height: keyboardOpen ? editorHeight : undefined,
                  minHeight: editorHeight,
                  maxHeight: keyboardOpen ? editorHeight : undefined,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.journalInput,
                  {
                    color: theme.text,
                    height: keyboardOpen ? editorHeight - 28 : undefined,
                    minHeight: editorHeight - 28,
                    maxHeight: keyboardOpen ? editorHeight - 28 : undefined,
                  },
                ]}
                multiline
                placeholder={EDITOR_PLACEHOLDER}
                placeholderTextColor={theme.mutedText}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
                blurOnSubmit={false}
                scrollEnabled
              />
            </View>

            {!keyboardOpen ? (
              <>
                {saveButton}
                {!canSave ? (
                  <Text style={[styles.saveHint, { color: theme.mutedText }]}>
                    Tap here after writing — or tap to start typing.
                  </Text>
                ) : null}

                <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.reflectCard}>
                  <Text style={[styles.reflectEyebrow, { color: labelAccent }]}>
                    💜 Need help finding the words?
                  </Text>
                  <Pressable
                    onPress={() => void reflectWithEmo()}
                    style={({ pressed }) => [
                      styles.reflectBtn,
                      { borderColor: tokens.border.strong },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <MessageCircle size={16} color={theme.accent} strokeWidth={2.2} />
                    <Text style={[styles.reflectBtnText, { color: theme.text }]}>Reflect with Emo</Text>
                  </Pressable>
                </CircadianGlassCard>

                <Text style={[styles.sectionEyebrow, { color: theme.mutedText }]}>
                  Recent Reflections
                </Text>
                {recentEntries.length === 0 ? (
                  <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.emptyCard}>
                    <Text style={[styles.emptyCopy, { color: theme.mutedText }]}>
                      Your recent reflections will appear here — one honest moment at a time.
                    </Text>
                  </CircadianGlassCard>
                ) : (
                  recentEntries.map((entry) => {
                    const shortDate = new Date(entry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    const preview =
                      entry.text.length > 64
                        ? `${entry.text.slice(0, 64).trim()}…`
                        : entry.text.trim();
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => {
                          void hapticLight();
                          setViewingId(entry.id);
                        }}
                        style={({ pressed }) => [
                          styles.recentCard,
                          selectableCardStyle(pressed),
                          moodCheckInCardShadow(pressed),
                          pressed && styles.recentCardPressed,
                        ]}
                      >
                        <View style={styles.recentTop}>
                          <Text style={[styles.recentMood, { color: theme.text }]}>
                            {moodEmoji(entry)} {entry.mood?.label ?? 'Reflective'}
                          </Text>
                          <Text style={[styles.recentDate, { color: theme.mutedText }]}>
                            {shortDate}
                          </Text>
                        </View>
                        <Text
                          style={[styles.recentPreview, { color: theme.secondaryText }]}
                          numberOfLines={2}
                        >
                          {preview}
                        </Text>
                      </Pressable>
                    );
                  })
                )}

                <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.journeyCard}>
                  <Text style={[styles.journeyTitle, { color: theme.text }]}>Your Journey</Text>
                  <Text style={[styles.journeyLine, { color: theme.secondaryText }]}>
                    {journeyLine}
                  </Text>
                </CircadianGlassCard>

                <View style={styles.privacyRow}>
                  <Lock size={14} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2.2} />
                  <Text style={[styles.privacyText, { color: theme.mutedText }]}>
                    Stored privately on this device only.
                  </Text>
                </View>
              </>
            ) : null}
          </ScrollView>

          {/* Pin save above the keyboard — marginBottom tracks keyboard height (reliable on iPad). */}
          {keyboardOpen ? (
            <View
              style={[
                styles.saveFooter,
                {
                  paddingBottom: Math.max(insets.bottom, 8),
                  marginBottom: keyboardHeight,
                  backgroundColor: JOURNAL_BG,
                },
              ]}
            >
              {saveButton}
            </View>
          ) : null}
        </View>
      </ScreenSafeArea>

      <JournalSaveOverlay
        visible={showSaved}
        theme={theme}
        onContinueWriting={() => setShowSaved(false)}
        onReturnHome={() => {
          setShowSaved(false);
          onNav('home');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  headerBlock: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    gap: 14,
  },
  scrollContentTyping: {
    flexGrow: 1,
  },
  saveFooter: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120, 100, 160, 0.18)',
  },
  heroCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  heroCardCompact: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroPrompt: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 32,
  },
  heroPromptCompact: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 22,
  },
  editorShell: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  journalInput: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: SERIF,
    width: '100%',
  },
  saveTouch: {
    borderRadius: 28,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  saveInner: {
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveHint: {
    marginTop: -4,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  reflectCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  reflectEyebrow: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reflectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  reflectBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: -4,
    paddingHorizontal: 4,
  },
  emptyCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  recentCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  recentCardPressed: {
    opacity: 0.96,
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentMood: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentDate: {
    fontSize: 12,
  },
  recentPreview: {
    fontFamily: SERIF,
    fontSize: 14,
    lineHeight: 22,
  },
  journeyCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  journeyTitle: {
    fontFamily: SERIF,
    fontSize: 17,
    marginBottom: 8,
  },
  journeyLine: {
    fontSize: 15,
    lineHeight: 23,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  privacyText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  readCard: {
    padding: 18,
  },
  journalReadText: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 26,
  },
  detailHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: '600',
  },
  detailMood: {
    fontSize: 13,
    marginTop: 2,
  },
  backBtn: { padding: 4 },
  backGlyph: { fontSize: 20 },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 13, fontWeight: '600' },
  askEmoBtn: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  askEmoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
