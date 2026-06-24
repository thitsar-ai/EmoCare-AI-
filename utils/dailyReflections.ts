import AsyncStorage from '@react-native-async-storage/async-storage';
import reflectionsData from '../constants/reflections.json';

export type DailyReflection = {
  id: number;
  text: string;
  sub?: string;
  featured?: boolean;
};

const REFLECTIONS = reflectionsData.reflections as DailyReflection[];

const ROTATION_KEY = 'dailyReflectionRotation';
const FEATURED_SEEN_KEY = 'dailyReflectionFeaturedSeen';

function calendarDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedIndexForDate(dateKey: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return count > 0 ? hash % count : 0;
}

export function pickReflection(dateKey: string, rotationOffset = 0): DailyReflection {
  const base = seedIndexForDate(dateKey, REFLECTIONS.length);
  const idx = (base + rotationOffset) % REFLECTIONS.length;
  return REFLECTIONS[idx] ?? REFLECTIONS[0];
}

export function getFeaturedReflection(): DailyReflection | null {
  return REFLECTIONS.find((r) => r.featured) ?? REFLECTIONS[0] ?? null;
}

export async function loadDailyReflection(): Promise<{
  reflection: DailyReflection;
  rotationOffset: number;
}> {
  const dateKey = calendarDateKey();
  let rotationOffset = 0;

  try {
    const raw = await AsyncStorage.getItem(ROTATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date?: string; offset?: number };
      if (parsed.date === dateKey && typeof parsed.offset === 'number') {
        rotationOffset = parsed.offset;
      }
    }
  } catch {}

  if (rotationOffset === 0) {
    try {
      const seen = await AsyncStorage.getItem(FEATURED_SEEN_KEY);
      if (!seen) {
        const featured = getFeaturedReflection();
        if (featured) {
          await AsyncStorage.setItem(FEATURED_SEEN_KEY, '1');
          return { reflection: featured, rotationOffset: 0 };
        }
      }
    } catch {}
  }

  return {
    reflection: pickReflection(dateKey, rotationOffset),
    rotationOffset,
  };
}

export async function rotateDailyReflection(currentOffset: number): Promise<{
  reflection: DailyReflection;
  rotationOffset: number;
}> {
  const dateKey = calendarDateKey();
  const rotationOffset = currentOffset + 1;
  try {
    await AsyncStorage.setItem(ROTATION_KEY, JSON.stringify({ date: dateKey, offset: rotationOffset }));
  } catch {}
  return {
    reflection: pickReflection(dateKey, rotationOffset),
    rotationOffset,
  };
}
