import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChevronDown, Globe, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme, getCircadianIconColor } from '../../theme/circadianTheme';
import { NavChromeBtn, ScreenNavChrome, type MainScreenKey, useAppNav } from '../navigation/AppNavigation';
import { fetchOracleResearchContext } from '../../utils/oracleSearch';
import { logOracleInquiry } from '../../utils/oracleTopicLog';
import { saveOracleInsight } from '../../utils/oracleSavedInsights';
import {
  buildOracleApiMessages,
  buildOracleSystemPrompt,
} from '../../utils/oracleChatPrompt';
import { callAnthropicMessages, describeAnthropicError } from '../../utils/anthropic';
import { loadSettings, saveSettings } from '../../utils/settingsStorage';
import {
  getMiraLanguageLabel,
  miraInputPlaceholder,
  normalizeMiraLanguage,
  resolveMiraComposeLocale,
} from '../../utils/miraLanguage';
import {
  getMiraBirthdayAnswer,
  getMiraStoryAnswer,
  isMiraBirthdayCompareQuestion,
  isMiraBirthdayQuestion,
  isMiraStoryQuestion,
  shouldUseConciseMiraStory,
} from '../../utils/miraIdentity';
import { localeAwareTextStyle, localeTextMetrics } from '../../utils/localeText';
import { BRAND_CTA_GRADIENT, CHAT_USER_BUBBLE_GRADIENT, tokens } from '../../theme/tokens';
import { OracleAmbientCanvas } from './OracleAmbientCanvas';
import { TalkHeroMira } from '../talk/TalkHeroMira';
import { MiraLanguageSheet } from '../talk/MiraLanguageSheet';
import { MiraControlsSheet } from '../talk/MiraControlsSheet';
import { TalkAiConsentSheet } from '../talk/TalkAiConsentSheet';
import { useAnthropicAiConsent } from '../../hooks/useAnthropicAiConsent';
import {
  ORACLE_HEADER_TAGLINE,
  ORACLE_HEADER_TITLE,
  ORACLE_MODES,
  ORACLE_STATUS_SHORT,
  TALK_BG,
  TALK_INPUT_SURFACE,
  oracleSourcesLabel,
  type OracleModeId,
} from '../../constants/brandCopy';
import { hapticLight } from '../../utils/haptics';

const ORACLE_CHAT_KEY = 'oracleChatCurrent';
const NAV_CONTENT_HEIGHT = 72;
const NEAR_BOTTOM_PX = 80;
const USER_GRADIENT = [...CHAT_USER_BUBBLE_GRADIENT] as [string, string, string, string];
const SEND_GRADIENT = [...BRAND_CTA_GRADIENT] as [string, string];

function shouldFetchResearch(mode: OracleModeId, query: string): boolean {
  if (mode === 'deep' || mode === 'wise') return true;
  return /\b(research|study|studies|evidence|data|statistics|compare|history of|sources?|cite)\b/i.test(
    query,
  );
}

function maxTokensForMode(mode: OracleModeId): number {
  if (mode === 'quick') return 550;
  if (mode === 'wise') return 1000;
  return 1200;
}

function statusForMode(mode: OracleModeId): string {
  if (mode === 'quick') return 'Mira is thinking…';
  if (mode === 'wise') return 'Gathering knowledge and perspective…';
  return ORACLE_STATUS_SHORT;
}

type OracleMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time?: string;
  sourceCount?: number;
  query?: string;
  sources?: { title?: string; url?: string }[];
};

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
  try {
    if (messages.length === 0) {
      await AsyncStorage.removeItem(ORACLE_CHAT_KEY);
    } else {
      await AsyncStorage.setItem(ORACLE_CHAT_KEY, JSON.stringify(messages));
    }
  } catch {}
}

export function OracleSearchScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { userName } = useAppNav();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const nearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);

  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [mode, setMode] = useState<OracleModeId>('deep');
  const [messages, setMessages] = useState<OracleMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [miraLanguage, setMiraLanguage] = useState<'auto' | 'en' | 'my' | 'id'>('auto');
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const { showConsentSheet: showAiConsentSheet, grantConsent: handleAiConsent, ensureConsentBeforeSend } =
    useAnthropicAiConsent();

  const narrow = windowWidth < 390;
  const miraPlaceholder = miraInputPlaceholder(miraLanguage);
  const isEmpty = messages.length === 0;
  const accent = tokens.oracle.accent;

  const activeMode = useMemo(
    () => ORACLE_MODES.find((m) => m.id === mode) ?? ORACLE_MODES[1],
    [mode],
  );
  const modeChipLabel = narrow ? activeMode.shortLabel : activeMode.label;

  const lastBot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'bot') return messages[i];
    }
    return null;
  }, [messages]);

  const availability = useMemo(
    () => ({
      canResearchDeeper: Boolean(lastBot?.text?.trim()) && !waiting,
      canSeeSources: Boolean(lastBot && (lastBot.sourceCount ?? 0) > 0 && lastBot.sources?.length),
      canSave: Boolean(lastBot?.text?.trim()),
      canClear: messages.length > 0,
      sourcesDisabledHint: lastBot
        ? 'Available after sourced research'
        : 'Available after Mira replies',
    }),
    [lastBot, messages.length, waiting],
  );

  useEffect(() => {
    void loadSettings().then((s) => {
      setMiraLanguage(normalizeMiraLanguage(s.miraLanguage));
      if (s.miraMode === 'quick' || s.miraMode === 'deep' || s.miraMode === 'wise') {
        setMode(s.miraMode);
      }
    });
  }, []);

  useEffect(() => {
    void loadOracleChat().then((loaded) => {
      if (loaded.length > 0) setMessages(loaded);
      setHistoryLoaded(true);
      if (loaded.length > 0) {
        forceScrollRef.current = true;
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

  const scrollToLatestIfNeeded = useCallback((force = false) => {
    if (force || forceScrollRef.current || nearBottomRef.current) {
      forceScrollRef.current = false;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distance < NEAR_BOTTOM_PX;
  }, []);

  const submitText = useCallback(
    async (rawText: string, activeMode: OracleModeId = mode, opts?: { skipUserBubble?: boolean }) => {
      const trimmed = rawText.trim();
      if (!trimmed || waiting || showAiConsentSheet) return;
      if (!(await ensureConsentBeforeSend())) return;
      const name = userName.trim() || 'friend';
      setInput('');
      setWaiting(true);
      forceScrollRef.current = true;

      const userMsg: OracleMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        time: nowTime(),
      };

      let priorForApi: OracleMessage[] = [];
      setMessages((prev) => {
        priorForApi = prev;
        if (opts?.skipUserBubble) return prev;
        return [...prev, userMsg];
      });

      try {
        const settings = await loadSettings();
        const lang = normalizeMiraLanguage(settings.miraLanguage);
        setMiraLanguage(lang);
        const recentUserTexts = priorForApi
          .filter((m) => m.role === 'user')
          .map((m) => m.text)
          .slice(-6);
        const composeLocale = resolveMiraComposeLocale(lang, trimmed, recentUserTexts);

        const miraLocale = composeLocale === 'my' ? 'my' : 'en';
        if (isMiraBirthdayQuestion(trimmed)) {
          const replyText = getMiraBirthdayAnswer({
            locale: miraLocale,
            compare: isMiraBirthdayCompareQuestion(trimmed),
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              role: 'bot',
              text: replyText,
              time: nowTime(),
              sourceCount: 0,
              query: trimmed,
              sources: [],
            },
          ]);
          return;
        }
        if (isMiraStoryQuestion(trimmed)) {
          const replyText = getMiraStoryAnswer({
            locale: miraLocale,
            concise: shouldUseConciseMiraStory(trimmed, activeMode),
            userName: name !== 'friend' ? name : '',
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              role: 'bot',
              text: replyText,
              time: nowTime(),
              sourceCount: 0,
              query: trimmed,
              sources: [],
            },
          ]);
          return;
        }

        let research = { contextBlock: '', sources: [] as { title?: string; url?: string }[] };
        if (shouldFetchResearch(activeMode, trimmed)) {
          try {
            research = await Promise.race([
              fetchOracleResearchContext(trimmed),
              new Promise<typeof research>((resolve) =>
                setTimeout(() => resolve({ contextBlock: '', sources: [] }), 10000),
              ),
            ]);
          } catch {
            research = { contextBlock: '', sources: [] };
          }
        }

        const userBlock = research.contextBlock
          ? `${trimmed}\n\n${research.contextBlock}`
          : trimmed;

        const apiHistory = buildOracleApiMessages(priorForApi);
        const result = await callAnthropicMessages({
          system: buildOracleSystemPrompt(name, activeMode, lang, {
            userMessage: trimmed,
            recentUserTexts,
          }),
          messages: [...apiHistory, { role: 'user', content: userBlock }],
          maxTokens: maxTokensForMode(activeMode),
          route: 'oracle', // legacy route id — companion is Mira
          languageMeta: undefined,
          temperature: undefined,
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
            ...prev,
            {
              id: `b-err-${Date.now()}`,
              role: 'bot',
              text: errMsg,
              time: nowTime(),
              sourceCount: 0,
              query: trimmed,
              sources: [],
            },
          ]);
          return;
        }

        void logOracleInquiry({
          query: trimmed,
          message: replyText,
          sources: research.sources || [],
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: 'bot',
            text: replyText,
            time: nowTime(),
            sourceCount: research.sources?.length || 0,
            query: trimmed,
            sources: research.sources || [],
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-err-${Date.now()}`,
            role: 'bot',
            text: `I couldn't reply just now, ${name}. Please try again in a moment.`,
            time: nowTime(),
            sourceCount: 0,
            query: trimmed,
          },
        ]);
      } finally {
        setWaiting(false);
        scrollToLatestIfNeeded(true);
      }
    },
    [waiting, showAiConsentSheet, ensureConsentBeforeSend, userName, mode, scrollToLatestIfNeeded],
  );

  const send = useCallback(() => {
    void submitText(input, mode);
  }, [input, submitText, mode]);

  const selectMode = useCallback((next: OracleModeId) => {
    setMode(next);
    void saveSettings({ miraMode: next });
    setControlsOpen(false);
    setTimeout(() => inputRef.current?.focus(), 180);
  }, []);

  /** iOS often swallows Alert if shown in the same tick as Modal dismiss. */
  const afterSheetClose = useCallback((fn: () => void) => {
    setControlsOpen(false);
    setTimeout(fn, 380);
  }, []);

  const clearHistory = useCallback(() => {
    afterSheetClose(() => {
      Alert.alert('Clear conversation', 'Remove all Mira messages?', [
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
    });
  }, [afterSheetClose]);

  const saveLatestInsight = useCallback(() => {
    afterSheetClose(() => {
      void (async () => {
        if (!lastBot?.text.trim()) {
          Alert.alert('Nothing to save', 'Ask Mira a question first.');
          return;
        }
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        const ok = await saveOracleInsight({
          query: lastBot.query || lastUser?.text || '',
          insight: lastBot.text,
          sourceCount: lastBot.sourceCount || 0,
          sourceTitles: (lastBot.sources || []).map((s) => s.title || '').filter(Boolean),
        });
        if (ok) {
          Alert.alert('Saved', 'This Mira answer was saved to your library.', [
            { text: 'Stay here', style: 'cancel' },
            { text: 'View Insights', onPress: () => onNav('insights') },
          ]);
        }
      })();
    });
  }, [afterSheetClose, lastBot, messages, onNav]);

  const showSources = useCallback(() => {
    afterSheetClose(() => {
      if (!lastBot) return;
      const titles = (lastBot.sources || []).map((s) => s.title).filter(Boolean);
      if (!titles.length) {
        Alert.alert('Sources', 'No published sources were attached to this reply.');
        return;
      }
      Alert.alert('Published sources', titles.join('\n\n'));
    });
  }, [afterSheetClose, lastBot]);

  const researchDeeper = useCallback(() => {
    if (!lastBot) return;
    const topic = (lastBot.query || '').trim();
    const followUp = topic
      ? `Research deeper on that last answer about “${topic.slice(0, 80)}${topic.length > 80 ? '…' : ''}”. Expand with thorough analysis and published sources.`
      : 'Research deeper on your last answer. Expand with thorough analysis and published sources.';
    afterSheetClose(() => {
      setMode('deep');
      void saveSettings({ miraMode: 'deep' });
      void submitText(followUp, 'deep');
    });
  }, [afterSheetClose, lastBot, submitText]);

  const openControls = useCallback(() => {
    void hapticLight();
    Keyboard.dismiss();
    setControlsOpen(true);
  }, []);

  const statusLine = waiting ? statusForMode(mode) : null;

  return (
    <View style={[styles.flex, { backgroundColor: TALK_BG }]}>
      <OracleAmbientCanvas />

      <ScreenSafeArea extraTop={4} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.headerWrap}>
            <ScreenNavChrome
              theme={theme}
              title={ORACLE_HEADER_TITLE}
              actionsBeforeNav={
                <NavChromeBtn
                  theme={theme}
                  onPress={() => {
                    void hapticLight();
                    setLanguageSheetOpen(true);
                  }}
                  accessibilityLabel={`Mira language, ${getMiraLanguageLabel(miraLanguage)}`}
                >
                  <Globe size={18} color={theme.text} strokeWidth={2.4} />
                </NavChromeBtn>
              }
            />
            <View style={styles.brandFaceBlock}>
              <TalkHeroMira theme={theme} size="header" />
              <Text
                style={[styles.brandTaglineUnderFace, { color: theme.secondaryText }]}
                numberOfLines={2}
              >
                {ORACLE_HEADER_TAGLINE}
              </Text>
            </View>
            {statusLine ? (
              <View style={styles.presenceRow}>
                <Text style={[styles.presenceText, { color: theme.text }]} numberOfLines={1}>
                  {statusLine}
                </Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, isEmpty && styles.scrollContentEmpty]}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => scrollToLatestIfNeeded(false)}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            maintainVisibleContentPosition={
              Platform.OS === 'ios' ? { minIndexForVisible: 0 } : undefined
            }
          >
            {isEmpty ? (
              <View style={styles.emptyBlock}>
                <TalkHeroMira theme={theme} size="hero" />
                <Text style={[styles.emptyTagline, { color: theme.secondaryText }]}>
                  {ORACLE_HEADER_TAGLINE}
                </Text>
                <Text
                  style={[
                    styles.emptyPrompt,
                    { color: theme.secondaryText },
                    localeAwareTextStyle('What would you like Mira to explore?', {
                      fontSize: 16,
                      englishLineHeight: 24,
                      baseFontFamily: SERIF,
                    }),
                  ]}
                >
                  What would you like Mira to explore?
                </Text>
              </View>
            ) : (
              messages.map((m) =>
                m.role === 'bot' ? (
                  <View key={m.id} style={styles.msgBot}>
                    <View
                      style={[
                        styles.botBubble,
                        {
                          borderColor: tokens.glass.cardBorder,
                          backgroundColor: tokens.surface.frosted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.botText,
                          { color: theme.text },
                          localeAwareTextStyle(m.text, {
                            fontSize: 15,
                            englishLineHeight: 23,
                            baseFontFamily: SERIF,
                          }),
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                    {(m.sourceCount ?? 0) > 0 ? (
                      <Text style={[styles.sourceLine, { color: theme.secondaryText }]}>
                        {oracleSourcesLabel(m.sourceCount || 0)}
                      </Text>
                    ) : null}
                    {m.time ? (
                      <Text style={[styles.msgTime, { color: theme.secondaryText }]}>{m.time}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View key={m.id} style={styles.msgUser}>
                    <LinearGradient
                      colors={USER_GRADIENT}
                      locations={[0, 0.33, 0.67, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={[
                        styles.userBubble,
                        (() => {
                          const pad = localeTextMetrics(m.text, {
                            fontSize: 14,
                            englishPaddingV: 12,
                          });
                          return {
                            paddingTop: pad.paddingTop,
                            paddingBottom: pad.paddingBottom,
                          };
                        })(),
                      ]}
                    >
                      <Text
                        style={[
                          styles.userText,
                          localeAwareTextStyle(m.text, { fontSize: 14, englishLineHeight: 21 }),
                        ]}
                      >
                        {m.text}
                      </Text>
                    </LinearGradient>
                    {m.time ? (
                      <Text style={[styles.msgTime, styles.msgTimeUser, { color: theme.secondaryText }]}>
                        {m.time} ✓✓
                      </Text>
                    ) : null}
                  </View>
                ),
              )
            )}
            {waiting ? (
              <View style={styles.msgBot}>
                <Text style={[styles.typingGlyph, { color: theme.accent }]}>···</Text>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.composerWrap,
              {
                paddingBottom: NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 6),
                borderTopColor: tokens.border.standard,
                backgroundColor: TALK_INPUT_SURFACE,
              },
              // Hide while controls sheet is open so the input never ghosts through.
              controlsOpen && styles.composerHidden,
            ]}
            pointerEvents={controlsOpen ? 'none' : 'auto'}
          >
            <Pressable
              onPress={() => {
                void hapticLight();
                setLanguageSheetOpen(true);
              }}
              style={styles.langChip}
              accessibilityRole="button"
              accessibilityLabel={`Mira language, ${getMiraLanguageLabel(miraLanguage)}`}
            >
              <Globe size={13} color={theme.accent} strokeWidth={2.2} />
              <Text style={[styles.langChipText, { color: theme.accent }]}>
                {getMiraLanguageLabel(miraLanguage)}
              </Text>
            </Pressable>

            <View style={styles.composerRow}>
              <Pressable
                onPress={openControls}
                style={[
                  styles.modeChip,
                  {
                    borderColor: `${accent}55`,
                    backgroundColor: `${accent}14`,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Select Mira response style"
                accessibilityHint={`Current mode ${activeMode.label}`}
                accessibilityState={{ expanded: controlsOpen }}
              >
                <Text
                  style={[styles.modeChipText, { color: accent }]}
                  numberOfLines={1}
                >
                  {modeChipLabel}
                </Text>
                <ChevronDown size={14} color={accent} strokeWidth={2.4} />
              </Pressable>

              <View
                style={[
                  styles.inputPill,
                  {
                    backgroundColor: TALK_INPUT_SURFACE,
                    borderColor: tokens.border.standard,
                  },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  placeholder="What would you like Mira to explore?"
                  placeholderTextColor={theme.secondaryText}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={send}
                  editable={!waiting}
                  returnKeyType="send"
                  submitBehavior="submit"
                  blurOnSubmit={false}
                  multiline={false}
                  style={[
                    styles.composerInput,
                    { color: theme.text },
                    (() => {
                      const sample = input || miraPlaceholder;
                      const m = localeTextMetrics(sample, {
                        fontSize: 15,
                        englishLineHeight: 21,
                        englishPaddingV: 8,
                      });
                      return {
                        lineHeight: m.lineHeight,
                        paddingTop: Math.max(8, m.paddingTop - 4),
                        paddingBottom: Math.max(8, m.paddingBottom - 4),
                        ...(m.myanmar ? { fontFamily: undefined } : {}),
                      };
                    })(),
                  ]}
                />
              </View>

              <Pressable
                style={[styles.sendWrap, (waiting || !input.trim()) && styles.sendDisabled]}
                onPress={send}
                disabled={waiting || !input.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send to Mira"
              >
                <LinearGradient colors={SEND_GRADIENT} style={styles.sendBtn}>
                  <Text style={styles.sendGlyph}>↑</Text>
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.privacyRow}>
              <Lock size={12} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2.2} />
              <Text style={[styles.privacyText, { color: theme.secondaryText }]}>
                Private to you · Mira thinks carefully
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenSafeArea>

      <MiraControlsSheet
        visible={controlsOpen}
        theme={theme}
        mode={mode}
        availability={availability}
        onClose={() => {
          setControlsOpen(false);
          setTimeout(() => inputRef.current?.focus(), 180);
        }}
        onSelectMode={selectMode}
        onResearchDeeper={researchDeeper}
        onSeeSources={showSources}
        onSave={saveLatestInsight}
        onClear={clearHistory}
      />

      <MiraLanguageSheet
        visible={languageSheetOpen}
        theme={theme}
        value={miraLanguage}
        onClose={() => setLanguageSheetOpen(false)}
        onSelect={(id) => {
          void (async () => {
            const next = await saveSettings({ miraLanguage: id });
            setMiraLanguage(normalizeMiraLanguage(next.miraLanguage));
          })();
        }}
      />

      <TalkAiConsentSheet
        visible={showAiConsentSheet}
        theme={theme}
        onConsent={() => void handleAiConsent()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: {
    paddingBottom: 2,
  },
  brandFaceBlock: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
  },
  brandTaglineUnderFace: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    letterSpacing: 0.15,
  },
  emptyTagline: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  composerHidden: {
    opacity: 0,
  },
  presenceRow: {
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  presenceText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  scrollContentEmpty: {
    justifyContent: 'center',
  },
  emptyBlock: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
    paddingVertical: 20,
  },
  emptyPrompt: {
    textAlign: 'center',
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 24,
  },
  msgBot: {
    alignSelf: 'stretch',
    marginBottom: 12,
    maxWidth: '94%',
  },
  botBubble: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  botText: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: SERIF,
  },
  sourceLine: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: SERIF,
    marginTop: 6,
    marginLeft: 4,
  },
  msgUser: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    maxWidth: '88%',
  },
  userBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  msgTime: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  msgTimeUser: {
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  typingGlyph: {
    fontSize: 28,
    letterSpacing: 2,
    fontWeight: '700',
    marginLeft: 8,
    marginTop: 4,
  },
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    maxWidth: 148,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 1,
    flexShrink: 0,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  inputPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  composerInput: {
    fontSize: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendWrap: {
    flexShrink: 0,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});
