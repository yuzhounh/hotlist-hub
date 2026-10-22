export type CachedSource<T> = { value: T; expiresAt: number };

export function createSourceCache<T>({ ttlMs = 60000, maxEntries = 256, now = Date.now } = {}) {
  const ready = new Map<string, CachedSource<T>>();
  const pending = new Map<string, Promise<CachedSource<T>>>();
  return (key: string, load: () => Promise<T>, force = false): Promise<CachedSource<T>> => {
    const hit = ready.get(key);
    if (!force && hit && hit.expiresAt > now()) {
      ready.delete(key);
      ready.set(key, hit);
      return Promise.resolve(hit);
    }
    ready.delete(key);
    const running = pending.get(key);
    if (running) return running;
    const task = Promise.resolve().then(load).then(value => {
      const entry = { value, expiresAt: now() + ttlMs };
      ready.set(key, entry);
      if (ready.size > maxEntries) ready.delete(ready.keys().next().value!);
      return entry;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}
