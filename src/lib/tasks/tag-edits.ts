import type { Tag } from "@/lib/tasks/api";

/** One row in the tag editor. `id` is null for a tag not yet created. */
export type TagDraft = { key: string; id: string | null; name: string };

export type TagEdits = {
  deleted: string[];
  renamed: { id: string; name: string }[];
  created: string[];
};

export type TagEditsResult =
  | { ok: true; edits: TagEdits; empty: boolean }
  | { ok: false; message: string; invalidKeys: Set<string> };

/** Case-insensitive, because two tags differing only in case read as one. */
export function isNameTaken(
  drafts: readonly TagDraft[],
  name: string,
  exceptKey?: string,
): boolean {
  const needle = name.trim().toLowerCase();
  return drafts.some(
    (draft) => draft.key !== exceptKey && draft.name.trim().toLowerCase() === needle,
  );
}

/**
 * Turns the editor's rows into the three lists `saveTagEdits` applies.
 *
 * `empty` means nothing actually changed — the caller closes rather than
 * sending a no-op round trip.
 *
 * The order those lists are applied in matters and is `saveTagEdits`'s job:
 * delete, then rename, then create. `tags` is unique on `(user_id, name)`, so
 * renaming onto a name that another row is giving up only works if the delete
 * has already happened.
 */
export function buildTagEdits(
  tags: readonly Tag[],
  drafts: readonly TagDraft[],
): TagEditsResult {
  const invalidKeys = new Set<string>();
  const seen = new Map<string, string>();

  for (const draft of drafts) {
    const name = draft.name.trim().toLowerCase();
    if (!name) invalidKeys.add(draft.key);
    const clash = seen.get(name);
    if (name && clash) {
      invalidKeys.add(draft.key);
      invalidKeys.add(clash);
    }
    if (name) seen.set(name, draft.key);
  }

  if (invalidKeys.size > 0) {
    const anyBlank = [...invalidKeys].some(
      (key) => !drafts.find((draft) => draft.key === key)?.name.trim(),
    );
    return {
      ok: false,
      invalidKeys,
      message: anyBlank
        ? "Tags can't be blank. Remove one instead of emptying it."
        : "Two tags have the same name.",
    };
  }

  const kept = new Set(drafts.flatMap((draft) => (draft.id ? [draft.id] : [])));

  const edits: TagEdits = {
    deleted: tags.filter((tag) => !kept.has(tag.id)).map((tag) => tag.id),
    renamed: drafts.flatMap((draft) => {
      const original = tags.find((tag) => tag.id === draft.id);
      return original && original.name !== draft.name.trim()
        ? [{ id: original.id, name: draft.name.trim() }]
        : [];
    }),
    created: drafts.filter((draft) => !draft.id).map((draft) => draft.name.trim()),
  };

  return {
    ok: true,
    edits,
    empty:
      edits.deleted.length === 0 &&
      edits.renamed.length === 0 &&
      edits.created.length === 0,
  };
}
