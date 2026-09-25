import * as Crypto from "expo-crypto";

/**
 * A v4 UUID, generated on the client.
 *
 * Hermes has no `crypto` global — Expo's runtime installs `TextDecoder`, `URL`,
 * `DOMException`, `structuredClone` and `fetch`, but not `crypto` — so the web
 * build's `crypto.randomUUID()` throws here. That would break every task
 * create, every habit tap and every queued write, so nothing may call
 * `crypto.randomUUID()` directly; use this instead.
 *
 * Ids are chosen on the client so a row created offline can be tapped, edited
 * and deleted before its insert has ever reached the database, and so a replayed
 * write collides (23505) instead of duplicating.
 */
export function newId(): string {
  return Crypto.randomUUID();
}
