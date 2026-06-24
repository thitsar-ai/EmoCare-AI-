import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  glassCardBase,
  glassSurfaces,
  todayInsightsCardBase,
  type GlassSurfaceVariant,
} from '../../theme/glassSurfaces';
import { tokens } from '../../theme/tokens';

type SanctuaryGlassSurfaceProps = {
  children: React.ReactNode;
  variant?: GlassSurfaceVariant;
  style?: StyleProp<ViewStyle>;
  /** Skip backdrop blur on dense grids (mood tiles) — keeps frosted tint + border. */
  noBlur?: boolean;
};

function FrostedCardFill() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.bg.card }]}
    />
  );
}

/** Frosted card — rgba(255,253,250,0.72), blur 12, white rim; on sanctuary gradient canvas. */
export function SanctuaryGlassSurface({
  children,
  variant = 'primary',
  style,
  noBlur = false,
}: SanctuaryGlassSurfaceProps) {
  const useBlur =
    !noBlur && (Platform.OS === 'ios' || Platform.OS === 'android');
  const blurIntensity = glassSurfaces.blurIntensity;

  if (variant === 'waitlist') {
    return (
      <View style={[glassCardBase, style]}>
        {useBlur ? (
          <BlurView
            intensity={blurIntensity}
            tint="light"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        ) : null}
        <LinearGradient
          colors={[tokens.brand.gradStart, tokens.brand.gradMid]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  const cardShell = variant === 'todayInsights' ? todayInsightsCardBase : glassCardBase;

  return (
    <View style={[cardShell, style]}>
      {useBlur ? (
        <BlurView
          intensity={blurIntensity}
          tint="light"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      ) : null}
      <FrostedCardFill />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
});
