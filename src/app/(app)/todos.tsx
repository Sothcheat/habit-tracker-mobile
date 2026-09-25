import { SquareCheckBig } from "lucide-react-native";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { TodoCard } from "@/components/tracker/cards";
import { DeleteTaskDialog } from "@/components/tracker/delete-task-dialog";
import { TagSheet } from "@/components/tracker/tag-sheet";
import { TaskEditDialog } from "@/components/tracker/task-edit-dialog";
import { TaskColumn } from "@/components/tracker/task-column";
import { TaskMenu } from "@/components/tracker/task-menu";
import { useColumnFeedback } from "@/hooks/use-column-feedback";
import { activeTagIds } from "@/lib/tasks/selectors";
import { share, taskShareText } from "@/lib/share";
import type { Task } from "@/lib/tasks/api";
import { isOverdue } from "@/lib/tasks/schedule";
import {
  buildView,
  todoCount,
  todosFor,
  type TodoFilter,
  toneOf
} from "@/lib/tasks/selectors";
import { useTrackerContext } from "@/lib/tasks/tracker-context";

const FILTERS = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "complete", label: "Complete" },
] as const satisfies readonly { value: TodoFilter; label: string }[];

export default function Todos() {
  const tracker = useTrackerContext();
  const { state, data, today, pendingIds, addTask, toggleTodo, removeTask, moveTask, saveTagEdits } =
    tracker;
  // Alone among the three, this column opens on "active" rather than "all":
  // a finished to-do is done with, and shouldn't be the first thing you see.
  const [filter, setFilter] = useState<TodoFilter>("active");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [tagFilter, setTagFilter] = useState<ReadonlySet<string>>(new Set());
  // Non-null while the sheet is open; it carries the selection to restore on
  // Cancel, captured at the moment the sheet was opened.
  const [tagSheet, setTagSheet] = useState<{ snapshot: ReadonlySet<string> } | null>(null);
  const { error, notice, run, notify, dismiss } = useColumnFeedback();

  const view = buildView(data, { search, tagFilter });
  const todos = todosFor(view, filter);
  const anyTodos = view.visible.some((task) => task.type === "todo");
  const column = view.tasks.filter((task) => task.type === "todo");

  async function handleShare(task: Task) {
    const outcome = await share(taskShareText(task));
    if (outcome === "failed") notify("That couldn't be shared.");
    else if (outcome === "copied") notify("Copied to clipboard.");
  }

  return (
    <ErrorBoundary section="To-dos">
      <TaskColumn
        title="To-dos"
        count={todoCount(view)}
        countLabel="to-dos open"
        filters={FILTERS}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        tasks={todos}
        loading={state.status === "loading"}
        addPlaceholder="Add a to-do"
        onAdd={(title) => addTask("todo", title)}
        error={error}
        onDismissError={dismiss}
        notice={notice}
        tagCount={activeTagIds(tagFilter, data?.tags ?? []).size}
        onOpenTags={() => setTagSheet({ snapshot: new Set(tagFilter) })}
        filteredOut={
          anyTodos
            ? filter === "complete"
              ? "Nothing completed yet."
              : filter === "scheduled"
                ? "No to-dos with a due date."
                : "All clear."
            : view.filtering
              ? "Nothing matches your search or tags."
              : null
        }
        empty={{
          icon: SquareCheckBig,
          title: "These are your to-dos",
          body: "To-dos are done once. Give one a due date to schedule it.",
        }}
        renderTask={(task) => (
          <TodoCard
            task={task}
            overdue={isOverdue(task, today)}
            pending={pendingIds.has(task.id)}
            onToggle={(done) => run(toggleTodo(task.id, done))}
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
        )}
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
