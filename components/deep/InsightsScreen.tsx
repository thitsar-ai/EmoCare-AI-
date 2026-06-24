import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OB_MOODS } from '../../constants/obMoods';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { CircadianGlassCard, CircadianHeroGlow, SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryLabelAccent } from '../../theme/sanctuaryBrand';
import { loadInsightsBundle } from '../../utils/insightsData';
import {
  addHelpedActivity,
  editHelpedItem,
  removeHelpedItem,
} from '../../utils/thingsThatHelped';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { pressLinkStyle } from '../../utils/pressFeedback';
import { ScreenNavChrome, type MainScreenKey } from '../navigation/AppNavigation';
import { HelpedActivitySheet, type HelpedRow } from './HelpedActivitySheet';
import { AddHelpedSheet } from './AddHelpedSheet';

const H_PAD = 22;
const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';

type WeatherMood = { label: string; color: string; emoji: string | null };

function moodEmoji(label: string, fallback: string | null) {
  if (fallback) return fallback;
  return OB_MOODS.find((m) => m.label === label)?.emoji ?? '💜';
}

function SectionEyebrow({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <Text style={[styles.eyebrow, { color }]}>
      {icon} {label}
    </Text>
  );
}

function EmotionalWeatherBubbles({ moods }: { moods: WeatherMood[] }) {
  if (!moods.length) return null;

  return (
    <View style={styles.bubbleCloud}>
      {moods.map((mood, index) => {
        const drift = index % 3 === 1 ? styles.bubbleDriftMid : index % 3 === 2 ? styles.bubbleDriftLow : null;
        return (
          <View
            key={mood.label}
            style={[
              styles.moodBubble,
              drift,
              {
                backgroundColor: `${mood.color}18`,
                borderColor: `${mood.color}40`,
              },
            ]}
          >
            <Text style={styles.bubbleEmoji}>{moodEmoji(mood.label, mood.emoji)}</Text>
            <Text style={[styles.bubbleLabel, { color: mood.color }]}>{mood.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function InsightsScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const labelAccent = getSanctuaryLabelAccent(theme);

  const [weekLabel, setWeekLabel] = useState('This week');
  const [heroInsight, setHeroInsight] = useState('');
  const [emotionalWeather, setEmotionalWeather] = useState<WeatherMood[]>([]);
  const [whatHelpedTitles, setWhatHelpedTitles] = useState<string[]>([]);
  const [gentleGrowth, setGentleGrowth] = useState({ line1: '', line2: '' });
  const [emoReflection, setEmoReflection] = useState('');
  const [helped, setHelped] = useState<HelpedRow[]>([]);
  const [hasLiveData, setHasLiveData] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HelpedRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    const bundle = await loadInsightsBundle(7);
    setWeekLabel(bundle.weekLabel || 'This week');
    setHeroInsight(bundle.heroInsight);
    setEmotionalWeather(bundle.emotionalWeather);
    setWhatHelpedTitles(bundle.whatHelpedTitles);
    setGentleGrowth(bundle.gentleGrowth);
    setEmoReflection(bundle.emoReflection);
    setHelped(bundle.helped as HelpedRow[]);
    setHasLiveData(bundle.hasLiveData);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scrollMinHeight = useMemo(() => {
    const reserved = insets.top + insets.bottom + 168;
    return Math.max(windowHeight - reserved, 420);
  }, [windowHeight, insets.top, insets.bottom]);

  const handleTryNow = useCallback(
    (item: HelpedRow) => {
      setSelectedItem(null);
      if (item.navigate) onNav(item.navigate);
    },
    [onNav],
  );

  const handleTalkEmo = useCallback(
    async (prompt: string) => {
      setSelectedItem(null);
      await AsyncStorage.setItem(PENDING_TALK_QUERY_KEY, prompt);
      onNav('talk');
    },
    [onNav],
  );

  const handleAddCatalog = useCallback(
    async (catalogId: string, categoryId: string) => {
      await addHelpedActivity({ catalogId, categoryId });
      await refresh();
    },
    [refresh],
  );

  const handleAddCustom = useCallback(
    async (title: string, categoryId: string) => {
      await addHelpedActivity({ title, categoryId });
      await refresh();
    },
    [refresh],
  );

  const handleDeleteHelped = useCallback(
    async (item: HelpedRow) => {
      await removeHelpedItem(item);
      setSelectedItem(null);
      await refresh();
    },
    [refresh],
  );

  const handleSaveHelpedEdit = useCallback(
    async (item: HelpedRow, patch: { title: string; sub: string }) => {
      await editHelpedItem(item, patch);
      setSelectedItem(null);
      await refresh();
    },
    [refresh],
  );

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Insights" />
        </View>

        <View style={styles.headerBlock}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your emotional landscape</Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>
              Reflection, not reporting — understanding at your pace.
            </Text>
            <View
              style={[
                styles.weekPill,
                {
                  borderColor: tokens.border.standard,
                  backgroundColor: tokens.bg.card,
                },
              ]}
            >
              <Text style={[styles.weekPillText, { color: theme.secondaryText }]}>{weekLabel}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 28, minHeight: scrollMinHeight },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Hero — Gentle Insight */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.heroCard}>
            <SectionEyebrow icon="💜" label="Gentle Insight" color={tokens.text.primary} />
            <Text style={[styles.heroQuote, { color: theme.text }]}>{heroInsight}</Text>
          </CircadianGlassCard>

          {/* 2. Emotional Weather */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Emotional Weather</Text>
            {emotionalWeather.length === 0 ? (
              <Text style={[styles.emptyCopy, { color: theme.mutedText }]}>
                {hasLiveData
                  ? 'Your emotional skies will take shape as you check in this week.'
                  : 'Check in when you’re ready — your moods will gather here like soft weather.'}
              </Text>
            ) : (
              <EmotionalWeatherBubbles moods={emotionalWeather} />
            )}
          </CircadianGlassCard>

          {/* 3. What Helped This Week */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <View style={styles.helpedHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
                What Helped This Week
              </Text>
              <Pressable
                onPress={() => {
                  void hapticLight();
                  setAddOpen(true);
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.logChip,
                  {
                    borderColor: `${theme.accent}44`,
                    backgroundColor: `${theme.accent}10`,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Log what helped"
              >
                <Plus size={13} color={theme.accent} strokeWidth={2.4} />
                <Text style={[styles.logChipText, { color: theme.accent }]}>Log</Text>
              </Pressable>
            </View>
            {whatHelpedTitles.length === 0 ? (
              <Pressable
                onPress={() => setAddOpen(true)}
                style={({ pressed }) => [styles.emptyHelped, pressLinkStyle(theme, pressed)]}
              >
                <Text style={[styles.emptyCopy, { color: theme.mutedText }]}>
                  Walks, journaling, breathing, time with Emo — log what lifted you this week.
                </Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.helpedCloud}>
                  {whatHelpedTitles.map((title) => {
                    const row = helped.find((h) => h.title === title);
                    return (
                      <Pressable
                        key={title}
                        onPress={() => row && setSelectedItem(row)}
                        disabled={!row}
                        style={({ pressed }) => [
                          styles.helpedChip,
                          {
                            borderColor: tokens.border.strong,
                            backgroundColor: tokens.surface.tint,
                          },
                          row && pressed && { opacity: 0.88 },
                        ]}
                      >
                        <Text style={[styles.helpedChipText, { color: theme.text }]}>{title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.supportCopy, { color: theme.mutedText }]}>
                  These activities often appeared before calmer moments.
                </Text>
              </>
            )}
          </CircadianGlassCard>

          {/* 4. Gentle Growth */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <SectionEyebrow icon="✨" label="Gentle Growth" color={labelAccent} />
            <Text style={[styles.growthLine1, { color: theme.text }]}>{gentleGrowth.line1}</Text>
            <Text style={[styles.growthLine2, { color: theme.secondaryText }]}>
              {gentleGrowth.line2}
            </Text>
          </CircadianGlassCard>

          {/* 5. Emo's Reflection */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.cardLast}>
            <SectionEyebrow icon="💜" label="Emo's Reflection" color={tokens.text.primary} />
            <Text style={[styles.reflectionQuote, { color: theme.text }]}>{emoReflection}</Text>
          </CircadianGlassCard>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ScreenSafeArea>

      <HelpedActivitySheet
        visible={selectedItem != null}
        theme={theme}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onTryNow={handleTryNow}
        onTalkEmo={handleTalkEmo}
        onDelete={handleDeleteHelped}
        onSaveEdit={handleSaveHelpedEdit}
      />

      <AddHelpedSheet
        visible={addOpen}
        theme={theme}
        onClose={() => setAddOpen(false)}
        onAddCatalog={handleAddCatalog}
        onAddCustom={handleAddCustom}
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
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: tokens.typography.pageTitle.fontSize,
    lineHeight: tokens.typography.pageTitle.lineHeight,
    fontWeight: tokens.typography.pageTitle.fontWeight,
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  weekPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  weekPillText: { fontSize: 11, fontWeight: '600' },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  heroCard: {
    marginBottom: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  card: {
    marginBottom: 18,
  },
  cardLast: {
    marginBottom: 0,
  },
  bottomSpacer: {
    minHeight: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  heroQuote: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '400',
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 16,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 22,
  },
  bubbleCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  moodBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  bubbleDriftMid: {
    marginTop: 4,
  },
  bubbleDriftLow: {
    marginTop: -2,
  },
  bubbleEmoji: {
    fontSize: 15,
  },
  bubbleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logChipText: { fontSize: 12, fontWeight: '700' },
  emptyHelped: { paddingVertical: 4 },
  helpedCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  helpedChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  helpedChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  supportCopy: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  growthLine1: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 8,
  },
  growthLine2: {
    fontSize: 14,
    lineHeight: 22,
  },
  reflectionQuote: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
  },
});
