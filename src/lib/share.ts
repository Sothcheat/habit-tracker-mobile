import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import type { Task } from "@/lib/tasks/api";
import { formatDate } from "@/lib/tasks/dates";

export type ShareOutcome = "shared" | "copied" | "dismissed" | "failed";

/**
 * Hands a line to the system share sheet, falling back to the clipboard.
 *
 * The web had to ask whether a share sheet existed at all; every phone has
 * one, so `canShare()` is gone and the menu item is always offered.
 */
export async function share(text: string): Promise<ShareOutcome> {
  try {
    const result = await Share.share({ message: text });
    // Dismissing is a choice, not a failure — it must not raise an error.
    return result.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch {
    try {
      await Clipboard.setStringAsync(text);
      return "copied";
    } catch (error) {
      console.error(error);
      return "failed";
    }
  }
}

/** What a card knows about itself, for the line that gets shared. */
export type TaskFacts = {
  /** Habits: taps recorded today. */
  plusToday?: number;
  /** Dailies: consecutive days done. */
  streak?: number;
};

/**
 * The sentence the share sheet carries.
 *
 * It states what the task is doing now, because a bare title is not worth
 * sending: a habit brings today's count, a daily its streak, a to-do its due
 * date or that it is finished. Everything here is already on the card — this
 * shares what the user can see, and never a note, a tag or anything else the
 * card keeps to itself.
 */
export function taskShareText(task: Task, facts: TaskFacts = {}): string {
  const detail = describe(task, facts);
  return detail ? `${task.title} — ${detail}` : task.title;
}

function describe(task: Task, facts: TaskFacts): string | null {
  if (task.type === "habit") {
    const taps = facts.plusToday ?? 0;
    if (taps === 0) return null;
    return `${taps} ${taps === 1 ? "time" : "times"} today`;
  }
  if (task.type === "daily") {
    const streak = facts.streak ?? 0;
    return streak > 0 ? `${streak} day streak` : null;
  }
  if (task.completed_at) return "done";
  return task.due_date ? `due ${formatDate(task.due_date)}` : null;
}
