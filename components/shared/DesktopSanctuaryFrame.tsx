import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { tokens, rgba } from '../../theme/tokens';

/** Phone-width sanctuary column centered on desktop web. */
const DESKTOP_COLUMN_MAX = 430;
/** Comfortable reading column on iPad / large tablets. */
const TABLET_COLUMN_MAX = 680;
const TABLET_MIN_WIDTH = 768;

type Props = {
  children: React.ReactNode;
};

function isNativeTablet(width: number): boolean {
  if (Platform.OS === 'ios' && Platform.isPad) return true;
  if (Platform.OS === 'android' && width >= TABLET_MIN_WIDTH) return true;
  return false;
}

/**
 * Centers the sanctuary UI on wide surfaces:
 * - Desktop web → phone-width column
 * - iPad / Android tablet → wider readable column (not edge-to-edge stretch)
 * - Phone → full width
 */
export function DesktopSanctuaryFrame({ children }: Props) {
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web';
  const tablet = isNativeTablet(width);

  if (!web && !tablet) {
    return <>{children}</>;
  }

  const columnMax = web ? DESKTOP_COLUMN_MAX : TABLET_COLUMN_MAX;
  const wide = width > columnMax + 48;

  return (
    <View style={[styles.root, tablet && styles.tabletRoot]}>
      {wide ? (
        <>
          <View style={styles.sideGlowLeft} pointerEvents="none" />
          <View style={styles.sideGlowRight} pointerEvents="none" />
        </>
      ) : null}
      <View
        style={[
          styles.column,
          { maxWidth: columnMax },
          wide && styles.columnWide,
          tablet && styles.tabletColumn,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: tokens.text.section,
    alignItems: 'center',
  },
  tabletRoot: {
    backgroundColor: tokens.bg.canvasTop,
  },
  column: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    overflow: 'hidden',
  },
  tabletColumn: {
    backgroundColor: tokens.bg.canvasTop,
  },
  columnWide: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.standard,
    shadowColor: tokens.shadow.floating,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
  },
  sideGlowLeft: {
    position: 'absolute',
    left: '8%',
    top: '18%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: rgba(tokens.brand.gradEnd, 0.12),
  },
  sideGlowRight: {
    position: 'absolute',
    right: '8%',
    bottom: '22%',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: rgba(tokens.brand.gradMid2, 0.1),
  },
});
