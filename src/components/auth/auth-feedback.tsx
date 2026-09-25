import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type Feedback = { kind: "error" | "success"; text: string } | null;

/**
 * Status line for an auth form.
 *
 * The web version rendered the live region always and collapsed it with
 * `empty:hidden`, so the region existed before its text arrived. RN's
 * accessibilityLiveRegion announces on change without that trick, so this can
 * render nothing when there is nothing to say.
 */
export function AuthFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <Text
      accessibilityLiveRegion="polite"
      className={cn(
        "text-sm leading-relaxed",
        feedback.kind === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {feedback.text}
    </Text>
  );
}
