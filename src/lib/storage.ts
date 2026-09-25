// Installs a synchronous, drop-in globalThis.localStorage backed by SQLite.
import "expo-sqlite/localStorage/install";

/**
 * Synchronous key-value storage, with the same API as the web's `localStorage`.
 *
 * This is re-exported as a *value* rather than left as a global on purpose.
 * Every consumer here — the Supabase client, the read snapshot, the write
 * outbox, the theme — reads storage at module scope or synchronously during a
 * render. If they touched `globalThis.localStorage` directly they would depend
 * on the side-effect import above having been evaluated first, and any
 * import-sorting tool that moved it below another import would break session
 * persistence and the offline cache silently, with no error to notice.
 *
 * Importing a binding makes that a data dependency the module graph enforces.
 */
export const storage = globalThis.localStorage;
