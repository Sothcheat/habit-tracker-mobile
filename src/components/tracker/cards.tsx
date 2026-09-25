import {
  CalendarDays,
  ChevronsRight,
  Flag,
  Minus,
  Plus,
  Repeat,
  Tag as TagIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { TaskCard } from "@/components/tracker/task-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Tone } from "@/components/ui/tone";
import type { Task } from "@/lib/tasks/api";
import { formatDate } from "@/lib/tasks/dates";
import type { HabitStrength } from "@/lib/tasks/schedule";
import { cn } from "@/lib/utils";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STRENGTH_TONE: Record<HabitStrength, Tone> = {
  strong: "positive",
  weak: "caution",
  neutral: "neutral",
};

export const PRIORITY_LABEL = {
  low: "Low",
  normal: "Normal",
  essential: "Essential",
  urgent: "Urgent",
} as const;

/** Card meta is 12pt muted throughout; digits align so counts do not jitter. */
const META_TEXT = "text-muted-foreground text-xs";
const TABULAR = { fontVariant: ["tabular-nums" as const] };

function TagCount({ task }: { task: Task }) {
  const count = task.task_tags.length;
  if (!count) return null;
  return (
    <View
      className="flex-row items-center gap-1"
      accessibilityLabel={`${count} ${count === 1 ? "tag" : "tags"}`}
    >
      <Icon as={TagIcon} size={14} className="text-muted-foreground" />
      <Text className={META_TEXT}>{count}</Text>
    </View>
  );
}

/** The priority, when set: a flag and its name. The top two levels read louder. */
function PriorityMark({ task }: { task: Task }) {
  if (!task.priority) return null;
  const loud = task.priority === "essential" || task.priority === "urgent";
  return (
    <View
      className="flex-row items-center gap-1"
      accessibilityLabel={`Priority: ${PRIORITY_LABEL[task.priority]}`}
    >
      {/* Priority has no colour — only weight separates the loud levels. */}
      <Icon
        as={Flag}
        size={14}
        className={loud ? "text-foreground" : "text-muted-foreground"}
      />
      <Text className={cn(META_TEXT, loud && "font-medium text-foreground")}>
        {PRIORITY_LABEL[task.priority]}
      </Text>
    </View>
  );
}

/** The strip's checkbox. 28pt from 10pt down: centred on the title's first line. */
function StripCheckbox({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onToggle: (done: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onToggle}
      disabled={disabled}
      accessibilityLabel={label}
      iconSize={20}
      className="mt-0.5 size-7 border-muted-foreground bg-card"
    />
  );
}

// ─── Habit ──────────────────────────────────────────────────────────────────

function TapButton({
  direction,
  tone,
  title,
  disabled,
  onTap,
}: {
  direction: "plus" | "minus";
  tone: Tone;
  title: string;
  disabled: boolean;
  onTap: () => void;
}) {
  return (
    <Pressable
      onPress={onTap}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={
        direction === "plus"
          ? `Log a good one for "${title}"`
          : `Log a slip for "${title}"`
      }
      // The web's `tap-target`: a 44pt target around a 32pt control.
      hitSlop={6}
      className={cn(
        "size-8 items-center justify-center rounded-full",
        tone === "positive" && "bg-positive active:bg-positive/85",
        tone === "caution" && "bg-caution active:bg-caution/85",
        tone === "neutral" && "bg-secondary active:bg-secondary/80",
        disabled && "opacity-50",
      )}
    >
      <Icon
        as={direction === "plus" ? Plus : Minus}
        size={16}
        className={
          tone === "positive"
            ? "text-positive-foreground"
            : tone === "caution"
              ? "text-caution-foreground"
              : "text-secondary-foreground"
        }
      />
    </Pressable>
  );
}

/** Stands in for a direction this habit doesn't track. Not a control. */
function TapPlaceholder({ direction }: { direction: "plus" | "minus" }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="size-8 items-center justify-center rounded-full border border-foreground/15"
    >
      <Icon
        as={direction === "plus" ? Plus : Minus}
        size={16}
        className="text-muted-foreground/60"
      />
    </View>
  );
}

export function HabitCard({
  task,
  strength,
  plusToday,
  minusToday,
  pending,
  onTap,
  onOpen,
  menu,
}: {
  task: Task;
  strength: HabitStrength;
  plusToday: number;
  minusToday: number;
  pending: boolean;
  onTap: (direction: "plus" | "minus") => void;
  onOpen: () => void;
  menu?: React.ReactNode;
}) {
  const tracksPlus = task.direction !== "negative";
  const tracksMinus = task.direction !== "positive";
  const tone = STRENGTH_TONE[strength];

  return (
    <TaskCard
      title={task.title}
      notes={task.notes}
      pending={pending}
      leftTone={tracksPlus ? tone : "neutral"}
      rightTone={tracksMinus ? tone : "neutral"}
      onOpen={onOpen}
      menu={menu}
      left={
        tracksPlus ? (
          <TapButton
            direction="plus"
            tone={tone}
            title={task.title}
            disabled={pending}
            onTap={() => onTap("plus")}
          />
        ) : (
          <TapPlaceholder direction="plus" />
        )
      }
      right={
        tracksMinus ? (
          <TapButton
            direction="minus"
            tone={tone}
            title={task.title}
            disabled={pending}
            onTap={() => onTap("minus")}
          />
        ) : (
          <TapPlaceholder direction="minus" />
        )
      }
      meta={
        <>
          <View className="mr-auto">
            <PriorityMark task={task} />
          </View>
          <TagCount task={task} />
          <View
            className="flex-row items-center gap-1"
            accessibilityLabel={`Today: ${tracksPlus ? `+${plusToday}` : ""}${
              tracksPlus && tracksMinus ? ", " : ""
            }${tracksMinus ? `-${minusToday}` : ""}`}
          >
            <Icon as={ChevronsRight} size={14} className="text-muted-foreground" />
            {tracksPlus ? (
              <Text style={TABULAR} className={META_TEXT}>{`+${plusToday}`}</Text>
            ) : null}
            {tracksPlus && tracksMinus ? (
              <Text className="text-border text-xs">|</Text>
            ) : null}
            {tracksMinus ? (
              <Text style={TABULAR} className={META_TEXT}>{`−${minusToday}`}</Text>
            ) : null}
          </View>
        </>
      }
    />
  );
}

// ─── Daily ──────────────────────────────────────────────────────────────────

export function describeSchedule(task: Task): string {
  switch (task.frequency) {
    case "daily":
      return "Every day";
    case "weekdays":
      // [...].sort, not toSorted — Hermes does not implement it.
      return [...(task.repeat_days ?? [])]
        .sort((a, b) => a - b)
        .map((day) => WEEKDAY_SHORT[day])
        .join(", ");
    case "every_n_days":
      return task.every_n_days === 1 ? "Every day" : `Every ${task.every_n_days} days`;
    default:
      return "";
  }
}

export function DailyCard({
  task,
  dueToday,
  doneToday,
  streak,
  pending,
  onToggle,
  onOpen,
  menu,
}: {
  task: Task;
  dueToday: boolean;
  doneToday: boolean;
  streak: number;
  pending: boolean;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  menu?: React.ReactNode;
}) {
  return (
    <TaskCard
      title={task.title}
      notes={task.notes}
      done={doneToday}
      pending={pending}
      leftTone={dueToday && !doneToday ? "caution" : "neutral"}
      onOpen={onOpen}
      menu={menu}
      left={
        <StripCheckbox
          checked={doneToday}
          disabled={pending}
          label={`Mark "${task.title}" done for today`}
          onToggle={onToggle}
        />
      }
      meta={
        <>
          <View className="mr-auto">
            <PriorityMark task={task} />
          </View>
          <TagCount task={task} />
          <View className="flex-row items-center gap-1">
            <Icon as={Repeat} size={14} className="text-muted-foreground" />
            <Text className={META_TEXT}>
              {dueToday ? describeSchedule(task) : "Not due today"}
            </Text>
          </View>
          <View
            className="flex-row items-center gap-1"
            accessibilityLabel={`Streak: ${streak}`}
          >
            <Icon as={ChevronsRight} size={14} className="text-muted-foreground" />
            <Text style={TABULAR} className={META_TEXT}>
              {streak}
            </Text>
          </View>
        </>
      }
    />
  );
}

// ─── To do ──────────────────────────────────────────────────────────────────

export function TodoCard({
  task,
  overdue,
  pending,
  onToggle,
  onOpen,
  menu,
}: {
  task: Task;
  overdue: boolean;
  pending: boolean;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  menu?: React.ReactNode;
}) {
  const done = task.completed_at !== null;
  const hasMeta = Boolean(task.due_date || task.task_tags.length || task.priority);

  return (
    <TaskCard
      title={task.title}
      notes={task.notes}
      done={done}
      pending={pending}
      leftTone={overdue ? "caution" : "neutral"}
      onOpen={onOpen}
      menu={menu}
      left={
        <StripCheckbox
          checked={done}
          disabled={pending}
          label={`Mark "${task.title}" complete`}
          onToggle={onToggle}
        />
      }
      meta={
        hasMeta ? (
          <>
            {/* One left group, so date and flag sit together instead of each
                claiming the free space and floating mid-row. */}
            <View className="mr-auto flex-row items-center gap-3">
              {task.due_date ? (
                <View className="flex-row items-center gap-1">
                  <Icon
                    as={CalendarDays}
                    size={14}
                    className={overdue ? "text-foreground" : "text-muted-foreground"}
                  />
                  <Text
                    className={cn(META_TEXT, overdue && "font-medium text-foreground")}
                  >
                    {overdue ? `Overdue · ${formatDate(task.due_date)}` : formatDate(task.due_date)}
                  </Text>
                </View>
              ) : null}
              <PriorityMark task={task} />
            </View>
            <TagCount task={task} />
          </>
        ) : null
      }
    />
  );
}
