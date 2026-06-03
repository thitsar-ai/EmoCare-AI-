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
import { ChevronRight, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import {
  CircadianGlassCard,
  CircadianHeroGlow,
  SERIF,
} from '../shared/CircadianHeroGlow';
import { useCircadianTheme, getCircadianIconColor } from '../../theme/circadianTheme';
import { loadInsightsBundle } from '../../utils/insightsData';
import { addHelpedActivity } from '../../utils/thingsThatHelped';
import { ScreenNavChrome, type MainScreenKey } from '../navigation/AppNavigation';
import { HelpedActivitySheet, type HelpedRow } from './HelpedActivitySheet';
import { AddHelpedSheet } from './AddHelpedSheet';

const H_PAD = 22;
const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';

export function InsightsScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [weekLabel, setWeekLabel] = useState('This week');
  const [themes, setThemes] = useState<{ label: string; pct: number; color: string }[]>([]);
  const [gentleInsight, setGentleInsight] = useState('');
  const [helped, setHelped] = useState<HelpedRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<HelpedRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    const bundle = await loadInsightsBundle(7);
    setWeekLabel(bundle.weekLabel || 'This week');
    setThemes(bundle.themes);
    setGentleInsight(bundle.gentleInsight);
    setHelped(bundle.helped as HelpedRow[]);
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

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Insights" titleFontSize={15} />
        </View>

        <View style={styles.headerBlock}>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>
              Understanding your emotional world
            </Text>
            <View style={[styles.weekPill, { borderColor: theme.border, backgroundColor: theme.card }]}>
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
          <View style={styles.cardsColumn}>
            <CircadianGlassCard theme={theme} style={styles.card}>
              <Text style={[styles.eyebrow, { color: '#3DBDA8' }]}>A GENTLE INSIGHT</Text>
              <Text style={[styles.insightQuote, { color: theme.text }]}>{gentleInsight}</Text>
            </CircadianGlassCard>

            <CircadianGlassCard theme={theme} style={styles.card}>
              <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>EMOTIONAL THEMES</Text>
              {themes.map((row) => (
                <View key={row.label} style={styles.themeRow}>
                  <View style={[styles.themeDot, { backgroundColor: row.color }]} />
                  <View style={styles.themeMain}>
                    <View style={styles.themeLabelRow}>
                      <Text style={[styles.themeLabel, { color: theme.text }]}>{row.label}</Text>
                      <Text style={[styles.themePct, { color: theme.mutedText }]}>{row.pct}%</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: theme.barTrack }]}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.min(100, row.pct)}%`, backgroundColor: row.color },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </CircadianGlassCard>

            <CircadianGlassCard theme={theme} style={{ ...styles.card, marginBottom: 0 }}>
              <View style={styles.helpedHeader}>
                <Text style={[styles.eyebrow, { color: theme.secondaryText, marginBottom: 0 }]}>
                  THINGS THAT HELPED
                </Text>
                <Pressable
                  onPress={() => setAddOpen(true)}
                  style={({ pressed }) => [
                    styles.addChip,
                    { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
                    pressed && styles.chromeBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Log what helped"
                >
                  <Plus size={14} color={theme.accent} strokeWidth={2.4} />
                  <Text style={[styles.addChipText, { color: theme.accent }]}>Log</Text>
                </Pressable>
              </View>

              {helped.length === 0 ? (
                <Pressable onPress={() => setAddOpen(true)} style={styles.emptyHelped}>
                  <Text style={[styles.emptyHelpedText, { color: theme.mutedText }]}>
                    Tap Log to record what lifted your mood this week — walks, movies, time with friends, and more.
                  </Text>
                </Pressable>
              ) : (
                helped.map((item, idx) => (
                  <Pressable
                    key={item.recordId || item.id}
                    onPress={() => setSelectedItem(item)}
                    style={[
                      styles.helpedRow,
                      idx < helped.length - 1 && { borderBottomColor: theme.border, ...styles.helpedBorder },
                    ]}
                  >
                    <View style={[styles.octIcon, { backgroundColor: `${item.color}33`, borderColor: item.color }]}>
                      <View style={[styles.octInner, { backgroundColor: item.color }]} />
                    </View>
                    <View style={styles.helpedText}>
                      <Text style={[styles.helpedTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={[styles.helpedSub, { color: theme.mutedText }]}>{item.sub}</Text>
                    </View>
                    <ChevronRight size={18} color={getCircadianIconColor(theme, 'muted')} strokeWidth={2.2} />
                  </Pressable>
                ))
              )}
            </CircadianGlassCard>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </ScreenSafeArea>

      <HelpedActivitySheet
        visible={selectedItem != null}
        theme={theme}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onTryNow={handleTryNow}
        onTalkEmo={handleTalkEmo}
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
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 2,
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
  headerBlock: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 16,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  weekPill: {
    borderWidth: 0.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  weekPillText: { fontSize: 12, fontWeight: '600' },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  cardsColumn: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 18,
  },
  bottomSpacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 16 },
  helpedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addChipText: { fontSize: 12, fontWeight: '700' },
  emptyHelped: { paddingVertical: 8 },
  emptyHelpedText: { fontSize: 14, lineHeight: 21 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  themeDot: { width: 10, height: 10, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  themeMain: { flex: 1 },
  themeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  themeLabel: { fontSize: 15, fontWeight: '600' },
  themePct: { fontSize: 13 },
  barTrack: { height: 9, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  insightQuote: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  helpedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  helpedBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  octIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '22.5deg' }],
  },
  octInner: { width: 10, height: 10, borderRadius: 2 },
  helpedText: { flex: 1 },
  helpedTitle: { fontSize: 15, fontWeight: '700' },
  helpedSub: { fontSize: 12, marginTop: 3 },
});
