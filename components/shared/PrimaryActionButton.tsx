import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  getSanctuaryButtonGradient,
  getSanctuaryButtonGradientDisabled,
} from '../../theme/sanctuaryBrand';
import { hapticLight } from '../../utils/haptics';
import { pressPrimaryStyle, primaryRestingShadow } from '../../utils/pressFeedback';

type PrimaryActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shown below the button while disabled — explains how to enable it. */
  disabledHint?: string;
  theme: CircadianTheme;
  /** Optional leading symbol (e.g. ✦). */
  prefix?: string;
  style?: ViewStyle;
  testID?: string;
};

export function PrimaryActionButton({
  label,
  onPress,
  disabled = false,
  disabledHint,
  theme,
  prefix,
  style,
  testID,
}: PrimaryActionButtonProps) {
  const activeGradient = getSanctuaryButtonGradient(theme.phase);
  const disabledGradient = getSanctuaryButtonGradientDisabled(theme.phase);

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => {
          void hapticLight();
          onPress();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed }) => [
          styles.pressable,
          !disabled && primaryRestingShadow(theme),
          !disabled && pressPrimaryStyle(theme, pressed),
        ]}
      >
        <LinearGradient
          colors={disabled ? disabledGradient : activeGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.btn}
        >
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {prefix ? `${prefix}  ${label}` : label}
          </Text>
        </LinearGradient>
      </Pressable>
      {disabled && disabledHint ? (
        <Text style={[styles.hint, { color: theme.mutedText }]} accessibilityLiveRegion="polite">
          {disabledHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  pressable: { borderRadius: 18, overflow: 'hidden', minHeight: 52 },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  labelDisabled: { opacity: 0.92 },
  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
