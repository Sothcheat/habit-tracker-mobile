import type { Schedule } from "@/lib/tasks/schedule";
import { dailyStreak, habitStrength, isDueOn, isOverdue } from "@/lib/tasks/schedule";

const daily = (over: Partial<Schedule> = {}): Schedule => ({
  frequency: "daily",
  repeat_days: null,
  every_n_days: null,
  start_date: "2026-09-01",
  ...over,
});

describe("isDueOn", () => {
  it("is never due before the start date", () => {
    expect(isDueOn(daily({ start_date: "2026-09-10" }), "2026-09-09")).toBe(false);
    expect(isDueOn(daily({ start_date: "2026-09-10" }), "2026-09-10")).toBe(true);
  });

  it("is never due without a start date", () => {
    expect(isDueOn(daily({ start_date: null }), "2026-09-24")).toBe(false);
  });

  it("daily is due every day", () => {
    expect(isDueOn(daily(), "2026-09-24")).toBe(true);
  });

  it("weekdays is due only on the listed days", () => {
    // 2026-09-24 is a Thursday (4).
    const task = daily({ frequency: "weekdays", repeat_days: [1, 3, 5] });
    expect(isDueOn(task, "2026-09-24")).toBe(false);
    expect(isDueOn(daily({ frequency: "weekdays", repeat_days: [4] }), "2026-09-24")).toBe(true);
  });

  it("weekdays with no days listed is never due", () => {
    expect(isDueOn(daily({ frequency: "weekdays", repeat_days: [] }), "2026-09-24")).toBe(false);
  });

  it("every_n_days counts from the start date", () => {
    const task = daily({ frequency: "every_n_days", every_n_days: 3, start_date: "2026-09-01" });
    expect(isDueOn(task, "2026-09-01")).toBe(true);
    expect(isDueOn(task, "2026-09-02")).toBe(false);
    expect(isDueOn(task, "2026-09-04")).toBe(true);
  });

  it("treats a zero or missing interval as every day rather than dividing by zero", () => {
    const task = daily({ frequency: "every_n_days", every_n_days: 0 });
    expect(isDueOn(task, "2026-09-24")).toBe(true);
  });
});

describe("dailyStreak", () => {
  const today = "2026-09-24";
  const statuses = (entries: Record<string, "done" | "frozen">) =>
    new Map(Object.entries(entries));

  it("counts an unbroken run ending today", () => {
    expect(
      dailyStreak(
        daily(),
        statuses({ "2026-09-24": "done", "2026-09-23": "done", "2026-09-22": "done" }),
        today,
      ),
    ).toBe(3);
  });

  it("does not break the streak when today is simply not done yet", () => {
    // The whole point: an unfinished today is not a failure.
    expect(
      dailyStreak(daily(), statuses({ "2026-09-23": "done", "2026-09-22": "done" }), today),
    ).toBe(2);
  });

  it("counts today only when it is done", () => {
    expect(dailyStreak(daily(), statuses({ "2026-09-24": "done" }), today)).toBe(1);
    expect(dailyStreak(daily(), statuses({}), today)).toBe(0);
  });

  it("holds the streak across a frozen day without incrementing it", () => {
    expect(
      dailyStreak(
        daily(),
        statuses({ "2026-09-23": "done", "2026-09-22": "frozen", "2026-09-21": "done" }),
        today,
      ),
    ).toBe(2);
  });

  it("breaks on a missed day that was due", () => {
    expect(
      dailyStreak(daily(), statuses({ "2026-09-23": "done", "2026-09-21": "done" }), today),
    ).toBe(1);
  });

  it("skips days the task was not due, rather than breaking", () => {
    // Due Mondays only. 2026-09-21 and 2026-09-14 are Mondays.
    const task = daily({ frequency: "weekdays", repeat_days: [1], start_date: "2026-01-01" });
    expect(dailyStreak(task, statuses({ "2026-09-21": "done", "2026-09-14": "done" }), today)).toBe(2);
  });

  it("stops at the start date", () => {
    const task = daily({ start_date: "2026-09-23" });
    expect(
      dailyStreak(task, statuses({ "2026-09-23": "done", "2026-09-22": "done" }), today),
    ).toBe(1);
  });

  it("respects the look-back window", () => {
    const all: Record<string, "done"> = {};
    for (let i = 0; i < 40; i++) {
      const d = new Date(Date.UTC(2026, 8, 24) - i * 86_400_000);
      all[d.toISOString().slice(0, 10)] = "done";
    }
    expect(dailyStreak(daily({ start_date: "2020-01-01" }), statuses(all), today, 10)).toBe(11);
  });
});

describe("isOverdue", () => {
  it("is overdue only when incomplete and past due", () => {
    expect(isOverdue({ due_date: "2026-09-23", completed_at: null }, "2026-09-24")).toBe(true);
    expect(isOverdue({ due_date: "2026-09-24", completed_at: null }, "2026-09-24")).toBe(false);
    expect(isOverdue({ due_date: null, completed_at: null }, "2026-09-24")).toBe(false);
    expect(
      isOverdue({ due_date: "2026-09-23", completed_at: "2026-09-23T10:00:00Z" }, "2026-09-24"),
    ).toBe(false);
  });
});

describe("habitStrength", () => {
  it("reads the net of plus and minus taps", () => {
    expect(habitStrength([{ direction: "plus" }, { direction: "plus" }])).toBe("strong");
    expect(habitStrength([{ direction: "minus" }])).toBe("weak");
    expect(habitStrength([{ direction: "plus" }, { direction: "minus" }])).toBe("neutral");
    expect(habitStrength([])).toBe("neutral");
  });
});
