import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryLabelAccent } from '../../theme/sanctuaryBrand';
import { hapticLight } from '../../utils/haptics';
import { loadGentleInsight } from '../../utils/insightsData';
import { pressLinkStyle } from '../../utils/pressFeedback';
import { SanctuaryGlassSurface } from '../shared/SanctuaryGlassSurface';
import { useUiCopy } from '../i18n/UiCopyProvider';

const SERIF = 'Georgia';
const INSIGHT_ACCENT = '#3DBDA8';

type Props = {
  theme: CircadianTheme;
  refreshKey?: number;
  onExploreInsights?: () => void;
};

/** Signature sanctuary card — one warm observation from on-device activity. */
export function GentleInsightCard({ theme, refreshKey = 0, onExploreInsights }: Props) {
  const { t, locale } = useUiCopy();
  const myanmar = locale === 'my';
  const [insight, setInsight] = useState<string | null>(null);
  const labelAccent = getSanctuaryLabelAccent(theme);

  useEffect(() => {
    if (myanmar) {
      setInsight(t('home.gentleInsightBody'));
      return;
    }
    void loadGentleInsight(7).then(({ insight: text }) => setInsight(text));
  }, [refreshKey, myanmar, t]);

  if (!insight) return null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${t('home.gentleInsight')}. ${insight}`}
      style={styles.wrap}
    >
      <SanctuaryGlassSurface variant="lavender" style={styles.card}>
        <View style={styles.header}>
          <Sparkles size={12} color={INSIGHT_ACCENT} strokeWidth={2.2} />
          <Text
            style={[
              styles.eyebrow,
              myanmar && styles.eyebrowMy,
              { color: labelAccent },
            ]}
          >
            {t('home.gentleInsight')}
          </Text>
        </View>

        <Text
          style={[
            styles.body,
            myanmar && styles.bodyMy,
            { color: theme.text },
          ]}
        >
          {insight}
        </Text>

        {onExploreInsights ? (
          <Pressable
            onPress={() => {
              void hapticLight();
              onExploreInsights();
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.linkRow, pressLinkStyle(theme, pressed)]}
            accessibilityRole="button"
            accessibilityLabel={t('home.explorePatterns')}
          >
            <Text
              style={[
                styles.linkText,
                myanmar && styles.linkTextMy,
                { color: theme.accent },
              ]}
            >
              {t('home.explorePatterns')}
            </Text>
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
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eyebrowMy: {
    letterSpacing: 0,
    textTransform: 'none',
    fontSize: 13,
    lineHeight: 20,
  },
  body: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
  },
  bodyMy: {
    fontFamily: undefined,
    letterSpacing: 0,
    fontSize: 15,
    lineHeight: 26,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  linkTextMy: {
    letterSpacing: 0,
    lineHeight: 22,
  },
});
