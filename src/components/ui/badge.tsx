import { cva, type VariantProps } from "class-variance-authority";
import { View, type ViewProps } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// Padding-driven, not a fixed height: the web's h-5 pinned a 16px line box
// inside 20px, leaving 2px above and below, which reads as a sticker rather
// than a chip. py-1.5 around a text-xs line gives 28pt overall — a step up from
// the web, still clearly below the 32pt button so a count never competes with
// an action.
const badgeVariants = cva(
  "flex-row items-center justify-center gap-1 self-start overflow-hidden rounded-full border border-transparent px-2.5 py-1.5",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary",
        destructive: "bg-destructive/10",
        outline: "border-border",
        ghost: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const badgeTextVariants = cva("font-medium text-xs", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive",
      outline: "text-foreground",
      ghost: "text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

type BadgeProps = ViewProps &
  VariantProps<typeof badgeVariants> & {
    className?: string;
    textClassName?: string;
  };

export function Badge({
  className,
  textClassName,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          numberOfLines={1}
          className={cn(badgeTextVariants({ variant }), textClassName)}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export { badgeTextVariants, badgeVariants };
