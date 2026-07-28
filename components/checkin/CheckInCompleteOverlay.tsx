import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { BRAND_CTA_GRADIENT, tokens, rgba } from '../../theme/tokens';
import { primaryButtonInner, primaryButtonLabel, primaryButtonShell } from '../../theme/primaryButton';
import { hapticMedium } from '../../utils/haptics';
import { useUiCopy } from '../i18n/UiCopyProvider';

const SERIF = 'Georgia';

type Props = {
  theme: CircadianTheme;
  visible: boolean;
  moodLabel?: string | null;
  onTalkWithEmo: () => void;
  onContinue: () => void;
};

/** Warm completion moment after a check-in is saved — offer Talk with context. */
export function CheckInCompleteOverlay({
  theme,
  visible,
  moodLabel,
  onTalkWithEmo,
  onContinue,
}: Props) {
  const { t } = useUiCopy();
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

  const moodKey = moodLabel?.trim() ? `mood.${moodLabel.trim().toLowerCase()}` : null;
  const moodDisplay = moodKey ? t(moodKey) : '';
  const talkHint = moodLabel?.trim()
    ? t('checkin.talkHintNamed', { mood: moodDisplay === moodKey ? moodLabel.trim() : moodDisplay })
    : t('checkin.talkHint');

  return (
    <Animated.View style={[styles.backdrop, { opacity: fade }]}>
      <Animated.View style={[styles.cardWrap, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={[styles.card, { borderColor: tokens.border.standard }]}>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={[styles.completeTitle, { color: theme.text }]}>{t('checkin.completeTitle')}</Text>
          <Text style={[styles.completeSub, { color: theme.secondaryText }]}>
            {t('checkin.completeSub')}
          </Text>
          <View
            style={[
              styles.emoBubble,
              { backgroundColor: tokens.surface.tint, borderColor: tokens.border.medium },
            ]}
          >
            <Text style={[styles.emoLine, { color: theme.text }]}>{talkHint}</Text>
          </View>

          <Pressable
            onPress={onTalkWithEmo}
            accessibilityRole="button"
            accessibilityLabel={t('checkin.talkWithEmo')}
          >
            <LinearGradient
              colors={[...BRAND_CTA_GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[primaryButtonShell, primaryButtonInner, styles.continueBtn]}
            >
              <Text style={[primaryButtonLabel, styles.continueText]}>{t('checkin.talkWithEmo')}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel={t('checkin.returnSanctuary')}
          >
            <Text style={[styles.secondaryText, { color: theme.secondaryText }]}>
              {t('checkin.returnSanctuary')}
            </Text>
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
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  continueBtn: {
    alignSelf: 'stretch',
    minWidth: 220,
  },
  continueText: {},
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
