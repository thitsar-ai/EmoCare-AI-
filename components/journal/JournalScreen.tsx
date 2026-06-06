import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark, Lock, MessageCircle, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { ScreenNavChrome, TAB_BAR_HEIGHT, type MainScreenKey } from '../navigation/AppNavigation';
import { useCircadianTheme, getCircadianIconColor, type CircadianTheme } from '../../theme/circadianTheme';
import { CircadianHeroGlow } from '../shared/CircadianHeroGlow';
import { PrimaryActionButton } from '../shared/PrimaryActionButton';
import { hapticMedium } from '../../utils/haptics';
import { getTodayCheckIn } from '../../utils/sanctuaryHome';
import {
  JOURNAL_ENTRIES_KEY,
  PENDING_JOURNAL_CONTEXT_KEY,
} from '../../utils/journalStorage';

const H_PAD = 22;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export type JournalEntry = {
  id: number;
  date: string;
  text: string;
  mood: { emoji: string; label: string };
};

const DAILY_PROMPTS = [
  'What do you wish someone understood about you today?',
  'What felt heavy today — and what felt even a little lighter?',
  'If your heart could speak without fear, what would it say?',
  'What are you carrying that is not yours to carry?',
  'Where did you feel most like yourself today?',
  'What would gentleness look like for you right now?',
  'What do you need more of — and what do you need less of?',
];

const CATEGORY_CHIPS = [
  { label: 'Gratitude', color: '#9B7BFF', starter: 'I am grateful for ' },
  { label: 'Emotions', color: '#3DBDA8', starter: 'The emotion I am carrying is ' },
  { label: 'Release', color: '#D46BA8', starter: 'I am ready to release ' },
  { label: 'Gentle wins', color: '#E89B5C', starter: 'A gentle win today: ' },
];

function JournalGlassCard({
  theme,
  children,
  style,
  fill,
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: ViewStyle;
  fill?: string;
}) {
  return (
    <View
      style={[
        styles.glassCard,
        {
          backgroundColor: fill ?? theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function moodTagColors(label: string, theme: CircadianTheme) {
  const map: Record<string, string> = {
    Peaceful: '#3DBDA8',
    Light: '#9B7BFF',
    Grateful: '#E89B5C',
    Hopeful: '#7BC67E',
    Heavy: '#D46BA8',
    Overwhelmed: '#6B7FD7',
    Anxious: '#B79DFF',
    Tired: theme.isDark ? theme.secondaryText : '#A99CCF',
    Neutral: theme.isDark ? theme.secondaryText : theme.mutedText,
  };
  return map[label] || theme.accent;
}

function inputSurface(theme: CircadianTheme) {
  return theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)';
}

export function JournalScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [todayMood, setTodayMood] = useState<{ emoji: string; label: string } | null>(null);
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

  const dailyPrompt = useMemo(() => {
    const dayIndex = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    return DAILY_PROMPTS[dayIndex % DAILY_PROMPTS.length];
  }, []);

  const scrollPad = TAB_BAR_HEIGHT + insets.bottom + 24;

  const composerBottomInset = keyboardVisible
    ? Math.max(insets.bottom, 10)
    : TAB_BAR_HEIGHT + insets.bottom;

  const inputMinHeight = keyboardVisible ? 112 : 148;

  useEffect(() => {
    AsyncStorage.getItem(JOURNAL_ENTRIES_KEY).then((d) => {
      if (d) setEntries(JSON.parse(d));
    });
    AsyncStorage.getItem('checkIns').then((raw) => {
      if (!raw) return;
      try {
        const checkIns = JSON.parse(raw);
        const today = getTodayCheckIn(checkIns);
        if (today?.mood?.label) {
          setTodayMood({ emoji: today.mood.emoji || '🙂', label: today.mood.label });
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

  const save = async () => {
    if (!text.trim()) return;
    void hapticMedium();
    Keyboard.dismiss();
    const mood = todayMood || { emoji: '○', label: 'Reflective' };
    const entry: JournalEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: text.trim(),
      mood,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updated));
    setText('');
  };

  const deleteEntry = async (id: number) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updated));
  };

  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const moodLabel = todayMood ? todayMood.label.toUpperCase() : 'NOT CHECKED IN YET';

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
      <View style={styles.flex}>
        <CircadianHeroGlow theme={theme} />
        <ScreenSafeArea extraTop={4}>
          <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setViewingId(null)} style={styles.backBtn}>
              <Text style={[styles.backGlyph, { color: theme.accent }]}>←</Text>
            </TouchableOpacity>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={[styles.moodEyebrow, { color: theme.secondaryText }]}>
                MOOD · {e.mood.label.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Delete this entry?', 'This cannot be undone.', [
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
              <Text style={[styles.deleteText, { color: theme.isDark ? '#F472B6' : '#D46BA8' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: H_PAD, paddingBottom: scrollPad }}>
            <Text style={[styles.journalReadText, { color: theme.text }]}>{e.text}</Text>
            <TouchableOpacity
              style={[styles.askEmoBtn, { backgroundColor: theme.accent }]}
              activeOpacity={0.88}
              onPress={() => void askEmoAboutEntry(e)}
            >
              <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.askEmoBtnText}>Ask Emo about this</Text>
            </TouchableOpacity>
          </ScrollView>
        </ScreenSafeArea>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
        >
          <View style={styles.chromeWrap}>
            <ScreenNavChrome theme={theme} title="My Journal" titleFontSize={15} />
          </View>

          <View style={styles.headerBlock}>
            <Text style={[styles.dateLine, { color: theme.text }]}>{dateLine}</Text>
            <Text style={[styles.moodEyebrow, { color: theme.secondaryText, marginBottom: 0 }]}>
              MOOD TODAY · {moodLabel}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardVisible ? 12 : 16 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {!keyboardVisible ? (
              <View style={styles.pastSection}>
                {entries.length > 0 ? (
                  <>
                    <Text style={[styles.sectionLabel, { color: theme.mutedText }]}>PAST ENTRIES</Text>
                    {entries.map((e, i) => {
                      const shortDate = new Date(e.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      const tagColor = moodTagColors(e.mood.label, theme);
                      const preview =
                        e.text.length > 72 ? `"${e.text.slice(0, 72).trim()}…"` : `"${e.text.trim()}"`;

                      return (
                        <TouchableOpacity key={e.id} activeOpacity={0.88} onPress={() => setViewingId(e.id)}>
                          <JournalGlassCard theme={theme} style={styles.entryCard}>
                            <View style={styles.entryTop}>
                              <Text style={[styles.entryDate, { color: theme.text }]}>
                                {shortDate} · {e.mood.label}
                              </Text>
                              <View style={[styles.moodTag, { borderColor: `${tagColor}66` }]}>
                                <Bookmark size={10} color={tagColor} strokeWidth={2.4} />
                                <Text style={[styles.moodTagText, { color: tagColor }]}>{e.mood.label}</Text>
                              </View>
                            </View>
                            <Text
                              style={[styles.entryPreview, { color: theme.secondaryText }]}
                              numberOfLines={2}
                            >
                              {preview}
                            </Text>
                          </JournalGlassCard>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <Text style={[styles.emptyPastHint, { color: theme.mutedText }]}>
                    Your saved entries will appear here.
                  </Text>
                )}
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.composerDock,
              {
                borderTopColor: theme.border,
                backgroundColor: theme.isDark ? 'rgba(18,10,36,0.98)' : 'rgba(245,240,252,0.98)',
                paddingBottom: composerBottomInset,
              },
            ]}
          >
            {!keyboardVisible ? (
              <>
                <JournalGlassCard theme={theme} style={styles.promptCard}>
                  <Text style={[styles.promptLabel, { color: theme.mutedText }]}>TODAY&apos;S PROMPT</Text>
                  <Text style={[styles.promptText, { color: theme.text }]}>{dailyPrompt}</Text>
                </JournalGlassCard>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={styles.chipRow}
                  style={styles.chipScroll}
                >
                  {CATEGORY_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip.label}
                      style={[styles.categoryChip, { borderColor: chip.color }]}
                      onPress={() =>
                        setText((prev) => (prev.trim() ? `${prev}\n\n${chip.starter}` : chip.starter))
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.categoryChipText, { color: chip.color }]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={[styles.promptStrip, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                <Sparkles size={13} color={theme.accent} strokeWidth={2.2} />
                <Text style={[styles.promptStripLabel, { color: theme.mutedText }]}>Prompt</Text>
                <Text style={[styles.promptStripText, { color: theme.secondaryText }]} numberOfLines={1}>
                  {dailyPrompt}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.inputShell,
                {
                  borderColor: theme.isDark ? 'rgba(183,157,255,0.45)' : 'rgba(123,111,232,0.35)',
                  backgroundColor: inputSurface(theme),
                  minHeight: inputMinHeight,
                },
              ]}
            >
              <Text style={[styles.inputEyebrow, { color: theme.mutedText }]}>YOUR ENTRY</Text>
              <TextInput
                ref={inputRef}
                style={[styles.journalInput, { color: theme.text, minHeight: inputMinHeight - 42 }]}
                multiline
                placeholder="Write what your heart wants to release today…"
                placeholderTextColor={theme.mutedText}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="default"
                scrollEnabled
              />
            </View>

            <View style={styles.composeFooter}>
              <PrimaryActionButton
                label="Save this entry"
                theme={theme}
                onPress={() => void save()}
                disabled={!text.trim()}
                disabledHint="Write something to save this entry."
              />

              {!keyboardVisible ? (
                <View style={[styles.privacyRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <Lock size={14} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2.2} />
                  <Text style={[styles.privacyText, { color: theme.mutedText }]}>
                    Stored privately on this device only.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  headerBlock: { paddingHorizontal: H_PAD, paddingTop: 4, paddingBottom: 16, gap: 8 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  chromeSpacer: { flex: 1 },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginBottom: 10,
    gap: 16,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  glassCard: {
    borderRadius: 22,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
    letterSpacing: 0.2,
  },
  dateLine: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  moodEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 24,
  },
  composeColumn: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  composerDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    gap: 14,
  },
  promptCard: {
    padding: 18,
    marginBottom: 0,
  },
  promptLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  promptText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
  },
  promptStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  promptStripLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  promptStripText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  chipScroll: { flexGrow: 0, marginBottom: 0 },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  inputShell: {
    borderWidth: 1.5,
    borderRadius: 18,
    overflow: 'hidden',
  },
  inputEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  composeFooter: {
    gap: 12,
    paddingTop: 2,
  },
  journalInput: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 16,
    lineHeight: 26,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pastSection: {
    marginTop: 4,
    paddingTop: 4,
  },
  emptyPastHint: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  privacyText: { fontSize: 13, flex: 1, lineHeight: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 14,
  },
  entryCard: { padding: 16, marginBottom: 10 },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  entryDate: { fontSize: 13, fontWeight: '600', flex: 1 },
  moodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  moodTagText: { fontSize: 11, fontWeight: '600' },
  entryPreview: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  journalReadText: { fontSize: 16, lineHeight: 26 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  detailHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  backGlyph: { fontSize: 20 },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 13, fontWeight: '600' },
  askEmoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  askEmoBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
