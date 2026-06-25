import React from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { BRAND_NAME, BRAND_SPLASH_FOOTER, BRAND_TAGLINE } from '../../constants/brandCopy';
import { SanctuaryEmoPresence } from './SanctuaryEmoPresence';
import { tokens } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export const SPLASH_STAR_PARTICLES = [
  { left: 0.12, top: 0.16, size: 3, opacity: 0.45 },
  { left: 0.82, top: 0.13, size: 2, opacity: 0.4 },
  { left: 0.68, top: 0.27, size: 3, opacity: 0.5 },
  { left: 0.22, top: 0.34, size: 2, opacity: 0.35 },
  { left: 0.9, top: 0.4, size: 2, opacity: 0.45 },
  { left: 0.08, top: 0.52, size: 3, opacity: 0.4 },
  { left: 0.78, top: 0.6, size: 2, opacity: 0.5 },
  { left: 0.3, top: 0.64, size: 2, opacity: 0.35 },
  { left: 0.55, top: 0.72, size: 3, opacity: 0.55 },
  { left: 0.16, top: 0.78, size: 2, opacity: 0.45 },
  { left: 0.86, top: 0.8, size: 3, opacity: 0.5 },
  { left: 0.42, top: 0.86, size: 2, opacity: 0.4 },
  { left: 0.64, top: 0.9, size: 2, opacity: 0.45 },
  { left: 0.26, top: 0.92, size: 3, opacity: 0.5 },
] as const;

export function SplashStarField({
  theme,
  variant = 'sanctuary',
}: {
  theme: CircadianTheme;
  variant?: 'sanctuary' | 'circadian';
}) {
  const particleColor =
    variant === 'sanctuary' ? tokens.brand.accent : theme.isDark ? '#FFFFFF' : theme.accent;
  const particleOpacityScale = variant === 'sanctuary' ? 0.42 : theme.isDark ? 1 : 0.4;

  return (
    <>
      {SPLASH_STAR_PARTICLES.map((p, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width * p.left,
            top: height * p.top,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: particleColor,
            opacity: p.opacity * particleOpacityScale,
          }}
        />
      ))}
    </>
  );
}

/** Glowing lavender Emo orb + EmoCare copy + loading bar + sanctuary footer. */
export function SanctuarySplashContent({
  theme,
  fadeIn,
  progress,
  reduceMotion: _reduceMotion,
}: {
  theme: CircadianTheme;
  fadeIn: Animated.Value;
  progress: Animated.Value;
  reduceMotion: boolean;
}) {
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });

  return (
    <Animated.View style={[styles.inner, { opacity: fadeIn }]}>
      <View style={styles.orbWrap} pointerEvents="none">
        <SanctuaryEmoPresence theme={theme} size="splash" />
      </View>

      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {BRAND_NAME}
      </Text>
      <Text style={[styles.tagline, { color: theme.secondaryText }]} numberOfLines={2}>
        {BRAND_TAGLINE}
      </Text>

      <View style={[styles.barTrack, { backgroundColor: tokens.splash.barTrack }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barWidth,
              backgroundColor: tokens.splash.barFill,
              shadowColor: tokens.splash.barFill,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.footer,
          { color: theme.mutedText, opacity: theme.isDark ? 0.78 : 0.85 },
        ]}
        numberOfLines={1}
      >
        {BRAND_SPLASH_FOOTER}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'visible',
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '400',
    letterSpacing: 0.6,
    textAlign: 'center',
    fontFamily: SERIF,
    width: '100%',
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 1.8,
    textAlign: 'center',
    marginTop: 20,
    width: '100%',
  },
  barTrack: {
    width: '42%',
    height: 6,
    borderRadius: 999,
    marginTop: 56,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  footer: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 22,
  },
});
