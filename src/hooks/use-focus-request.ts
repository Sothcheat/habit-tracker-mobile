import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";

/**
 * Moves focus to a field *after* the next commit.
 *
 * Focusing inline fails whenever the target is disabled in the current render —
 * right after a request settles, before `pending = false` has committed.
 * Deferring to an effect runs it once the field is interactive again.
 *
 * The web version looked fields up with `document.getElementById`. There are no
 * ids here, so callers register a ref under the same string key and the call
 * sites keep their shape.
 */
export function useFocusRequest() {
  const fields = useRef(new Map<string, TextInput | null>());
  // Wrapped in an object so asking for the same id twice still re-fires.
  const [request, setRequest] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (request) fields.current.get(request.id)?.focus();
  }, [request]);

  return {
    register: (id: string) => (node: TextInput | null) => {
      fields.current.set(id, node);
    },
    requestFocus: (id: string) => setRequest({ id }),
  };
}
