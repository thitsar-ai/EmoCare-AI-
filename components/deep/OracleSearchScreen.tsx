import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowUp, Bookmark, Loader2, MessageCircle, Search, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { ScreenNavChrome, type MainScreenKey } from '../navigation/AppNavigation';
import { useAppNav } from '../navigation/AppNavigation';
import { fetchOracleResearchContext } from '../../utils/oracleSearch';
import { logOracleInquiry } from '../../utils/oracleTopicLog';
import { saveOracleInsight } from '../../utils/oracleSavedInsights';
import {
  buildOracleApiMessages,
  buildOracleSystemPrompt,
} from '../../utils/oracleChatPrompt';
import { callAnthropicMessages } from '../../utils/anthropic';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { OracleAmbientCanvas } from './OracleAmbientCanvas';
import { isSanctuaryDayArt } from '../../theme/sanctuaryHeroArt';
import type { CircadianTheme } from '../../theme/circadianTheme';

const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';
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
  const isDay = isSanctuaryDayArt(theme.phase);
  const emptyDesc = isDay ? theme.mutedText : 'rgba(190, 170, 230, 0.7)';
  return {
    navTitle: isDay ? '#6E58C4' : '#C8B8E8',
    emptyDesc,
    /** One shade lighter than the description line. */
    emptyTitle: isDay ? '#9A8EB0' : 'rgba(205, 192, 238, 0.55)',
    headline: isDay ? theme.secondaryText : '#C4B5E8',
    body: isDay ? theme.mutedText : 'rgba(200,185,255,0.58)',
    inputBg: isDay ? 'rgba(255, 255, 255, 0.92)' : 'rgba(14,8,28,0.88)',
    inputBorder: isDay ? 'rgba(110, 88, 196, 0.28)' : 'rgba(130,100,210,0.32)',
    inputText: isDay ? theme.text : '#E8E0F8',
    placeholder: isDay ? 'rgba(92, 74, 122, 0.42)' : 'rgba(180,160,220,0.48)',
    sendBg: isDay ? '#7B5CFF' : '#A78BFA',
    sendDisabled: isDay ? 'rgba(123, 92, 255, 0.35)' : 'rgba(120,90,180,0.45)',
    searchTeal: '#3DBDA8',
    userBubble: isDay ? 'rgba(123, 92, 255, 0.12)' : 'rgba(167,139,250,0.18)',
    botBubbleBg: isDay ? 'rgba(255, 255, 255, 0.88)' : 'rgba(18,10,36,0.72)',
    botBubbleBorder: isDay ? 'rgba(110, 88, 196, 0.18)' : 'rgba(130,100,210,0.22)',
    faceHaloStops: isDay
      ? [
          { offset: '0%', color: '#B89AFF', opacity: 0.14 },
          { offset: '55%', color: '#9B7BFF', opacity: 0.06 },
          { offset: '100%', color: '#8B6ED4', opacity: 0 },
        ]
      : [
          { offset: '0%', color: '#9160E6', opacity: 0.18 },
          { offset: '55%', color: '#7850D2', opacity: 0.07 },
          { offset: '100%', color: '#6441C3', opacity: 0 },
        ],
    bottomMistStops: isDay
      ? [
          { offset: '0%', color: '#D4B8FF', opacity: 0.22 },
          { offset: '50%', color: '#C4A8FF', opacity: 0.1 },
          { offset: '100%', color: '#A88BF0', opacity: 0 },
        ]
      : [
          { offset: '0%', color: '#BE87FC', opacity: 0.28 },
          { offset: '50%', color: '#A56EEE', opacity: 0.12 },
          { offset: '100%', color: '#8C5ADC', opacity: 0 },
        ],
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

export function OracleSearchScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const oracle = getOracleColors(theme);
  const isDay = isSanctuaryDayArt(theme.phase);
  const insets = useSafeAreaInsets();
  const { userName } = useAppNav();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [messages, setMessages] = useState<OracleMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const isEmpty = messages.length === 0;

  const lastBotId = React.useMemo(() => {
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
    async (rawText: string) => {
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
          { id: 'status', role: 'status', text: 'Searching trusted research sources…' },
        ];
      });

      try {
        const research = await fetchOracleResearchContext(trimmed);
        const userBlock = research.contextBlock
          ? `${trimmed}\n\n${research.contextBlock}`
          : trimmed;

        const apiHistory = buildOracleApiMessages(priorForApi);
        const result = await callAnthropicMessages({
          system: buildOracleSystemPrompt(name),
          messages: [...apiHistory, { role: 'user', content: userBlock }],
          maxTokens: 900,
        });

        const replyText =
          result.ok && result.data?.content
            ? result.data.content.find((b: { type?: string }) => b.type === 'text')?.text?.trim()
            : '';
        const reply =
          replyText ||
          `I found thoughtful perspectives on that, ${name}. Ask me to go deeper on any part, or share what you'd like to understand next.`;

        void logOracleInquiry({
          query: trimmed,
          message: reply,
          sources: research.sources || [],
        });

        const botMsg: OracleMessage = {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: reply,
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
            text: `I couldn't reach research sources just now, ${name}. Try again in a moment — or ask me to explore a related topic.`,
            sourceCount: 0,
            query: trimmed,
          },
        ]);
      } finally {
        setSearching(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
      }
    },
    [searching, userName],
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
      Alert.alert('Saved to Insights', 'This Oracle insight was added to your Insights screen.', [
        { text: 'Stay here', style: 'cancel' },
        { text: 'View Insights', onPress: () => onNav('insights') },
      ]);
    }
  };

  const researchMore = (botMsg: OracleMessage) => {
    const topic = botMsg.query || botMsg.text.slice(0, 100);
    setInput(`Go deeper with more research: ${topic}`);
    inputRef.current?.focus();
  };

  const discussInTalk = async (botMsg: OracleMessage) => {
    const prompt = `I'd like to explore this Oracle insight further:\n\n${botMsg.text.slice(0, 500)}`;
    try {
      await AsyncStorage.setItem(PENDING_TALK_QUERY_KEY, prompt);
    } catch {}
    onNav('talk');
  };

  const showSources = (botMsg: OracleMessage) => {
    const titles = (botMsg.sources || []).map((s) => s.title).filter(Boolean);
    if (!titles.length) {
      Alert.alert('Sources', 'No published sources were attached to this reply.');
      return;
    }
    Alert.alert('Research sources', titles.join('\n\n'));
  };

  const canSend = !searching && input.trim().length > 0;

  return (
    <View style={styles.flex}>
      <OracleAmbientCanvas isDay={isDay} />

      {isEmpty ? (
        <Svg
          width={360}
          height={110}
          style={styles.bottomMist}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="bottomMist" cx="50%" cy="50%" rx="50%" ry="50%">
              {oracle.bottomMistStops.map((stop) => (
                <Stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </RadialGradient>
          </Defs>
          <Ellipse cx={180} cy={55} rx={180} ry={55} fill="url(#bottomMist)" />
        </Svg>
      ) : null}

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
                    Emo · Oracle Mode
                  </Text>
                  {searching ? (
                    <View style={styles.searchPillCenter}>
                      <Loader2 size={12} color={oracle.searchTeal} />
                      <Text style={styles.searchPillText}>Searching…</Text>
                    </View>
                  ) : null}
                </View>
              }
            />
          </View>

          {isEmpty ? (
            <View style={styles.oracleEmpty}>
              <View style={styles.heroStack}>
                <Svg width={220} height={220} style={styles.heroHalo} pointerEvents="none">
                  <Defs>
                    <RadialGradient id="oracleFaceHalo" cx="50%" cy="50%" r="50%">
                      {oracle.faceHaloStops.map((stop) => (
                        <Stop
                          key={stop.offset}
                          offset={stop.offset}
                          stopColor={stop.color}
                          stopOpacity={stop.opacity}
                        />
                      ))}
                    </RadialGradient>
                  </Defs>
                  <Circle cx={110} cy={110} r={110} fill="url(#oracleFaceHalo)" />
                </Svg>
                <Image
                  source={theme.emoFace}
                  style={styles.emoFace}
                  resizeMode="contain"
                  accessibilityLabel="Emo"
                />
              </View>
              <Text style={[styles.oracleTitle, { color: oracle.emptyTitle }]}>
                Ask anything about the world.
              </Text>
              <Text style={[styles.oracleDesc, { color: oracle.emptyDesc }]}>
                Emo searches trusted sources{'\n'}
                and returns a thoughtful,{'\n'}
                gentle synthesis.
              </Text>
            </View>
          ) : (
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
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>{m.text}</Text>
                    </View>
                  );
                }
                if (m.role === 'user') {
                  return (
                    <View key={m.id} style={[styles.userBubble, { backgroundColor: oracle.userBubble }]}>
                      <Text style={[styles.userText, { color: oracle.inputText }]}>{m.text}</Text>
                      {m.time ? (
                        <Text style={[styles.timeTag, { color: oracle.body }]}>{m.time}</Text>
                      ) : null}
                    </View>
                  );
                }
                return (
                  <View key={m.id} style={styles.botBlock}>
                    <View
                      style={[
                        styles.botBubble,
                        {
                          backgroundColor: oracle.botBubbleBg,
                          borderColor: oracle.botBubbleBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.botText, { color: oracle.inputText }]}>{m.text}</Text>
                    </View>
                    {m.sourceCount ? (
                      <Text style={[styles.sourceLine, { color: oracle.body }]}>
                        Sourced from {m.sourceCount} peer-reviewed{' '}
                        {m.sourceCount === 1 ? 'study' : 'studies'}
                      </Text>
                    ) : null}
                    {m.id === lastBotId ? (
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => researchMore(m)}
                          style={[styles.pillBtnTeal, styles.pillBtnRow]}
                        >
                          <Search size={13} color="#3DBDA8" strokeWidth={2.4} />
                          <Text style={styles.pillTextTeal}>Research more</Text>
                        </Pressable>
                        {(m.sourceCount ?? 0) > 0 ? (
                          <Pressable
                            onPress={() => showSources(m)}
                            style={[styles.pillBtnAccent, styles.pillBtnRow, { borderColor: `${oracle.headline}55` }]}
                          >
                            <Text style={[styles.pillTextLight, { color: oracle.headline }]}>View sources</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => void discussInTalk(m)}
                          style={[styles.pillBtnAccent, styles.pillBtnRow]}
                        >
                          <MessageCircle size={13} color={oracle.headline} strokeWidth={2.4} />
                          <Text style={[styles.pillTextLight, { color: oracle.headline }]}>Discuss</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    borderColor: oracle.inputBorder,
                    backgroundColor: oracle.inputBg,
                    color: oracle.inputText,
                  },
                ]}
                placeholder="Ask anything about the world..."
                placeholderTextColor={oracle.placeholder}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => void submit()}
                returnKeyType="send"
                selectionColor={oracle.sendBg}
              />
              <Pressable
                onPress={() => void submit()}
                disabled={!canSend}
                style={[styles.sendBtn, { backgroundColor: canSend ? oracle.sendBg : oracle.sendDisabled }]}
                accessibilityRole="button"
                accessibilityLabel="Send question"
              >
                {searching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ArrowUp size={20} color="#fff" strokeWidth={2.5} />
                )}
              </Pressable>
            </View>

            {!isEmpty ? (
              <View style={styles.composerActions}>
                <Pressable
                  onPress={() => void saveLatestInsight()}
                  style={({ pressed }) => [
                    styles.composerBtn,
                    { borderColor: oracle.inputBorder, backgroundColor: oracle.inputBg },
                    pressed && styles.composerBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save insight"
                >
                  <Bookmark size={14} color={oracle.searchTeal} strokeWidth={2.3} />
                  <Text style={[styles.composerBtnText, { color: oracle.headline }]}>Save insight</Text>
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
            ) : null}
          </View>
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
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  heroStack: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    zIndex: 2,
  },
  heroHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bottomMist: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    zIndex: 0,
  },
  navCenter: { alignItems: 'center', gap: 4, minWidth: 0 },
  searchPillCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#3DBDA8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  oracleEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 24,
    zIndex: 1,
  },
  emoFace: {
    width: 168,
    height: 168,
    zIndex: 3,
  },
  oracleTitle: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'Georgia',
    letterSpacing: 0.3,
  },
  oracleDesc: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 44,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 8,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#3DBDA8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  searchPillText: { color: '#3DBDA8', fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#3DBDA8',
  },
  statusText: { fontSize: 14, fontWeight: '600', color: '#3DBDA8' },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '92%',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  userText: { fontSize: 17, lineHeight: 25 },
  timeTag: {
    alignSelf: 'flex-end',
    fontSize: 11,
    marginTop: 6,
  },
  botBlock: { marginBottom: 12 },
  botBubble: {
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
  },
  botText: { fontSize: 17, lineHeight: 26, fontFamily: SERIF },
  sourceLine: { fontSize: 12, marginTop: 8, marginLeft: 4 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pillBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillBtnAccent: {
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillBtnTeal: {
    borderWidth: 1,
    borderColor: '#3DBDA8',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillBtnWarm: {
    borderWidth: 1,
    borderColor: '#E89B5C',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillTextLight: { fontSize: 13, fontWeight: '600' },
  pillTextTeal: { fontSize: 13, fontWeight: '600', color: '#3DBDA8' },
  inputBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  composerBtnText: { fontSize: 13, fontWeight: '600' },
  composerBtnDestructive: { fontSize: 13, fontWeight: '600', color: '#F08A8A' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
