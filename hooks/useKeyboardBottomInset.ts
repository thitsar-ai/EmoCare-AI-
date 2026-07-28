import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export type KeyboardBottomInset = {
  /** True while the software keyboard is visible. */
  keyboardOpen: boolean;
  /**
   * Distance from the bottom of the window covered by the keyboard (0 when closed).
   * Use as the sticky composer / footer bottom inset — do NOT also apply
   * KeyboardAvoidingView padding for the same edge.
   */
  keyboardHeight: number;
};

type Options = {
  /** Called when the keyboard opens or closes (e.g. hide the tab bar). */
  onOpenChange?: (open: boolean) => void;
};

/**
 * Single keyboard measurement source for sticky bottom composers and footers.
 * Prefer this over nesting KeyboardAvoidingView + manual height (double offset).
 */
export function useKeyboardBottomInset(options: Options = {}): KeyboardBottomInset {
  const { onOpenChange } = options;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const next = Math.max(0, e.endCoordinates?.height ?? 0);
      setKeyboardOpen(true);
      setKeyboardHeight(next);
      onOpenChange?.(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
      onOpenChange?.(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      onOpenChange?.(false);
    };
  }, [onOpenChange]);

  return { keyboardOpen, keyboardHeight };
}

/**
 * Bottom padding for a sticky composer sitting at the bottom of a full-screen route
 * that also has an absolute tab bar when the keyboard is closed.
 */
export function stickyComposerBottomPad(opts: {
  keyboardOpen: boolean;
  keyboardHeight: number;
  tabBarHeight: number;
  safeBottom: number;
}): number {
  if (opts.keyboardOpen) {
    // Keyboard height already includes the home-indicator region — do not add safeBottom again.
    return Math.max(0, opts.keyboardHeight);
  }
  return opts.tabBarHeight + Math.max(opts.safeBottom, 0);
}
