import React from 'react';
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavChromeShell, ScreenSafeArea } from '../shared/ScreenSafeArea';
import { ScreenNavChrome } from '../navigation/AppNavigation';
import { tokens as designTokens } from '../../theme/tokens';

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
  text: designTokens.text.primary,
  secondaryText: designTokens.text.body,
  mutedText: designTokens.text.secondary,
  card: designTokens.bg.card,
  border: designTokens.border.standard,
  accent: designTokens.text.primary,
  teal: designTokens.oracle.accent,
  gold: designTokens.gold.accent,
  glow: designTokens.shadow.card,
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
  const palette = isDark ? DEEP_DARK : TODAY_LIGHT;
  const scrollPad = (showNav ? NAV_CONTENT_HEIGHT : 24) + insets.bottom + 28;

  const themeStub = {
    text: palette.text,
    mutedText: palette.mutedText,
    card: palette.card,
    border: palette.border,
    accent: palette.accent,
  };

  return (
    <View style={styles.flex}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: designTokens.bg.canvas }]}
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
          <NavChromeShell style={styles.navChromeWrap}>
            <ScreenNavChrome theme={themeStub as never} title={title} extraRight={extraRight} showForward={false} />
          </NavChromeShell>
        ) : null}
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollPad, paddingTop: showNav ? 12 : 4 }]}
          showsVerticalScrollIndicator={false}
        >
          {subtitle ? (
            <Text style={[styles.subtitle, { color: palette.mutedText }]}>{subtitle}</Text>
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
  navChromeWrap: { paddingHorizontal: 8, paddingBottom: 0 },
  scroll: { paddingHorizontal: 18 },
  glassCard: {
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
});

export { NAV_CONTENT_HEIGHT };
