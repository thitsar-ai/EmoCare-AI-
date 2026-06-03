import AsyncStorage from '@react-native-async-storage/async-storage';

export const AGE_VERIFIED_KEY = 'ageVerified';

export async function readAgeVerified(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AGE_VERIFIED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function persistAgeVerified(): Promise<void> {
  try {
    await AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true');
  } catch {}
}

export function parseBirthDate(month: string, day: string, year: string): Date | null {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (!Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function ageOnDate(birthDate: Date, onDate = new Date()): number {
  let age = onDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = onDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && onDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAtLeast18(birthDate: Date, onDate = new Date()): boolean {
  return ageOnDate(birthDate, onDate) >= 18;
}

/** Youth support lines — region-keyed for future config expansion. */
export const YOUTH_SUPPORT_RESOURCES = {
  US: [
    { label: 'Teen Line (call or text)', value: '8008528336', type: 'phone' as const },
    { label: 'Crisis Text Line — text HOME to 741741', value: '741741', type: 'sms' as const, smsBody: 'HOME' },
    { label: '988 Suicide & Crisis Lifeline', value: '988', type: 'phone' as const },
  ],
  DEFAULT: [
    { label: 'Contact local emergency services', value: '', type: 'info' as const },
    { label: 'Find youth crisis support in your country', value: '', type: 'info' as const },
  ],
} as const;
