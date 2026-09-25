import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

type InputProps = TextInputProps & {
  className?: string;
  /** Renders the destructive border the web build showed via aria-invalid. */
  invalid?: boolean;
};

/**
 * Forwards its ref so callers can focus it: the web build focused fields by id
 * through `document.getElementById`, which has no native equivalent.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      // h-11, not the web primitive's h-8. That h-8 is its *dense desktop*
      // size; the design system overrides every field to h-11 below the sm
      // breakpoint, and on a phone there is no width above it. It also happens
      // to be the 44pt touch target.
      //
      // 16px text at every width: anything smaller and iOS zooms on focus, and
      // the design system already fixes field text at text-base regardless.
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 font-sans text-base text-foreground placeholder:text-muted-foreground dark:bg-input/30",
        invalid && "border-destructive",
        props.editable === false && "opacity-50",
        className,
      )}
      {...props}
    />
  );
});
