import NetInfo from "@react-native-community/netinfo";
import { useSyncExternalStore } from "react";

/**
 * Whether the device believes it has a connection.
 *
 * Trustworthy in one direction only: `false` means definitely offline, `true`
 * means an interface is up — not that the server is reachable. So this drives
 * the header chip and nothing else. Whether a *write* queues is decided by
 * `isNetworkFailure()` on the actual response, never by this (Rule 3).
 *
 * useSyncExternalStore rather than useState + useEffect so a drop between the
 * first render and the effect is not missed.
 */

// NetInfo's first emission on a cold start is often `null` before it settles,
// and `null` is not knowledge — assume online until told otherwise, which
// matches the web's `navigator.onLine` default.
let online = true;

function subscribe(onChange: () => void) {
  return NetInfo.addEventListener((state) => {
    const next = state.isConnected !== false;
    if (next === online) return;
    online = next;
    onChange();
  });
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => online,
    () => true,
  );
}
