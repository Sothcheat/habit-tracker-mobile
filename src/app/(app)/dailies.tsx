import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { DailyCard } from "@/components/tracker/cards";
import { DeleteTaskDialog } from "@/components/tracker/delete-task-dialog";
import { TagSheet } from "@/components/tracker/tag-sheet";
import { TaskEditDialog } from "@/components/tracker/task-edit-dialog";
import { TaskColumn } from "@/components/tracker/task-column";
import { TaskMenu } from "@/components/tracker/task-menu";
import { useColumnFeedback } from "@/hooks/use-column-feedback";
import { activeTagIds } from "@/lib/tasks/selectors";
import { share, taskShareText } from "@/lib/share";
import type { Task } from "@/lib/tasks/api";
import {
  buildView,
  dailiesFor,
  dailyCount,
  dailyInfo,
  type DailyFilter,
  toneOf
} from "@/lib/tasks/selectors";
import { useTrackerContext } from "@/lib/tasks/tracker-context";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "due", label: "Due" },
  { value: "notDue", label: "Not due" },
] as const satisfies readonly { value: DailyFilter; label: string }[];

export default function Dailies() {
  const tracker = useTrackerContext();
  const { state, data, today, pendingIds, addTask, toggleDaily, removeTask, moveTask, saveTagEdits } =
    tracker;
  const [filter, setFilter] = useState<DailyFilter>("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [tagFilter, setTagFilter] = useState<ReadonlySet<string>>(new Set());
  // Non-null while the sheet is open; it carries the selection to restore on
  // Cancel, captured at the moment the sheet was opened.
  const [tagSheet, setTagSheet] = useState<{ snapshot: ReadonlySet<string> } | null>(null);
  const { error, notice, run, notify, dismiss } = useColumnFeedback();

  const view = buildView(data, { search, tagFilter });
  const dailies = dailiesFor(view, filter, today);
  const anyDailies = view.visible.some((task) => task.type === "daily");
  const column = view.tasks.filter((task) => task.type === "daily");

  async function handleShare(task: Task) {
    const { streak } = dailyInfo(view, task, today);
    const outcome = await share(taskShareText(task, { streak }));
    if (outcome === "failed") notify("That couldn't be shared.");
    else if (outcome === "copied") notify("Copied to clipboard.");
  }

  return (
    <ErrorBoundary section="Dailies">
      <TaskColumn
        title="Dailies"
        count={dailyCount(view, today)}
        countLabel="dailies left today"
        filters={FILTERS}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        tasks={dailies}
        loading={state.status === "loading"}
        addPlaceholder="Add a daily"
        onAdd={(title) => addTask("daily", title)}
        error={error}
        onDismissError={dismiss}
        notice={notice}
        tagCount={activeTagIds(tagFilter, data?.tags ?? []).size}
        onOpenTags={() => setTagSheet({ snapshot: new Set(tagFilter) })}
        filteredOut={
          anyDailies
            ? filter === "due"
              ? "Nothing due today."
              : "Everything is due today."
            : view.filtering
              ? "Nothing matches your search or tags."
              : null
        }
        empty={{
          icon: CalendarDays,
          title: "These are your dailies",
          body: "Dailies repeat on a schedule. Choose the rhythm that suits you.",
        }}
        renderTask={(task) => {
          const info = dailyInfo(view, task, today);
          return (
            <DailyCard
              task={task}
              dueToday={info.dueToday}
              doneToday={info.doneToday}
              streak={info.streak}
              pending={pendingIds.has(task.id)}
              onToggle={(done) => run(toggleDaily(task.id, done))}
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
