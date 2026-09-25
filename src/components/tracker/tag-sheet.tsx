import { Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { Tag } from "@/lib/tasks/api";
import {
  buildTagEdits,
  isNameTaken,
  type TagDraft,
  type TagEdits,
} from "@/lib/tasks/tag-edits";
import type { Result } from "@/lib/tasks/use-tracker";
import { newId } from "@/lib/uuid";

/**
 * The tag panel, in two modes.
 *
 * - **filter**: ticks apply live, so the board narrows as you go. Cancel puts
 *   the selection back to what it was when the sheet opened.
 * - **edit**: rename, remove and add. Nothing is written until Save edits, and
 *   closing mid-edit discards — which is why the drafts live in a component
 *   that is unmounted on close rather than in the parent.
 */
export function TagSheet({
  visible,
  onClose,
  tags,
  selected,
  snapshot,
  onChange,
  onClearAll,
  onSaveEdits,
}: {
  visible: boolean;
  onClose: () => void;
  tags: Tag[];
  selected: ReadonlySet<string>;
  /**
   * What the selection was when the sheet was opened, so Cancel can put it
   * back. Captured by the caller at the opening gesture rather than in an
   * effect here: ticks apply live, so anything watching `selected` would
   * overwrite the very thing Cancel exists to restore.
   */
  snapshot: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  onClearAll: () => void;
  onSaveEdits: (edits: TagEdits) => Promise<Result>;
}) {
  const [mode, setMode] = useState<"filter" | "edit">("filter");

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        // Always reopen in filter mode; a half-finished edit is not a state to
        // return to.
        setMode("filter");
        onClose();
      }}
    >
      {({ requestClose }) =>
        mode === "edit" ? (
          <TagEditor
            tags={tags}
            onCancel={() => setMode("filter")}
            onSave={onSaveEdits}
          />
        ) : (
          <TagFilter
            tags={tags}
            selected={selected}
            onChange={onChange}
            onEdit={() => setMode("edit")}
            onClearAll={() => {
              onClearAll();
              requestClose();
            }}
            onCancel={() => {
              onChange(new Set(snapshot));
              requestClose();
            }}
          />
        )
      }
    </BottomSheet>
  );
}

function TagFilter({
  tags,
  selected,
  onChange,
  onEdit,
  onClearAll,
  onCancel,
}: {
  tags: Tag[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  onEdit: () => void;
  onClearAll: () => void;
  onCancel: () => void;
}) {
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <View>
      <View className="flex-row items-center justify-between gap-4 px-5 pt-5 pb-3">
        <Text
          accessibilityRole="header"
          className="font-semibold text-foreground text-base"
        >
          Tags
        </Text>
        <Button variant="ghost" onPress={onEdit}>
          Edit tags
        </Button>
      </View>

      <View className="gap-1 px-5 pb-4">
        {tags.length === 0 ? (
          <Text className="py-4 text-muted-foreground text-sm leading-relaxed">
            No tags yet. Choose Edit tags to make some.
          </Text>
        ) : (
          tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => toggle(tag.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected.has(tag.id) }}
              accessibilityLabel={tag.name}
              className="h-11 flex-row items-center gap-3 rounded-lg px-1 active:bg-accent"
            >
              <Checkbox
                checked={selected.has(tag.id)}
                onCheckedChange={() => toggle(tag.id)}
                accessibilityLabel={tag.name}
                iconSize={16}
                className="size-5 border-muted-foreground"
              />
              <Text className="flex-1 text-foreground text-sm">{tag.name}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View className="flex-row items-center justify-between border-border border-t px-3 py-2">
        <Button variant="destructive" onPress={onClearAll}>
          Clear all filters
        </Button>
        <Button variant="ghost" onPress={onCancel} textClassName="text-muted-foreground">
          Cancel
        </Button>
      </View>
    </View>
  );
}

function TagEditor({
  tags,
  onCancel,
  onSave,
}: {
  tags: Tag[];
  onCancel: () => void;
  onSave: (edits: TagEdits) => Promise<Result>;
}) {
  const [drafts, setDrafts] = useState<TagDraft[]>(() =>
    tags.map((tag) => ({ key: tag.id, id: tag.id, name: tag.name })),
  );
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [invalidKeys, setInvalidKeys] = useState<ReadonlySet<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Adds the typed name as a draft. Returns the rows including it. */
  function commitNew(): TagDraft[] | null {
    const name = newName.trim();
    if (!name) return drafts;
    if (isNameTaken(drafts, name)) {
      setNewError(`"${name}" is already in the list.`);
      return null;
    }
    const next = [...drafts, { key: `new-${newId()}`, id: null, name }];
    setDrafts(next);
    setNewName("");
    setNewError(null);
    return next;
  }

  async function handleSave() {
    setSaveError(null);
    // Text left in "New tag" counts — nobody expects to lose it on Save.
    const all = commitNew();
    if (!all) return;

    const result = buildTagEdits(tags, all);
    if (!result.ok) {
      setInvalidKeys(result.invalidKeys);
      setSaveError(result.message);
      return;
    }
    setInvalidKeys(new Set());
    if (result.empty) {
      onCancel();
      return;
    }

    setSaving(true);
    const saved = await onSave(result.edits);
    setSaving(false);
    if (saved.error) setSaveError(saved.error);
    else onCancel();
  }

  return (
    <View>
      <View className="px-5 pt-5 pb-3">
        <Text
          accessibilityRole="header"
          className="font-semibold text-foreground text-base"
        >
          Tags
        </Text>
      </View>

      <View className="gap-2 px-5 pb-4">
        {drafts.map((draft) => (
          <View key={draft.key} className="flex-row items-center gap-2">
            <Input
              value={draft.name}
              onChangeText={(name) => {
                setDrafts((current) =>
                  current.map((d) => (d.key === draft.key ? { ...d, name } : d)),
                );
                // Typing clears this row's mark; the message stands until Save.
                setInvalidKeys((current) => {
                  if (!current.has(draft.key)) return current;
                  const next = new Set(current);
                  next.delete(draft.key);
                  return next;
                });
              }}
              accessibilityLabel={draft.id ? "Tag name" : "Tag name (new)"}
              invalid={invalidKeys.has(draft.key)}
              editable={!saving}
              className="flex-1 bg-card"
            />
            <Pressable
              onPress={() =>
                setDrafts((current) => current.filter((d) => d.key !== draft.key))
              }
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${draft.name.trim() || "this tag"}`}
              hitSlop={8}
              className="size-9 items-center justify-center rounded-md active:bg-accent"
            >
              <Icon as={X} size={16} className="text-muted-foreground" />
            </Pressable>
          </View>
        ))}

        <View className="mt-1 flex-row items-center gap-2 rounded-lg border border-input bg-card px-3">
          <Icon as={Plus} size={16} className="text-muted-foreground" />
          <Input
            value={newName}
            onChangeText={(value) => {
              setNewName(value);
              if (newError) setNewError(null);
            }}
            onSubmitEditing={() => commitNew()}
            placeholder="New tag"
            accessibilityLabel="New tag"
            invalid={Boolean(newError)}
            editable={!saving}
            returnKeyType="done"
            className="flex-1 border-0 bg-transparent px-0"
          />
        </View>
        {newError ? (
          <Text accessibilityLiveRegion="polite" className="px-1 text-destructive text-sm">
            {newError}
          </Text>
        ) : null}
        {saveError ? (
          <Text accessibilityLiveRegion="polite" className="px-1 text-destructive text-sm">
            {saveError}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-end gap-2 border-border border-t px-3 py-2">
        <Button
          variant="ghost"
          onPress={onCancel}
          disabled={saving}
          textClassName="text-muted-foreground"
        >
          Cancel
        </Button>
        <Button onPress={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save edits"}
        </Button>
      </View>
    </View>
  );
}
