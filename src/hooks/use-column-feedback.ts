import { useCallback, useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/tasks/use-tracker";

/** How long a confirmation stays before clearing itself. */
const NOTICE_MS = 4000;

/**
 * A column's two kinds of message, which the design system treats as
 * different things and never interchangeable:
 *
 * - **An error** is something the user did that failed. It is destructive-toned
 *   and stays until dismissed, because it may need acting on.
 * - **A notice** is a confirmation. It is quiet, and clears itself, because
 *   nothing needs doing about it.
 *
 * Connection trouble is neither — that is the header chip's job.
 */
export function useColumnFeedback() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** Runs a mutation; a failure lands in this column's alert. */
  const run = useCallback(async (action: Promise<Result>) => {
    setError(null);
    const { error: failure } = await action;
    if (failure) setError(failure);
    return failure ?? null;
  }, []);

  const notify = useCallback((text: string) => {
    setNotice(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  const dismiss = useCallback(() => setError(null), []);

  return { error, notice, run, notify, dismiss, setError };
}
