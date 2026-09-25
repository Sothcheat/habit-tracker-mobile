import { addDays, diffDays, formatDate, todayIn, weekdayOf } from "@/lib/tasks/dates";

describe("todayIn", () => {
  // The whole app's notion of "today" comes from here, and habit_logs.log_date
  // is the user's *local* date resolved client-side. If Hermes' Intl lacks IANA
  // zone support these fall apart, so assert the shape as well as the value.
  const noon = new Date("2026-09-24T12:00:00Z");

  it("returns YYYY-MM-DD", () => {
    expect(todayIn("UTC", noon)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves the local date east of UTC", () => {
    expect(todayIn("Asia/Phnom_Penh", noon)).toBe("2026-09-24");
  });

  it("resolves the local date west of UTC", () => {
    expect(todayIn("America/Los_Angeles", noon)).toBe("2026-09-24");
  });

  it("crosses the date line where the zone demands it", () => {
    // 22:00Z is already tomorrow in Phnom Penh (+07) and still today in LA.
    const late = new Date("2026-09-24T22:00:00Z");
    expect(todayIn("Asia/Phnom_Penh", late)).toBe("2026-09-25");
    expect(todayIn("America/Los_Angeles", late)).toBe("2026-09-24");
  });

  it("falls back to the device zone for an unknown zone name", () => {
    expect(todayIn("Not/AZone", noon)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDays", () => {
  it("moves forward and back", () => {
    expect(addDays("2026-09-24", 1)).toBe("2026-09-25");
    expect(addDays("2026-09-24", -1)).toBe("2026-09-23");
  });

  it("crosses a month and a year boundary", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("is unaffected by DST, because the arithmetic is in UTC", () => {
    // US DST ends 2026-11-01. A local-time implementation would return
    // 2026-11-01 twice or skip a day here.
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});

describe("diffDays", () => {
  it("counts whole days, signed", () => {
    expect(diffDays("2026-09-24", "2026-09-27")).toBe(3);
    expect(diffDays("2026-09-27", "2026-09-24")).toBe(-3);
    expect(diffDays("2026-09-24", "2026-09-24")).toBe(0);
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday through 6 for Saturday", () => {
    expect(weekdayOf("2026-09-20")).toBe(0); // Sunday
    expect(weekdayOf("2026-09-24")).toBe(4); // Thursday
    expect(weekdayOf("2026-09-26")).toBe(6); // Saturday
  });
});

describe("formatDate", () => {
  it("renders a human date", () => {
    expect(formatDate("2026-09-24")).toBe("Sep 24, 2026");
  });
});
