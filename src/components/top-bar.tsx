import { View } from "react-native";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { useTrackerContext } from "@/lib/tasks/tracker-context";

/**
 * Rendered once, by the tab group's layout — not per screen.
 *
 * Three copies would mean three offline chips subscribing to NetInfo and a
 * visible re-mount on every tab switch.
 */
export function TopBar() {
  const { pendingWrites } = useTrackerContext();

  return (
    <View className="flex-row items-center gap-3 border-border border-b bg-background px-4 py-2">
      <Wordmark className="mr-auto" />
      {/* Outside the boundary: it is the thing that explains a bad connection,
          so it should survive whatever else on the bar does not. */}
      <OfflineIndicator pending={pendingWrites} />
      <ErrorBoundary section="The account menu" variant="inline">
        <ThemeToggle />
      </ErrorBoundary>
    </View>
  );
}
