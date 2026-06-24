import type { TextStyle, ViewStyle } from 'react-native';
import { tokens } from './tokens';

/** Shared primary CTA metrics — apply to all signature action buttons. */
export const PRIMARY_BUTTON_HEIGHT = 56;
export const PRIMARY_BUTTON_RADIUS = 28;
export const PRIMARY_BUTTON_PADDING = 18;

export const primaryButtonShell: ViewStyle = {
  borderRadius: PRIMARY_BUTTON_RADIUS,
  overflow: 'hidden',
  minHeight: PRIMARY_BUTTON_HEIGHT,
};

export const primaryButtonInner: ViewStyle = {
  minHeight: PRIMARY_BUTTON_HEIGHT,
  paddingHorizontal: PRIMARY_BUTTON_PADDING,
  paddingVertical: PRIMARY_BUTTON_PADDING,
  alignItems: 'center',
  justifyContent: 'center',
};

export const primaryButtonLabel: TextStyle = {
  color: tokens.text.onCta,
  fontSize: 15,
  fontWeight: '600',
  letterSpacing: 0.2,
};

export const primaryButtonLabelDisabled: TextStyle = {
  color: tokens.text.onCtaDisabled,
};
