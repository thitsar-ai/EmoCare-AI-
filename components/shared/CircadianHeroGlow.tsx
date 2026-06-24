import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { SanctuaryGlassSurface } from './SanctuaryGlassSurface';
import type { GlassSurfaceVariant } from '../../theme/glassSurfaces';

/** Subtle top-right glow — sits on the global circadian canvas without covering it. */
export function CircadianHeroGlow({ theme }: { theme: CircadianTheme }) {
  return (
    <LinearGradient
      colors={[theme.heroWash[0], 'transparent']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.15, y: 0.65 }}
      style={styles.glow}
      pointerEvents="none"
    />
  );
}

export function CircadianGlassCard({
  theme,
  children,
  style,
  variant = 'primary',
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassSurfaceVariant;
}) {
  return (
    <SanctuaryGlassSurface variant={variant} style={[styles.card, style]}>
      {children}
    </SanctuaryGlassSurface>
  );
}

export const SERIF = 'Georgia';

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -72,
    right: -96,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  card: {
    padding: 16,
    marginBottom: 14,
  },
});
