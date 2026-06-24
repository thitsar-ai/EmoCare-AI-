import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { tokens, rgba } from '../../theme/tokens';

/** Phone-width sanctuary column centered on desktop web. */
const DESKTOP_COLUMN_MAX = 430;

type Props = {
  children: React.ReactNode;
};

export function DesktopSanctuaryFrame({ children }: Props) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const { width } = useWindowDimensions();
  const wide = width > DESKTOP_COLUMN_MAX + 48;

  return (
    <View style={styles.webRoot}>
      {wide ? (
        <>
          <View style={styles.webSideGlowLeft} pointerEvents="none" />
          <View style={styles.webSideGlowRight} pointerEvents="none" />
        </>
      ) : null}
      <View style={[styles.webColumn, wide && styles.webColumnWide]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: tokens.text.section,
    alignItems: 'center',
  },
  webColumn: {
    flex: 1,
    width: '100%',
    maxWidth: DESKTOP_COLUMN_MAX,
    minHeight: '100%',
    overflow: 'hidden',
  },
  webColumnWide: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.standard,
    shadowColor: tokens.shadow.floating,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
  },
  webSideGlowLeft: {
    position: 'absolute',
    left: '8%',
    top: '18%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: rgba(tokens.brand.gradEnd, 0.12),
  },
  webSideGlowRight: {
    position: 'absolute',
    right: '8%',
    bottom: '22%',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: rgba(tokens.brand.gradMid2, 0.1),
  },
});
