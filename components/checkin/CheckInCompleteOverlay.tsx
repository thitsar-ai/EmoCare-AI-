import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { BRAND_CTA_GRADIENT, tokens, rgba } from '../../theme/tokens';
import { primaryButtonInner, primaryButtonLabel, primaryButtonShell } from '../../theme/primaryButton';
import { hapticMedium } from '../../utils/haptics';

const SERIF = 'Georgia';

type Props = {
  theme: CircadianTheme;
  visible: boolean;
  onContinue: () => void;
};

/** Warm completion moment after a check-in is saved. */
export function CheckInCompleteOverlay({ theme, visible, onContinue }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      rise.setValue(16);
      return;
    }
    void hapticMedium();
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fade, rise]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.backdrop,
        { opacity: fade },
      ]}
    >
      <Animated.View style={[styles.cardWrap, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={[styles.card, { borderColor: tokens.border.standard }]}>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={[styles.completeTitle, { color: theme.text }]}>Check-In Complete</Text>
          <Text style={[styles.completeSub, { color: theme.secondaryText }]}>
            You took a moment for yourself today.
          </Text>
          <View style={[styles.emoBubble, { backgroundColor: tokens.surface.tint, borderColor: tokens.border.medium }]}>
            <Text style={[styles.emoLine, { color: theme.text }]}>
              💜 Thank you for checking in. I'm here whenever you need me.
            </Text>
          </View>
          <Pressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="Return to Sanctuary">
            <LinearGradient
              colors={[...BRAND_CTA_GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[primaryButtonShell, primaryButtonInner, styles.continueBtn]}
            >
              <Text style={[primaryButtonLabel, styles.continueText]}>Return to Sanctuary</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: rgba(tokens.bg.canvas, 0.96),
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: tokens.bg.card,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: tokens.shadow.card,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  sparkle: {
    fontSize: 28,
    marginBottom: 10,
  },
  completeTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  completeSub: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  emoBubble: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 22,
    width: '100%',
  },
  emoLine: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueBtn: {
    alignSelf: 'stretch',
    minWidth: 220,
  },
  continueText: {},
});
