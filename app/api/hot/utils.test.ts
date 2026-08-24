import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupeItems, normalizePublicHttpUrl } from './utils.ts';

test('normalizePublicHttpUrl only accepts normal HTTP URLs', () => {
  assert.equal(normalizePublicHttpUrl('https://example.com/news?id=1'), 'https://example.com/news?id=1');
  assert.equal(normalizePublicHttpUrl('javascript:alert(1)'), null);
  assert.equal(normalizePublicHttpUrl('https://www.yicai.comjavascript:closeTSYD();'), null);
  assert.equal(normalizePublicHttpUrl('/relative/path'), null);
});

test('dedupeItems removes malformed and duplicate links', () => {
  const items = dedupeItems([
    { id: 1, title: '正常', url: 'https://example.com/a' },
    { id: 2, title: '重复', url: 'https://example.com/a' },
    { id: 3, title: '异常', url: 'javascript:alert(1)' },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, '正常');
});
