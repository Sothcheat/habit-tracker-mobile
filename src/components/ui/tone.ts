/**
 * State colour for a card's side strips, from the design system's task-state
 * tokens. Tints, not fills: the strip only hints, the control inside it
 * carries the contrast.
 *
 * These are not general success/warning colours and they never colour text.
 */
export type Tone = "positive" | "caution" | "neutral";

export const STRIP_TONE: Record<Tone, string> = {
  positive: "bg-positive/25",
  caution: "bg-caution/30",
  neutral: "bg-muted",
};
