import { forwardRef } from "react";
import { View } from "react-native";
import type { TextInput, TextInputProps } from "react-native";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";

type AuthFieldProps = TextInputProps & {
  label: string;
  /** Rendered at the end of the label row, e.g. a "Forgot password?" action. */
  action?: React.ReactNode;
  /** Validation message. Marks the input invalid and is read with it. */
  error?: string | null;
  /**
   * Marks the input invalid without printing a message — for when a hint
   * already explains what is wrong, as the password checklist does.
   */
  invalid?: boolean;
  /** Persistent guidance under the input, e.g. password requirements. */
  hint?: React.ReactNode;
};

/**
 * A labelled input at auth scale.
 *
 * `accessibilityLabel` carries the label text: RN has no htmlFor, so a screen
 * reader would otherwise read an unnamed text field.
 */
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, action, error, invalid, hint, className, ...props },
  ref,
) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-4">
        <Label className="text-foreground">{label}</Label>
        {action}
      </View>
      {/*
        No extra letter-spacing on password fields. The web build spread the
        dots so they could be counted, but guarded it with
        :not(:placeholder-shown) so the placeholder stayed normal. RN cannot
        express that state, and applying it unconditionally stretched the
        placeholder text — so the field simply matches every other one.
      */}
      <Input
        ref={ref}
        accessibilityLabel={label}
        invalid={Boolean(error) || invalid}
        className={className}
        {...props}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-destructive text-sm leading-relaxed"
        >
          {error}
        </Text>
      ) : null}
      {hint}
    </View>
  );
});
