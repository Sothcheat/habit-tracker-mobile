import type { TaskType } from "@/lib/tasks/api";
import type { ISODate } from "@/lib/tasks/dates";
import type { Enums, TablesUpdate } from "@/types/database.types";

/** Everything the editor collects, before it becomes a row. */
export type TaskFormValues = {
  notes: string;
  /** "none" stands in for a null priority: a chip's value must be a string. */
  priority: string;
  tracksPlus: boolean;
  tracksMinus: boolean;
  frequency: Enums<"frequency_type">;
  startDate: ISODate;
  days: number[];
  /** Kept as typed text so a half-entered number is not coerced mid-keystroke. */
  everyN: string;
  dueDate: ISODate | "";
};

export const asPriority = (value: string): Enums<"priority_level"> | null =>
  value === "none" ? null : (value as Enums<"priority_level">);

/**
 * Everything but the title, in the shape both insert and update take.
 *
 * The important part is what it sets to `null`. Switching a daily from "on
 * certain days" to "every few days" must clear `repeat_days`, or the row keeps
 * a day list nothing reads — which the database will happily store, because
 * `tasks_frequency_payload_check` only requires the field the *current*
 * frequency uses. A stale one is accepted and silently wrong.
 */
export function buildTaskFields(
  type: TaskType,
  values: TaskFormValues,
): Omit<TablesUpdate<"tasks">, "title"> {
  const fields: Omit<TablesUpdate<"tasks">, "title"> = {
    notes: values.notes.trim() || null,
    priority: asPriority(values.priority),
  };

  if (type === "habit") {
    fields.direction =
      values.tracksPlus && values.tracksMinus
        ? "both"
        : values.tracksPlus
          ? "positive"
          : "negative";
  }

  if (type === "daily") {
    fields.frequency = values.frequency;
    fields.start_date = values.startDate;
    // [...].sort, not toSorted: Hermes does not implement it.
    fields.repeat_days =
      values.frequency === "weekdays" ? [...values.days].sort((a, b) => a - b) : null;
    fields.every_n_days =
      values.frequency === "every_n_days" ? Number(values.everyN) : null;
  }

  if (type === "todo") fields.due_date = values.dueDate || null;

  return fields;
}

export type TaskFormErrors = Partial<
  Record<"title" | "startDate" | "days" | "interval", string>
>;

/** The messages are the web build's, word for word. */
export function validateTaskForm(
  type: TaskType,
  title: string,
  values: TaskFormValues,
): TaskFormErrors {
  const errors: TaskFormErrors = {};
  if (!title.trim()) errors.title = "Give it a name.";

  if (type === "daily") {
    if (!values.startDate) errors.startDate = "Choose a start date.";
    if (values.frequency === "weekdays" && values.days.length === 0) {
      errors.days = "Pick at least one day.";
    }
    const n = Number(values.everyN);
    if (values.frequency === "every_n_days" && (!Number.isInteger(n) || n < 1)) {
      errors.interval = "Use a whole number, 1 or more.";
    }
  }

  return errors;
}
