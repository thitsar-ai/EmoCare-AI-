export type EnergyCategoryId = 'work' | 'home' | 'movement' | 'connect' | 'care' | 'admin';

export interface TriageTaskRecord {
  id: string;
  title: string;
  deadline: string | null;
  status: 'pending' | 'done';
  energyCategory: EnergyCategoryId | 'deep_focus' | 'low_admin' | 'restorative';
  dayKey: string;
  createdAt: string;
  durationMin?: number;
  emoScheduled?: boolean;
  categoryLocked?: boolean;
}

export interface EnergyCategoryMeta {
  id: EnergyCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  chipBg: string;
}

export const TODAY_TRIAGE_STORAGE_KEY: string;
export const MORNING_BRIEFING_CACHE_KEY: string;
export const ENERGY_CATEGORIES: Record<EnergyCategoryId, EnergyCategoryMeta>;
export const ENERGY_CATEGORY_ORDER: EnergyCategoryId[];

export function normalizeCategory(categoryId: string | undefined): EnergyCategoryId;
export function inferTaskCategory(title: string): EnergyCategoryId;
export function resolveTaskCategory(task: TriageTaskRecord): EnergyCategoryId;
export function getTodayDayKey(date?: Date): string;
export function loadAllTriageTasks(): Promise<TriageTaskRecord[]>;
export function loadTodayTasks(dayKey?: string): Promise<TriageTaskRecord[]>;
export function addTodayTask(input: {
  title: string;
  energyCategory?: EnergyCategoryId;
  deadline?: string | null;
  autoCategory?: boolean;
}): Promise<TriageTaskRecord | null>;
export function setTaskStatus(taskId: string, status: string): Promise<TriageTaskRecord | null>;
export function deleteTodayTask(taskId: string): Promise<boolean>;
export function groupTasksByEnergy(tasks: TriageTaskRecord[]): Array<{
  category: EnergyCategoryMeta;
  tasks: TriageTaskRecord[];
}>;
export function summarizeTodayTasks(tasks: TriageTaskRecord[]): {
  total: number;
  pendingCount: number;
  doneCount: number;
  byCategory: Record<EnergyCategoryId, number>;
  deepFocusPending: number;
  lowAdminPending: number;
  restorativePending: number;
  pendingTitles: Array<{
    title: string;
    energyCategory: EnergyCategoryId;
    deadline: string | null;
  }>;
};
export function formatBriefingContext(
  tasks: TriageTaskRecord[],
  moodLabel: string | null | undefined,
  ambientProgress: number,
  userName?: string,
): string;
export function buildEmoDailyNote(
  tasks: TriageTaskRecord[],
  moodLabel: string | null | undefined,
): string;
export function buildTodayHeroInsight(
  tasks: TriageTaskRecord[],
  moodLabel: string | null | undefined,
): string;
export function buildTodayGentleGrowth(tasks: TriageTaskRecord[]): {
  line1: string;
  line2: string;
};
export function categorySubline(task: TriageTaskRecord): string;
export function isBreathCareTask(task: TriageTaskRecord): boolean;
