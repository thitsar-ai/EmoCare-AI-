import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowUp, Bookmark, Compass, Loader2, Sparkles, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CircadianGlassCard, SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { ScreenNavChrome, type MainScreenKey, useAppNav } from '../navigation/AppNavigation';
import { fetchOracleResearchContext } from '../../utils/oracleSearch';
import { logOracleInquiry } from '../../utils/oracleTopicLog';
import { saveOracleInsight } from '../../utils/oracleSavedInsights';
import {
  buildOracleApiMessages,
  buildOracleSystemPrompt,
} from '../../utils/oracleChatPrompt';
import { callAnthropicMessages, describeAnthropicError } from '../../utils/anthropic';
import { tokens } from '../../theme/tokens';
import { OracleAmbientCanvas } from './OracleAmbientCanvas';
import { TalkHeroEmo } from '../talk/TalkHeroEmo';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  ORACLE_CATEGORIES,
  ORACLE_EXAMPLE_PROMPTS,
  ORACLE_HEADER_TAGLINE,
  ORACLE_HEADER_TITLE,
  ORACLE_INPUT_PLACEHOLDER,
  ORACLE_MODES,
  ORACLE_STATUS_MESSAGE,
  ORACLE_STATUS_SHORT,
  type OracleModeId,
  oracleSourcesLabel,
} from '../../constants/brandCopy';
import { hapticLight } from '../../utils/haptics';
import { CrisisFooter } from '../shared/CrisisFooter';

const ORACLE_CHAT_KEY = 'oracleChatCurrent';

function isPersistedOracleMessage(m: OracleMessage): m is OracleMessage {
  return m.role === 'user' || m.role === 'bot';
}

async function loadOracleChat(): Promise<OracleMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(ORACLE_CHAT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is OracleMessage =>
        typeof m === 'object' &&
        m != null &&
        typeof (m as OracleMessage).id === 'string' &&
        typeof (m as OracleMessage).text === 'string' &&
        ((m as OracleMessage).role === 'user' || (m as OracleMessage).role === 'bot'),
    );
  } catch {
    return [];
  }
}

async function persistOracleChat(messages: OracleMessage[]): Promise<void> {
  const saved = messages.filter(isPersistedOracleMessage);
  try {
    if (saved.length === 0) {
      await AsyncStorage.removeItem(ORACLE_CHAT_KEY);
    } else {
      await AsyncStorage.setItem(ORACLE_CHAT_KEY, JSON.stringify(saved));
    }
  } catch {}
}

function getOracleColors(theme: CircadianTheme) {
  const teal = tokens.oracle.accent;
  return {
    navTitle: theme.text,
    body: theme.mutedText,
    headline: theme.text,
    inputBg: tokens.surface.inset,
    inputBorder: tokens.border.standard,
    inputText: theme.text,
    placeholder: theme.mutedText,
    sendBg: teal,
    sendDisabled: `${teal}59`,
    accentSoft: teal,
    accentMuted: `${teal}8C`,
    userBubble: tokens.surface.bubble,
    botBubbleBg: tokens.surface.frosted,
    botBubbleBorder: tokens.border.standard,
    wiseBg: tokens.surface.tint,
    wiseBorder: tokens.border.medium,
  } as const;
}

type OracleMessage = {
  id: string;
  role: 'user' | 'bot' | 'status';
  text: string;
  time?: string;
  sourceCount?: number;
  query?: string;
  sources?: { title?: string; url?: string }[];
};

function splitWisePerspective(text: string): { answer: string; perspective: string | null } {
  const marker = 'A wise perspective';
  const index = text.indexOf(marker);
  if (index === -1) return { answer: text, perspective: null };
  const answer = text.slice(0, index).trim();
  const perspective = text.slice(index + marker.length).replace(/^[\s:\n—-]+/, '').trim();
  if (!perspective) return { answer: text, perspective: null };
  return { answer, perspective };
}

function statusMessageForMode(mode: OracleModeId): string {
  if (mode === 'quick') return 'Thinking through your question…';
  if (mode === 'wise') return 'Gathering knowledge and perspective…';
  return ORACLE_STATUS_MESSAGE;
}

function maxTokensForMode(mode: OracleModeId): number {
  if (mode === 'quick') return 550;
  if (mode === 'wise') return 1000;
  return 1200;
}

function shouldFetchResearch(mode: OracleModeId, query: string): boolean {
  if (mode === 'deep' || mode === 'wise') return true;
  return /\b(research|study|studies|evidence|data|statistics|compare|history of|explain)\b/i.test(query);
}

export function OracleSearchScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const oracle = getOracleColors(theme);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { userName } = useAppNav();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<OracleModeId>('deep');
  const [messages, setMessages] = useState<OracleMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const isEmpty = messages.length === 0;

  const lastBotId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'bot') return messages[i].id;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    void loadOracleChat().then((loaded) => {
      if (loaded.length > 0) setMessages(loaded);
      setHistoryLoaded(true);
      if (loaded.length > 0) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
      }
    });
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    void persistOracleChat(messages);
  }, [messages, historyLoaded]);

  const nowTime = () =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const submitText = useCallback(
    async (rawText: string, activeMode: OracleModeId = mode) => {
      const trimmed = rawText.trim();
      if (!trimmed || searching) return;
      const name = userName.trim() || 'friend';
      setInput('');
      setSearching(true);

      const userMsg: OracleMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        time: nowTime(),
      };

      let priorForApi: OracleMessage[] = [];
      setMessages((prev) => {
        priorForApi = prev;
        return [
          ...prev,
          userMsg,
          { id: 'status', role: 'status', text: statusMessageForMode(activeMode) },
        ];
      });

      try {
        let research = { contextBlock: '', sources: [] as { title?: string; url?: string }[] };
        if (shouldFetchResearch(activeMode, trimmed)) {
          research = await fetchOracleResearchContext(trimmed);
        }

        const userBlock = research.contextBlock
          ? `${trimmed}\n\n${research.contextBlock}`
          : trimmed;

        const apiHistory = buildOracleApiMessages(
          priorForApi.filter(
            (m): m is OracleMessage & { role: 'user' | 'bot' } =>
              m.role === 'user' || m.role === 'bot',
          ),
        );
        const result = await callAnthropicMessages({
          system: buildOracleSystemPrompt(name, activeMode),
          messages: [...apiHistory, { role: 'user', content: userBlock }],
          maxTokens: maxTokensForMode(activeMode),
          route: 'oracle',
        });

        const replyText =
          result.ok && result.data?.content
            ? result.data.content.find((b: { type?: string }) => b.type === 'text')?.text?.trim()
            : '';

        if (!replyText) {
          const errMsg = result.error
            ? describeAnthropicError({ error: result.error })
            : `I couldn't reach an answer just now, ${name}. Try again in a moment.`;
          setMessages((prev) => [
            ...prev.filter((m) => m.role !== 'status'),
            {
              id: `b-err-${Date.now()}`,
              role: 'bot',
              text: errMsg,
              sourceCount: research.sources?.length || 0,
              query: trimmed,
              sources: research.sources || [],
            },
          ]);
          return;
        }

        void logOracleInquiry({
          query: trimmed,
          message: replyText,
          sources: research.sources || [],
        });

        const botMsg: OracleMessage = {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: replyText,
          sourceCount: research.sources?.length || 0,
          query: trimmed,
          sources: research.sources || [],
        };
        setMessages((prev) => [...prev.filter((m) => m.role !== 'status'), botMsg]);
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== 'status'),
          {
            id: `b-err-${Date.now()}`,
            role: 'bot',
            text: `I couldn't reach sources just now, ${name}. Try again — or switch to Quick Insight for a faster reply.`,
            sourceCount: 0,
            query: trimmed,
          },
        ]);
      } finally {
        setSearching(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
      }
    },
    [searching, userName, mode],
  );

  const submit = useCallback(() => {
    void submitText(input);
  }, [input, submitText]);

  const clearHistory = () => {
    Alert.alert('Clear history', 'Remove all Oracle messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          void persistOracleChat([]);
        },
      },
    ]);
  };

  const saveLatestInsight = async () => {
    const lastBot = [...messages].reverse().find((m) => m.role === 'bot');
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastBot?.text.trim()) {
      Alert.alert('Nothing to save', 'Ask Oracle a question first.');
      return;
    }
    const ok = await saveOracleInsight({
      query: lastBot.query || lastUser?.text || '',
      insight: lastBot.text,
      sourceCount: lastBot.sourceCount || 0,
      sourceTitles: (lastBot.sources || []).map((s) => s.title || '').filter(Boolean),
    });
    if (ok) {
      Alert.alert('Saved', 'This Oracle answer was saved to your library.', [
        { text: 'Stay here', style: 'cancel' },
        { text: 'View Insights', onPress: () => onNav('insights') },
      ]);
    }
  };

  const researchMore = (botMsg: OracleMessage) => {
    const topic = botMsg.query || botMsg.text.slice(0, 100);
    setMode('deep');
    void submitText(`Research this more deeply: ${topic}`, 'deep');
  };

  const showSources = (botMsg: OracleMessage) => {
    const titles = (botMsg.sources || []).map((s) => s.title).filter(Boolean);
    if (!titles.length) {
      Alert.alert('Sources', 'No published sources were attached to this reply.');
      return;
    }
    Alert.alert('Sources', titles.join('\n\n'));
  };

  const canSend = !searching && input.trim().length > 0;

  const renderBotMessage = (m: OracleMessage) => {
    const { answer, perspective } = splitWisePerspective(m.text);
    return (
      <View key={m.id} style={styles.botBlock}>
        <CircadianGlassCard
          theme={theme}
          variant="todayInsights"
          style={[styles.botBubble, { borderColor: oracle.botBubbleBorder }]}
        >
          <Text style={[styles.botText, { color: oracle.inputText }]}>{answer}</Text>
          {perspective ? (
            <View
              style={[
                styles.wiseBlock,
                { backgroundColor: oracle.wiseBg, borderColor: oracle.wiseBorder },
              ]}
            >
              <Text style={[styles.wiseEyebrow, { color: tokens.text.primary }]}>A wise perspective</Text>
              <Text style={[styles.wiseText, { color: oracle.inputText }]}>{perspective}</Text>
            </View>
          ) : null}
        </CircadianGlassCard>
        {m.sourceCount ? (
          <Text style={[styles.sourceLine, { color: oracle.body }]}>
            {oracleSourcesLabel(m.sourceCount)}
          </Text>
        ) : null}
        {m.id === lastBotId ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => researchMore(m)}
              style={[styles.pillBtn, { borderColor: `${oracle.accentSoft}44` }]}
            >
              <Compass size={13} color={oracle.accentSoft} strokeWidth={2.2} />
              <Text style={[styles.pillText, { color: oracle.headline }]}>Research deeper</Text>
            </Pressable>
            {(m.sourceCount ?? 0) > 0 ? (
              <Pressable
                onPress={() => showSources(m)}
                style={[styles.pillBtn, { borderColor: tokens.border.strong }]}
              >
                <Text style={[styles.pillText, { color: oracle.headline }]}>See sources</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderModeSelector = (compact = false) => (
    <View style={[styles.modeRow, compact && styles.modeRowCompact]}>
      {ORACLE_MODES.map((item) => {
        const selected = mode === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              void hapticLight();
              setMode(item.id);
            }}
            style={[
              styles.modeChip,
              compact && styles.modeChipCompact,
              {
                borderColor: selected ? tokens.border.active : tokens.border.standard,
                backgroundColor: selected ? tokens.surface.selected : tokens.surface.frosted,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.label}. ${item.hint}`}
          >
            <Text style={[styles.modeLabel, { color: selected ? tokens.text.primary : theme.text }]}>
              {item.label}
            </Text>
            {!compact ? (
              <Text style={[styles.modeHint, { color: theme.mutedText }]}>{item.hint}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  const renderSearchInput = (large: boolean) => (
    <View style={[styles.inputRow, large && styles.inputRowLarge]}>
      <TextInput
        ref={inputRef}
        style={[
          large ? styles.inputLarge : styles.input,
          {
            borderColor: oracle.inputBorder,
            backgroundColor: oracle.inputBg,
            color: oracle.inputText,
          },
        ]}
        placeholder={ORACLE_INPUT_PLACEHOLDER}
        placeholderTextColor={oracle.placeholder}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={() => void submit()}
        returnKeyType="send"
        selectionColor={oracle.sendBg}
        multiline={large}
        textAlign={large ? 'center' : 'left'}
      />
      <Pressable
        onPress={() => void submit()}
        disabled={!canSend}
        style={[
          large ? styles.sendBtnLarge : styles.sendBtn,
          { backgroundColor: canSend ? oracle.sendBg : oracle.sendDisabled },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Send question to Oracle"
      >
        {searching ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <ArrowUp size={large ? 22 : 20} color="#fff" strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );

  return (
    <View style={styles.flex}>
      <OracleAmbientCanvas />

      <ScreenSafeArea extraTop={4}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.chromeWrap}>
            <ScreenNavChrome
              theme={theme}
              titleColor={oracle.navTitle}
              centerContent={
                <View style={styles.navCenter}>
                  <Text style={[styles.navTitle, { color: oracle.navTitle }]} numberOfLines={1}>
                    {ORACLE_HEADER_TITLE}
                  </Text>
                  <Text style={[styles.navTagline, { color: oracle.body }]} numberOfLines={1}>
                    {ORACLE_HEADER_TAGLINE}
                  </Text>
                  {searching ? (
                    <View style={[styles.statusPill, { borderColor: `${oracle.accentSoft}44` }]}>
                      <Loader2 size={12} color={oracle.accentSoft} />
                      <Text style={[styles.statusPillText, { color: oracle.accentSoft }]}>
                        {ORACLE_STATUS_SHORT}
                      </Text>
                    </View>
                  ) : null}
                </View>
              }
            />
          </View>

          <View style={[styles.oracleEmoRow, !isEmpty && styles.oracleEmoRowCompact]}>
            <TalkHeroEmo theme={theme} size="compact" />
          </View>

          {isEmpty ? (
            <ScrollView
              contentContainerStyle={[
                styles.emptyScroll,
                {
                  paddingBottom: insets.bottom + 24,
                  minHeight: Math.max(windowHeight - insets.top - insets.bottom - 220, 420),
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.heroSearchCard}>
                {renderSearchInput(true)}
              </CircadianGlassCard>

              {renderModeSelector()}

              <Text style={[styles.sectionEyebrow, { color: theme.mutedText }]}>Try asking</Text>
              <View style={styles.exampleCloud}>
                {ORACLE_EXAMPLE_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    onPress={() => {
                      void hapticLight();
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    style={({ pressed }) => [
                      styles.exampleChip,
                      {
                        borderColor: tokens.border.standard,
                        backgroundColor: tokens.surface.frosted,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.exampleText, { color: theme.text }]}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.sectionEyebrow, { color: theme.mutedText }]}>Explore by topic</Text>
              <View style={styles.categoryGrid}>
                {ORACLE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      void hapticLight();
                      setInput(cat.starter);
                      inputRef.current?.focus();
                    }}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      {
                        borderColor: tokens.border.standard,
                        backgroundColor: tokens.surface.frosted,
                      },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryLabel, { color: theme.text }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>

              <CrisisFooter theme={theme} variant="compact" style={styles.crisisFooter} />
            </ScrollView>
          ) : (
            <>
              <View style={styles.modeBar}>{renderModeSelector(true)}</View>
              <ScrollView
                ref={scrollRef}
                style={styles.flex}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {messages.map((m) => {
                  if (m.role === 'status') {
                    return (
                      <View key={m.id} style={styles.statusRow}>
                        <Sparkles size={14} color={oracle.accentSoft} strokeWidth={2.2} />
                        <Text style={[styles.statusText, { color: oracle.accentMuted }]}>{m.text}</Text>
                      </View>
                    );
                  }
                  if (m.role === 'user') {
                    return (
                      <View
                        key={m.id}
                        style={[styles.userBubble, { backgroundColor: oracle.userBubble }]}
                      >
                        <Text style={[styles.userText, { color: oracle.inputText }]}>{m.text}</Text>
                        {m.time ? (
                          <Text style={[styles.timeTag, { color: oracle.body }]}>{m.time}</Text>
                        ) : null}
                      </View>
                    );
                  }
                  return renderBotMessage(m);
                })}
              </ScrollView>
            </>
          )}

          {!isEmpty ? (
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              {renderSearchInput(false)}
              <View style={styles.composerActions}>
                <Pressable
                  onPress={() => void saveLatestInsight()}
                  style={({ pressed }) => [
                    styles.composerBtn,
                    { borderColor: oracle.inputBorder, backgroundColor: oracle.inputBg },
                    pressed && styles.composerBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save answer"
                >
                  <Bookmark size={14} color={oracle.accentSoft} strokeWidth={2.3} />
                  <Text style={[styles.composerBtnText, { color: oracle.headline }]}>Save</Text>
                </Pressable>
                <Pressable
                  onPress={clearHistory}
                  style={({ pressed }) => [
                    styles.composerBtn,
                    { borderColor: 'rgba(240,138,138,0.35)', backgroundColor: 'rgba(240,138,138,0.08)' },
                    pressed && styles.composerBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear history"
                >
                  <Trash2 size={14} color="#F08A8A" strokeWidth={2.3} />
                  <Text style={styles.composerBtnDestructive}>Clear</Text>
                </Pressable>
              </View>
              <CrisisFooter theme={theme} variant="compact" style={styles.crisisFooter} />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 2 },
  navTitle: {
    fontFamily: SERIF,
    fontSize: tokens.typography.navTitleLarge.fontSize,
    lineHeight: tokens.typography.navTitleLarge.lineHeight,
    fontWeight: tokens.typography.navTitleLarge.fontWeight,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  navTagline: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  navCenter: { alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  statusPillText: { fontSize: 11, fontWeight: '600', fontStyle: 'italic', fontFamily: SERIF },
  oracleEmoRow: {
    alignItems: 'center',
    overflow: 'visible',
    paddingTop: 0,
    paddingBottom: 2,
  },
  oracleEmoRowCompact: {
    paddingTop: 0,
    paddingBottom: 2,
  },
  emptyScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroSearchCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  modeRowCompact: {
    marginBottom: 0,
  },
  modeBar: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  modeChipCompact: {
    paddingVertical: 8,
    borderRadius: 999,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeHint: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginTop: 4,
  },
  exampleCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  exampleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 4,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12, paddingHorizontal: 4 },
  statusText: { flex: 1, fontSize: 15, lineHeight: 22, fontFamily: SERIF, fontStyle: 'italic' },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '92%',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tokens.border.standard,
  },
  userText: { fontSize: 16, lineHeight: 24 },
  timeTag: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 6,
  },
  botBlock: { marginBottom: 12 },
  botBubble: {
    paddingVertical: 4,
  },
  botText: { fontSize: 16, lineHeight: 26 },
  wiseBlock: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  wiseEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  wiseText: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sourceLine: { fontSize: 13, marginTop: 10, marginLeft: 4, fontStyle: 'italic', fontFamily: SERIF },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  inputBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  crisisFooter: { marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputRowLarge: {
    alignItems: 'center',
  },
  composerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  composerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  composerBtnPressed: { opacity: 0.82 },
  composerBtnText: { fontSize: 15, fontWeight: '600' },
  composerBtnDestructive: { fontSize: 15, fontWeight: '600', color: '#F08A8A' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
  },
  inputLarge: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 18 : 16,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 56,
    maxHeight: 140,
    fontFamily: SERIF,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#58D6D0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#58D6D0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
