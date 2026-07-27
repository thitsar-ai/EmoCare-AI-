import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
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
import { PrimaryActionButton } from '../shared/PrimaryActionButton';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { ScreenNavChrome, TAB_BAR_HEIGHT, type MainScreenKey } from '../navigation/AppNavigation';
import { useCircadianTheme, getCircadianIconColor, type CircadianTheme } from '../../theme/circadianTheme';
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
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const labelAccent = getSanctuaryLabelAccent(theme);

  const [text, setText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [todayMood, setTodayMood] = useState<{ emoji: string; label: string } | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [editorFocused, setEditorFocused] = useState(false);

  const dailyPrompt = useMemo(() => pickDailyJournalPrompt(), []);
  const recentEntries = useMemo(() => entries.slice(0, 3), [entries]);
  const journeyLine = useMemo(() => buildJourneyLine(entries), [entries]);
  const scrollPad = TAB_BAR_HEIGHT + insets.bottom + 24;
  const writingMode = keyboardHeight > 0 || editorFocused;
  /** When the keyboard is up, never reserve tab-bar space — that was eating the page. */
  const saveBarPad = writingMode ? 6 : TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 8;
  const browseEditorMinHeight = Math.max(280, Math.round(windowHeight * 0.38));
  const canSave = Boolean(text.trim());

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    if (!text.trim()) return;
    void hapticMedium();
    Keyboard.dismiss();
    setEditorFocused(false);
    setKeyboardHeight(0);
    const mood = todayMood || { emoji: '💜', label: 'Reflective' };
    const entry: JournalEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: text.trim(),
      mood,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    await saveJournalEntries(updated);
    setText('');
    setShowSaved(true);
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
          <ScrollView contentContainerStyle={{ padding: H_PAD, paddingBottom: scrollPad }}>
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

  return (
    <View style={[styles.flex, { backgroundColor: JOURNAL_BG }]}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        >
          <View style={styles.chromeWrap}>
            <ScreenNavChrome theme={theme} title="Your Journal" />
          </View>

          {writingMode ? (
            <View style={styles.writeCompose}>
              <Text style={[styles.writePromptLine, { color: theme.secondaryText }]} numberOfLines={1}>
                ✨ {dailyPrompt}
              </Text>
              <View
                style={[
                  styles.editorShell,
                  styles.editorShellWrite,
                  {
                    borderColor: tokens.border.standard,
                    backgroundColor: JOURNAL_EDITOR_SURFACE,
                  },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={[styles.journalInput, styles.journalInputWrite, { color: theme.text }]}
                  multiline
                  placeholder={EDITOR_PLACEHOLDER}
                  placeholderTextColor={theme.mutedText}
                  value={text}
                  onChangeText={setText}
                  onFocus={() => setEditorFocused(true)}
                  onBlur={() => setEditorFocused(false)}
                  textAlignVertical="top"
                  blurOnSubmit={false}
                  scrollEnabled
                  autoFocus
                />
              </View>

              {/* Chat-style composer — slim row above keyboard, not a full CTA slab */}
              <View
                style={[
                  styles.composerBar,
                  {
                    paddingBottom: saveBarPad,
                    borderTopColor: tokens.border.standard,
                    backgroundColor: JOURNAL_BG,
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    if (!canSave) return;
                    void save();
                  }}
                  disabled={!canSave}
                  accessibilityRole="button"
                  accessibilityLabel="Save reflection"
                  accessibilityState={{ disabled: !canSave }}
                  style={({ pressed }) => [
                    styles.composerSave,
                    !canSave && styles.composerSaveDisabled,
                    canSave && pressed && { opacity: 0.9 },
                  ]}
                >
                  <LinearGradient
                    colors={
                      canSave
                        ? getSanctuaryButtonGradient(theme.phase)
                        : [tokens.border.standard, tokens.border.standard]
                    }
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.composerSaveInner}
                  >
                    <Text
                      style={[
                        styles.composerSaveText,
                        { color: canSave ? '#FFFFFF' : theme.mutedText },
                      ]}
                    >
                      Save →
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.headerBlock}>
                <Text style={[styles.headerSubtitle, { color: theme.mutedText }]}>
                  A private space for reflection, growth, and self-discovery.
                </Text>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.flex}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.heroCard}>
                  <Text style={[styles.heroEyebrow, { color: tokens.text.secondary }]}>
                    ✨ Today's Reflection
                  </Text>
                  <Text style={[styles.heroPrompt, { color: theme.text }]}>{dailyPrompt}</Text>
                </CircadianGlassCard>

                <Pressable
                  onPress={() => {
                    setEditorFocused(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  style={[
                    styles.editorShell,
                    {
                      borderColor: tokens.border.standard,
                      backgroundColor: JOURNAL_EDITOR_SURFACE,
                      minHeight: browseEditorMinHeight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.journalInput,
                      {
                        color: text.trim() ? theme.text : theme.mutedText,
                        minHeight: browseEditorMinHeight - 28,
                      },
                    ]}
                  >
                    {text.trim() || EDITOR_PLACEHOLDER}
                  </Text>
                </Pressable>

                <PrimaryActionButton
                  label="Save Reflection →"
                  theme={theme}
                  onPress={() => void save()}
                  disabled={!canSave}
                  disabledHint="Write a few words to save your reflection."
                  style={styles.saveBtnWrap}
                />

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

                <Text style={[styles.sectionEyebrow, { color: theme.mutedText }]}>Recent Reflections</Text>
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
              </ScrollView>

              <View style={{ height: saveBarPad }} />
            </>
          )}
        </KeyboardAvoidingView>
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
  heroCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  heroPrompt: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 32,
  },
  promptCompact: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  writePromptLine: {
    fontFamily: SERIF,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
  },
  heroEyebrowCompact: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroPromptCompact: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 22,
  },
  writeCompose: {
    flex: 1,
    paddingTop: 4,
    minHeight: 0,
  },
  editorShell: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  editorShellWrite: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: H_PAD,
    marginBottom: 8,
  },
  journalInput: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: SERIF,
  },
  journalInputWrite: {
    flex: 1,
    minHeight: 120,
    width: '100%',
    paddingTop: 0,
  },
  composerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerSave: {
    borderRadius: 22,
    overflow: 'hidden',
    minWidth: 108,
  },
  composerSaveDisabled: {
    opacity: 0.7,
  },
  composerSaveInner: {
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSaveText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveBar: {
    paddingHorizontal: H_PAD,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtnWrap: {
    marginTop: 4,
    marginBottom: 4,
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
