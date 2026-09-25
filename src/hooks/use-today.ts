import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { type ISODate, todayIn } from "@/lib/tasks/dates";

/** How often to re-check the date while the app is in the foreground. */
const TICK_MS = 60_000;

/**
 * Today's date in the user's timezone, kept current while the app is open.
 *
 * The web build computed this once during render, which is fine for a tab that
 * remounts constantly. A phone app lives for days: tap a habit at 00:05 after
 * the app has been backgrounded since 22:00 and, without this, the log is
 * written against *yesterday* — and persisted.
 *
 * Checking once a minute rather than scheduling a timer for the exact midnight
 * instant is deliberate. Finding that instant means converting a wall-clock
 * time in an arbitrary IANA zone back to an epoch, and the obvious tool for it
 * — `Intl.DateTimeFormat.formatToParts` — is one of the APIs Hermes has been
 * known to ship incomplete. A minute of lag costs nothing; the timer only runs
 * while the app is foregrounded, and returning from the background recomputes
 * immediately.
 */
export function useToday(timeZone: string): ISODate {
  const [today, setToday] = useState(() => todayIn(timeZone));

  useEffect(() => {
    const sync = () => setToday(todayIn(timeZone));

    // The zone itself may have just been loaded from the profile.
    sync();

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(sync, TICK_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    if (AppState.currentState === "active") start();

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        // Catch up first: the app may have been asleep across midnight.
        sync();
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [timeZone]);

  return today;
}
