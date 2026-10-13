/** Keep timeout and caller cancellation active until the JSON body is consumed. */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; data: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  try {
    if (signal?.aborted) throw signal.reason ?? new Error('Aborted');
    signal?.addEventListener('abort', onAbort, { once: true });
    const response = await fetcher(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, data: null };
    }
    const data = await response.json() as T;
    return { ok: true, data };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
