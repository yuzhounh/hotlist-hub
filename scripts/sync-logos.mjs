import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logosDir = path.join(root, 'public', 'logos');
const catalogPath = path.join(root, 'app', 'source-catalog.ts');
const OUTPUT_SIZE = 128;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const catalog = fs.readFileSync(catalogPath, 'utf8');
const entries = [...catalog.matchAll(/source\('([^']+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g)]
  .map((match) => ({
    name: match[1],
    provider: match[2],
    upstreamId: match[3],
    siteUrl: match[4],
  }));

const newsnowBase = 'https://raw.githubusercontent.com/ourongxing/newsnow/main/public/icons';
const newsnowLiveBase = 'https://newsnow.busiyi.world/icons';

const newsnowIconMap = {
  'bilibili-hot-search': 'bilibili',
  'chongbuluo-hot': 'chongbuluo',
  'cls-hot': 'cls',
  'fastbull-express': 'fastbull',
  gelonghui: 'gelonghui',
  'github-trending-today': 'github',
  'iqiyi-hot-ranklist': 'iqiyi',
  'mktnews-flash': 'mktnews',
  'pcbeta-windows11': 'pcbeta',
  'qqvideo-tv-hotsearch': 'qqvideo',
  sputniknewscn: 'sputniknewscn',
  'v2ex-share': 'v2ex',
  'wallstreetcn-quick': 'wallstreetcn',
  'xueqiu-hotstock': 'xueqiu',
  douban: 'douban',
  'foreign-aljazeera': 'aljazeeracn',
};

const dailyhotIconMap = {
  '36kr': '36kr',
  acfun: 'acfun',
  '51cto': 'ghxi',
  '52pojie': 'default',
  csdn: 'default',
  'douban-group': 'douban',
  dgtle: 'default',
  geekpark: 'default',
  guokr: 'default',
  hellogithub: 'hellogithub',
  history: 'default',
  honkai: 'honkai',
  huxiu: 'default',
  ifanr: 'default',
  'ithome-xijiayi': 'ithome',
  kuaishou: 'kuaishou',
  lol: 'default',
  miyoushe: 'genshin',
  'netease-news': 'default',
  ngabbs: 'default',
  nodeseek: 'linuxdo',
  nytimes: 'default',
  'qq-news': 'tencent',
  'sina-news': 'default',
  sina: 'default',
  smzdm: 'smzdm',
  starrail: 'starrail',
  weatheralarm: 'default',
  yystv: 'default',
};

const directIconMap = {
  'cnbeta-latest': 'default',
  'cnbeta-hot': 'default',
  'cnbeta-argue': 'default',
  jianshu: 'jianshu',
  'zhihu-daily': 'zhihu',
  'douban-hot-movie': 'douban',
  'douban-hot-tv': 'douban',
  'douban-book-chart': 'douban',
  'fanqie-top': 'default',
  'youku-ranking': 'default',
  'music-netease-hot': 'default',
  'music-qq-hot': 'tencent',
  'music-kugou-top500': 'default',
  'music-bilibili': 'bilibili',
  'music-kuwo-hot': 'default',
  'weread-rising': 'weread',
  'weread-hot-search': 'weread',
  'weread-newbook': 'weread',
  'weread-novel': 'weread',
  'weread-all': 'weread',
  'weread-masterpiece': 'weread',
  'weread-potential': 'weread',
  'foreign-google-trends': 'default',
  'foreign-google-news': 'default',
  'foreign-bbc-world': 'default',
  'foreign-guardian-world': 'default',
  'foreign-npr-news': 'default',
  'foreign-techmeme': 'default',
  'foreign-theverge': 'default',
  'foreign-arstechnica': 'default',
  'foreign-techcrunch': 'default',
  'foreign-lobsters': 'default',
  'foreign-stackoverflow': 'default',
  'foreign-coingecko': 'default',
  caixin: 'default',
  eastmoney: 'default',
  'eastmoney-stock': 'xueqiu',
  jd: 'default',
  taobao: 'default',
  tonghuashun: 'default',
  yicai: 'default',
};

function resolveNewsnowIconId(provider, upstreamId) {
  if (provider === 'newsnow') return newsnowIconMap[upstreamId] ?? upstreamId;
  if (provider === 'dailyhot') return dailyhotIconMap[upstreamId] ?? upstreamId;
  if (provider === 'direct') return directIconMap[upstreamId] ?? upstreamId;
  return upstreamId;
}

function logoFilename(entry) {
  return `${entry.provider}-${entry.upstreamId.replace(/[^a-z0-9-]/gi, '-')}.png`;
}

function siteOrigin(siteUrl) {
  return new URL(siteUrl).origin;
}

function resolveUrl(raw, base) {
  if (!raw || raw.startsWith('data:') || raw.startsWith('javascript:') || raw.startsWith('blob:')) return null;
  const normalized = raw.startsWith('//') ? `https:${raw}` : raw;
  try {
    return new URL(normalized, base).href;
  } catch {
    return null;
  }
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.svg')) return 'svg';
    if (pathname.endsWith('.png')) return 'png';
    if (pathname.endsWith('.ico')) return 'ico';
    if (pathname.endsWith('.webp')) return 'webp';
    return '';
  } catch {
    return '';
  }
}

function parseSizes(value) {
  if (!value) return 0;
  const matches = [...String(value).matchAll(/(\d+)\s*x\s*(\d+)/gi)];
  if (!matches.length) {
    const single = Number.parseInt(value, 10);
    return Number.isFinite(single) ? single : 0;
  }
  return Math.max(...matches.map((match) => Math.max(Number(match[1]), Number(match[2]))));
}

function parseLinkTags(html) {
  const tags = [];
  for (const match of html.matchAll(/<link\b([^>]*?)\/?>/gi)) {
    const attrs = {};
    for (const part of match[1].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/gi)) {
      attrs[part[1].toLowerCase()] = part[2];
    }
    tags.push(attrs);
  }
  return tags;
}

function isIconRel(rel) {
  if (!rel) return false;
  const parts = rel.toLowerCase().split(/\s+/);
  return parts.some((part) => part === 'icon' || part === 'shortcut' || part === 'apple-touch-icon' || part === 'mask-icon');
}

function scoreCandidate(candidate) {
  const ext = candidate.ext || extFromUrl(candidate.url);
  const type = (candidate.type ?? '').toLowerCase();
  const declared = parseSizes(candidate.sizes);
  const viaBonus = candidate.via ? 0 : 50;

  if (ext === 'svg' || type.includes('svg')) return 1000 + declared + viaBonus;
  if (ext === 'png' || type.includes('png')) {
    if (declared >= OUTPUT_SIZE) return 850 + declared + viaBonus;
    return 500 + declared + viaBonus;
  }
  if (ext === 'webp' || type.includes('webp')) return 450 + declared + viaBonus;
  if (ext === 'ico' || type.includes('icon') || type.includes('x-icon')) return 700 + declared + viaBonus;
  return 100 + viaBonus;
}

function buildOriginCandidates(siteUrl) {
  const origin = siteOrigin(siteUrl);
  const hostname = new URL(origin).hostname;
  return [
    { url: `${origin}/favicon.svg`, ext: 'svg' },
    { url: `${origin}/favicon.ico`, ext: 'ico' },
    { url: `${origin}/apple-touch-icon.png`, ext: 'png', sizes: '180x180' },
    { url: `${origin}/apple-touch-icon-precomposed.png`, ext: 'png', sizes: '180x180' },
    { url: `${origin}/icon.svg`, ext: 'svg' },
    { url: `${origin}/logo.svg`, ext: 'svg' },
    { url: `${origin}/assets/favicon.svg`, ext: 'svg' },
    { url: `${origin}/static/favicon.ico`, ext: 'ico' },
    { url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`, ext: 'ico', via: 'duckduckgo' },
    {
      url: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=128`,
      ext: 'png',
      sizes: '128x128',
      via: 'google',
    },
  ];
}

function collectCandidatesFromHtml(html, pageUrl) {
  const candidates = [];
  const seen = new Set();

  const push = (href, meta = {}) => {
    const url = resolveUrl(href, pageUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push({ url, ext: extFromUrl(url), ...meta });
  };

  for (const tag of parseLinkTags(html)) {
    if (!isIconRel(tag.rel) || !tag.href) continue;
    push(tag.href, { type: tag.type, sizes: tag.sizes, rel: tag.rel });
  }

  return candidates;
}

async function fetchBuffer(url, referer) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: referer ?? url,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 40) throw new Error('Response too small');
  return {
    buffer,
    contentType: (response.headers.get('content-type') ?? '').toLowerCase(),
    finalUrl: response.url || url,
  };
}

async function fetchSiteHtml(siteUrl) {
  const response = await fetch(siteUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return { html, finalUrl: response.url || siteUrl };
}

function detectKind(buffer, contentType, url) {
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trimStart();
  if (head.startsWith('<!DOCTYPE') || head.startsWith('<html') || head.startsWith('<HTML')) {
    throw new Error('HTML response');
  }

  const ext = extFromUrl(url);
  if (ext === 'svg' || contentType.includes('svg') || head.includes('<svg')) return 'svg';
  if (ext === 'ico' || contentType.includes('icon') || contentType.includes('x-icon')) return 'ico';
  if (ext === 'png' || contentType.includes('png')) return 'png';
  if (ext === 'webp' || contentType.includes('webp')) return 'webp';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) return 'ico';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'webp';
  throw new Error(`Unsupported icon type: ${contentType || extFromUrl(url) || 'unknown'}`);
}

async function saveAsLogoPng(buffer, kind, dest) {
  await sharp(buffer, kind === 'svg' ? { density: 320 } : undefined)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toFile(dest);
}

async function tryCandidate(candidate, referer) {
  const { buffer, contentType, finalUrl } = await fetchBuffer(candidate.url, referer);
  const kind = detectKind(buffer, contentType, finalUrl);
  await sharp(buffer, kind === 'svg' ? { density: 320 } : undefined).metadata();
  return { buffer, kind, finalUrl };
}

async function tryCandidates(candidates, referer, strategy) {
  const sorted = [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  const errors = [];

  for (const candidate of sorted.slice(0, 24)) {
    try {
      const result = await tryCandidate(candidate, referer);
      return {
        ...result,
        strategy: candidate.via ? `site-${candidate.via}` : strategy,
        candidate: candidate.url,
      };
    } catch (error) {
      errors.push(`${candidate.url}: ${error.message}`);
    }
  }

  throw new Error(errors[0] ?? 'No icon candidates succeeded');
}

async function fetchIconFromSite(entry) {
  const origin = siteOrigin(entry.siteUrl);
  const originCandidates = buildOriginCandidates(entry.siteUrl);

  try {
    return await tryCandidates(originCandidates, origin, 'site');
  } catch (directError) {
    try {
      const { html, finalUrl } = await fetchSiteHtml(entry.siteUrl);
      const htmlCandidates = collectCandidatesFromHtml(html, finalUrl);
      if (!htmlCandidates.length) throw new Error('No icon links in HTML');
      return await tryCandidates(htmlCandidates, finalUrl, 'site-html');
    } catch (htmlError) {
      throw new Error(`${directError.message}; html: ${htmlError.message}`);
    }
  }
}

async function fetchIconFromNewsnow(entry) {
  const iconId = resolveNewsnowIconId(entry.provider, entry.upstreamId);
  const urls = [
    `${newsnowBase}/${iconId}.png`,
    `${newsnowLiveBase}/${iconId}.png`,
  ];

  for (const url of urls) {
    try {
      const { buffer, finalUrl } = await fetchBuffer(url);
      const kind = detectKind(buffer, 'image/png', finalUrl);
      await sharp(buffer).metadata();
      return { buffer, kind, finalUrl, candidate: url, strategy: 'newsnow', iconId };
    } catch {
      // try next mirror
    }
  }

  throw new Error(`NewsNow icon unavailable for ${iconId}`);
}

async function syncEntry(entry) {
  const filename = logoFilename(entry);
  const dest = path.join(logosDir, filename);
  let result;
  let siteError = '';

  try {
    result = await fetchIconFromSite(entry);
  } catch (error) {
    siteError = String(error);
    try {
      result = await fetchIconFromNewsnow(entry);
    } catch (fallbackError) {
      return {
        ...entry,
        filename,
        saved: 'FAILED',
        error: `${siteError}; fallback: ${fallbackError}`,
      };
    }
  }

  try {
    await saveAsLogoPng(result.buffer, result.kind, dest);
  } catch (error) {
    try {
      const fallback = await fetchIconFromNewsnow(entry);
      await saveAsLogoPng(fallback.buffer, fallback.kind, dest);
      const stat = fs.statSync(dest);
      return {
        ...entry,
        filename,
        saved: dest,
        strategy: 'newsnow',
        sourceUrl: fallback.finalUrl,
        kind: fallback.kind,
        size: stat.size,
        siteError: `${siteError}; convert: ${error}`,
      };
    } catch (fallbackError) {
      return {
        ...entry,
        filename,
        saved: 'FAILED',
        error: `${siteError}; convert: ${error}; fallback: ${fallbackError}`,
      };
    }
  }

  const stat = fs.statSync(dest);
  return {
    ...entry,
    filename,
    saved: dest,
    strategy: result.strategy,
    sourceUrl: result.finalUrl,
    kind: result.kind,
    size: stat.size,
    siteError: siteError || undefined,
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }));
  return results;
}

fs.mkdirSync(logosDir, { recursive: true });

const results = await mapWithConcurrency(entries, 8, syncEntry);
const reportPath = path.join(root, 'scripts', 'sync-logos-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

const ok = results.filter((item) => item.saved !== 'FAILED');
const fromSite = ok.filter((item) => item.strategy?.startsWith('site')).length;
const fromNewsnow = ok.filter((item) => item.strategy === 'newsnow').length;

console.log(`Synced ${ok.length}/${results.length} logos (${fromSite} from sites, ${fromNewsnow} from NewsNow fallback)`);
console.log('Failed:', results.filter((item) => item.saved === 'FAILED').map((item) => item.name).join(', ') || 'none');
console.log('Report:', reportPath);
