import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchJsonWithTimeout } from './request-json.ts';

function stalledBody(onHeaders?: () => void): typeof fetch {
  return (async (_url, options) => {
    const signal = options?.signal;
    const body = new ReadableStream({ start(controller) {
      signal?.addEventListener('abort', () => controller.error(signal.reason), { once: true });
    } });
    onHeaders?.();
    return new Response(body);
  }) as typeof fetch;
}
test('timeout aborts a JSON body that stalls after successful headers', async () => {
  await assert.rejects(fetchJsonWithTimeout('/fixture', {}, 20, undefined, stalledBody()), /Request timeout/);
});
test('caller cancellation stays attached while JSON is being read', async () => {
  const controller = new AbortController();
  const request = fetchJsonWithTimeout('/fixture', {}, 1000, controller.signal, stalledBody());
  await new Promise(resolve => setImmediate(resolve));
  controller.abort(new Error('Refresh cancelled'));
  await assert.rejects(request, /Refresh cancelled/);
});
test('success, HTTP failures and invalid JSON finish without leaking abort listeners', async () => {
  let removes = 0;
  const controller = new AbortController();
  const original = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.removeEventListener = (type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) => {
    removes++; if (callback) original(type, callback, options);
  };
  const fetcher = (async () => Response.json({ items: [1] })) as typeof fetch;
  assert.deepEqual(await fetchJsonWithTimeout('/fixture', {}, 1000, controller.signal, fetcher), { ok: true, data: { items: [1] } });
  assert.deepEqual(await fetchJsonWithTimeout('/fixture', {}, 1000, controller.signal, (async () => new Response('unavailable', { status: 502 })) as typeof fetch), { ok: false, data: null });
  await assert.rejects(fetchJsonWithTimeout('/fixture', {}, 1000, controller.signal, (async () => new Response('{')) as typeof fetch), SyntaxError);
  assert.equal(removes, 3);
});
