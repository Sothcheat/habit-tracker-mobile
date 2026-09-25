import type { DailyLog, HabitLog, Tag, Task } from "@/lib/tasks/api";

/** How much history to load. Habit strength looks back 30 days, streaks 90. */
export const HABIT_WINDOW_DAYS = 30;
export const DAILY_WINDOW_DAYS = 90;

/**
 * Everything the tracker loads for one user.
 *
 * On the web this lived in `useTracker.ts`, which `snapshot.ts` then imported
 * the type back from while `useTracker` imported `readSnapshot` from it — a
 * cycle that only survived because the import was type-only and erased. It
 * lives here instead so the dependency runs one way.
 */
export type TrackerData = {
  timezone: string;
  /** Storage path, not a URL. Null when the user has no photo of their own. */
  avatarPath: string | null;
  tasks: Task[];
  tags: Tag[];
  habitLogs: HabitLog[];
  dailyLogs: DailyLog[];
};
