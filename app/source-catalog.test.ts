import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { normalizeSourceId, sourceCatalog } from './source-catalog.ts';

test('all catalog sources use direct fetch identifiers and local logos', () => {
  assert.equal(sourceCatalog.length, 75);
  assert.equal(new Set(sourceCatalog.map((platform) => platform.source)).size, sourceCatalog.length);

  for (const platform of sourceCatalog) {
    assert.equal(platform.provider, 'direct', platform.name);
    assert.match(platform.source, /^direct:/, platform.name);
    assert.ok(
      existsSync(path.join(process.cwd(), 'public', platform.logo.replace(/^\//, ''))),
      `${platform.name} is missing ${platform.logo}`,
    );
  }
});

test('legacy aggregation identifiers migrate to direct identifiers', () => {
  assert.equal(normalizeSourceId('newsnow:weibo'), 'direct:weibo');
  assert.equal(normalizeSourceId('dailyhot:36kr'), 'direct:36kr');
  assert.equal(normalizeSourceId('helti:yicai'), 'direct:yicai');
  assert.equal(normalizeSourceId('direct:weibo'), 'direct:weibo');
});
