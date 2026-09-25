import { Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { type TextInput, View } from "react-native";
import { PRIORITY_LABEL } from "@/components/tracker/cards";
import {
  DeleteTaskDialog,
  TASK_KIND,
} from "@/components/tracker/delete-task-dialog";
import { TagSelect } from "@/components/tracker/tag-select";
import {
  DailySchedule,
  DirectionToggles,
  DueDateField,
} from "@/components/tracker/task-schedule-fields";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ChipGroup, type ChipOption } from "@/components/ui/chip-group";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { STRIP_TONE, type Tone } from "@/components/ui/tone";
import type { Task, TaskType } from "@/lib/tasks/api";
import {
  buildTaskFields,
  type TaskFormErrors,
  type TaskFormValues,
  validateTaskForm,
} from "@/lib/tasks/task-fields";
import type { Tracker } from "@/lib/tasks/use-tracker";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database.types";

/** "none" stands in for a null priority: a chip's value must be a string. */
const PRIORITY_OPTIONS: ChipOption<string>[] = [
  { value: "none", label: "None" },
  ...Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label })),
];

const DESCRIPTION: Record<TaskType, string> = {
  habit: "Habits have no schedule — log them whenever they happen.",
  daily: "Dailies repeat on a schedule you choose.",
  todo: "To-dos are done once. A due date is optional.",
};

type Mode =
  | { kind: "edit"; task: Task; tone: Tone }
  | { kind: "create"; type: TaskType };

/**
 * Create or edit a task.
 *
 * `task` opens it in edit mode, `type` in create mode; null for both keeps it
 * closed. The form inside is keyed per task and per type, so each opening
 * starts from fresh state rather than the last one's.
 */
export function TaskEditDialog({
  task,
  type,
  tone = "neutral",
  tracker,
  onClose,
}: {
  task?: Task | null;
  type?: TaskType | null;
  /** The card's state tone; the header band wears it, like the card's strips. */
  tone?: Tone;
  tracker: Tracker;
  onClose: () => void;
}) {
  const mode: Mode | null = task
    ? { kind: "edit", task, tone }
    : type
      ? { kind: "create", type }
      : null;

  return (
    <BottomSheet visible={mode !== null} onClose={onClose}>
      {({ requestClose }) =>
        mode ? (
          <TaskForm
            key={mode.kind === "edit" ? mode.task.id : mode.type}
            mode={mode}
            tracker={tracker}
            onClose={requestClose}
          />
        ) : null
      }
    </BottomSheet>
  );
}

/**
 * The one form behind both modes. Create and edit differ only in where the
 * values start, what Save calls, and the footer — so the two can't drift.
 */
function TaskForm({
  mode,
  tracker,
  onClose,
}: {
  mode: Mode;
  tracker: Tracker;
  onClose: () => void;
}) {
  const task = mode.kind === "edit" ? mode.task : null;
  const type = mode.kind === "edit" ? mode.task.type : mode.type;
  const creating = mode.kind === "create";

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<string>(task?.priority ?? "none");
  const [tracksPlus, setTracksPlus] = useState(task?.direction !== "negative");
  const [tracksMinus, setTracksMinus] = useState(task?.direction !== "positive");
  const [frequency, setFrequency] = useState<Enums<"frequency_type">>(
    task?.frequency ?? "daily",
  );
  const [startDate, setStartDate] = useState(task?.start_date ?? tracker.today);
  const [days, setDays] = useState<number[]>(task?.repeat_days ?? []);
  const [everyN, setEveryN] = useState(String(task?.every_n_days ?? 2));
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [tagIds, setTagIds] = useState<string[]>(
    task?.task_tags.map((link) => link.tag_id) ?? [],
  );

  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const titleRef = useRef<TextInput>(null);
  const kind = TASK_KIND[type];

  const values: TaskFormValues = {
    notes,
    priority,
    tracksPlus,
    tracksMinus,
    frequency,
    startDate,
    days,
    everyN,
    dueDate,
  };

  async function handleSubmit() {
    const next = validateTaskForm(type, title, values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.title) titleRef.current?.focus();
      return;
    }

    setSaving(true);
    setSaveError(null);
    const result = task
      ? await tracker.editTask(
          task.id,
          { title: title.trim(), ...buildTaskFields(type, values) },
          tagIds,
        )
      : await tracker.addTask(type, title, buildTaskFields(type, values), tagIds);
    setSaving(false);
    if (result.error) setSaveError(result.error);
    else onClose();
  }

  const busy = saving || (task ? tracker.pendingIds.has(task.id) : false);
  // Create waits for a title; edit always allows Save and explains what is
  // missing instead, since the task already has one.
  const submitDisabled = busy || (creating && !title.trim());
  const submitLabel = creating
    ? saving
      ? "Creating…"
      : "Create"
    : saving
      ? "Saving…"
      : "Save";

  return (
    <>
        {/* ── Header band: what the task is, wearing the card's own tone ── */}
          <View
            className={cn(
              "gap-5 px-5 pt-4 pb-6",
              STRIP_TONE[mode.kind === "edit" ? mode.tone : "neutral"],
            )}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text
                accessibilityRole="header"
                className="font-semibold text-foreground text-xl tracking-tight"
              >
                {creating ? "Create" : "Edit"} {kind}
              </Text>
              <View className="flex-row items-center gap-2">
                <Button variant="ghost" disabled={saving} onPress={onClose}>
                  Cancel
                </Button>
                <Button disabled={submitDisabled} onPress={handleSubmit}>
                  {submitLabel}
                </Button>
              </View>
            </View>

            <View className="gap-2">
              <Label>
                Title <Text className="text-muted-foreground">*</Text>
              </Label>
              <Input
                ref={titleRef}
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  if (errors.title) setErrors({});
                }}
                placeholder="Add a title"
                accessibilityLabel="Title"
                invalid={Boolean(errors.title)}
                editable={!busy}
                className="border-transparent bg-card"
              />
              {errors.title ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-destructive text-sm"
                >
                  {errors.title}
                </Text>
              ) : null}
            </View>

            <View className="gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes"
                accessibilityLabel="Notes"
                editable={!busy}
                className="border-transparent bg-card"
              />
            </View>
          </View>

          {/* ── Body ── */}
          <View className="gap-6 px-5 py-6">
            <Text className="text-muted-foreground text-sm leading-relaxed">
              {DESCRIPTION[type]}
            </Text>

            {type === "habit" ? (
              <DirectionToggles
                plus={tracksPlus}
                minus={tracksMinus}
                onPlus={setTracksPlus}
                onMinus={setTracksMinus}
                disabled={busy}
              />
            ) : null}

            {type === "daily" ? (
              <DailySchedule
                startDate={startDate}
                onStartDate={setStartDate}
                frequency={frequency}
                onFrequency={setFrequency}
                days={days}
                onDays={setDays}
                everyN={everyN}
                onEveryN={setEveryN}
                errors={errors}
                disabled={busy}
              />
            ) : null}

            {type === "todo" ? (
              <DueDateField dueDate={dueDate} onDueDate={setDueDate} disabled={busy} />
            ) : null}

            <View className="gap-2">
              <Label>Priority</Label>
              <ChipGroup
                label="Priority"
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={setPriority}
              />
            </View>

            <View className="gap-2">
              <Label>Tags</Label>
              <TagSelect
                tags={tracker.data?.tags ?? []}
                selected={tagIds}
                onChange={setTagIds}
                disabled={busy}
              />
            </View>

            {saveError ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-destructive text-sm leading-relaxed"
              >
                {saveError}
              </Text>
            ) : null}
          </View>

          {/* ── Footer ── */}
          <View className="border-border border-t px-5 py-3">
            {task ? (
              <Button
                variant="ghost"
                size="touch"
                onPress={() => setConfirmingDelete(true)}
                disabled={busy}
                className="self-center"
                textClassName="text-destructive"
              >
                <Icon as={Trash2} size={16} className="text-destructive" />
                <Text className="font-medium text-destructive text-sm">
                  Delete this {kind}
                </Text>
              </Button>
            ) : (
              // The action repeated at the foot, so a long form does not make
              // the user scroll back up to commit it.
              <Button
                variant="outline"
                size="touch"
                disabled={submitDisabled}
                onPress={handleSubmit}
                className="self-center px-8"
              >
                {submitLabel}
              </Button>
            )}
          </View>
      {task ? (
        <DeleteTaskDialog
          task={confirmingDelete ? task : null}
          onOpenChange={(open) => {
            if (!open) setConfirmingDelete(false);
          }}
          onDelete={tracker.removeTask}
          onDeleted={onClose}
        />
      ) : null}
    </>
  );
}
