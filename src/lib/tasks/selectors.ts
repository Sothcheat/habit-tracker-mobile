import type { DailyLog, HabitLog, Tag, Task } from "@/lib/tasks/api";
import type { ISODate } from "@/lib/tasks/dates";
import {
  dailyStreak,
  habitStrength,
  isDueOn,
  isOverdue,
} from "@/lib/tasks/schedule";
import type { TrackerData } from "@/lib/tasks/types";

/**
 * The tracker's derived view model.
 *
 * On the web this lived inside `TrackerPage`, which rendered all three columns
 * itself. Here the columns are three sibling tab screens, so it has to be
 * shared — and being pure, it is also the most test-worthy logic in the app.
 */

/** State colour a card's strips wear. Mirrors the design system's Tone. */
export type Tone = "positive" | "caution" | "neutral";

export type HabitFilter = "all" | "weak" | "strong";
export type DailyFilter = "all" | "due" | "notDue";
export type TodoFilter = "active" | "scheduled" | "complete";

/**
 * A task's place in its column. `position` arrives with the
 * 20260923000200_task_position migration; until that is applied the column is
 * absent, so fall back to creation time in the same unit (epoch seconds) —
 * which is exactly what the migration backfills.
 */
export function sortKey(task: Task): number {
  return (task.position as number | undefined) ?? Date.parse(task.created_at) / 1000;
}

export type TrackerView = {
  /** Every task, sorted. The ⋮ menu judges first/last against this, not the filtered list. */
  tasks: Task[];
  /** What survives the search box and the tag filter. */
  visible: Task[];
  /** True when a search or tag filter is narrowing the list. */
  filtering: boolean;
  habitLogsByTask: Map<string, HabitLog[]>;
  dailyStatusByTask: Map<string, Map<ISODate, DailyLog["status"]>>;
};

export function buildView(
  data: TrackerData | null,
  options: { search?: string; tagFilter?: ReadonlySet<string> } = {},
): TrackerView {
  const { search = "", tagFilter } = options;

  // Column order: position ascending. [...].sort rather than toSorted, which
  // Hermes does not implement.
  const tasks = [...(data?.tasks ?? [])].sort((a, b) => sortKey(a) - sortKey(b));

  const activeTags = activeTagIds(tagFilter, data?.tags ?? []);
  const query = search.trim().toLowerCase();

  const visible = tasks.filter(
    (task) =>
      (!query ||
        task.title.toLowerCase().includes(query) ||
        task.notes?.toLowerCase().includes(query)) &&
      (activeTags.size === 0 ||
        task.task_tags.some((link) => activeTags.has(link.tag_id))),
  );

  return {
    tasks,
    visible,
    filtering: query !== "" || activeTags.size > 0,
    habitLogsByTask: groupHabitLogs(data?.habitLogs ?? []),
    dailyStatusByTask: groupDailyStatuses(data?.dailyLogs ?? []),
  };
}

/**
 * Only tags that still exist count. A selected id whose tag is gone — deleted
 * by a tag save that then failed part-way — would otherwise hide every task,
 * with no checkbox left in the panel to untick it.
 */
export function activeTagIds(
  tagFilter: ReadonlySet<string> | undefined,
  tags: readonly Tag[],
): Set<string> {
  if (!tagFilter || tagFilter.size === 0) return new Set();
  const existing = new Set(tags.map((tag) => tag.id));
  return new Set([...tagFilter].filter((id) => existing.has(id)));
}

function groupHabitLogs(logs: readonly HabitLog[]) {
  const byTask = new Map<string, HabitLog[]>();
  for (const log of logs) {
    const list = byTask.get(log.task_id);
    if (list) list.push(log);
    else byTask.set(log.task_id, [log]);
  }
  return byTask;
}

function groupDailyStatuses(logs: readonly DailyLog[]) {
  const byTask = new Map<string, Map<ISODate, DailyLog["status"]>>();
  for (const log of logs) {
    let byDate = byTask.get(log.task_id);
    if (!byDate) {
      byDate = new Map();
      byTask.set(log.task_id, byDate);
    }
    byDate.set(log.log_date, log.status);
  }
  return byTask;
}

export type HabitInfo = {
  strength: ReturnType<typeof habitStrength>;
  plusToday: number;
  minusToday: number;
};

export function habitInfo(view: TrackerView, task: Task, today: ISODate): HabitInfo {
  const logs = view.habitLogsByTask.get(task.id) ?? [];
  const todays = logs.filter((log) => log.log_date === today);
  return {
    strength: habitStrength(logs),
    plusToday: todays.filter((log) => log.direction === "plus").length,
    minusToday: todays.filter((log) => log.direction === "minus").length,
  };
}

export type DailyInfo = { dueToday: boolean; doneToday: boolean; streak: number };

export function dailyInfo(view: TrackerView, task: Task, today: ISODate): DailyInfo {
  const statuses = view.dailyStatusByTask.get(task.id) ?? new Map();
  return {
    dueToday: isDueOn(task, today),
    doneToday: statuses.get(today) === "done",
    streak: dailyStreak(task, statuses, today),
  };
}

/** The same state colour the card's strips use, for the editor's header band. */
export function toneOf(view: TrackerView, task: Task | null, today: ISODate): Tone {
  if (!task) return "neutral";
  if (task.type === "habit") {
    const { strength } = habitInfo(view, task, today);
    return strength === "strong" ? "positive" : strength === "weak" ? "caution" : "neutral";
  }
  if (task.type === "daily") {
    const { dueToday, doneToday } = dailyInfo(view, task, today);
    return dueToday && !doneToday ? "caution" : "neutral";
  }
  return isOverdue(task, today) ? "caution" : "neutral";
}

// ── Per-column lists. Each takes the column's own filter tab. ──

export function habitsFor(view: TrackerView, filter: HabitFilter, today: ISODate): Task[] {
  return view.visible
    .filter((task) => task.type === "habit")
    .filter(
      (task) => filter === "all" || habitInfo(view, task, today).strength === filter,
    );
}

export function dailiesFor(view: TrackerView, filter: DailyFilter, today: ISODate): Task[] {
  return view.visible
    .filter((task) => task.type === "daily")
    .filter((task) => {
      if (filter === "all") return true;
      const { dueToday } = dailyInfo(view, task, today);
      return filter === "due" ? dueToday : !dueToday;
    });
}

export function todosFor(view: TrackerView, filter: TodoFilter): Task[] {
  return view.visible
    .filter((task) => task.type === "todo")
    .filter((task) => {
      const done = task.completed_at !== null;
      if (filter === "complete") return done;
      if (filter === "scheduled") return !done && task.due_date !== null;
      return !done;
    });
}

// ── Count badges. Each column counts something different. ──

/** Every habit. */
export function habitCount(view: TrackerView): number {
  return view.visible.filter((task) => task.type === "habit").length;
}

/** Dailies due today and not yet done — "dailies left today". */
export function dailyCount(view: TrackerView, today: ISODate): number {
  return view.visible.filter((task) => {
    if (task.type !== "daily") return false;
    const { dueToday, doneToday } = dailyInfo(view, task, today);
    return dueToday && !doneToday;
  }).length;
}

/** To-dos with no completion — "to-dos open". */
export function todoCount(view: TrackerView): number {
  return view.visible.filter(
    (task) => task.type === "todo" && task.completed_at === null,
  ).length;
}
