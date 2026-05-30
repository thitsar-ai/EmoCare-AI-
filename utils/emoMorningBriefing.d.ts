import type { TriageTaskRecord } from './todayTriage';

export function loadCachedMorningBriefing(
  dayKey?: string,
  moodLabel?: string,
): Promise<string | null>;

export function generateMorningBriefing(options?: {
  userName?: string;
  moodLabel?: string;
  ambientProgress?: number;
  tasks?: TriageTaskRecord[];
  force?: boolean;
}): Promise<string>;

export function buildFallbackBriefing(options: {
  userName?: string;
  moodLabel?: string | null;
  tasks: TriageTaskRecord[];
}): string;
