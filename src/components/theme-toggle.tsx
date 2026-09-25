import { Monitor, Moon, Sun } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { type Theme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "Match the system", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Three-way theme control.
 *
 * The web version was sr-only radio inputs styled through `peer-checked:`,
 * which gave it arrow-key roving for free. NativeWind has no `peer-*`, so these
 * are Pressables carrying their own selected state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Colour theme"
      className={cn(
        "flex-row items-center gap-0.5 rounded-lg border border-border bg-card p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => setTheme(option.value)}
            // 28pt segments are a deliberate exception to the 44pt target —
            // they clear WCAG 2.5.8's 24pt floor, and hitSlop covers the rest.
            hitSlop={8}
            className={cn(
              "size-7 items-center justify-center rounded-md",
              selected && "bg-secondary",
            )}
          >
            <Icon
              as={option.icon}
              size={14}
              className={selected ? "text-secondary-foreground" : "text-muted-foreground"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
