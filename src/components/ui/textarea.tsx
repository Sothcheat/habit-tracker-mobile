import { forwardRef, useState } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

type TextareaProps = TextInputProps & {
  className?: string;
  invalid?: boolean;
  /** Stops growing here, then scrolls. */
  maxHeight?: number;
};

// Three lines of 16px text plus the vertical padding — the web build's
// min-h-16 assumed a denser field than a phone should have.
const MIN_HEIGHT = 88;

/**
 * The web build used `field-sizing-content` to grow with its text. There is no
 * NativeWind equivalent, so the height is tracked from the content size.
 */
export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  { className, invalid, maxHeight = 160, style, onContentSizeChange, ...props },
  ref,
) {
  const [height, setHeight] = useState(MIN_HEIGHT);

  return (
    <TextInput
      ref={ref}
      multiline
      textAlignVertical="top"
      onContentSizeChange={(event) => {
        const next = event.nativeEvent.contentSize.height;
        setHeight(Math.min(Math.max(next, MIN_HEIGHT), maxHeight));
        onContentSizeChange?.(event);
      }}
      style={[{ height }, style]}
      className={cn(
        "w-full rounded-lg border border-input bg-transparent px-3 py-3 font-sans text-base text-foreground placeholder:text-muted-foreground dark:bg-input/30",
        invalid && "border-destructive",
        props.editable === false && "opacity-50",
        className,
      )}
      {...props}
    />
  );
});
