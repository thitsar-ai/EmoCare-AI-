import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  DEFAULT_CRISIS_REGION,
  getCrisisLine,
  openCrisisCall,
  openCrisisText,
  type CrisisRegion,
} from '../../utils/crisisLine';

type CrisisFooterProps = {
  theme: CircadianTheme;
  style?: StyleProp<ViewStyle>;
  /** US default — pass another region when settings support it. */
  region?: CrisisRegion;
  variant?: 'full' | 'compact';
};

export function CrisisFooter({
  theme,
  style,
  region = DEFAULT_CRISIS_REGION,
  variant = 'full',
}: CrisisFooterProps) {
  const line = getCrisisLine(region);
  const linkColor = theme.accent;
  const hasNumber = Boolean(line.phone);

  if (variant === 'compact') {
    return (
      <Text style={[styles.text, styles.compactText, { color: theme.mutedText }, style]}>
        If in crisis, contact emergency services
        {hasNumber ? (
          <>
            {' '}
            or{' '}
            <CrisisLink color={linkColor} onPress={() => openCrisisCall(line.phone)}>
              call {line.display}
            </CrisisLink>
            {' · '}
            <CrisisLink color={linkColor} onPress={() => openCrisisText(line.sms)}>
              text {line.display}
            </CrisisLink>
          </>
        ) : null}
        . EmoCare is a companion app — Emo is not emergency care.
      </Text>
    );
  }

  return (
    <View style={style}>
      <Text style={[styles.text, { color: theme.mutedText }]}>
        If you are in crisis or may hurt yourself, please contact local emergency services or a crisis
        helpline immediately.
        {hasNumber ? (
          <>
            {' '}
            {line.regionLabel}:{' '}
            <CrisisLink color={linkColor} onPress={() => openCrisisCall(line.phone)}>
              call {line.display}
            </CrisisLink>
            {' · '}
            <CrisisLink color={linkColor} onPress={() => openCrisisText(line.sms)}>
              text {line.display}
            </CrisisLink>
            .
          </>
        ) : (
          <> {line.regionLabel}, reach {line.display}.</>
        )}{' '}
        EmoCare is a companion app — Emo is not emergency care.
      </Text>
    </View>
  );
}

/** Inline link — must be Text (not Pressable) to flow inside parent Text. */
function CrisisLink({
  children,
  color,
  onPress,
}: {
  children: React.ReactNode;
  color: string;
  onPress: () => void;
}) {
  return (
    <Text
      style={[styles.link, { color }]}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityHint="Opens your phone to connect with a crisis line"
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  compactText: {
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
