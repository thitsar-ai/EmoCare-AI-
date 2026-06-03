import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { ScreenNavChrome } from '../navigation/AppNavigation';

export const DEEP_DARK = {
  text: '#FFFFFF',
  secondaryText: '#C4B7FF',
  mutedText: '#A99CCF',
  card: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.12)',
  accent: '#B79DFF',
  glow: 'rgba(120,90,200,0.35)',
  destructive: '#E87898',
  destructiveBg: 'rgba(120,30,60,0.45)',
} as const;

export const TODAY_LIGHT = {
  text: '#2D1B4A',
  secondaryText: '#5C4A7A',
  mutedText: '#7A6B96',
  card: '#FFFFFF',
  border: 'rgba(45,27,74,0.10)',
  accent: '#7B5CFF',
  teal: '#2A9D8F',
  gold: '#C4A35A',
  glow: 'rgba(123,92,255,0.12)',
} as const;

export const SERIF = 'Georgia';
const NAV_CONTENT_HEIGHT = 72;

export function DeepGlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.glassCard, { backgroundColor: DEEP_DARK.card, borderColor: DEEP_DARK.border }, style]}>
      {children}
    </View>
  );
}

export function TodayGlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.glassCard, { backgroundColor: TODAY_LIGHT.card, borderColor: TODAY_LIGHT.border }, style]}>
      {children}
    </View>
  );
}

export function DeepScreenLayout({
  title,
  subtitle,
  children,
  variant = 'dark',
  showNav = true,
  extraRight,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'dark' | 'light';
  showNav?: boolean;
  extraRight?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const isDark = variant === 'dark';
  const tokens = isDark ? DEEP_DARK : TODAY_LIGHT;
  const scrollPad = (showNav ? NAV_CONTENT_HEIGHT : 24) + insets.bottom + 28;

  const themeStub = {
    text: tokens.text,
    mutedText: tokens.mutedText,
    card: tokens.card,
    border: tokens.border,
    accent: tokens.accent,
  };

  return (
    <View style={styles.flex}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? '#0D0720' : '#E8E4F5' }]}
      />
      <LinearGradient
        colors={isDark ? ['rgba(80,50,140,0.35)', 'transparent'] : ['rgba(180,160,230,0.25)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
        style={styles.glowOrb}
        pointerEvents="none"
      />
      <ScreenSafeArea extraTop={4}>
        {showNav ? (
          <ScreenNavChrome theme={themeStub as never} title={title} extraRight={extraRight} />
        ) : null}
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollPad }]}
          showsVerticalScrollIndicator={false}
        >
          {!showNav ? (
            <View style={styles.titleBlock}>
              <View style={styles.titleSpacer} />
            </View>
          ) : null}
          {subtitle ? (
            <View style={styles.subtitleWrap}>
              <View style={styles.subtitleText}>
                {/* title shown in chrome; subtitle below */}
              </View>
            </View>
          ) : null}
          {children}
        </ScrollView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glowOrb: {
    position: 'absolute',
    top: -80,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  scroll: { paddingHorizontal: 18, paddingTop: 4 },
  glassCard: {
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
  },
  titleBlock: { height: 8 },
  titleSpacer: { flex: 1 },
  subtitleWrap: { marginBottom: 8 },
  subtitleText: {},
});

export { NAV_CONTENT_HEIGHT };
