import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  getSanctuaryButtonGradient,
  getSanctuaryButtonGradientPressed,
  getSanctuaryLabelAccent,
} from '../../theme/sanctuaryBrand';
import {
  primaryButtonInner,
  primaryButtonLabel,
  primaryButtonShell,
} from '../../theme/primaryButton';
import { tokens, rgba } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { pressPrimaryStyle } from '../../utils/pressFeedback';
import { CircadianGlassCard, SERIF } from '../shared/CircadianHeroGlow';

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  onContinueWriting: () => void;
  onReturnHome: () => void;
};

export function JournalSaveOverlay({
  visible,
  theme,
  onContinueWriting,
  onReturnHome,
}: Props) {
  const labelAccent = getSanctuaryLabelAccent(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
          <Text style={[styles.eyebrow, { color: labelAccent }]}>✨ Reflection Saved</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            Thank you for taking a moment for yourself today.
          </Text>

          <Pressable
            onPress={() => {
              void hapticLight();
              onContinueWriting();
            }}
            style={({ pressed }) => [primaryButtonShell, styles.actionBtn, pressPrimaryStyle(theme, pressed)]}
          >
            {({ pressed }) => (
              <LinearGradient
                colors={
                  pressed
                    ? getSanctuaryButtonGradientPressed(theme.phase)
                    : getSanctuaryButtonGradient(theme.phase)
                }
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[primaryButtonInner, styles.actionGradient]}
              >
                <Text style={primaryButtonLabel}>Continue Writing</Text>
              </LinearGradient>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              void hapticLight();
              onReturnHome();
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: tokens.border.strong },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: theme.text }]}>Return to Sanctuary</Text>
          </Pressable>
        </CircadianGlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: rgba(tokens.text.primary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionBtn: {
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  actionGradient: {},
  secondaryBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 28,
    minHeight: 56,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
