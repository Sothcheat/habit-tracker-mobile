import { buildTaskFields, type TaskFormValues, validateTaskForm } from "@/lib/tasks/task-fields";

const values = (over: Partial<TaskFormValues> = {}): TaskFormValues => ({
  notes: "",
  priority: "none",
  tracksPlus: true,
  tracksMinus: true,
  frequency: "daily",
  startDate: "2026-09-24",
  days: [],
  everyN: "2",
  dueDate: "",
  ...over,
});

describe("buildTaskFields — shared", () => {
  it("trims notes to null rather than storing whitespace", () => {
    expect(buildTaskFields("todo", values({ notes: "   " })).notes).toBeNull();
    expect(buildTaskFields("todo", values({ notes: " keep " })).notes).toBe("keep");
  });

  it("maps the 'none' priority chip back to null", () => {
    expect(buildTaskFields("todo", values()).priority).toBeNull();
    expect(buildTaskFields("todo", values({ priority: "urgent" })).priority).toBe("urgent");
  });
});

describe("buildTaskFields — habit direction", () => {
  it.each([
    [true, true, "both"],
    [true, false, "positive"],
    [false, true, "negative"],
  ])("plus=%s minus=%s -> %s", (tracksPlus, tracksMinus, expected) => {
    expect(buildTaskFields("habit", values({ tracksPlus, tracksMinus })).direction).toBe(
      expected,
    );
  });

  it("does not set schedule fields on a habit", () => {
    const fields = buildTaskFields("habit", values());
    expect(fields).not.toHaveProperty("frequency");
    expect(fields).not.toHaveProperty("due_date");
  });
});

describe("buildTaskFields — daily schedule", () => {
  it("clears the schedule field the chosen frequency does not use", () => {
    // The whole point: `tasks_frequency_payload_check` only requires the field
    // the *current* frequency uses, so a stale one is stored without complaint
    // and is silently wrong.
    const weekdays = buildTaskFields("daily", values({ frequency: "weekdays", days: [3, 1] }));
    expect(weekdays.repeat_days).toEqual([1, 3]);
    expect(weekdays.every_n_days).toBeNull();

    const everyN = buildTaskFields(
      "daily",
      values({ frequency: "every_n_days", everyN: "3", days: [1, 3] }),
    );
    expect(everyN.every_n_days).toBe(3);
    expect(everyN.repeat_days).toBeNull();

    const daily = buildTaskFields("daily", values({ frequency: "daily", days: [1, 3] }));
    expect(daily.repeat_days).toBeNull();
    expect(daily.every_n_days).toBeNull();
  });

  it("sorts the day list", () => {
    const fields = buildTaskFields("daily", values({ frequency: "weekdays", days: [5, 0, 2] }));
    expect(fields.repeat_days).toEqual([0, 2, 5]);
  });

  it("always carries frequency and start date", () => {
    const fields = buildTaskFields("daily", values({ startDate: "2026-01-01" }));
    expect(fields.frequency).toBe("daily");
    expect(fields.start_date).toBe("2026-01-01");
  });
});

describe("buildTaskFields — to-do due date", () => {
  it("stores an empty due date as null", () => {
    expect(buildTaskFields("todo", values({ dueDate: "" })).due_date).toBeNull();
    expect(buildTaskFields("todo", values({ dueDate: "2026-10-01" })).due_date).toBe("2026-10-01");
  });
});

describe("validateTaskForm", () => {
  it("requires a title for every type", () => {
    expect(validateTaskForm("habit", "  ", values()).title).toBe("Give it a name.");
    expect(validateTaskForm("habit", "Walk", values()).title).toBeUndefined();
  });

  it("requires a start date for a daily", () => {
    expect(validateTaskForm("daily", "X", values({ startDate: "" })).startDate).toBe(
      "Choose a start date.",
    );
  });

  it("requires at least one day when repeating on certain days", () => {
    expect(validateTaskForm("daily", "X", values({ frequency: "weekdays", days: [] })).days).toBe(
      "Pick at least one day.",
    );
    expect(
      validateTaskForm("daily", "X", values({ frequency: "weekdays", days: [1] })).days,
    ).toBeUndefined();
  });

  it("requires a whole interval of 1 or more", () => {
    const bad = ["0", "-1", "1.5", "", "abc"];
    for (const everyN of bad) {
      expect(
        validateTaskForm("daily", "X", values({ frequency: "every_n_days", everyN })).interval,
      ).toBe("Use a whole number, 1 or more.");
    }
    expect(
      validateTaskForm("daily", "X", values({ frequency: "every_n_days", everyN: "3" })).interval,
    ).toBeUndefined();
  });

  it("does not apply daily rules to other types", () => {
    const broken = values({ startDate: "", frequency: "weekdays", days: [] });
    expect(validateTaskForm("habit", "X", broken)).toEqual({});
    expect(validateTaskForm("todo", "X", broken)).toEqual({});
  });
});
