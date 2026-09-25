import { storage } from "@/lib/storage";
import type { PendingWrite } from "@/lib/tasks/outbox";
import { applyPatch, pendingCount, queueWrite } from "@/lib/tasks/outbox";
import type { TablesInsert } from "@/types/database.types";

// Swap SQLite-backed storage for the in-memory double: expo-sqlite has no
// native module under jest.
jest.mock("@/lib/storage");

// A factory, not an automock: an automock would still evaluate the real api.ts,
// which constructs the Supabase client. Only flushOutbox calls into api, and
// these tests cover queueing.
jest.mock("@/lib/tasks/api", () => ({}));

const USER = "user-1";
const TASK = "task-1";

const read = (): PendingWrite[] =>
  JSON.parse(storage.getItem(`cadence-outbox:${USER}`) ?? "[]");

const row = (over: Partial<TablesInsert<"tasks">> = {}): TablesInsert<"tasks"> =>
  ({ id: TASK, user_id: USER, type: "todo", title: "Original", ...over }) as TablesInsert<"tasks">;

const create = (over: Partial<TablesInsert<"tasks">> = {}): PendingWrite => ({
  id: "w-create",
  kind: "task-create",
  taskId: TASK,
  row: row(over),
  tagIds: [],
});

beforeEach(() => storage.clear());

describe("queueWrite — ticking a daily", () => {
  it("collapses repeated ticks on the same date to one state", () => {
    for (const [i, done] of [true, false, true, false].entries()) {
      queueWrite(USER, {
        id: `w${i}`,
        kind: "daily-mark",
        taskId: TASK,
        date: "2026-09-24",
        done,
      });
    }
    const items = read();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "daily-mark", done: false });
  });

  it("keeps ticks for different dates apart", () => {
    queueWrite(USER, { id: "a", kind: "daily-mark", taskId: TASK, date: "2026-09-24", done: true });
    queueWrite(USER, { id: "b", kind: "daily-mark", taskId: TASK, date: "2026-09-23", done: true });
    expect(read()).toHaveLength(2);
  });
});

describe("queueWrite — taps never collapse", () => {
  it("keeps every tap, because how many there were is the point", () => {
    for (let i = 0; i < 4; i++) {
      queueWrite(USER, {
        id: `t${i}`,
        kind: "habit-tap",
        taskId: TASK,
        logId: `log-${i}`,
        direction: "plus",
        date: "2026-09-24",
      });
    }
    expect(read()).toHaveLength(4);
  });
});

describe("queueWrite — edits merge", () => {
  it("merges two partial patches instead of losing the earlier field", () => {
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: { title: "Renamed" } });
    queueWrite(USER, { id: "e2", kind: "task-edit", taskId: TASK, patch: { position: 42 } });
    const items = read();
    expect(items).toHaveLength(1);
    // Superseding would have dropped the rename.
    expect(items[0]).toMatchObject({ patch: { title: "Renamed", position: 42 } });
  });

  it("folds a todo completion into a pending edit", () => {
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: { title: "Renamed" } });
    queueWrite(USER, {
      id: "c1",
      kind: "todo-complete",
      taskId: TASK,
      completedAt: "2026-09-24T10:00:00Z",
    });
    const items = read();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "task-edit",
      patch: { title: "Renamed", completed_at: "2026-09-24T10:00:00Z" },
    });
  });

  it("collapses repeated todo completions to the latest", () => {
    queueWrite(USER, { id: "c1", kind: "todo-complete", taskId: TASK, completedAt: "2026-09-24T10:00:00Z" });
    queueWrite(USER, { id: "c2", kind: "todo-complete", taskId: TASK, completedAt: null });
    const items = read();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "todo-complete", completedAt: null });
  });
});

describe("queueWrite — an edit to a task not yet created", () => {
  it("folds into the create, so the row is inserted with its final values", () => {
    queueWrite(USER, create());
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: { title: "Final" } });
    const items = read();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "task-create", row: { title: "Final" } });
  });

  it("replaces the create's tag ids when the edit carries them", () => {
    queueWrite(USER, create());
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: {}, tagIds: ["tag-a"] });
    expect(read()[0]).toMatchObject({ kind: "task-create", tagIds: ["tag-a"] });
  });
});

describe("queueWrite — deleting", () => {
  it("cancels everything queued about that task", () => {
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: { title: "Renamed" } });
    queueWrite(USER, {
      id: "t1", kind: "habit-tap", taskId: TASK, logId: "l1", direction: "plus", date: "2026-09-24",
    });
    queueWrite(USER, { id: "d1", kind: "task-delete", taskId: TASK });
    const items = read();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "task-delete" });
  });

  it("queues nothing at all when the task was also created offline", () => {
    // The server never heard of the row, so there is nothing to tell it.
    queueWrite(USER, create());
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: { title: "x" } });
    queueWrite(USER, { id: "d1", kind: "task-delete", taskId: TASK });
    expect(read()).toHaveLength(0);
  });

  it("leaves other tasks' writes alone", () => {
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: "other", patch: { title: "Keep" } });
    queueWrite(USER, { id: "d1", kind: "task-delete", taskId: TASK });
    expect(read()).toHaveLength(2);
  });
});

describe("queueWrite — storage", () => {
  it("scopes the queue per user so writes never replay into the wrong account", () => {
    queueWrite(USER, { id: "d1", kind: "task-delete", taskId: TASK });
    expect(pendingCount(USER)).toBe(1);
    expect(pendingCount("someone-else")).toBe(0);
  });

  it("removes the key entirely once the queue empties", () => {
    queueWrite(USER, create());
    queueWrite(USER, { id: "d1", kind: "task-delete", taskId: TASK });
    expect(storage.getItem(`cadence-outbox:${USER}`)).toBeNull();
  });

  it("survives a reload, because entries are data and not closures", () => {
    queueWrite(USER, { id: "e1", kind: "task-edit", taskId: TASK, patch: { title: "Renamed" } });
    // A fresh read is all a relaunch does.
    expect(pendingCount(USER)).toBe(1);
  });
});

describe("applyPatch", () => {
  it("treats undefined as untouched and null as clear", () => {
    const base = { title: "Keep", notes: "Keep too", due_date: "2026-09-24" };
    const next = applyPatch(base, { title: undefined, notes: null, due_date: "2026-10-01" });
    expect(next).toEqual({ title: "Keep", notes: null, due_date: "2026-10-01" });
  });

  it("does not mutate the base", () => {
    const base = { title: "Keep" };
    applyPatch(base, { title: "Changed" });
    expect(base.title).toBe("Keep");
  });
});
