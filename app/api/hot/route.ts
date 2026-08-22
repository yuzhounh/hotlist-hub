import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSourceDefinition } from '../../source-catalog';
import { fetchOfficial, hasOfficialFetcher } from './official-fetchers';
import { browserHeaders, decodeHtml, dedupeItems, parseFeed, type UnifiedItem } from './utils';

async function fetchNewsNow(source: string) {
  const upstream = await fetch(`https://newsnow.busiyi.world/api/s?id=${encodeURIComponent(source)}`, {
    headers: { ...browserHeaders, Referer: 'https://newsnow.busiyi.world/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`NewsNow returned ${upstream.status}`);
  const data = await upstream.json() as { updatedTime?: number | string; items?: UnifiedItem[] };
  return { updatedTime: data.updatedTime, items: data.items ?? [] };
}

async function fetchDailyHot(source: string) {
  const upstream = await fetch(`https://daily-hot-for-ai.vercel.app/api/${encodeURIComponent(source)}`, {
    headers: browserHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`DailyHot returned ${upstream.status}`);
  const data = await upstream.json() as {
    updateTime?: number | string;
    data?: Array<UnifiedItem & { hot?: string | number; timestamp?: number }>;
  };
  const items = (data.data ?? [])
    .filter((item) => source !== 'ifanr' || !item.title?.toUpperCase().includes('BIRTV'))
    .map((item, index) => ({
    id: item.id ?? item.url ?? index,
    title: item.title,
    url: item.url,
    mobileUrl: item.mobileUrl,
    extra: item.extra ?? (item.hot ? { info: String(item.hot) } : undefined),
  }));
  return { updatedTime: data.updateTime, items };
}

async function fetchHelti(source: string) {
  const upstream = await fetch(`https://ttkit.cn/daily-hot/api/${encodeURIComponent(source)}`, {
    headers: { ...browserHeaders, Referer: 'https://ttkit.cn/daily-hot' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`HelTi returned ${upstream.status}`);
  const data = await upstream.json() as {
    updateTime?: number | string;
    data?: Array<UnifiedItem & { hot?: string | number }>;
  };
  const items = (data.data ?? []).map((item, index) => ({
    id: item.id ?? item.url ?? index,
    title: item.title,
    url: item.url,
    mobileUrl: item.mobileUrl,
    extra: item.extra ?? (item.hot !== undefined ? { info: String(item.hot) } : undefined),
  }));
  return { updatedTime: data.updateTime, items };
}

async function fetchCaixin() {
  const upstream = await fetch('https://www.caixin.com/', {
    headers: browserHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Caixin returned ${upstream.status}`);
  const html = await upstream.text();
  const seen = new Set<string>();
  const items = Array.from(html.matchAll(/<a[^>]+href="(https:\/\/www\.caixin\.com\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      id: match[1].match(/\d+/)?.[0] ?? match[1],
      title: decodeHtml(match[2]),
      url: match[1],
    }))
    .filter((item) => item.title.length > 6 && !seen.has(item.url) && seen.add(item.url));
  return { updatedTime: Date.now(), items };
}

async function fetchEastmoney() {
  const upstream = await fetch('https://www.eastmoney.com/', {
    headers: { ...browserHeaders, Referer: 'https://www.eastmoney.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Eastmoney returned ${upstream.status}`);
  const html = await upstream.text();
  const seen = new Set<string>();
  const items = Array.from(html.matchAll(/<a[^>]+href="(https:\/\/finance\.eastmoney\.com\/a\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      id: match[1].match(/\/a\/(\d+)\.html/)?.[1] ?? match[1],
      title: decodeHtml(match[2]),
      url: match[1],
    }))
    .filter((item) => item.title && !seen.has(item.url) && seen.add(item.url));
  return { updatedTime: Date.now(), items };
}

function stockCodeFromSc(sc: string) {
  return sc.replace(/^[A-Z]+/i, '');
}

function secidFromSc(sc: string) {
  const match = sc.match(/^(SH|SZ|BJ)(\d{6})$/i);
  if (!match) return undefined;
  return `${match[1].toUpperCase() === 'SH' ? 1 : 0}.${match[2]}`;
}

function stockUrlFromSc(sc: string) {
  const match = sc.match(/^(SH|SZ|BJ)(\d{6})$/i);
  if (!match) return 'https://guba.eastmoney.com/rank/';
  return `https://quote.eastmoney.com/${match[1].toLowerCase()}${match[2]}.html`;
}

async function fetchEastmoneyStock() {
  const rankResponse = await fetch('https://emappdata.eastmoney.com/stockrank/getAllCurrentList', {
    method: 'POST',
    headers: { ...browserHeaders, 'Content-Type': 'application/json', Referer: 'https://guba.eastmoney.com/' },
    body: JSON.stringify({ appId: 'appId01', globalId: '786e4c21-70dc-435a-93bb-38', marketType: '', pageNo: 1, pageSize: 30 }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!rankResponse.ok) throw new Error(`Eastmoney stock returned ${rankResponse.status}`);
  const rankData = await rankResponse.json() as { data?: Array<{ sc: string; rk?: number; rc?: number }> };
  const rankItems = rankData.data ?? [];
  const secids = rankItems.map((item) => secidFromSc(item.sc)).filter(Boolean) as string[];
  const quoteByCode = new Map<string, { f12?: string; f14?: string; f3?: number | string }>();
  if (secids.length) {
    const quoteUrl = new URL('https://push2.eastmoney.com/api/qt/ulist.np/get');
    quoteUrl.searchParams.set('fltt', '2');
    quoteUrl.searchParams.set('invt', '2');
    quoteUrl.searchParams.set('fields', 'f2,f3,f12,f14');
    quoteUrl.searchParams.set('secids', secids.join(','));
    const quoteResponse = await fetch(quoteUrl, {
      headers: { ...browserHeaders, Referer: 'https://guba.eastmoney.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json() as { data?: { diff?: Array<{ f12?: string; f14?: string; f3?: number | string }> } };
      for (const quote of quoteData.data?.diff ?? []) {
        if (quote.f12) quoteByCode.set(quote.f12, quote);
      }
    }
  }
  const items = rankItems.flatMap((item) => {
    const code = stockCodeFromSc(item.sc);
    const quote = quoteByCode.get(code);
    const name = quote?.f14 || item.sc;
    const title = `${name} (${code})`;
    const url = stockUrlFromSc(item.sc);
    if (!title || !url) return [];
    return [{
      id: item.sc,
      title,
      url,
      mobileUrl: `https://wap.eastmoney.com/quote/stock/${secidFromSc(item.sc) ?? code}.html`,
      extra: quote?.f3 !== undefined ? { info: `${quote.f3}%` } : item.rk ? { info: String(item.rk) } : undefined,
    }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchJd() {
  const upstream = await fetch('https://www.jd.com/', {
    headers: { ...browserHeaders, Referer: 'https://www.jd.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`JD returned ${upstream.status}`);
  const html = await upstream.text();
  const rankLinkPattern = /\/\/www\.jd\.com\/(?:phb|jxinfo|zxnews)\/[A-Za-z0-9_/.-]+\.html/;
  const seen = new Set<string>();
  const items = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)).flatMap((match) => {
    const href = match[1].startsWith('//') ? `https:${match[1]}` : match[1];
    const title = decodeHtml(match[2]);
    if (!title || !rankLinkPattern.test(href) || seen.has(href)) return [];
    seen.add(href);
    return [{ id: href, title, url: href }];
  });
  return { updatedTime: Date.now(), items };
}

function extractTaobaoStaticConfig(html: string) {
  const match = /window\.staticConfig\s*=/.exec(html);
  const braceStart = html.indexOf('{', match?.index ?? -1);
  if (braceStart === -1) throw new Error('Taobao static config not found');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = braceStart; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(braceStart, i + 1)) as unknown;
    }
  }
  throw new Error('Failed to parse taobao static config');
}

function collectTaobaoItems(value: unknown, items: UnifiedItem[] = []) {
  if (!value || typeof value !== 'object') return items;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTaobaoItems(entry, items));
    return items;
  }
  const record = value as Record<string, unknown>;
  const itemId = typeof record.itemId === 'string' ? record.itemId : typeof record.itemId === 'number' ? String(record.itemId) : '';
  const shortTitle = typeof record.shortTitle === 'string' ? record.shortTitle : '';
  const clickUrl = typeof record.clickUrl === 'string' ? record.clickUrl : '';
  if (itemId && shortTitle && /(?:item\.taobao\.com|detail\.tmall\.com)\/item\.htm/.test(clickUrl)) {
    const url = clickUrl.startsWith('//') ? `https:${clickUrl}` : clickUrl;
    items.push({
      id: itemId,
      title: shortTitle,
      url,
      mobileUrl: `https://main.m.taobao.com/search/index.html?q=${encodeURIComponent(shortTitle)}&sort=sale-desc`,
      extra: record.price ? { info: `¥${record.price}` } : undefined,
    });
  }
  Object.values(record).forEach((entry) => collectTaobaoItems(entry, items));
  return items;
}

async function fetchTaobao() {
  const upstream = await fetch('https://www.taobao.com/', {
    headers: { ...browserHeaders, Referer: 'https://www.taobao.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Taobao returned ${upstream.status}`);
  const items = collectTaobaoItems(extractTaobaoStaticConfig(await upstream.text()));
  return { updatedTime: Date.now(), items };
}

async function fetchTonghuashun() {
  const upstream = await fetch('https://www.10jqka.com.cn/', {
    headers: browserHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Tonghuashun returned ${upstream.status}`);
  const html = await upstream.text();
  const seen = new Set<string>();
  const items = Array.from(html.matchAll(/<a[^>]+href=["'](\/\/news\.10jqka\.com\.cn\/[^"']+\.shtml|https:\/\/news\.10jqka\.com\.cn\/[^"']+\.shtml)["'][\s\S]*?<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi))
    .map((match) => {
      const url = match[1].startsWith('//') ? `https:${match[1]}` : match[1];
      return { id: url.match(/\/([^/]+)\.shtml$/)?.[1] ?? url, title: decodeHtml(match[2]), url };
    })
    .filter((item) => item.title && !seen.has(item.url) && seen.add(item.url));
  return { updatedTime: Date.now(), items };
}

async function fetchYicai() {
  const upstream = await fetch('https://www.yicai.com/', {
    headers: { ...browserHeaders, Referer: 'https://www.yicai.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Yicai returned ${upstream.status}`);
  const html = await upstream.text();
  const seen = new Set<string>();
  const items = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/gi))
    .map((match) => {
      const url = match[1].startsWith('http') ? match[1] : `https://www.yicai.com${match[1]}`;
      return {
        id: url.match(/\d+/)?.[0] ?? url,
        title: decodeHtml(match[2]),
        url,
      };
    })
    .filter((item) => item.title && item.url.includes('yicai.com') && !seen.has(item.url) && seen.add(item.url));
  return { updatedTime: Date.now(), items };
}

async function fetchJianshu() {
  const upstream = await fetch('https://www.jianshu.com/asimov/trending/now', {
    headers: browserHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`Jianshu returned ${upstream.status}`);
  const data = await upstream.json() as Array<{
    object?: {
      data?: {
        id?: string | number;
        title?: string;
        slug?: string;
        likes_count?: number;
      };
    };
  }>;
  const items = data.flatMap((entry) => {
    const item = entry.object?.data;
    if (!item?.title || !item.slug) return [];
    return [{
      id: item.id ?? item.slug,
      title: item.title,
      url: `https://www.jianshu.com/p/${item.slug}`,
      extra: item.likes_count ? { info: String(item.likes_count) } : undefined,
    }];
  });
  return { updatedTime: Date.now(), items };
}

type ZhihuDailyStory = {
  id: string | number;
  title: string;
  url: string;
  type?: number;
};

async function fetchZhihuDaily() {
  const latestResponse = await fetch('https://daily.zhihu.com/api/4/news/latest', {
    headers: { ...browserHeaders, Referer: 'https://daily.zhihu.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!latestResponse.ok) throw new Error(`Zhihu Daily returned ${latestResponse.status}`);
  const latest = await latestResponse.json() as {
    date?: string;
    stories?: ZhihuDailyStory[];
    top_stories?: ZhihuDailyStory[];
  };

  let previousStories: ZhihuDailyStory[] = [];
  if (latest.date) {
    const previousResponse = await fetch(`https://daily.zhihu.com/api/4/news/before/${latest.date}`, {
      headers: { ...browserHeaders, Referer: 'https://daily.zhihu.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (previousResponse.ok) {
      const previous = await previousResponse.json() as { stories?: ZhihuDailyStory[] };
      previousStories = previous.stories ?? [];
    }
  }

  const items = [...(latest.stories ?? []), ...(latest.top_stories ?? []), ...previousStories]
    .filter((item) => item.type === undefined || item.type === 0)
    .map((item) => ({ id: item.id, title: item.title, url: item.url }));
  return { updatedTime: Date.now(), items };
}

const mobileHeaders = {
  Accept: 'text/html,application/json,*/*',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

function extractJsonScript(html: string, id: string) {
  const match = html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchQidianHotsales() {
  const upstream = await fetch('https://m.qidian.com/rank/hotsales', {
    headers: mobileHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Qidian returned ${upstream.status}`);
  const html = await upstream.text();
  const payload = extractJsonScript(html, 'vite-plugin-ssr_pageContext') as {
    pageContext?: { pageProps?: { pageData?: { records?: Array<{ bid?: string; bName?: string; bAuth?: string; rankNum?: number; cnt?: string; cat?: string }> } } };
  } | null;
  const records = payload?.pageContext?.pageProps?.pageData?.records ?? [];
  const items = records.flatMap((book) => {
    if (!book.bid || !book.bName) return [];
    const url = `https://www.qidian.com/book/${book.bid}/`;
    const meta = [book.bAuth, book.cat, book.cnt].filter(Boolean).join(' · ');
    return [{
      id: book.bid,
      title: book.bName,
      url,
      mobileUrl: `https://m.qidian.com/book/${book.bid}/`,
      extra: meta ? { info: meta } : undefined,
    }];
  }).slice(0, 30);
  if (!items.length) throw new Error('Empty Qidian rank');
  return { updatedTime: Date.now(), items };
}

async function fetchHongguoHot() {
  const upstream = await fetch('https://hongguoduanju.com/category?tab=1', {
    headers: mobileHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Hongguo returned ${upstream.status}`);
  const html = await upstream.text();
  const seen = new Set<string>();
  const items = Array.from(html.matchAll(/<a[^>]+href="\/detail\?series_id=(\d+)"[^>]*>[\s\S]*?<img[^>]+alt="([^"]+)"/gi))
    .flatMap((match) => {
      const id = match[1];
      const title = decodeHtml(match[2]);
      const url = `https://hongguoduanju.com/detail?series_id=${id}`;
      if (!title || seen.has(id)) return [];
      seen.add(id);
      return [{ id, title, url, mobileUrl: url }];
    })
    .slice(0, 30);
  if (!items.length) throw new Error('Empty Hongguo rank');
  return { updatedTime: Date.now(), items };
}

function mapCnBetaArticleUrl(url: string) {
  const id = url.match(/(\d+)\.htm(?:\?|$)/)?.[1];
  if (!id) return url;
  return `https://www.cnbeta.com.tw/articles/tech/${id}.htm`;
}

async function fetchCnBeta(source: string) {
  const paths: Record<string, string> = {
    'cnbeta-latest': '',
    'cnbeta-hot': '/hot.htm',
    'cnbeta-argue': '/argue.htm',
  };
  const path = paths[source];
  if (path === undefined) throw new Error('Unsupported cnBeta source');
  const upstream = await fetch(`https://m.cnbeta.com.tw/wap${path}`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`cnBeta returned ${upstream.status}`);
  const html = await upstream.text();
  const items = Array.from(html.matchAll(/<div\s+class=["']list["']>\s*<a\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi))
    .map((match, index) => {
      const rawUrl = new URL(match[1], 'https://m.cnbeta.com.tw').href;
      const url = mapCnBetaArticleUrl(rawUrl);
      return {
        id: match[1].match(/(\d+)\.htm/)?.[1] ?? index,
        title: decodeHtml(match[2]),
        url,
        mobileUrl: url,
      };
    })
    .filter((item) => item.title && item.url);
  return { updatedTime: Date.now(), items };
}

function getWereadId(bookId: string) {
  const hash = createHash('md5').update(bookId).digest('hex');
  const chunks = /^\d+$/.test(bookId)
    ? bookId.match(/.{1,9}/g)!.map((chunk) => Number.parseInt(chunk, 10).toString(16))
    : [Array.from(bookId).map((character) => character.charCodeAt(0).toString(16)).join('')];
  let result = `${hash.slice(0, 3)}${/^\d+$/.test(bookId) ? '3' : '4'}2${hash.slice(-2)}`;
  result += chunks.map((chunk) => `${chunk.length.toString(16).padStart(2, '0')}${chunk}`).join('g');
  if (result.length < 20) result += hash.slice(0, 20 - result.length);
  return result + createHash('md5').update(result).digest('hex').slice(0, 3);
}

async function fetchWeread(source: string) {
  const types: Record<string, string> = {
    'weread-rising': 'rising',
    'weread-newbook': 'newbook',
    'weread-all': 'all',
    'weread-masterpiece': 'newrating_publish',
  };
  const type = types[source];
  if (!type) throw new Error('Unsupported WeRead source');
  const upstream = await fetch(`https://weread.qq.com/web/bookListInCategory/${type}?rank=1`, {
    headers: browserHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`WeRead returned ${upstream.status}`);
  const data = await upstream.json() as {
    books?: Array<{
      bookInfo?: { bookId?: string; title?: string; author?: string };
      readingCount?: number;
    }>;
  };
  const items = (data.books ?? []).flatMap((entry) => {
    const book = entry.bookInfo;
    if (!book?.bookId || !book.title) return [];
    return [{
      id: book.bookId,
      title: book.author ? `${book.title} · ${book.author}` : book.title,
      url: `https://weread.qq.com/web/bookDetail/${getWereadId(book.bookId)}`,
      extra: entry.readingCount ? { info: String(entry.readingCount) } : undefined,
    }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchDouban(source: string) {
  if (source === 'douban-book-chart') {
    const upstream = await fetch('https://book.douban.com/chart?subcat=all&icn=index-topchart-popular', {
      headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml', Referer: 'https://book.douban.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`Douban Book returned ${upstream.status}`);
    const html = await upstream.text();
    const items = Array.from(html.matchAll(/<a\s+class=["']fleft["']\s+href=["'](https:\/\/book\.douban\.com\/subject\/(\d+)\/)["'][^>]*>([\s\S]*?)<\/a>/gi))
      .map((match) => ({ id: match[2], title: decodeHtml(match[3]), url: match[1] }));
    return { updatedTime: Date.now(), items };
  }

  const type = source === 'douban-hot-tv' ? 'tv' : 'movie';
  const upstream = await fetch(`https://m.douban.com/rexxar/api/v2/subject/recent_hot/${type}?start=0&limit=30&category=%E7%83%AD%E9%97%A8&type=%E5%85%A8%E9%83%A8`, {
    headers: { ...browserHeaders, Referer: 'https://movie.douban.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`Douban returned ${upstream.status}`);
  const data = await upstream.json() as {
    items?: Array<{ id: string; title: string; rating?: { value?: number; count?: number } }>;
  };
  const items = (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    url: `https://movie.douban.com/subject/${item.id}/`,
    extra: item.rating?.count ? { info: String(item.rating.count) } : undefined,
  }));
  return { updatedTime: Date.now(), items };
}

function decodeUnicodeEscapes(value: string) {
  return value.replace(/\\u([0-9a-f]{4})/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

async function fetchYouku() {
  const upstream = await fetch('https://www.youku.com/channel/webtv/list', {
    headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Youku returned ${upstream.status}`);
  const html = await upstream.text();
  const items = Array.from(html.matchAll(/"videoLink":"([^"]+)"[\s\S]{0,1200}?"title":"([^"]+)"[\s\S]{0,1200}?"component_id":"WEB_RANKING"/g))
    .map((match, index) => {
      const path = decodeUnicodeEscapes(match[1]);
      return {
        id: path.match(/id_([^.?/]+)/)?.[1] ?? index,
        title: decodeUnicodeEscapes(match[2]),
        url: path.startsWith('//') ? `https:${path}` : path,
      };
    });
  return { updatedTime: Date.now(), items };
}

async function fetchMusic(source: string) {
  if (source.startsWith('music-netease-')) {
    const playlistId = source === 'music-netease-classical' ? '71384707' : '3778678';
    const upstream = await fetch(`https://music.163.com/api/v3/playlist/detail?id=${playlistId}&n=30`, {
      headers: { ...browserHeaders, Referer: 'https://music.163.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error(`NetEase Music returned ${upstream.status}`);
    const data = await upstream.json() as {
      playlist?: { tracks?: Array<{ id: number; name: string; ar?: Array<{ name: string }> }> };
    };
    const items = (data.playlist?.tracks ?? []).map((song) => ({
      id: song.id,
      title: `${song.name} · ${(song.ar ?? []).map((artist) => artist.name).join('/')}`,
      url: `https://music.163.com/#/song?id=${song.id}`,
    }));
    return { updatedTime: Date.now(), items };
  }

  if (source.startsWith('music-qq-')) {
    const topId = source === 'music-qq-douyin' ? '60' : '4';
    const upstream = await fetch(`https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=${topId}&page=detail&type=top&song_num=30`, {
      headers: { ...browserHeaders, Referer: 'https://y.qq.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error(`QQ Music returned ${upstream.status}`);
    const data = await upstream.json() as {
      songlist?: Array<{ data?: { songmid?: string; songname?: string; singer?: Array<{ name: string }> } }>;
    };
    const items = (data.songlist ?? []).flatMap((entry) => {
      const song = entry.data;
      if (!song?.songmid || !song.songname) return [];
      return [{
        id: song.songmid,
        title: `${song.songname} · ${(song.singer ?? []).map((artist) => artist.name).join('/')}`,
        url: `https://y.qq.com/n/ryqq/songDetail/${song.songmid}`,
      }];
    });
    return { updatedTime: Date.now(), items };
  }

  if (source.startsWith('music-kugou-')) {
    const rankId = source === 'music-kugou-shortvideo' ? '52144' : '8888';
    const upstream = await fetch(`https://www.kugou.com/yy/rank/home/1-${rankId}.html?from=rank`, {
      headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml', Referer: 'https://www.kugou.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`Kugou returned ${upstream.status}`);
    const html = await upstream.text();
    const items = Array.from(html.matchAll(/<li[^>]+title=["']([^"']+)["'][^>]+data-index=["']\d+["'][\s\S]*?<a\s+href=["'](https:\/\/www\.kugou\.com\/mixsong\/([^"']+)\.html)["'][^>]+class=["']pc_temp_songname["']/gi))
      .map((match) => ({ id: match[3], title: decodeHtml(match[1]), url: match[2] }));
    return { updatedTime: Date.now(), items };
  }

  if (source === 'music-bilibili') {
    const periodsResponse = await fetch('https://api.bilibili.com/x/copyright-music-publicity/toplist/all_period?list_type=1', {
      headers: { ...browserHeaders, Referer: 'https://music.bilibili.com/pc/rank' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!periodsResponse.ok) throw new Error(`Bilibili Music returned ${periodsResponse.status}`);
    const periods = await periodsResponse.json() as {
      data?: { list?: Record<string, Array<{ ID: number; publish_time: number }>> };
    };
    const latest = Object.values(periods.data?.list ?? {}).flat().sort((a, b) => b.publish_time - a.publish_time)[0];
    if (!latest) throw new Error('Bilibili Music has no period');
    const listResponse = await fetch(`https://api.bilibili.com/x/copyright-music-publicity/toplist/music_list?list_id=${latest.ID}`, {
      headers: { ...browserHeaders, Referer: 'https://music.bilibili.com/pc/rank' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await listResponse.json() as {
      data?: { list?: Array<{ music_id: string; music_title: string; singer?: string; heat?: number; mv_bvid?: string; creation_bvid?: string }> };
    };
    const items = (data.data?.list ?? []).map((song) => ({
      id: song.music_id,
      title: `${song.music_title} · ${song.singer ?? ''}`,
      url: song.mv_bvid || song.creation_bvid
        ? `https://www.bilibili.com/video/${song.mv_bvid || song.creation_bvid}`
        : `https://music.bilibili.com/pc/music-detail?music_id=${song.music_id}`,
      extra: song.heat ? { info: String(song.heat) } : undefined,
    }));
    return { updatedTime: latest.publish_time * 1000, items };
  }

  throw new Error('Unsupported music source');
}

const foreignFeeds: Record<string, string> = {
  'foreign-google-trends': 'https://trends.google.com/trending/rss?geo=US',
  'foreign-google-news': 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  'foreign-techmeme': 'https://www.techmeme.com/feed.xml',
  'foreign-bbc-world': 'https://feeds.bbci.co.uk/news/world/rss.xml',
  'foreign-guardian-world': 'https://www.theguardian.com/world/rss',
  'foreign-npr-news': 'https://feeds.npr.org/1001/rss.xml',
  'foreign-aljazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'foreign-theverge': 'https://www.theverge.com/rss/index.xml',
  'foreign-arstechnica': 'https://feeds.arstechnica.com/arstechnica/index',
  'foreign-techcrunch': 'https://techcrunch.com/feed/',
};

async function fetchForeign(source: string) {
  const feedUrl = foreignFeeds[source];
  if (feedUrl) {
    const upstream = await fetch(feedUrl, {
      headers: { ...browserHeaders, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`Foreign feed returned ${upstream.status}`);
    let items = parseFeed(await upstream.text());
    if (source === 'foreign-google-trends') {
      items = items.map((item, index) => ({
        ...item,
        id: `${item.title}-${index}`,
        url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(item.title)}&geo=US`,
      }));
    }
    return { updatedTime: Date.now(), items };
  }

  if (source === 'foreign-lobsters') {
    const upstream = await fetch('https://lobste.rs/hottest.json', { headers: browserHeaders, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) throw new Error(`Lobsters returned ${upstream.status}`);
    const data = await upstream.json() as Array<{ short_id?: string; title?: string; url?: string; comments_url?: string; score?: number }>;
    return { updatedTime: Date.now(), items: data.flatMap((item, index) => item.title && (item.url || item.comments_url) ? [{ id: item.short_id ?? index, title: item.title, url: item.url || item.comments_url!, extra: item.score ? { info: String(item.score) } : undefined }] : []) };
  }

  if (source === 'foreign-stackoverflow') {
    const upstream = await fetch('https://api.stackexchange.com/2.3/questions?site=stackoverflow&order=desc&sort=hot&pagesize=30', { headers: browserHeaders, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) throw new Error(`Stack Overflow returned ${upstream.status}`);
    const data = await upstream.json() as { items?: Array<{ question_id: number; title: string; link: string; score?: number }> };
    return { updatedTime: Date.now(), items: (data.items ?? []).map((item) => ({ id: item.question_id, title: decodeHtml(item.title), url: item.link, extra: item.score ? { info: String(item.score) } : undefined })) };
  }

  if (source === 'foreign-coingecko') {
    const upstream = await fetch('https://api.coingecko.com/api/v3/search/trending', { headers: browserHeaders, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) throw new Error(`CoinGecko returned ${upstream.status}`);
    const data = await upstream.json() as { coins?: Array<{ item?: { id?: string; name?: string; symbol?: string; market_cap_rank?: number } }> };
    return { updatedTime: Date.now(), items: (data.coins ?? []).flatMap((entry) => entry.item?.id && entry.item.name ? [{ id: entry.item.id, title: `${entry.item.name} (${entry.item.symbol ?? ''})`, url: `https://www.coingecko.com/en/coins/${entry.item.id}`, extra: entry.item.market_cap_rank ? { info: `#${entry.item.market_cap_rank}` } : undefined }] : []) };
  }

  throw new Error('Unsupported foreign source');
}

async function fetchDirect(source: string) {
  if (source === 'caixin') return fetchCaixin();
  if (source === 'eastmoney') return fetchEastmoney();
  if (source === 'eastmoney-stock') return fetchEastmoneyStock();
  if (source === 'jd') return fetchJd();
  if (source === 'taobao') return fetchTaobao();
  if (source === 'tonghuashun') return fetchTonghuashun();
  if (source === 'yicai') return fetchYicai();
  if (source === 'jianshu') return fetchJianshu();
  if (source === 'zhihu-daily') return fetchZhihuDaily();
  if (source.startsWith('cnbeta-')) return fetchCnBeta(source);
  if (source.startsWith('weread-')) return fetchWeread(source);
  if (source.startsWith('douban-')) return fetchDouban(source);
  if (source === 'youku-ranking') return fetchYouku();
  if (source === 'qidian-hotsales') return fetchQidianHotsales();
  if (source === 'hongguo-hot') return fetchHongguoHot();
  if (source.startsWith('music-')) return fetchMusic(source);
  if (source.startsWith('foreign-')) return fetchForeign(source);
  throw new Error('Unsupported direct source');
}

export async function GET(request: NextRequest) {
  const sourceId = request.nextUrl.searchParams.get('source') ?? '';
  const definition = getSourceDefinition(sourceId);
  if (!definition) {
    return NextResponse.json({ message: 'Unsupported source' }, { status: 400 });
  }

  try {
    let data;
    if (hasOfficialFetcher(sourceId)) {
      data = await fetchOfficial(sourceId);
    } else if (definition.provider === 'newsnow') {
      data = await fetchNewsNow(definition.upstreamId);
    } else if (definition.provider === 'helti') {
      data = await fetchHelti(definition.upstreamId);
    } else if (definition.provider === 'direct') {
      data = await fetchDirect(definition.upstreamId);
    } else {
      data = await fetchDailyHot(definition.upstreamId);
    }
    const items = dedupeItems(data.items);
    if (!items.length) throw new Error('Empty source');
    return NextResponse.json({ ...data, items }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error(`[hot] ${sourceId} unavailable`, error);
    return NextResponse.json({ message: 'Source unavailable' }, { status: 502 });
  }
}
