import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, type PressableProps } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * Two variant maps, not one: React Native does not inherit text colour, so the
 * label needs its own class for every variant the container has.
 *
 * Hover is gone — there is no pointer — and the web build's focus rings go with
 * it, since a touch target has no focus state to show. Pressed state carries
 * the feedback instead.
 */
const buttonVariants = cva(
  "flex-row items-center justify-center gap-1.5 rounded-lg border border-transparent",
  {
    variants: {
      variant: {
        default: "bg-primary active:bg-primary/80",
        outline: "border-border bg-background active:bg-muted",
        secondary: "bg-secondary active:bg-secondary/80",
        // Translucent on purpose: a ghost button sits on whatever surface it
        // is given, and the editor's header band is `bg-muted` itself — so a
        // solid `active:bg-muted` pressed state was invisible there. Composing
        // the foreground over the surface darkens in light and lightens in
        // dark, whatever is underneath. (Filled variants must NOT do this; see
        // PORTING.md — for them a translucent state washes out the label.)
        ghost: "active:bg-foreground/10",
        destructive: "bg-destructive/10 active:bg-destructive/20",
        link: "",
      },
      size: {
        default: "h-8 px-2.5",
        xs: "h-6 gap-1 rounded-md px-2",
        sm: "h-7 gap-1 rounded-md px-2.5",
        lg: "h-9 px-2.5",
        // Auth controls and every primary touch target below the sm breakpoint.
        touch: "h-11 px-3.5",
        icon: "h-8 w-8",
        "icon-xs": "h-6 w-6 rounded-md",
        "icon-sm": "h-7 w-7 rounded-md",
        "icon-lg": "h-9 w-9",
      },
      disabled: { true: "opacity-50", false: "" },
    },
    defaultVariants: { variant: "default", size: "default", disabled: false },
  },
);

const buttonTextVariants = cva("font-medium text-sm", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive",
      link: "text-primary underline",
    },
    size: {
      default: "",
      xs: "text-xs",
      sm: "text-[13px]",
      lg: "",
      touch: "",
      icon: "",
      "icon-xs": "",
      "icon-sm": "",
      "icon-lg": "",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

/**
 * Touch padding per size, bringing each control up to the design system's 44pt
 * target — the native form of its `tap-target` utility.
 *
 * Sized rather than a flat value: a `touch` button is already 44pt, and giving
 * it 8pt more made its hit area overlap the button beside it, so whichever
 * rendered last quietly swallowed presses meant for its neighbour.
 */
const HIT_SLOP: Record<NonNullable<VariantProps<typeof buttonVariants>["size"]>, number> = {
  xs: 12,
  "icon-xs": 12,
  sm: 8,
  "icon-sm": 8,
  default: 8,
  icon: 8,
  lg: 4,
  "icon-lg": 4,
  touch: 0,
};

type ButtonProps = Omit<PressableProps, "children"> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    textClassName?: string;
    children?: React.ReactNode;
  };

export function Button({
  className,
  textClassName,
  variant = "default",
  size = "default",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={Boolean(disabled)}
      hitSlop={HIT_SLOP[size ?? "default"]}
      className={cn(buttonVariants({ variant, size, disabled: Boolean(disabled) }), className)}
      {...props}
    >
      {typeof children === "string" ? (
        // numberOfLines={1} is the web base class `whitespace-nowrap`. Without
        // it a long label wraps, and the fixed height then clips the second
        // line away — the label looks truncated for no visible reason.
        <Text
          numberOfLines={1}
          className={cn(buttonTextVariants({ variant, size }), textClassName)}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export { buttonTextVariants, buttonVariants };
