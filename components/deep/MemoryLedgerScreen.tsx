import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { CircadianGlassCard, CircadianHeroGlow, SERIF } from '../shared/CircadianHeroGlow';
import { moodCheckInCardShadow, selectableCardStyle, selectableLabelColor } from '../../theme/glassSurfaces';
import { useCircadianTheme, getCircadianIconColor, type CircadianTheme } from '../../theme/circadianTheme';
import {
  dismissContextItem,
  dismissMemoryItem,
  loadMemoryLedgerBundle,
} from '../../utils/memoryLedger';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { ScreenNavChrome, useAppNav } from '../navigation/AppNavigation';
import { MemoryItemDetailSheet, type MemoryDetailItem } from './MemoryItemDetailSheet';

const H_PAD = 22;

type CategoryId = 'growth' | 'relationships' | 'reflection' | 'gratitude' | 'challenges' | 'milestones';

type TimelineItem = {
  id: string;
  dayLabel: string;
  monthKey: string;
  moodLabel: string;
  emoji: string;
  quote: string;
  category: string;
  kind: string;
  title: string;
  sourceItem?: MemoryDetailItem;
};

function SectionEyebrow({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <Text style={[styles.eyebrow, { color }]}>
      {icon} {label}
    </Text>
  );
}

function RememberStat({ label, value, theme }: { label: string; value: string; theme: CircadianTheme }) {
  return (
    <View style={styles.rememberStat}>
      <Text style={[styles.rememberValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.rememberLabel, { color: theme.mutedText }]}>{label}</Text>
    </View>
  );
}

export function MemoryLedgerScreen() {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { userName } = useAppNav();

  const [emoRemembers, setEmoRemembers] = useState({
    reflectionsCount: 0,
    conversationsCount: 0,
    savedInsightsCount: 0,
    meaningfulMemoriesCount: 0,
  });
  const [featuredMemory, setFeaturedMemory] = useState({
    dayLabel: '',
    moodLabel: '',
    emoji: '💜',
    quote: '',
    reason: '',
  });
  const [emotionalPatterns, setEmotionalPatterns] = useState<string[]>([]);
  const [memoryReflection, setMemoryReflection] = useState('');
  const [timelineByMonth, setTimelineByMonth] = useState<{ monthKey: string; items: TimelineItem[] }[]>([]);
  const [memoryCategories, setMemoryCategories] = useState<
    { id: string; icon: string; label: string }[]
  >([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selected, setSelected] = useState<MemoryDetailItem | null>(null);

  const refresh = useCallback(async () => {
    const bundle = await loadMemoryLedgerBundle(userName);
    setEmoRemembers(bundle.emoRemembers);
    setFeaturedMemory(bundle.featuredMemory);
    setEmotionalPatterns(bundle.emotionalPatterns);
    setMemoryReflection(bundle.memoryReflection);
    setTimelineByMonth(bundle.timelineByMonth as { monthKey: string; items: TimelineItem[] }[]);
    setMemoryCategories(bundle.memoryCategories);
    setCategoryCounts((bundle.categoryCounts ?? {}) as Record<string, number>);
  }, [userName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scrollMinHeight = useMemo(() => {
    const reserved = insets.top + insets.bottom + 168;
    return Math.max(windowHeight - reserved, 480);
  }, [windowHeight, insets.top, insets.bottom]);

  const filteredTimeline = useMemo(() => {
    if (!selectedCategory) return timelineByMonth;
    return timelineByMonth
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.category === selectedCategory),
      }))
      .filter((group) => group.items.length > 0);
  }, [selectedCategory, timelineByMonth]);

  const openTimelineItem = (item: TimelineItem) => {
    if (item.sourceItem) {
      setSelected(item.sourceItem as MemoryDetailItem);
      return;
    }
    setSelected({
      id: item.id,
      text: item.quote,
      label: item.title,
      detail: item.quote,
      kind: item.kind === 'milestone' ? 'milestone' : 'context',
      erasable: item.kind === 'milestone' || item.kind === 'context',
    });
  };

  const handleForget = useCallback(
    (item: MemoryDetailItem) => {
      const label = item.label || item.text || 'this memory';
      Alert.alert('Forget this memory?', `Emo will stop surfacing “${label}” on this device.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            setSelected(null);
            const dismiss =
              item.kind === 'milestone' ? dismissMemoryItem(item.id) : dismissContextItem(item.id);
            void dismiss.then(refresh);
          },
        },
      ]);
    },
    [refresh],
  );

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Memory Ledger" />
        </View>

        <View style={styles.headerBlock}>
          <Text style={[styles.headerSubtitle, { color: theme.mutedText }]}>
            A record of moments that helped shape your journey.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 28, minHeight: scrollMinHeight },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Emo remembers summary */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Emo remembers</Text>
            <View style={styles.rememberGrid}>
              <RememberStat theme={theme} value={String(emoRemembers.reflectionsCount)} label="reflections" />
              <RememberStat theme={theme} value={String(emoRemembers.conversationsCount)} label="conversations" />
              <RememberStat
                theme={theme}
                value={String(emoRemembers.savedInsightsCount)}
                label="saved insights"
              />
              <RememberStat
                theme={theme}
                value={String(emoRemembers.meaningfulMemoriesCount)}
                label="meaningful memories"
              />
            </View>
          </CircadianGlassCard>

          {/* Featured memory */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.featuredCard}>
            <Text style={[styles.featuredEyebrow, { color: tokens.text.primary }]}>Featured Memory</Text>
            {featuredMemory.dayLabel ? (
              <Text style={[styles.featuredDate, { color: theme.secondaryText }]}>
                {featuredMemory.dayLabel}
              </Text>
            ) : null}
            {featuredMemory.moodLabel ? (
              <Text style={[styles.featuredMood, { color: theme.text }]}>
                {featuredMemory.emoji} {featuredMemory.moodLabel}
              </Text>
            ) : null}
            <Text style={[styles.featuredQuote, { color: theme.text }]}>{featuredMemory.quote}</Text>
            <Text style={[styles.featuredReason, { color: theme.mutedText }]}>{featuredMemory.reason}</Text>
          </CircadianGlassCard>

          {/* Categories */}
          <Text style={[styles.sectionEyebrow, { color: theme.mutedText }]}>Memory categories</Text>
          <View style={styles.categoryGrid}>
            {memoryCategories.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    void hapticLight();
                    setSelectedCategory(active ? null : (cat.id as CategoryId));
                  }}
                  style={[
                    styles.categoryCard,
                    selectableCardStyle(active),
                    moodCheckInCardShadow(active),
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: selectableLabelColor(active, theme.text) },
                    ]}
                  >
                    {cat.label}
                  </Text>
                  <Text style={[styles.categoryCount, { color: theme.text }]}>{count}</Text>
                  <Text style={[styles.categoryCountLabel, { color: theme.mutedText }]}>
                    {count === 1 ? 'memory' : 'memories'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* What Emo remembers */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>What Emo Remembers</Text>
            {emotionalPatterns.map((line) => (
              <Text key={line} style={[styles.patternLine, { color: theme.text }]}>
                {line}
              </Text>
            ))}
          </CircadianGlassCard>

          {/* Timeline */}
          <Text style={[styles.sectionEyebrow, { color: theme.mutedText }]}>
            {selectedCategory ? 'Filtered timeline' : 'Your journey'}
          </Text>
          {filteredTimeline.length === 0 ? (
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
              <Text style={[styles.emptyCopy, { color: theme.mutedText }]}>
                {selectedCategory
                  ? 'No memories in this category yet — your story is still unfolding.'
                  : 'Your timeline will grow as you check in, journal, and talk with Emo.'}
              </Text>
            </CircadianGlassCard>
          ) : (
            filteredTimeline.map((group) => (
              <View key={group.monthKey} style={styles.monthGroup}>
                <Text style={[styles.monthLabel, { color: theme.text }]}>{group.monthKey}</Text>
                <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.timelineCard}>
                  {group.items.map((item, idx) => (
                    <Pressable
                      key={item.id}
                      onPress={() => openTimelineItem(item)}
                      style={({ pressed }) => [
                        styles.timelineRow,
                        idx < group.items.length - 1 && styles.timelineRowBorder,
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <Text style={[styles.timelineDay, { color: theme.secondaryText }]}>
                        {item.dayLabel}
                      </Text>
                      <Text style={[styles.timelineMood, { color: theme.text }]}>
                        {item.emoji} {item.moodLabel}
                      </Text>
                      <Text style={[styles.timelineQuote, { color: theme.text }]} numberOfLines={3}>
                        {item.quote}
                      </Text>
                    </Pressable>
                  ))}
                </CircadianGlassCard>
              </View>
            ))
          )}

          {/* Memory reflection */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.cardLast}>
            <SectionEyebrow icon="💜" label="Memory Reflection" color={tokens.text.primary} />
            <Text style={[styles.reflectionQuote, { color: theme.text }]}>{memoryReflection}</Text>
          </CircadianGlassCard>

          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.privacyCard}>
            <Smartphone size={16} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2} />
            <Text style={[styles.privacyText, { color: theme.mutedText }]}>
              Stored only on this device. Nothing shared. Nothing sold.
            </Text>
          </CircadianGlassCard>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ScreenSafeArea>

      <MemoryItemDetailSheet
        visible={selected != null}
        theme={theme}
        item={selected}
        onClose={() => setSelected(null)}
        onForget={handleForget}
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
    paddingHorizontal: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  card: { marginBottom: 18 },
  cardLast: { marginBottom: 18 },
  featuredCard: {
    marginBottom: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  rememberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rememberStat: {
    width: '47%',
    paddingVertical: 4,
  },
  rememberValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: SERIF,
    marginBottom: 4,
    lineHeight: 40,
  },
  rememberLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  featuredEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  featuredDate: {
    fontSize: 13,
    marginBottom: 6,
  },
  featuredMood: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  featuredQuote: {
    fontFamily: SERIF,
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 12,
  },
  featuredReason: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  categoryCard: {
    width: '48%',
    minWidth: '46%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  categoryIcon: { fontSize: 22, marginBottom: 6 },
  categoryLabel: {
    fontFamily: SERIF,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: SERIF,
    lineHeight: 40,
    marginTop: 4,
  },
  categoryCountLabel: { fontSize: 11, marginTop: 2 },
  patternLine: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10,
    fontFamily: SERIF,
  },
  monthGroup: { marginBottom: 16 },
  monthLabel: {
    fontFamily: SERIF,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  timelineCard: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  timelineRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  timelineRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.standard,
  },
  timelineDay: {
    fontSize: 12,
    marginBottom: 4,
  },
  timelineMood: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  timelineQuote: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 23,
  },
  reflectionQuote: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 22,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
  },
  privacyText: { flex: 1, fontSize: 13, lineHeight: 19 },
  bottomSpacer: { minHeight: 24 },
});
