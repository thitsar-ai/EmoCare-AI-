import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageCircle } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenNavChrome, type MainScreenKey } from '../navigation/AppNavigation';
import { useCircadianTheme, type CircadianTheme } from '../../theme/circadianTheme';
import { hapticMedium } from '../../utils/haptics';
import {
  JOURNAL_ENTRIES_KEY,
  PENDING_JOURNAL_CONTEXT_KEY,
} from '../../utils/journalStorage';

const NAV_CONTENT_HEIGHT = 60;

export type JournalEntry = {
  id: number;
  date: string;
  text: string;
  mood: { emoji: string; label: string };
};

const PROMPTS = [
  'What am I grateful for?',
  'What emotion am I carrying?',
  'What do I need to let go of?',
  'What went well today?',
];

function JournalGlassCard({
  theme,
  children,
  style,
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.glassCard, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function JournalScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(JOURNAL_ENTRIES_KEY).then((d) => {
      if (d) setEntries(JSON.parse(d));
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
    const entry: JournalEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: text.trim(),
      mood: { emoji: '🙂', label: 'Light' },
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    setLastSavedId(entry.id);
    await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updated));
    setText('');
  };

  const deleteEntry = async (id: number) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updated));
  };

  const scrollPad = NAV_CONTENT_HEIGHT + insets.bottom + 24;

  if (viewing !== null) {
    const e = entries[viewing];
    return (
      <View style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <View style={[styles.detailHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setViewing(null)} style={styles.backBtn}>
              <Text style={[styles.backGlyph, { color: theme.accent }]}>←</Text>
            </TouchableOpacity>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={[styles.cardSub, { color: theme.mutedText }]}>
                {e.mood.emoji} {e.mood.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                deleteEntry(e.id);
                setViewing(null);
              }}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: scrollPad }}>
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
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScreenNavChrome theme={theme} title="Journal" />
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: scrollPad }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.heroGreeting, { color: theme.text }]}>My Journal</Text>
            <Text style={[styles.cardSub, { marginBottom: 18, color: theme.mutedText }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={[styles.sectionLabel, { marginBottom: 10, color: theme.secondaryText }]}>
              A prompt to begin
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.promptChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setText(p + '\n\n')}
                >
                  <Text style={[styles.promptChipText, { color: theme.secondaryText }]}>
                    {p.split(' ').slice(0, 3).join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <JournalGlassCard theme={theme} style={{ marginBottom: 12 }}>
              <TextInput
                style={[styles.journalInput, { color: theme.text }]}
                multiline
                placeholder="This space is yours. Write freely — no one else will see this."
                placeholderTextColor={theme.mutedText}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
            </JournalGlassCard>
            <Pressable
              onPress={() => void save()}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: theme.accent }, pressed && styles.saveBtnPressed]}
            >
              <Text style={styles.saveBtnText}>✦  Save this entry</Text>
            </Pressable>
            <JournalGlassCard theme={theme} style={styles.privacyCard}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={[styles.cardSub, styles.flex, { color: theme.mutedText }]}>
                Your entries are stored privately on this device only.
              </Text>
            </JournalGlassCard>
            {entries.length > 0 ? (
              <Text style={[styles.sectionLabel, { marginBottom: 12, color: theme.secondaryText }]}>Past entries</Text>
            ) : null}
            {entries.map((e, i) => (
              <View key={e.id}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setViewing(i)}>
                  <JournalGlassCard
                    theme={theme}
                    style={
                      lastSavedId === e.id
                        ? { ...styles.entryCard, borderColor: theme.accent, borderWidth: 1 }
                        : styles.entryCard
                    }
                  >
                    <View style={styles.entryHeader}>
                      <Text style={[styles.cardTitle, { fontSize: 13, color: theme.text }]}>
                        {new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <View style={styles.entryHeaderRight}>
                        <Text style={[styles.cardSub, { color: theme.mutedText }]}>
                          {e.mood.emoji} {e.mood.label}
                        </Text>
                        <TouchableOpacity onPress={() => void deleteEntry(e.id)}>
                          <Text style={styles.deleteGlyph}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[styles.cardSub, { lineHeight: 18, color: theme.secondaryText }]} numberOfLines={2}>
                      {e.text}
                    </Text>
                  </JournalGlassCard>
                </TouchableOpacity>
                {lastSavedId === e.id ? (
                  <TouchableOpacity
                    style={[styles.askEmoBtn, { backgroundColor: theme.accent, marginTop: -4, marginBottom: 12 }]}
                    activeOpacity={0.88}
                    onPress={() => void askEmoAboutEntry(e)}
                  >
                    <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.askEmoBtnText}>Ask Emo about this</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glassCard: {
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  heroGreeting: { fontSize: 34, fontWeight: '700', lineHeight: 44, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  journalInput: { paddingVertical: 16, paddingHorizontal: 16, fontSize: 13, minHeight: 140, lineHeight: 22 },
  journalReadText: { fontSize: 14, lineHeight: 26 },
  promptChip: {
    borderWidth: 0.5,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  promptChipText: { fontSize: 11 },
  saveBtn: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnPressed: { opacity: 0.88 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  entryCard: { paddingVertical: 14, paddingHorizontal: 14, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  entryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  backGlyph: { fontSize: 20 },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#F472B6', fontSize: 13 },
  deleteGlyph: { color: '#F472B6', fontSize: 12 },
  askEmoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  askEmoBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
