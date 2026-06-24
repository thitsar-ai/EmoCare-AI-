import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryLabelAccent } from '../../theme/sanctuaryBrand';
import { hapticLight } from '../../utils/haptics';
import { loadGentleInsight } from '../../utils/insightsData';
import { pressLinkStyle } from '../../utils/pressFeedback';
import { SanctuaryGlassSurface } from '../shared/SanctuaryGlassSurface';

const SERIF = 'Georgia';
const INSIGHT_ACCENT = '#3DBDA8';

type Props = {
  theme: CircadianTheme;
  refreshKey?: number;
  onExploreInsights?: () => void;
};

/** Signature sanctuary card — one warm observation from on-device activity. */
export function GentleInsightCard({ theme, refreshKey = 0, onExploreInsights }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const labelAccent = getSanctuaryLabelAccent(theme);

  useEffect(() => {
    void loadGentleInsight(7).then(({ insight: text }) => setInsight(text));
  }, [refreshKey]);

  if (!insight) return null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Gentle insight. ${insight}`}
      style={styles.wrap}
    >
      <SanctuaryGlassSurface variant="lavender" style={styles.card}>
        <View style={styles.header}>
          <Sparkles size={12} color={INSIGHT_ACCENT} strokeWidth={2.2} />
          <Text style={[styles.eyebrow, { color: labelAccent }]}>Gentle Insight</Text>
        </View>

        <Text style={[styles.body, { color: theme.text }]}>{insight}</Text>

        {onExploreInsights ? (
          <Pressable
            onPress={() => {
              void hapticLight();
              onExploreInsights();
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.linkRow, pressLinkStyle(theme, pressed)]}
            accessibilityRole="button"
            accessibilityLabel="Explore emotional insights"
          >
            <Text style={[styles.linkText, { color: theme.accent }]}>Explore your patterns</Text>
            <ChevronRight size={14} color={theme.accent} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </SanctuaryGlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginTop: 16,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
