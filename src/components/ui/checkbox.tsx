import { Check } from "lucide-react-native";
import { Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Check glyph size. Scale it with the box — the card strips use a 28pt box. */
  iconSize?: number;
  /** Read out instead of the surrounding label, which RN cannot associate. */
  accessibilityLabel: string;
};

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  iconSize = 14,
  accessibilityLabel,
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      // The web primitive carried its own hit-area expansion
      // (after:-inset-x-3 after:-inset-y-2). This is that, and it is why
      // callers must not add a second one.
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      className={cn(
        // Square, and deliberately not the system radius — at --radius these
        // read as radio buttons.
        "size-4 items-center justify-center rounded-[4px] border border-input",
        // The caller's classes sit *before* the state ones on purpose. They
        // set the resting look — size, and the border a card strip wants —
        // while checked must still win, or a caller passing bg-card silently
        // cancels the fill and leaves a near-white tick on a near-white box.
        // The web got this for free: its data-checked: variants beat plain
        // classes on specificity, whatever the source order.
        className,
        checked && "border-primary bg-primary",
        disabled && "opacity-50",
      )}
    >
      {checked ? <Icon as={Check} size={iconSize} className="text-primary-foreground" /> : null}
    </Pressable>
  );
}
