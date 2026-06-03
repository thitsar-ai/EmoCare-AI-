import { Linking, Platform } from 'react-native';

export type CrisisRegion = 'US' | 'DEFAULT';

export type CrisisLineConfig = {
  region: CrisisRegion;
  /** E.164-style digits for tel: / sms: (no spaces). */
  phone: string;
  sms: string;
  /** Short label shown in UI (e.g. "988"). */
  display: string;
  regionLabel: string;
};

/** Region-keyed crisis lines — 988 is the US default. */
export const CRISIS_LINES: Record<CrisisRegion, CrisisLineConfig> = {
  US: {
    region: 'US',
    phone: '988',
    sms: '988',
    display: '988',
    regionLabel: 'In the US',
  },
  DEFAULT: {
    region: 'DEFAULT',
    phone: '',
    sms: '',
    display: 'your local crisis line',
    regionLabel: 'In your area',
  },
};

/** Active region — swap when user locale / settings support is added. */
export const DEFAULT_CRISIS_REGION: CrisisRegion = 'US';

export function getCrisisLine(region: CrisisRegion = DEFAULT_CRISIS_REGION): CrisisLineConfig {
  return CRISIS_LINES[region] ?? CRISIS_LINES.DEFAULT;
}

export function openCrisisCall(phone: string): void {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

export function openCrisisText(sms: string, body?: string): void {
  if (!sms) return;
  const url =
    Platform.OS === 'ios'
      ? `sms:${sms}${body ? `&body=${encodeURIComponent(body)}` : ''}`
      : `sms:${sms}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
  Linking.openURL(url).catch(() => {});
}
