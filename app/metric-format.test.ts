import assert from 'node:assert/strict';
import test from 'node:test';
import { formatItemMetric } from './metric-format.ts';

test('formats configured hot metrics in ten-thousands', () => {
  assert.equal(formatItemMetric('newsnow:baidu', '7,807,926'), '780.8万热度');
  assert.equal(formatItemMetric('newsnow:douyin', '热度 5000'), '0.5万热度');
  assert.equal(formatItemMetric('dailyhot:kuaishou', '10100000'), '1010.0万热度');
  assert.equal(formatItemMetric('direct:music-bilibili', '2342132'), '234.2万热度');
});

test('keeps the verified reading and play meanings', () => {
  assert.equal(formatItemMetric('newsnow:cls-hot', '129536'), '13.0万阅读');
  assert.equal(formatItemMetric('direct:bilibili-popular-all', '2397502'), '239.8万播放');
  assert.equal(formatItemMetric('dailyhot:36kr', '30769'), '3.1万阅读');
  assert.equal(formatItemMetric('newsnow:tieba', '2715750'), '271.6万实时讨论');
});

test('preserves unrelated metrics and hides invalid configured values', () => {
  assert.equal(formatItemMetric('newsnow:douban', '评分 8.8'), '评分 8.8');
  assert.equal(formatItemMetric('newsnow:zhihu', '603 万热度'), '603 万热度');
  assert.equal(formatItemMetric('newsnow:zhihu', '603.5 万热度'), '603.5 万热度');
  assert.equal(formatItemMetric('dailyhot:qq-news', '腾讯新闻'), undefined);
  assert.equal(formatItemMetric('newsnow:weibo', '499'), '<0.1万热度');
});
