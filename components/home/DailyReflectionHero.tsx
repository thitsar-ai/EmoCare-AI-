import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { RefreshCw, Sparkles } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryLabelAccent } from '../../theme/sanctuaryBrand';
import { hapticLight } from '../../utils/haptics';
import { pressLinkStyle } from '../../utils/pressFeedback';
import {
  loadDailyReflection,
  rotateDailyReflection,
  type DailyReflection,
} from '../../utils/dailyReflections';
import { SanctuaryGlassSurface } from '../shared/SanctuaryGlassSurface';
import { isNarrowPhone } from '../../utils/layoutBreakpoints';

const SERIF = 'Georgia';

export function DailyReflectionHero({ theme }: { theme: CircadianTheme }) {
  const { width } = useWindowDimensions();
  const narrow = isNarrowPhone(width);
  const [reflection, setReflection] = useState<DailyReflection | null>(null);
  const [rotationOffset, setRotationOffset] = useState(0);
  const labelAccent = getSanctuaryLabelAccent(theme);

  useEffect(() => {
    void loadDailyReflection().then(({ reflection: r, rotationOffset: o }) => {
      setReflection(r);
      setRotationOffset(o);
    });
  }, []);

  const handleRotate = useCallback(async () => {
    void hapticLight();
    const next = await rotateDailyReflection(rotationOffset);
    setReflection(next.reflection);
    setRotationOffset(next.rotationOffset);
  }, [rotationOffset]);

  if (!reflection) return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Today's reflection. ${reflection.text}${reflection.sub ? ` ${reflection.sub}` : ''}`}
    >
      <SanctuaryGlassSurface variant="lavender" style={styles.card}>
        <View style={styles.header}>
          <Sparkles size={12} color={theme.accent} strokeWidth={2.2} />
          <Text style={[styles.title, { color: labelAccent }]}>Today's Reflection</Text>
        </View>

        <View style={styles.body}>
          <Text
            style={[
              styles.mainLine,
              narrow && styles.mainLineNarrow,
              { color: theme.text },
            ]}
          >
            {reflection.text}
          </Text>
          {reflection.sub ? (
            <Text style={[styles.subLine, { color: theme.secondaryText }]}>{reflection.sub}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => void handleRotate()}
          hitSlop={12}
          style={({ pressed }) => [styles.rotateBtn, pressLinkStyle(theme, pressed)]}
          accessibilityLabel="Refresh reflection"
          accessibilityRole="button"
        >
          <RefreshCw size={11} color={theme.secondaryText} strokeWidth={2.4} />
          <Text style={[styles.rotateLabel, { color: theme.secondaryText }]}>Refresh Reflection</Text>
        </Pressable>
      </SanctuaryGlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 16,
    minHeight: 168,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 22,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  body: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 16,
  },
  mainLine: {
    fontFamily: SERIF,
    fontSize: 25,
    lineHeight: 36,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  mainLineNarrow: {
    fontSize: 21,
    lineHeight: 30,
  },
  subLine: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 26,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rotateLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
