import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useLayoutInsets } from '../../utils/safeAreaInsets';

export type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

/** Extra clearance below the status bar before screen body content. */
export const NAV_CHROME_TOP_EXTRA = 6;

/** ScreenNavChrome row min height — sync with chromeRow in AppNavigation (36 + 12). */
export const CHROME_HEIGHT = 48;

type ScreenSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Which edges receive inset padding. Default: top + horizontal. */
  edges?: SafeAreaEdge[];
  /** Extra space below the status bar (default NAV_CHROME_TOP_EXTRA). */
  extraTop?: number;
};

/**
 * Reliable top safe-area padding — does not depend on SafeAreaView alone
 * (which can report 0 in Expo Go / Simulator and let headers sit under the clock).
 */
export function ScreenSafeArea({
  children,
  style,
  edges = ['top', 'left', 'right'],
  extraTop = NAV_CHROME_TOP_EXTRA,
}: ScreenSafeAreaProps) {
  const insets = useLayoutInsets();

  return (
    <View
      style={[
        styles.root,
        edges.includes('top') && { paddingTop: insets.top + extraTop },
        edges.includes('bottom') && { paddingBottom: insets.bottom },
        edges.includes('left') && { paddingLeft: insets.left },
        edges.includes('right') && { paddingRight: insets.right },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Opaque strip behind top nav — keeps scroll content from bleeding through glass chrome. */
export function NavChromeShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.navChromeShell, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navChromeShell: {
    zIndex: 30,
    elevation: 16,
    backgroundColor: tokens.bg.elevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
    paddingBottom: 4,
  },
});
