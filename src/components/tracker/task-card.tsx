import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { STRIP_TONE, type Tone } from "@/components/ui/tone";
import { cn } from "@/lib/utils";

type TaskCardProps = {
  title: string;
  notes?: string | null;
  /** Dims the title — a completed daily or to-do. */
  done?: boolean;
  /** Request in flight: the card fades and its controls disable. */
  pending?: boolean;
  left: React.ReactNode;
  leftTone: Tone;
  right?: React.ReactNode;
  rightTone?: Tone;
  /** Small facts along the bottom edge: priority, streak, due date, tags. */
  meta?: React.ReactNode;
  /** The ⋮ options menu, pinned to the body's top-right corner. */
  menu?: React.ReactNode;
  onOpen: () => void;
};

/**
 * The shared shape of a habit, daily or to-do: a control strip on the left, an
 * optional one on the right, and a body that opens the editor.
 *
 * Strips are 48pt, the web's narrow-screen size — there is no width above `sm`
 * on a phone, and the 44pt controls inside still clear it.
 *
 * Alignment is one shared measurement, not per-control nudges: the title's
 * first line is centred 24pt from the top (12pt padding + half its 24pt line),
 * and every strip control is centred on that same line — a 32pt habit button
 * from 8pt down, a 28pt checkbox from 10pt down.
 */
export function TaskCard({
  title,
  notes,
  done = false,
  pending = false,
  left,
  leftTone,
  right,
  rightTone = "neutral",
  meta,
  menu,
  onOpen,
}: TaskCardProps) {
  return (
    <View
      className={cn(
        "min-h-19 flex-row overflow-hidden rounded-lg border border-border bg-card",
        pending && "opacity-60",
      )}
    >
      <View className={cn("w-12 items-center pt-2", STRIP_TONE[leftTone])}>
        {left}
      </View>

      {/* The menu is a sibling of the body press target, never nested inside
          it — a Pressable within a Pressable swallows the inner press. */}
      <View className="min-w-0 flex-1 flex-row">
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Edit: ${title}`}
          accessibilityState={{ busy: pending }}
          className="min-w-0 flex-1 flex-col px-3 py-3 active:bg-accent/40"
        >
          <Text
            className={cn(
              "font-medium text-base text-card-foreground leading-6",
              // Only the title shares a band with the ⋮ button, so only it
              // needs the clearance.
              menu && "pr-6",
              done && "text-muted-foreground line-through",
            )}
          >
            {title}
          </Text>
          {notes ? (
            <Text
              numberOfLines={2}
              className="mt-0.5 text-muted-foreground text-sm leading-relaxed"
            >
              {notes}
            </Text>
          ) : null}
          {meta ? (
            <View className="mt-auto flex-row items-center justify-end gap-3 pt-2">
              {meta}
            </View>
          ) : null}
        </Pressable>
        {menu ? <View className="absolute top-2.5 right-2">{menu}</View> : null}
      </View>

      {right ? (
        <View className={cn("w-12 items-center pt-2", STRIP_TONE[rightTone])}>
          {right}
        </View>
      ) : null}
    </View>
  );
}
