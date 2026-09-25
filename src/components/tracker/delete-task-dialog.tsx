import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import type { Task } from "@/lib/tasks/api";
import type { Result } from "@/lib/tasks/use-tracker";

export const TASK_KIND = {
  habit: "habit",
  daily: "daily",
  todo: "to-do",
} as const;

/**
 * The one confirmation before a task is deleted — shared by the card's ⋮ menu
 * and, later, the editor's "Delete this …" button, so the wording can't drift.
 *
 * The dialog stays open until the request resolves. A system alert would close
 * on the button press, taking any failure message with it.
 */
export function DeleteTaskDialog({
  task,
  onOpenChange,
  onDelete,
  onDeleted,
}: {
  /** The task to confirm deleting; null keeps the dialog closed. */
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (taskId: string) => Promise<Result>;
  onDeleted?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    setError(null);
    const result = await onDelete(task.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    close();
    onDeleted?.();
  }

  function close() {
    setError(null);
    onOpenChange(false);
  }

  const kind = task ? TASK_KIND[task.type] : "task";

  return (
    <Dialog
      visible={task !== null}
      onClose={close}
      title={`Delete “${task?.title}”?`}
      description={
        task?.type === "todo"
          ? `This ${kind} will be removed. This can't be undone.`
          : `Its whole history goes with it. This ${kind} and every log of it will be removed, and this can't be undone.`
      }
    >
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-destructive text-sm leading-relaxed"
        >
          {error}
        </Text>
      ) : null}
      <View className="flex-row justify-end gap-2">
        <Button variant="ghost" size="touch" disabled={deleting} onPress={close}>
          Keep it
        </Button>
        <Button
          variant="destructive"
          size="touch"
          disabled={deleting}
          onPress={handleDelete}
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </View>
    </Dialog>
  );
}
