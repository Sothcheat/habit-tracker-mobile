import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type FilterOption<V extends string> = { value: V; label: string };

type FilterTabsProps<V extends string> = {
  options: readonly FilterOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
};

/**
 * The web build's Tabs `line` variant: an underline that slides between the
 * active filter's label.
 *
 * There it was an `after:` pseudo-element faded with `data-active`. NativeWind
 * has no pseudo-elements, so the underline is a real View, always rendered and
 * made transparent when inactive — keeping every label the same height, which
 * an absent View would not.
 *
 * These filter content within a column; they are not routes.
 */
export function FilterTabs<V extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<V>) {
  return (
    <View accessibilityRole="tablist" className={cn("flex-row gap-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            hitSlop={8}
            className="items-center gap-1 px-2 py-1"
          >
            {/* text-xs, not the primitive's text-sm — the design system sets
                column filters a step smaller than the heading beside them. */}
            <Text
              className={cn(
                "text-xs",
                active ? "font-medium text-foreground" : "font-sans text-muted-foreground",
              )}
            >
              {option.label}
            </Text>
            <View
              className={cn(
                "h-0.5 w-full rounded-full",
                active ? "bg-foreground" : "bg-transparent",
              )}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
