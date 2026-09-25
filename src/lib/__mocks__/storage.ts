/**
 * In-memory stand-in for the SQLite-backed `storage` binding.
 *
 * expo-sqlite has no native module under jest, so the real one throws on first
 * use. This is a happy side effect of exporting storage as a value rather than
 * touching `globalThis.localStorage`: there is exactly one seam to replace.
 *
 * Behaviour matches the Web Storage contract the real one implements, including
 * returning null rather than undefined for a missing key.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length() {
    return this.map.size;
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

export const storage = new MemoryStorage();
