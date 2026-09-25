import { Minus, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { ChipGroup } from "@/components/ui/chip-group";
import { DateField } from "@/components/ui/date-field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import type { ISODate } from "@/lib/tasks/dates";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database.types";

const WEEKDAYS = [
  { day: 0, short: "S", long: "Sunday" },
  { day: 1, short: "M", long: "Monday" },
  { day: 2, short: "T", long: "Tuesday" },
  { day: 3, short: "W", long: "Wednesday" },
  { day: 4, short: "T", long: "Thursday" },
  { day: 5, short: "F", long: "Friday" },
  { day: 6, short: "S", long: "Saturday" },
];

// ─── Habit ──────────────────────────────────────────────────────────────────

/**
 * What a habit counts. At least one direction must stay on, so the last one
 * cannot be turned off — the database's `tasks_habit_requires_direction_check`
 * would refuse the row, and a habit that counts nothing has no meaning anyway.
 */
export function DirectionToggles({
  plus,
  minus,
  onPlus,
  onMinus,
  disabled,
}: {
  plus: boolean;
  minus: boolean;
  onPlus: (on: boolean) => void;
  onMinus: (on: boolean) => void;
  disabled?: boolean;
}) {
  const options = [
    { key: "plus", label: "Positive", icon: Plus, on: plus, set: onPlus, other: minus },
    { key: "minus", label: "Negative", icon: Minus, on: minus, set: onMinus, other: plus },
  ] as const;

  return (
    <View className="items-center gap-3">
      <View className="flex-row justify-center gap-10">
        {options.map(({ key, label, icon, on, set, other }) => {
          const locked = on && !other;
          return (
            <Pressable
              key={key}
              onPress={() => !locked && set(!on)}
              disabled={disabled}
              accessibilityRole="switch"
              accessibilityState={{ checked: on, disabled: disabled || locked }}
              accessibilityLabel={label}
              accessibilityHint={
                locked ? "A habit has to count at least one direction" : undefined
              }
              className={cn("items-center gap-2 rounded-lg p-1", disabled && "opacity-50")}
            >
              <View
                className={cn(
                  "size-12 items-center justify-center rounded-full",
                  on ? "bg-primary" : "border border-border",
                )}
              >
                <Icon
                  as={icon}
                  size={20}
                  className={on ? "text-primary-foreground" : "text-muted-foreground"}
                />
              </View>
              <Text
                className={cn(
                  "font-medium text-sm",
                  on ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-center text-muted-foreground text-xs leading-relaxed">
        Positive counts the good; negative counts the slips. Keep both on to count each way.
      </Text>
    </View>
  );
}

// ─── Daily ──────────────────────────────────────────────────────────────────

const FREQUENCIES = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "On certain days" },
  { value: "every_n_days", label: "Every few days" },
] as const;

export function DailySchedule({
  startDate,
  onStartDate,
  frequency,
  onFrequency,
  days,
  onDays,
  everyN,
  onEveryN,
  errors,
  disabled,
}: {
  startDate: ISODate;
  onStartDate: (value: ISODate) => void;
  frequency: Enums<"frequency_type">;
  onFrequency: (value: Enums<"frequency_type">) => void;
  days: number[];
  onDays: (update: (current: number[]) => number[]) => void;
  everyN: string;
  onEveryN: (value: string) => void;
  errors: { startDate?: string; days?: string; interval?: string };
  disabled?: boolean;
}) {
  return (
    <>
      <View className="gap-2">
        <Label>Start date</Label>
        <DateField
          value={startDate}
          onChange={onStartDate}
          accessibilityLabel="Start date"
          invalid={Boolean(errors.startDate)}
          disabled={disabled}
        />
        {errors.startDate ? (
          <Text accessibilityLiveRegion="polite" className="text-destructive text-sm">
            {errors.startDate}
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Label>Repeats</Label>
        <ChipGroup
          label="Repeats"
          options={FREQUENCIES}
          value={frequency}
          onChange={onFrequency}
        />
      </View>

      {frequency === "weekdays" ? (
        <View className="gap-2">
          <Label>On these days</Label>
          <View
            accessibilityRole="none"
            className="flex-row justify-between"
          >
            {WEEKDAYS.map(({ day, short, long }) => {
              const on = days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() =>
                    onDays((current) =>
                      on ? current.filter((d) => d !== day) : [...current, day],
                    )
                  }
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled }}
                  // The visible label is one letter, and three of them repeat.
                  accessibilityLabel={long}
                  className={cn(
                    "size-11 items-center justify-center rounded-lg border",
                    on ? "border-transparent bg-primary" : "border-border active:bg-accent",
                    disabled && "opacity-50",
                  )}
                >
                  <Text
                    className={cn(
                      "font-medium text-sm",
                      on ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.days ? (
            <Text accessibilityLiveRegion="polite" className="text-destructive text-sm">
              {errors.days}
            </Text>
          ) : null}
        </View>
      ) : null}

      {frequency === "every_n_days" ? (
        <View className="gap-2">
          <Label>Every how many days?</Label>
          <Input
            value={everyN}
            onChangeText={onEveryN}
            keyboardType="number-pad"
            accessibilityLabel="Every how many days"
            invalid={Boolean(errors.interval)}
            editable={!disabled}
            className="w-28 bg-card"
          />
          {errors.interval ? (
            <Text accessibilityLiveRegion="polite" className="text-destructive text-sm">
              {errors.interval}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

// ─── To-do ──────────────────────────────────────────────────────────────────

export function DueDateField({
  dueDate,
  onDueDate,
  disabled,
}: {
  dueDate: ISODate | "";
  onDueDate: (value: ISODate | "") => void;
  disabled?: boolean;
}) {
  return (
    <View className="gap-2">
      <Label>Due date</Label>
      <DateField
        value={dueDate}
        onChange={onDueDate}
        onClear={() => onDueDate("")}
        placeholder="No due date"
        accessibilityLabel="Due date"
        disabled={disabled}
      />
    </View>
  );
}
