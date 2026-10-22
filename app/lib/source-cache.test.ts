import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceCache } from './source-cache.ts';

test('concurrent cold requests share one fetch and cached hits keep the original expiry', async () => {
  let now = 1000;
  let calls = 0;
  let complete!: (value: number) => void;
  const cached = createSourceCache<number>({ now: () => now });
  const load = () => { calls++; return new Promise<number>(resolve => { complete = resolve; }); };
  const requests = Array.from({ length: 20 }, () => cached('canonical-source', load));
  await Promise.resolve();
  assert.equal(calls, 1);
  complete(42);
  const results = await Promise.all(requests);
  assert.ok(results.every(result => result.value === 42 && result.expiresAt === 61000));
  now = 60000;
  assert.deepEqual(await cached('canonical-source', load), { value: 42, expiresAt: 61000 });
  assert.equal(calls, 1);
  now = 61000;
  assert.equal((await cached('canonical-source', async () => { calls++; return 43; })).value, 43);
  assert.equal(calls, 2);
});

test('failures are not cached and later requests recover', async () => {
  const cached = createSourceCache<number>();
  let calls = 0;
  await assert.rejects(cached('source', () => { calls++; throw new Error('offline'); }), /offline/);
  assert.equal((await cached('source', async () => { calls++; return 7; })).value, 7);
  assert.equal(calls, 2);
});

test('explicit refresh bypasses a ready value but still shares inflight fetches', async () => {
  const cached = createSourceCache<number>();
  assert.equal((await cached('source', async () => 1)).value, 1);
  let calls = 0;
  const load = async () => { calls++; return 2; };
  const [first, second] = await Promise.all([cached('source', load, true), cached('source', load, true)]);
  assert.equal(first.value, 2);
  assert.equal(second.value, 2);
  assert.equal(calls, 1);
  assert.equal((await cached('source', async () => 3)).value, 2);
});

test('ready values are bounded and inflight work survives eviction pressure', async () => {
  const cached = createSourceCache<number>({ maxEntries: 2 });
  let finish!: (value: number) => void;
  const pending = cached('slow', () => new Promise<number>(resolve => { finish = resolve; }));
  await cached('a', async () => 1);
  await cached('b', async () => 2);
  await cached('a', async () => { throw new Error('cached a was lost'); });
  await cached('c', async () => 3);
  assert.equal(cached('slow', async () => { throw new Error('duplicate slow request'); }), pending);
  assert.equal((await cached('b', async () => 20)).value, 20);
  finish(8);
  assert.equal((await pending).value, 8);
});
