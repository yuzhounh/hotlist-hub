type CacheEntry = {
  source: string;
  updated: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  items: unknown[];
  consecutiveFailures: number;
};

export function serializePlatformCache(list: CacheEntry[]) {
  return JSON.stringify(list
    .filter(platform => platform.status === 'success' || platform.status === 'error' || (platform.status === 'loading' && platform.items.length > 0))
    .map(({ source, updated, status, items, consecutiveFailures }) => ({
      source, updated, status: status === 'loading' ? (consecutiveFailures ? 'error' : 'success') : status, items, consecutiveFailures,
    })));
}

export function createBufferedWriter<T>(write: (value: T) => void, delayMs = 150) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { value: T } | undefined;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const current = pending;
    pending = undefined;
    if (current) {
      try { write(current.value); } catch { /* Storage is best-effort; live cards remain usable. */ }
    }
  };
  return {
    schedule(value: T) {
      pending = { value };
      if (timer === undefined) timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}
