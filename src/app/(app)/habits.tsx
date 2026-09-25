import { Diff } from "lucide-react-native";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { DeleteTaskDialog } from "@/components/tracker/delete-task-dialog";
import { TagSheet } from "@/components/tracker/tag-sheet";
import { TaskEditDialog } from "@/components/tracker/task-edit-dialog";
import { HabitCard } from "@/components/tracker/cards";
import { TaskColumn } from "@/components/tracker/task-column";
import { TaskMenu } from "@/components/tracker/task-menu";
import { useColumnFeedback } from "@/hooks/use-column-feedback";
import { activeTagIds } from "@/lib/tasks/selectors";
import { share, taskShareText } from "@/lib/share";
import type { Task } from "@/lib/tasks/api";
import {
  buildView,
  habitCount,
  habitInfo,
  habitsFor,
  type HabitFilter,
  toneOf
} from "@/lib/tasks/selectors";
import { useTrackerContext } from "@/lib/tasks/tracker-context";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "weak", label: "Weak" },
  { value: "strong", label: "Strong" },
] as const satisfies readonly { value: HabitFilter; label: string }[];

export default function Habits() {
  const tracker = useTrackerContext();
  const { state, data, today, pendingIds, addTask, tapHabit, removeTask, moveTask, saveTagEdits } =
    tracker;
  const [filter, setFilter] = useState<HabitFilter>("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [tagFilter, setTagFilter] = useState<ReadonlySet<string>>(new Set());
  // Non-null while the sheet is open; it carries the selection to restore on
  // Cancel, captured at the moment the sheet was opened.
  const [tagSheet, setTagSheet] = useState<{ snapshot: ReadonlySet<string> } | null>(null);
  const { error, notice, run, notify, dismiss } = useColumnFeedback();

  const view = buildView(data, { search, tagFilter });
  const habits = habitsFor(view, filter, today);
  const anyHabits = view.visible.some((task) => task.type === "habit");

  // First/last are judged against the unfiltered column: "To top" means the
  // top of the list, not the top of whatever a filter is showing.
  const column = view.tasks.filter((task) => task.type === "habit");

  async function handleShare(task: Task) {
    const { plusToday } = habitInfo(view, task, today);
    const outcome = await share(taskShareText(task, { plusToday }));
    if (outcome === "failed") notify("That couldn't be shared.");
    else if (outcome === "copied") notify("Copied to clipboard.");
  }

  return (
    <ErrorBoundary section="Habits">
      <TaskColumn
        title="Habits"
        count={habitCount(view)}
        countLabel="habits"
        filters={FILTERS}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        tasks={habits}
        loading={state.status === "loading"}
        addPlaceholder="Add a habit"
        onAdd={(title) => addTask("habit", title)}
        error={error}
        onDismissError={dismiss}
        notice={notice}
        tagCount={activeTagIds(tagFilter, data?.tags ?? []).size}
        onOpenTags={() => setTagSheet({ snapshot: new Set(tagFilter) })}
        filteredOut={
          anyHabits
            ? `No ${filter} habits right now.`
            : view.filtering
              ? "Nothing matches your search or tags."
              : null
        }
        empty={{
          icon: Diff,
          title: "These are your habits",
          body: "Habits have no fixed schedule. Log them as many times a day as they happen.",
        }}
        renderTask={(task) => {
          const info = habitInfo(view, task, today);
          return (
            <HabitCard
              task={task}
              strength={info.strength}
              plusToday={info.plusToday}
              minusToday={info.minusToday}
              pending={pendingIds.has(task.id)}
              onTap={(direction) => run(tapHabit(task.id, direction))}
              onOpen={() => setEditing(task)}
              menu={
                <TaskMenu
                  title={task.title}
                  disabled={pendingIds.has(task.id)}
                  onEdit={() => setEditing(task)}
                  onShare={() => handleShare(task)}
                  onMoveTop={() => run(moveTask(task.id, "top"))}
                  onMoveBottom={() => run(moveTask(task.id, "bottom"))}
                  onDelete={() => setDeleting(task)}
                  isFirst={column[0]?.id === task.id}
                  isLast={column[column.length - 1]?.id === task.id}
                />
              }
            />
          );
        }}
      />
      <TagSheet
        visible={tagSheet !== null}
        onClose={() => setTagSheet(null)}
        tags={data?.tags ?? []}
        selected={tagFilter}
        snapshot={tagSheet?.snapshot ?? tagFilter}
        onChange={setTagFilter}
        onClearAll={() => {
          setTagFilter(new Set());
          setSearch("");
        }}
        onSaveEdits={async (edits) => {
          const result = await saveTagEdits(edits);
          if (!result.error && edits.deleted.length) {
            // A tag that no longer exists must not stay ticked, or it narrows
            // the board with no checkbox left to untick it.
            setTagFilter((current) => {
              const next = new Set(current);
              for (const id of edits.deleted) next.delete(id);
              return next;
            });
          }
          return result;
        }}
      />
      <TaskEditDialog
        task={editing}
        tone={editing ? toneOf(view, editing, today) : "neutral"}
        tracker={tracker}
        onClose={() => setEditing(null)}
      />
      <DeleteTaskDialog
        task={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDelete={removeTask}
      />
    </ErrorBoundary>
  );
}
