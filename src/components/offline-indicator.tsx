import { CloudOff, CloudUpload } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

/**
 * A quiet chip in the top bar: shown while the device reports no connection,
 * and while writes are still waiting to be sent.
 *
 * It is not `destructive`: nothing the user did failed, and red here would
 * outrank the real errors the columns raise when a write is refused. It is not
 * `caution` either — that token means task state, and borrowing it would make
 * "you are offline" look like "this daily is due".
 */
export function OfflineIndicator({
  pending = 0,
  className,
}: {
  /** Writes held in the outbox, waiting for the connection to come back. */
  pending?: number;
  className?: string;
}) {
  const online = useOnlineStatus();
  const waiting = pending > 0;

  if (online && !waiting) return null;

  const sentence = `${online ? "" : "Offline. "}${
    waiting
      ? `${pending} ${pending === 1 ? "change" : "changes"} will be saved when the connection returns.`
      : "Your changes can't be saved until the connection returns."
  }`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={sentence}
      className={cn(
        "h-8 flex-row items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5",
        className,
      )}
    >
      <Icon
        as={online ? CloudUpload : CloudOff}
        size={14}
        className="text-secondary-foreground"
      />
      {/* The word is dropped, not the meaning: the top bar also carries the
          wordmark, the theme toggle and the avatar. A count still shows as a
          bare number, because how much is waiting is not guessable from an
          icon. The label above says it properly either way. */}
      {waiting ? (
        <Text
          style={{ fontVariant: ["tabular-nums"] }}
          className="font-medium text-secondary-foreground text-xs"
        >
          {pending}
        </Text>
      ) : null}
    </View>
  );
}
