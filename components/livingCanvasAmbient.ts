export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const SANCTUARY_SPRING = { damping: 22, stiffness: 165, mass: 0.9 };

const TIME_AMBIENT: Record<TimeOfDay, number> = {
  morning: 0.06,
  afternoon: 0.18,
  evening: 0.55,
  night: 0.78,
};

export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 21) return 'evening';
  return 'night';
}

export function resolveAmbientProgress(opts: {
  timeOfDay: TimeOfDay;
  moodLabel?: string | null;
}): number {
  return TIME_AMBIENT[opts.timeOfDay] ?? 0.2;
}
