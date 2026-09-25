import { createContext, use, useEffect } from "react";
import { type Tracker, useTracker } from "@/lib/tasks/use-tracker";

const TrackerContext = createContext<Tracker | null>(null);

/** Live instances, so a second one is caught rather than quietly tolerated. */
let mounted = 0;

/**
 * Holds the one `useTracker` for the whole signed-in app.
 *
 * The web build kept it inside `TrackerPage`, which rendered all three columns
 * itself. Here the columns are sibling tab screens, and a `useTracker` per tab
 * would mean three profile fetches, three loads, three snapshot writers, and
 * three `flushOutbox` calls racing the same module-level `flushing` guard in
 * outbox.ts — while a tap in Habits left the count in Dailies stale.
 *
 * The symptom of getting this wrong is mild and intermittent ("sometimes the
 * badge is out of date"), which is exactly why it warns in development.
 */
export function TrackerProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const tracker = useTracker(userId);

  useEffect(() => {
    mounted += 1;
    if (__DEV__ && mounted > 1) {
      console.warn(
        `TrackerProvider is mounted ${mounted} times. There must be exactly one — see PORTING.md Rule 11.`,
      );
    }
    return () => {
      mounted -= 1;
    };
  }, []);

  return <TrackerContext value={tracker}>{children}</TrackerContext>;
}

export function useTrackerContext(): Tracker {
  const context = use(TrackerContext);
  if (!context) {
    throw new Error("useTrackerContext must be used inside <TrackerProvider>.");
  }
  return context;
}
