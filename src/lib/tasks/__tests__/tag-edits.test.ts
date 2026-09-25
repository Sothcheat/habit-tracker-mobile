import type { Tag } from "@/lib/tasks/api";
import { buildTagEdits, isNameTaken, type TagDraft } from "@/lib/tasks/tag-edits";

const tag = (id: string, name: string) => ({ id, name }) as Tag;
const draft = (key: string, id: string | null, name: string): TagDraft => ({ key, id, name });

const TAGS = [tag("t1", "Work"), tag("t2", "Home")];
const UNCHANGED = [draft("t1", "t1", "Work"), draft("t2", "t2", "Home")];

describe("isNameTaken", () => {
  it("ignores case, because two tags differing only in case read as one", () => {
    expect(isNameTaken(UNCHANGED, "work")).toBe(true);
    expect(isNameTaken(UNCHANGED, "  WORK  ")).toBe(true);
    expect(isNameTaken(UNCHANGED, "School")).toBe(false);
  });

  it("can exclude the row being edited", () => {
    expect(isNameTaken(UNCHANGED, "Work", "t1")).toBe(false);
  });
});

describe("buildTagEdits", () => {
  it("reports no change when nothing was touched", () => {
    const result = buildTagEdits(TAGS, UNCHANGED);
    expect(result).toMatchObject({ ok: true, empty: true });
  });

  it("collects a rename", () => {
    const result = buildTagEdits(TAGS, [draft("t1", "t1", "Office"), UNCHANGED[1]]);
    expect(result).toMatchObject({
      ok: true,
      empty: false,
      edits: { renamed: [{ id: "t1", name: "Office" }], deleted: [], created: [] },
    });
  });

  it("collects a deletion as whatever is no longer present", () => {
    const result = buildTagEdits(TAGS, [UNCHANGED[0]]);
    expect(result).toMatchObject({ ok: true, edits: { deleted: ["t2"] } });
  });

  it("collects a creation from a row with no id", () => {
    const result = buildTagEdits(TAGS, [...UNCHANGED, draft("new-1", null, "  School  ")]);
    expect(result).toMatchObject({ ok: true, edits: { created: ["School"] } });
  });

  it("handles a rename onto a name another row is giving up", () => {
    // Only safe because saveTagEdits deletes before it renames.
    const result = buildTagEdits(TAGS, [draft("t1", "t1", "Home")]);
    expect(result).toMatchObject({
      ok: true,
      edits: { deleted: ["t2"], renamed: [{ id: "t1", name: "Home" }] },
    });
  });

  it("rejects a blank name and says to remove it instead", () => {
    const result = buildTagEdits(TAGS, [draft("t1", "t1", "   "), UNCHANGED[1]]);
    expect(result).toEqual({
      ok: false,
      message: "Tags can't be blank. Remove one instead of emptying it.",
      invalidKeys: new Set(["t1"]),
    });
  });

  it("rejects a duplicate and marks both rows", () => {
    const result = buildTagEdits(TAGS, [draft("t1", "t1", "Home"), UNCHANGED[1]]);
    expect(result).toMatchObject({
      ok: false,
      message: "Two tags have the same name.",
    });
    if (!result.ok) expect(result.invalidKeys).toEqual(new Set(["t1", "t2"]));
  });

  it("treats a case-only difference as a duplicate", () => {
    const result = buildTagEdits(TAGS, [draft("t1", "t1", "HOME"), UNCHANGED[1]]);
    expect(result).toMatchObject({ ok: false, message: "Two tags have the same name." });
  });

  it("prefers the blank message when a row is both blank and repeated", () => {
    const result = buildTagEdits(TAGS, [draft("t1", "t1", ""), draft("t2", "t2", "")]);
    expect(result).toMatchObject({
      ok: false,
      message: "Tags can't be blank. Remove one instead of emptying it.",
    });
  });

  it("combines all three kinds of edit in one save", () => {
    const result = buildTagEdits(TAGS, [
      draft("t1", "t1", "Office"),
      draft("new-1", null, "School"),
    ]);
    expect(result).toMatchObject({
      ok: true,
      empty: false,
      edits: {
        deleted: ["t2"],
        renamed: [{ id: "t1", name: "Office" }],
        created: ["School"],
      },
    });
  });
});
