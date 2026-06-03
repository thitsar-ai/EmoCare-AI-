import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowUp, Loader2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CircadianHeroGlow, SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { ScreenNavChrome, type MainScreenKey } from '../navigation/AppNavigation';
import { useAppNav } from '../navigation/AppNavigation';
import { fetchOracleResearchContext } from '../../utils/oracleSearch';
import { logOracleInquiry } from '../../utils/oracleTopicLog';
import { callAnthropicMessages } from '../../utils/anthropic';

const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';

type OracleMessage = {
  id: string;
  role: 'user' | 'bot' | 'status';
  text: string;
  time?: string;
  sourceCount?: number;
};

export function OracleSearchScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { userName } = useAppNav();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [messages, setMessages] = useState<OracleMessage[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_TALK_QUERY_KEY).then((q) => {
      if (q?.trim()) {
        setInput(q.trim());
        AsyncStorage.removeItem(PENDING_TALK_QUERY_KEY).catch(() => {});
      }
    });
  }, []);

  const nowTime = () =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const submit = useCallback(async () => {
    const trimmed = input.trim();
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
    setMessages((prev) => [...prev, userMsg, { id: 'status', role: 'status', text: 'Searching clinical research databases…' }]);

    try {
      const research = await fetchOracleResearchContext(trimmed);

      const system = `You are Emo in Oracle Mode — warm, research-informed, concise. Address the user as ${name}. Synthesize findings into flowing prose. Never paste raw URLs or bullet lists. If research is thin, say so gently and offer a breathing or journaling next step.`;
      const userBlock = research.contextBlock
        ? `${trimmed}\n\n${research.contextBlock}`
        : trimmed;

      const result = await callAnthropicMessages({
        system,
        messages: [{ role: 'user', content: userBlock }],
        maxTokens: 900,
      });

      const replyText =
        result.ok && result.data?.content
          ? result.data.content.find((b: { type?: string }) => b.type === 'text')?.text?.trim()
          : '';
      const reply =
        replyText ||
        `Research supports several techniques, ${name}. Box breathing (4-4-4-4) is among the most evidence-backed for acute anxiety. Would you like me to guide you now?`;

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
      };
      setMessages((prev) => [...prev.filter((m) => m.role !== 'status'), botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'status'),
        {
          id: `b-err-${Date.now()}`,
          role: 'bot',
          text: `I couldn't reach research sources just now, ${name}. Try again in a moment — or I can guide you through box breathing instead.`,
          sourceCount: 0,
        },
      ]);
    } finally {
      setSearching(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [input, searching, userName]);

  const guideBreathing = () => onNav('breathe');
  const openTalk = () => onNav('talk');

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <View style={styles.chromeWrap}>
            <ScreenNavChrome
              theme={theme}
              title="Emo · Oracle Mode"
              titleFontSize={15}
              actionsBeforeNav={
              searching ? (
                <View style={[styles.searchPill, { borderColor: '#3DBDA8' }]}>
                  <Loader2 size={12} color="#3DBDA8" />
                  <Text style={styles.searchPillText}>Searching…</Text>
                </View>
              ) : null
            }
            />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        {messages.length === 0 ? (
          <View style={styles.emptyHint}>
            <Text style={[styles.emptyText, { color: theme.mutedText }]}>
              Ask anything about the world — Emo searches research and returns a gentle synthesis.
            </Text>
          </View>
        ) : null}

        {messages.map((m) => {
          if (m.role === 'status') {
            return (
              <View key={m.id} style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { color: '#3DBDA8' }]}>{m.text}</Text>
              </View>
            );
          }
          if (m.role === 'user') {
            return (
              <View key={m.id} style={[styles.userBubble, { backgroundColor: `${theme.accent}33` }]}>
                <Text style={[styles.userText, { color: theme.text }]}>{m.text}</Text>
                {m.time ? <Text style={[styles.timeTag, { color: theme.mutedText }]}>{m.time}</Text> : null}
              </View>
            );
          }
          return (
            <View key={m.id} style={styles.botBlock}>
              <View style={[styles.botBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.botText, { color: theme.text }]}>{m.text}</Text>
              </View>
              {m.sourceCount ? (
                <Text style={[styles.sourceLine, { color: theme.mutedText }]}>
                  Sourced from {m.sourceCount} peer-reviewed {m.sourceCount === 1 ? 'study' : 'studies'}
                </Text>
              ) : null}
            </View>
          );
        })}

        {messages.some((m) => m.role === 'bot') ? (
          <View style={styles.actionRow}>
            <Pressable onPress={guideBreathing} style={[styles.pillBtn, { borderColor: theme.accent }]}>
              <Text style={[styles.pillText, { color: theme.text }]}>Guide me now</Text>
            </Pressable>
            <Pressable onPress={openTalk} style={[styles.pillBtn, { borderColor: '#3DBDA8' }]}>
              <Text style={[styles.pillText, { color: '#3DBDA8' }]}>Show sources</Text>
            </Pressable>
            <Pressable onPress={() => onNav('journal')} style={[styles.pillBtn, { borderColor: '#E89B5C' }]}>
              <Text style={[styles.pillText, { color: '#E89B5C' }]}>Save insight</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

          <View
            style={[
              styles.inputBar,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
              placeholder="Ask anything about the world…"
              placeholderTextColor={theme.mutedText}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => void submit()}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => void submit()}
              disabled={searching || !input.trim()}
              style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: searching ? 0.6 : 1 }]}
            >
              {searching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  searchPillText: { color: '#3DBDA8', fontSize: 12, fontWeight: '600' },
  emptyHint: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
    minHeight: 220,
  },
  emptyText: { fontSize: 16, lineHeight: 24, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#3DBDA8',
  },
  statusText: { fontSize: 14, fontWeight: '600' },
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
    marginTop: 8,
    marginBottom: 16,
  },
  pillBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
