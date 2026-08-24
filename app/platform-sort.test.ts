import assert from 'node:assert/strict';
import test from 'node:test';
import { comparePlatformName, orderFavoritePlatforms, reorderSources } from './platform-sort.ts';

test('sorts numeric names before Latin names, then sorts Chinese names by pinyin', () => {
  const names = ['少数派', '爱范儿', 'IT之家', '9点新闻', 'cnBeta · 最新资讯', 'AI工具集', '36氪'];
  assert.deepEqual(names.sort(comparePlatformName), [
    '9点新闻',
    '36氪',
    'AI工具集',
    'cnBeta · 最新资讯',
    'IT之家',
    '爱范儿',
    '少数派',
  ]);
});

test('favorites use insertion order until a manual order exists', () => {
  const cards = [{ source: 'c' }, { source: 'a' }, { source: 'b' }];
  assert.deepEqual(
    orderFavoritePlatforms([...cards], new Set(['b', 'c', 'a']), []).map((item) => item.source),
    ['b', 'c', 'a'],
  );
  assert.deepEqual(
    orderFavoritePlatforms([...cards], new Set(['b', 'c', 'a']), ['a', 'b']).map((item) => item.source),
    ['a', 'b', 'c'],
  );
});

test('manual movement produces the order saved for favorites', () => {
  assert.deepEqual(reorderSources(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
});
