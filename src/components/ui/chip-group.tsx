import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type ChipOption<V extends string | number> = {
  value: V;
  label: string;
  /** Read out in place of the label, where the label is a single letter. */
  accessibilityLabel?: string;
};

/**
 * A row of selectable chips.
 *
 * Stands in for the web's `Select` and its `peer-checked:` radio groups —
 * NativeWind has no `peer-*`, and a system picker renders with system colours
 * and cannot wear the palette. With five options at most, laying them all out
 * is also fewer taps than opening a picker.
 */
export function ChipGroup<V extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly ChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group for a screen reader, since the chips only name themselves. */
  label: string;
  className?: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={cn("flex-row flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            className={cn(
              "h-10 items-center justify-center rounded-lg border px-3.5",
              selected
                ? "border-primary bg-secondary"
                : "border-border bg-card active:bg-accent",
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                "text-sm",
                selected ? "font-medium text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
