import type { DailyLog, HabitLog, Tag, Task } from "@/lib/tasks/api";
import {
  buildView,
  dailiesFor,
  dailyCount,
  dailyInfo,
  habitCount,
  habitInfo,
  habitsFor,
  sortKey,
  todoCount,
  todosFor,
  toneOf,
} from "@/lib/tasks/selectors";
import type { TrackerData } from "@/lib/tasks/types";

jest.mock("@/lib/storage");

const TODAY = "2026-09-24";

const task = (over: Partial<Task> & Pick<Task, "id" | "type" | "title">): Task =>
  ({
    notes: null,
    priority: null,
    direction: over.type === "habit" ? "both" : null,
    frequency: over.type === "daily" ? "daily" : null,
    repeat_days: null,
    every_n_days: null,
    start_date: over.type === "daily" ? "2026-01-01" : null,
    due_date: null,
    completed_at: null,
    archived_at: null,
    user_id: "u1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    position: 100,
    task_tags: [],
    ...over,
  }) as Task;

const data = (over: Partial<TrackerData> = {}): TrackerData => ({
  timezone: "UTC",
  avatarPath: null,
  tasks: [],
  tags: [],
  habitLogs: [],
  dailyLogs: [],
  ...over,
});

const habitLog = (taskId: string, direction: "plus" | "minus", date = TODAY): HabitLog =>
  ({ id: `${taskId}-${date}-${direction}-${Math.random()}`, task_id: taskId, direction, log_date: date }) as HabitLog;

const dailyLog = (taskId: string, date: string, status: "done" | "frozen" = "done"): DailyLog =>
  ({ id: `${taskId}-${date}`, task_id: taskId, log_date: date, status }) as DailyLog;

describe("sortKey", () => {
  it("prefers position", () => {
    expect(sortKey(task({ id: "a", type: "todo", title: "A", position: 42 }))).toBe(42);
  });

  it("falls back to created_at in epoch seconds when position is absent", () => {
    const row = task({ id: "a", type: "todo", title: "A", created_at: "2026-09-24T00:00:00.000Z" });
    // @ts-expect-error simulating a row from before the position migration
    row.position = undefined;
    expect(sortKey(row)).toBe(Date.parse("2026-09-24T00:00:00.000Z") / 1000);
  });
});

describe("buildView ordering", () => {
  it("sorts by position ascending", () => {
    const view = buildView(
      data({
        tasks: [
          task({ id: "c", type: "todo", title: "C", position: 30 }),
          task({ id: "a", type: "todo", title: "A", position: 10 }),
          task({ id: "b", type: "todo", title: "B", position: 20 }),
        ],
      }),
    );
    expect(view.tasks.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const tasks = [
      task({ id: "b", type: "todo", title: "B", position: 20 }),
      task({ id: "a", type: "todo", title: "A", position: 10 }),
    ];
    buildView(data({ tasks }));
    expect(tasks.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("buildView search", () => {
  const tasks = [
    task({ id: "a", type: "todo", title: "Buy milk", position: 1 }),
    task({ id: "b", type: "todo", title: "Call mum", notes: "about the milk", position: 2 }),
    task({ id: "c", type: "todo", title: "Run", position: 3 }),
  ];

  it("matches title or notes, case-insensitively", () => {
    const view = buildView(data({ tasks }), { search: "MILK" });
    expect(view.visible.map((t) => t.id)).toEqual(["a", "b"]);
    expect(view.filtering).toBe(true);
  });

  it("treats a blank query as no filter", () => {
    const view = buildView(data({ tasks }), { search: "   " });
    expect(view.visible).toHaveLength(3);
    expect(view.filtering).toBe(false);
  });
});

describe("buildView tag filter", () => {
  const tags = [{ id: "t1", name: "Work" }, { id: "t2", name: "Home" }] as Tag[];
  const tasks = [
    task({ id: "a", type: "todo", title: "A", position: 1, task_tags: [{ tag_id: "t1" }] }),
    task({ id: "b", type: "todo", title: "B", position: 2, task_tags: [{ tag_id: "t2" }] }),
    task({ id: "c", type: "todo", title: "C", position: 3 }),
  ];

  it("keeps tasks carrying ANY selected tag", () => {
    const view = buildView(data({ tasks, tags }), { tagFilter: new Set(["t1", "t2"]) });
    expect(view.visible.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("ignores a selected tag that no longer exists", () => {
    // Otherwise a tag deleted mid-save hides everything, with no checkbox left
    // in the panel to untick it.
    const view = buildView(data({ tasks, tags }), { tagFilter: new Set(["gone"]) });
    expect(view.visible).toHaveLength(3);
    expect(view.filtering).toBe(false);
  });

  it("combines search AND tags", () => {
    const view = buildView(data({ tasks, tags }), {
      search: "A",
      tagFilter: new Set(["t2"]),
    });
    expect(view.visible).toHaveLength(0);
  });
});

describe("habitInfo", () => {
  const habit = task({ id: "h", type: "habit", title: "Walk", position: 1 });

  it("counts today's taps by direction and reads overall strength", () => {
    const view = buildView(
      data({
        tasks: [habit],
        habitLogs: [
          habitLog("h", "plus"),
          habitLog("h", "plus"),
          habitLog("h", "minus"),
          habitLog("h", "plus", "2026-09-20"),
        ],
      }),
    );
    expect(habitInfo(view, habit, TODAY)).toEqual({
      strength: "strong",
      plusToday: 2,
      minusToday: 1,
    });
  });

  it("is neutral and empty with no logs", () => {
    const view = buildView(data({ tasks: [habit] }));
    expect(habitInfo(view, habit, TODAY)).toEqual({
      strength: "neutral",
      plusToday: 0,
      minusToday: 0,
    });
  });
});

describe("dailyInfo", () => {
  const daily = task({ id: "d", type: "daily", title: "Stretch", position: 1 });

  it("reports due, done and streak together", () => {
    const view = buildView(
      data({
        tasks: [daily],
        dailyLogs: [dailyLog("d", TODAY), dailyLog("d", "2026-09-23")],
      }),
    );
    expect(dailyInfo(view, daily, TODAY)).toEqual({
      dueToday: true,
      doneToday: true,
      streak: 2,
    });
  });

  it("is due but not done with no log for today", () => {
    const view = buildView(data({ tasks: [daily], dailyLogs: [dailyLog("d", "2026-09-23")] }));
    expect(dailyInfo(view, daily, TODAY)).toMatchObject({ dueToday: true, doneToday: false });
  });
});

describe("column filters", () => {
  const strong = task({ id: "s", type: "habit", title: "Strong", position: 1 });
  const weak = task({ id: "w", type: "habit", title: "Weak", position: 2 });
  const view = buildView(
    data({
      tasks: [strong, weak],
      habitLogs: [habitLog("s", "plus"), habitLog("w", "minus")],
    }),
  );

  it("filters habits by strength", () => {
    expect(habitsFor(view, "all", TODAY).map((t) => t.id)).toEqual(["s", "w"]);
    expect(habitsFor(view, "strong", TODAY).map((t) => t.id)).toEqual(["s"]);
    expect(habitsFor(view, "weak", TODAY).map((t) => t.id)).toEqual(["w"]);
  });

  it("filters dailies by due", () => {
    const due = task({ id: "due", type: "daily", title: "Due", position: 1 });
    const notDue = task({
      id: "not", type: "daily", title: "Not", position: 2,
      frequency: "weekdays", repeat_days: [0], // Sunday; TODAY is a Thursday
    });
    const v = buildView(data({ tasks: [due, notDue] }));
    expect(dailiesFor(v, "all", TODAY)).toHaveLength(2);
    expect(dailiesFor(v, "due", TODAY).map((t) => t.id)).toEqual(["due"]);
    expect(dailiesFor(v, "notDue", TODAY).map((t) => t.id)).toEqual(["not"]);
  });

  it("filters to-dos by active, scheduled and complete", () => {
    const open = task({ id: "o", type: "todo", title: "Open", position: 1 });
    const scheduled = task({ id: "s2", type: "todo", title: "Sched", position: 2, due_date: "2026-10-01" });
    const done = task({ id: "d2", type: "todo", title: "Done", position: 3, completed_at: "2026-09-24T00:00:00Z" });
    const v = buildView(data({ tasks: [open, scheduled, done] }));

    // "active" is the default tab and means not completed — including scheduled.
    expect(todosFor(v, "active").map((t) => t.id)).toEqual(["o", "s2"]);
    expect(todosFor(v, "scheduled").map((t) => t.id)).toEqual(["s2"]);
    expect(todosFor(v, "complete").map((t) => t.id)).toEqual(["d2"]);
  });
});

describe("count badges", () => {
  it("counts each column the way its label claims", () => {
    const view = buildView(
      data({
        tasks: [
          task({ id: "h", type: "habit", title: "H", position: 1 }),
          task({ id: "dDone", type: "daily", title: "Done", position: 2 }),
          task({ id: "dLeft", type: "daily", title: "Left", position: 3 }),
          task({ id: "tOpen", type: "todo", title: "Open", position: 4 }),
          task({ id: "tDone", type: "todo", title: "Done", position: 5, completed_at: "2026-09-24T00:00:00Z" }),
        ],
        dailyLogs: [dailyLog("dDone", TODAY)],
      }),
    );
    expect(habitCount(view)).toBe(1);
    // "dailies left today" — due and not yet done.
    expect(dailyCount(view, TODAY)).toBe(1);
    // "to-dos open" — no completion.
    expect(todoCount(view)).toBe(1);
  });
});

describe("toneOf", () => {
  it("maps habit strength to a tone", () => {
    const strong = task({ id: "s", type: "habit", title: "S", position: 1 });
    const weak = task({ id: "w", type: "habit", title: "W", position: 2 });
    const view = buildView(
      data({ tasks: [strong, weak], habitLogs: [habitLog("s", "plus"), habitLog("w", "minus")] }),
    );
    expect(toneOf(view, strong, TODAY)).toBe("positive");
    expect(toneOf(view, weak, TODAY)).toBe("caution");
  });

  it("cautions a daily that is due and not done, and nothing once it is", () => {
    const daily = task({ id: "d", type: "daily", title: "D", position: 1 });
    expect(toneOf(buildView(data({ tasks: [daily] })), daily, TODAY)).toBe("caution");
    const done = buildView(data({ tasks: [daily], dailyLogs: [dailyLog("d", TODAY)] }));
    expect(toneOf(done, daily, TODAY)).toBe("neutral");
  });

  it("cautions only an overdue to-do", () => {
    const overdue = task({ id: "o", type: "todo", title: "O", position: 1, due_date: "2026-09-23" });
    const later = task({ id: "l", type: "todo", title: "L", position: 2, due_date: "2026-10-01" });
    const view = buildView(data({ tasks: [overdue, later] }));
    expect(toneOf(view, overdue, TODAY)).toBe("caution");
    expect(toneOf(view, later, TODAY)).toBe("neutral");
    expect(toneOf(view, null, TODAY)).toBe("neutral");
  });
});
