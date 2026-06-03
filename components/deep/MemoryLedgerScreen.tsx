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
import { ChevronRight, Smartphone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import {
  CircadianGlassCard,
  CircadianHeroGlow,
} from '../shared/CircadianHeroGlow';
import { useCircadianTheme, getCircadianIconColor, type CircadianTheme } from '../../theme/circadianTheme';
import {
  clearAllMemoryItems,
  dismissContextItem,
  dismissMemoryItem,
  loadMemoryLedgerBundle,
} from '../../utils/memoryLedger';
import { exportUserData } from '../../utils/dataExport';
import { ScreenNavChrome, useAppNav } from '../navigation/AppNavigation';
import { MemoryItemDetailSheet, type MemoryDetailItem } from './MemoryItemDetailSheet';

const H_PAD = 22;

type LedgerRow = MemoryDetailItem & { text: string; color?: string };

export function MemoryLedgerScreen() {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { userName } = useAppNav();
  const [context, setContext] = useState<LedgerRow[]>([]);
  const [milestones, setMilestones] = useState<LedgerRow[]>([]);
  const [memoryTypes, setMemoryTypes] = useState<MemoryDetailItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [stats, setStats] = useState({ checkInCount: 0, journalCount: 0, streak: 0 });
  const [selected, setSelected] = useState<MemoryDetailItem | null>(null);

  const destructive = theme.isDark ? '#E87898' : '#D46BA8';
  const destructiveBg = theme.isDark ? 'rgba(120,30,60,0.45)' : 'rgba(212,107,168,0.15)';

  const refresh = useCallback(async () => {
    const bundle = await loadMemoryLedgerBundle(userName);
    setContext(bundle.context as LedgerRow[]);
    setMilestones(bundle.milestones as LedgerRow[]);
    setMemoryTypes(
      bundle.memoryTypes.map((t) => ({
        ...t,
        kind: 'type' as const,
        erasable: false,
        detail: t.summary,
      })),
    );
    setSavedCount(bundle.savedCount);
    setStats(bundle.stats);
  }, [userName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scrollMinHeight = useMemo(() => {
    const reserved = insets.top + insets.bottom + 168;
    return Math.max(windowHeight - reserved, 480);
  }, [windowHeight, insets.top, insets.bottom]);

  const btnStyle = { backgroundColor: theme.card, borderColor: theme.border };

  const handleForget = useCallback(
    (item: MemoryDetailItem) => {
      const label = item.label || item.text || 'this item';
      Alert.alert('Forget this memory?', `Emo will stop surfacing “${label}” on this device.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            setSelected(null);
            const dismiss =
              item.kind === 'milestone'
                ? dismissMemoryItem(item.id)
                : dismissContextItem(item.id);
            void dismiss.then(refresh);
          },
        },
      ]);
    },
    [refresh],
  );

  const handleClearAll = () => {
    Alert.alert('Clear all memory?', 'Emo will forget saved context and milestones on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => void clearAllMemoryItems().then(refresh),
      },
    ]);
  };

  const handleExport = () => {
    void exportUserData().catch(() => {
      Alert.alert('Export failed', 'Could not export data on this device.');
    });
  };

  const openRow = (item: MemoryDetailItem) => setSelected(item);

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Memory Ledger" titleFontSize={15} />
        </View>

        <View style={styles.headerBlock}>
          <Text style={[styles.subtitle, { color: theme.mutedText }]}>
            What Emo holds for you · tap any item to learn more
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 28, minHeight: scrollMinHeight },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardsColumn}>
            <CircadianGlassCard theme={theme} style={styles.statsCard}>
              <StatCell theme={theme} label="Saved" value={String(savedCount)} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <StatCell theme={theme} label="Check-ins" value={String(stats.checkInCount)} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <StatCell theme={theme} label="Journal" value={String(stats.journalCount)} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <StatCell
                theme={theme}
                label="Streak"
                value={stats.streak > 0 ? `${stats.streak}d` : '—'}
                accent={stats.streak >= 3 ? '#3DBDA8' : undefined}
              />
            </CircadianGlassCard>

            <CircadianGlassCard theme={theme} style={styles.card}>
              <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>PERSONAL CONTEXT</Text>
              {context.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                  No context yet. Check in or journal and Emo will learn gentle patterns here.
                </Text>
              ) : (
                context.map((row, idx) => (
                  <LedgerRowView
                    key={row.id}
                    theme={theme}
                    text={row.text}
                    color={theme.accent}
                    isLast={idx === context.length - 1}
                    onPress={() => openRow(row)}
                  />
                ))
              )}
            </CircadianGlassCard>

            <CircadianGlassCard theme={theme} style={styles.card}>
              <Text style={[styles.eyebrow, { color: '#3DBDA8' }]}>MILESTONES</Text>
              {milestones.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                  Milestones appear as you build rhythm — first journal, streaks, and more.
                </Text>
              ) : (
                milestones.map((row, idx) => (
                  <LedgerRowView
                    key={row.id}
                    theme={theme}
                    text={row.text}
                    color={row.color || '#9B7BFF'}
                    isLast={idx === milestones.length - 1}
                    onPress={() => openRow(row)}
                  />
                ))
              )}
            </CircadianGlassCard>

            <CircadianGlassCard theme={theme} style={styles.card}>
              <Text style={[styles.eyebrow, { color: '#E89B5C' }]}>WHAT EMO REMEMBERS</Text>
              <Text style={[styles.sectionHint, { color: theme.mutedText }]}>
                Types of memory Emo may use to support you — always on this device only.
              </Text>
              {memoryTypes.map((row, idx) => (
                <LedgerRowView
                  key={row.id}
                  theme={theme}
                  text={row.label || row.text || ''}
                  sub={row.summary}
                  color="#E89B5C"
                  isLast={idx === memoryTypes.length - 1}
                  onPress={() => openRow(row)}
                />
              ))}
            </CircadianGlassCard>

            <View style={styles.actionRow}>
              <Pressable
                onPress={handleClearAll}
                style={[styles.actionBtn, { backgroundColor: destructiveBg, borderColor: `${destructive}55` }]}
              >
                <Text style={[styles.clearText, { color: destructive }]}>Clear all</Text>
              </Pressable>
              <Pressable
                onPress={handleExport}
                style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={[styles.exportText, { color: theme.secondaryText }]}>Export data</Text>
              </Pressable>
            </View>

            <CircadianGlassCard theme={theme} style={styles.privacyCard}>
              <Smartphone size={16} color={getCircadianIconColor(theme, 'secondary')} strokeWidth={2} />
              <Text style={[styles.privacyText, { color: theme.mutedText }]}>
                Stored only on this device. Nothing shared. Nothing sold.
              </Text>
            </CircadianGlassCard>

            <View style={styles.bottomSpacer} />
          </View>
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

function StatCell({
  theme,
  label,
  value,
  accent,
}: {
  theme: CircadianTheme;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: accent || theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.mutedText }]}>{label}</Text>
    </View>
  );
}

function LedgerRowView({
  theme,
  text,
  sub,
  color,
  isLast,
  onPress,
}: {
  theme: CircadianTheme;
  text: string;
  sub?: string;
  color: string;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${text}`}
    >
      <View style={[styles.hex, { backgroundColor: `${color}44`, borderColor: color }]}>
        <View style={[styles.hexInner, { backgroundColor: color }]} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowText, { color: theme.text }]}>{text}</Text>
        {sub ? <Text style={[styles.rowSub, { color: theme.mutedText }]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color={getCircadianIconColor(theme, 'muted')} strokeWidth={2.2} />
    </Pressable>
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
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  cardsColumn: {
    flexGrow: 1,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 4,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  card: { marginBottom: 18 },
  bottomSpacer: { flexGrow: 1, minHeight: 24 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  sectionHint: { fontSize: 13, lineHeight: 19, marginTop: -6, marginBottom: 12 },
  emptyText: { fontSize: 14, lineHeight: 21, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.78 },
  hex: {
    width: 14,
    height: 14,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexInner: { width: 6, height: 6 },
  rowTextWrap: { flex: 1 },
  rowText: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  rowSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 0.5,
  },
  clearText: { fontWeight: '700', fontSize: 14 },
  exportText: { fontWeight: '600', fontSize: 14 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
  },
  privacyText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
