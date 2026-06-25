import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryButtonGradient } from '../../theme/sanctuaryBrand';
import {
  primaryButtonInner,
  primaryButtonLabel,
  primaryButtonShell,
} from '../../theme/primaryButton';
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
  const displayLabel = prefix ? `${prefix}  ${label}` : label;
  const gradient = getSanctuaryButtonGradient(theme.phase);

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          void hapticLight();
          onPress();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed }) => [
          primaryButtonShell,
          styles.button,
          styles.buttonVisible,
          primaryRestingShadow(theme),
          !disabled && pressPrimaryStyle(theme, pressed),
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={primaryButtonInner}
        >
          <Text
            style={primaryButtonLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.88}
          >
            {displayLabel}
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
  wrap: { marginBottom: 4, alignSelf: 'stretch', width: '100%' },
  button: { width: '100%' },
  /** Keep full brand purple visible — never fade when disabled or pressed. */
  buttonVisible: { opacity: 1 },
  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
