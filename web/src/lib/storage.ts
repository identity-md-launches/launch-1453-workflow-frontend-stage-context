// Opaque host iframes may deny storage. Memory remains the working copy.
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`skyline:${key}`, JSON.stringify(value));
  } catch {
    /* sandbox/privacy mode */
  }
}
export function load<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(`skyline:${key}`);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function remove(key: string) {
  try {
    localStorage.removeItem(`skyline:${key}`);
  } catch {
    /* sandbox/privacy mode */
  }
}
