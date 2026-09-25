import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

/**
 * Every piece of text in the app.
 *
 * Unlike the web, RN text styles do not cascade — a colour or family set on a
 * parent View reaches nothing. So each Text carries its own, and this supplies
 * the defaults the web build got from `html { font-family: var(--font-sans) }`.
 */
export function Text({ className, ...props }: TextProps) {
  return (
    <RNText
      className={cn("font-sans text-base text-foreground", className)}
      {...props}
    />
  );
}
