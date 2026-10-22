import assert from 'node:assert/strict';
import test from 'node:test';
import { createBufferedWriter, serializePlatformCache } from './platform-cache.ts';

test('refreshing cards retain their prior usable cache instead of disappearing', () => {
  const payload = JSON.parse(serializePlatformCache([
    { source: 'good', updated: 'old', status: 'loading', items: [{ title: 'saved' }], consecutiveFailures: 0 },
    { source: 'failed', updated: 'old', status: 'loading', items: [{ title: 'fallback' }], consecutiveFailures: 2 },
    { source: 'new', updated: 'waiting', status: 'loading', items: [], consecutiveFailures: 0 },
  ]));
  assert.deepEqual(payload.map((entry: { source: string; status: string }) => [entry.source, entry.status]), [['good', 'success'], ['failed', 'error']]);
  assert.equal(payload[0].items[0].title, 'saved');
  assert.equal(payload[1].consecutiveFailures, 2);
});

test('a result burst writes the latest value once and page exit can flush immediately', async () => {
  const writes: number[] = [];
  const writer = createBufferedWriter<number>(value => writes.push(value), 10);
  for (let i = 0; i < 9; i++) writer.schedule(i);
  assert.equal(writes.length, 0);
  writer.flush();
  writer.flush();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(writes, [8]);
  writer.schedule(9);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(writes, [8, 9]);
});

test('storage failure does not throw or poison subsequent writes', () => {
  const writes: number[] = [];
  const writer = createBufferedWriter<number>(value => { if (value === 1) throw new Error('quota'); writes.push(value); });
  writer.schedule(1);
  assert.doesNotThrow(() => writer.flush());
  writer.schedule(2);
  writer.flush();
  assert.deepEqual(writes, [2]);
});
