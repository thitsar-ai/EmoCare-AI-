import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useLayoutInsets } from '../../utils/safeAreaInsets';

export type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

type ScreenSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Which edges receive inset padding. Default: top + horizontal. */
  edges?: SafeAreaEdge[];
  /** Extra space below the status bar (default 6). */
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
  extraTop = 6,
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

const styles = StyleSheet.create({
  root: { flex: 1 },
});
