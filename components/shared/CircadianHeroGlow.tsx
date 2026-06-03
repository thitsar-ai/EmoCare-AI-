import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';

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
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
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
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
  },
});
