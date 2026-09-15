import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';
import { getSourceDefinition } from '../../source-catalog';
import { fetchOfficial, hasOfficialFetcher } from './official-fetchers';
import { browserHeaders, decodeHtml, dedupeItems, fetchJson, fetchText, parseFeed, scrapeAnchors, type UnifiedItem } from './utils';

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

async function fetchInfzmHot() {
  const data = await fetchJson<{
    data?: {
      hot_contents?: Array<{
        id?: number;
        subject?: string;
        short_subject?: string;
      }>;
    };
  }>('https://www.infzm.com/hot_contents?format=json', 'https://www.infzm.com/');
  const items = (data.data?.hot_contents ?? []).flatMap((article) => {
    const title = decodeHtml(article.subject || article.short_subject || '');
    if (!article.id || !title) return [];
    return [{
      id: article.id,
      title,
      url: `https://www.infzm.com/contents/${article.id}`,
    }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchDili360Hot() {
  const pageUrl = 'https://www.dili360.com/';
  const html = await fetchText(pageUrl);
  const block = html.match(
    /<h2\s+class=["']subtitle["']>\s*热度榜\s*<\/h2>\s*<ul\s+class=["']content["']>([\s\S]*?)<\/ul>/i,
  )?.[1] ?? '';
  const items = Array.from(block.matchAll(
    /<li[^>]*>[\s\S]*?<span[^>]*>\s*(\d+)\s*<\/span>[\s\S]*?<h3[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )).flatMap((match) => {
    const title = decodeHtml(match[3]);
    if (!title) return [];
    return [{
      id: match[1],
      title,
      url: new URL(decodeHtml(match[2]), pageUrl).href,
    }];
  });
  if (!items.length) throw new Error('Dili360 hot list was not found');
  return { updatedTime: Date.now(), items };
}

async function fetchXinhuaLatest() {
  const pageUrl = 'https://www.news.cn/';
  const html = await fetchText(pageUrl);
  const block = html.match(
    /<div\s+id=["']latest["'][^>]*>([\s\S]*?)(?:<div\s+id=["']main["']|<\/fjtignoreurl>)/i,
  )?.[1] ?? '';
  const items = Array.from(block.matchAll(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )).flatMap((match, index) => {
    const title = decodeHtml(match[2]);
    if (!title) return [];
    const url = new URL(decodeHtml(match[1]), pageUrl).href;
    return [{ id: url || index, title, url }];
  });
  if (!items.length) throw new Error('Xinhua latest list was not found');
  return { updatedTime: Date.now(), items: items.slice(0, 30) };
}

async function fetchCctvLatest() {
  const pageUrl = 'https://news.cctv.com/news/index.shtml';
  const text = await fetchText(
    'https://news.cctv.com/2019/07/gaiban/cmsdatainterface/page/news_1.jsonp',
    pageUrl,
    'application/javascript,text/javascript,*/*',
  );
  const payload = text.match(/^[^(]+\(([\s\S]*)\)\s*;?\s*$/)?.[1];
  if (!payload) throw new Error('CCTV latest JSONP was invalid');
  const data = JSON.parse(payload) as {
    data?: {
      list?: Array<{ id?: string; title?: string; url?: string }>;
    };
  };
  const items = (data.data?.list ?? []).flatMap((article) => {
    if (!article.id || !article.title || !article.url) return [];
    return [{
      id: article.id,
      title: decodeHtml(article.title),
      url: article.url,
    }];
  });
  if (!items.length) throw new Error('CCTV latest list was empty');
  return { updatedTime: Date.now(), items: items.slice(0, 30) };
}

async function fetchJiemianFlash() {
  const pageUrl = 'https://www.jiemian.com/lists/4.html';
  const html = await fetchText(pageUrl);
  const firstPageMatches = Array.from(html.matchAll(
    /data-time=["'](\d+)["'][^>]*data-id=["'](\d+)["'][\s\S]{0,900}?<h4>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  ));
  const items: UnifiedItem[] = firstPageMatches.flatMap((match) => {
    const title = decodeHtml(match[4]);
    if (!title) return [];
    return [{ id: match[2], title, url: new URL(decodeHtml(match[3]), pageUrl).href }];
  });
  const lastTime = firstPageMatches.at(-1)?.[1];
  if (lastTime && items.length < 30) {
    try {
      const params = new URLSearchParams({ cid: '4', start_time: lastTime, page: '2', tagid: '' });
      const data = await fetchJson<{
        result?: { list?: Array<{ id?: string; title?: string }> };
      }>(`https://papi.jiemian.com/page/api/kuaixun/getlistmore?${params}`, pageUrl);
      for (const article of data.result?.list ?? []) {
        if (!article.id || !article.title) continue;
        items.push({
          id: article.id,
          title: decodeHtml(article.title),
          url: `https://www.jiemian.com/article/${article.id}.html`,
        });
        if (items.length >= 30) break;
      }
    } catch {
      // The first official page still provides 20 current entries if pagination is unavailable.
    }
  }
  if (!items.length) throw new Error('Jiemian flash list was not found');
  return { updatedTime: Date.now(), items: items.slice(0, 30) };
}

async function fetchAiBotDaily() {
  const pageUrl = 'https://ai-bot.cn/daily-ai-news/';
  const upstream = await fetch(pageUrl, {
    headers: {
      ...browserHeaders,
      Accept: 'text/html,application/xhtml+xml',
      Referer: 'https://ai-bot.cn/',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`AI Bot returned ${upstream.status}`);
  const html = await upstream.text();
  const items = scrapeAnchors(
    html,
    /<div[^>]+class=["'][^"']*\bnews-item\b[^"']*["'][^>]*>[\s\S]*?<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>/gi,
    (href, title, index) => ({
      id: href || index,
      title,
      url: new URL(href, pageUrl).href,
    }),
  ).slice(0, 30);
  return { updatedTime: Date.now(), items };
}

const AIHOT_PAGE = 'https://aihot.news/hot';
const AIHOT_API = 'https://aihot.news/api/v1/hot-topics';

function solveAihotChallenge(html: string) {
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
  if (!script || !script.includes('__tst_status')) return null;
  const cookies: string[] = [];
  const document = { cookie: '' };
  Object.defineProperty(document, 'cookie', {
    set(value: string) {
      cookies.push(String(value).split(';')[0]);
    },
    get: () => cookies.join('; '),
    enumerable: true,
  });
  runInContext(script, createContext({
    document,
    location: { href: AIHOT_PAGE, replace: (value: string) => value },
    setTimeout: () => 0,
  }), { timeout: 1000 });
  return cookies.join('; ') || null;
}

async function fetchAihotHot() {
  // 1. Try official JSON API first
  try {
    const apiRes = await fetch(AIHOT_API, {
      headers: {
        'User-Agent': browserHeaders['User-Agent'],
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (apiRes.ok) {
      const data = await apiRes.json() as {
        items?: Array<{
          id?: string;
          rank?: number;
          title?: string;
          sourceCount?: number;
          signalCount?: number;
          links?: { story?: string; aihot?: string; original?: string };
        }>;
      };
      if (Array.isArray(data?.items) && data.items.length > 0) {
        const items = data.items.flatMap((item) => {
          if (!item?.title) return [];
          const rawUrl = item.links?.story || item.links?.aihot || item.links?.original || `https://aihot.news/items/${item.id}`;
          const url = rawUrl.replace(/^https:\/\/aihot\.virxact\.com\//, 'https://aihot.news/');
          const heat = item.sourceCount ?? item.signalCount;
          return [{
            id: String(item.id || item.rank || url),
            title: item.title.trim(),
            url,
            ...(heat != null ? { extra: { info: `热度 ${heat}` } } : {}),
          }];
        });
        if (items.length > 0) {
          return { updatedTime: Date.now(), items };
        }
      }
    }
  } catch (err) {
    console.warn('[hot] AIHOT api fetch failed, falling back to HTML scraping', err);
  }

  // 2. Fallback: HTML page scraping
  const headers = {
    ...browserHeaders,
    Accept: 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
  const first = await fetch(AIHOT_PAGE, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!first.ok) throw new Error(`AIHOT returned ${first.status}`);
  let html = await first.text();
  const solved = solveAihotChallenge(html);
  if (solved) {
    const seed = (first.headers.getSetCookie?.() ?? []).map((value) => value.split(';')[0]).join('; ');
    const response = await fetch(AIHOT_PAGE, {
      headers: { ...headers, Cookie: [seed, solved].filter(Boolean).join('; ') },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`AIHOT retry returned ${response.status}`);
    html = await response.text();
  }
  if (html.includes('__tst_status')) throw new Error('AIHOT bot challenge was not solved');

  // Try parsing HTML rows
  const rows = html.split(/<li\b[^>]*\bclass="[^"]*hot-rank-row[^"]*"[^>]*>/i).slice(1);
  const items = rows.flatMap((row) => {
    const link = row.match(/<a[^>]*\bclass="[^"]*hot-rank-link[^"]*"[^>]*\bhref="(\/story\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      || row.match(/<a[^>]*\bhref="(\/story\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) return [];
    const title = decodeHtml(link[2].replace(/<[^>]+>/g, '')).trim();
    if (!title) return [];
    const heat = row.match(/(\d+)(?:<!-- -->)?\s*个精选信源/i)?.[1]
      || row.match(/hot-rank-sources-count">(\d+)</i)?.[1];
    return [{
      id: link[1].slice('/story/'.length),
      title,
      url: new URL(link[1], AIHOT_PAGE).href,
      ...(heat ? { extra: { info: `热度 ${heat}` } } : {}),
    }];
  });

  // Try parsing JSON-LD ItemList if rows parsing yielded no items
  if (!items.length) {
    const jsonLdScripts = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
    for (const scriptTag of jsonLdScripts) {
      try {
        const jsonText = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        const parsed = JSON.parse(jsonText) as {
          '@type'?: string;
          itemListElement?: Array<{ name?: string; url?: string; position?: number }>;
        };
        if (parsed?.['@type'] === 'ItemList' && Array.isArray(parsed.itemListElement) && parsed.itemListElement.length > 0) {
          const ldItems = parsed.itemListElement.flatMap((entry) => {
            if (!entry?.name) return [];
            const url = entry.url || AIHOT_PAGE;
            return [{
              id: entry.url ? entry.url.replace(/^.*\/story\//, '') : String(entry.position || entry.name),
              title: decodeHtml(entry.name),
              url: url.replace(/^https:\/\/aihot\.virxact\.com\//, 'https://aihot.news/'),
            }];
          });
          if (ldItems.length > 0) {
            return { updatedTime: Date.now(), items: ldItems };
          }
        }
      } catch {
        // Continue to generic fallback
      }
    }
  }

  // Generic fallback: all story links
  if (!items.length) {
    const storyRegex = /<a[^>]*\bhref="(\/story\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((match = storyRegex.exec(html)) !== null) {
      const href = match[1];
      const title = decodeHtml(match[2].replace(/<[^>]+>/g, '')).trim();
      if (title && !seen.has(href)) {
        seen.add(href);
        items.push({
          id: href.slice('/story/'.length),
          title,
          url: new URL(href, AIHOT_PAGE).href,
        });
      }
    }
  }

  if (!items.length) throw new Error('AIHOT hot list was not found');
  return { updatedTime: Date.now(), items };
}

async function fetchAiMediaLatest(source: string) {
  if (source === 'ai-media-jiqizhixin') {
    const pageUrl = 'https://www.jiqizhixin.com/';
    type JiqizhixinResponse = {
      articles?: Array<{
        id?: string;
        title?: string;
        slug?: string;
      }>;
    };
    const data = await fetchJson<JiqizhixinResponse>(
      `${pageUrl}api/article_library/articles.json?sort=time&page=1&per=20`,
      pageUrl,
    );
    const items = (data.articles ?? []).flatMap((article) => {
      if (!article.id || !article.title || !article.slug) return [];
      return [{
        id: article.id,
        title: decodeHtml(article.title),
        url: `${pageUrl}articles/${article.slug}`,
      }];
    }).slice(0, 30);
    return { updatedTime: Date.now(), items };
  }

  const site = source === 'ai-media-qbitai'
    ? 'https://www.qbitai.com/'
    : source === 'ai-media-aiera'
      ? 'https://aiera.com.cn/'
      : '';
  if (!site) throw new Error('Unsupported AI media source');
  const data = await fetchJson<Array<{
    id?: number;
    link?: string;
    title?: { rendered?: string };
  }>>(
    `${site}wp-json/wp/v2/posts?per_page=30&page=1&_fields=id,link,title`,
    site,
  );
  const items = data.flatMap((article) => {
    const title = decodeHtml(article.title?.rendered ?? '');
    if (!article.id || !article.link || !title) return [];
    return [{ id: article.id, title, url: article.link }];
  }).slice(0, 30);
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

async function fetchFanqieTop() {
  const upstream = await fetch('https://fanqienovel.com/api/author/misc/top_book_list/v1/?limit=30&offset=0', {
    headers: { ...browserHeaders, Referer: 'https://fanqienovel.com/?enter_from=menu' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`Fanqie Novel returned ${upstream.status}`);
  const data = await upstream.json() as {
    book_list?: Array<{
      book_id?: string;
      book_name?: string;
      author?: string;
    }>;
  };
  const items = (data.book_list ?? []).flatMap((book) => {
    if (!book.book_id || !book.book_name) return [];
    const url = `https://fanqienovel.com/page/${book.book_id}`;
    return [{
      id: book.book_id,
      title: book.book_name,
      byline: book.author,
      url,
      mobileUrl: url,
    }];
  }).slice(0, 30);
  if (!items.length) throw new Error('Empty Fanqie top rank');
  return { updatedTime: Date.now(), items };
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
  type HongguoResponse = {
    recommendList?: Array<{
      series_id?: string;
      series_name?: string;
      episode_cnt?: number;
      episode_right_text?: string;
    }>;
  };
  const apiPath = '/api/category/page?tab=1&page_num=1&sort_type=0&gender=2';
  let data: HongguoResponse | undefined;
  for (const origin of ['https://hongguoduanju.com', 'https://novelquickapp.com']) {
    try {
      const upstream = await fetch(`${origin}${apiPath}`, {
        headers: { ...browserHeaders, Referer: 'https://hongguoduanju.com/category?tab=1' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) continue;
      data = await upstream.json() as HongguoResponse;
      if (data.recommendList?.length) break;
    } catch {
      // The current and legacy official domains occasionally fail independently.
    }
  }
  if (!data?.recommendList?.length) throw new Error('Hongguo API unavailable');
  const items = (data.recommendList ?? [])
    .flatMap((entry) => {
      const id = entry.series_id;
      const title = entry.series_name;
      if (!id || !title) return [];
      const url = `https://hongguoduanju.com/detail?series_id=${id}`;
      const episodeText = entry.episode_right_text || (entry.episode_cnt ? `全${entry.episode_cnt}集` : '');
      return [{
        id,
        title,
        url,
        mobileUrl: url,
        extra: episodeText ? { info: episodeText } : undefined,
      }];
    })
    .slice(0, 30);
  if (!items.length) throw new Error('Empty Hongguo rank');
  return { updatedTime: Date.now(), items };
}

async function fetchMaoyanBoxOffice() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';
  const timestamp = Date.now();
  const index = Math.floor(Math.random() * 1000) + 1;
  const encodedUserAgent = Buffer.from(userAgent).toString('base64');
  const signatureSource = [
    'method=GET',
    `timeStamp=${timestamp}`,
    `User-Agent=${encodedUserAgent}`,
    `index=${index}`,
    'channelId=40009',
    'sVersion=2',
    'key=A013F70DB97834C0A5492378BD76C53A',
  ].join('&');
  const signKey = createHash('md5').update(signatureSource).digest('hex');
  const params = new URLSearchParams({
    orderType: '0',
    uuid: '18affa452e4c8-057e2dc1cfbe0c-78505771-384000-18affa452e55',
    timeStamp: String(timestamp),
    'User-Agent': encodedUserAgent,
    index: String(index),
    channelId: '40009',
    sVersion: '2',
    signKey,
  });
  const upstream = await fetch(`https://piaofang.maoyan.com/dashboard-ajax/movie?${params}`, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://piaofang.maoyan.com/dashboard/movie',
      'User-Agent': userAgent,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Maoyan returned ${upstream.status}`);
  const data = await upstream.json() as {
    movieList?: {
      list?: Array<{
        movieInfo?: { movieId?: number; movieName?: string };
        sumBoxDesc?: string;
      }>;
      updateInfo?: { updateTimestamp?: number };
    };
  };
  const items = (data.movieList?.list ?? []).flatMap((entry) => {
    const id = entry.movieInfo?.movieId;
    const title = entry.movieInfo?.movieName;
    if (!id || !title) return [];
    const url = `https://www.maoyan.com/films/${id}`;
    const totalBoxOffice = entry.sumBoxDesc?.trim();
    const totalBoxOfficeWithUnit = totalBoxOffice && /^\d+(?:\.\d+)?$/.test(totalBoxOffice)
      ? `${totalBoxOffice}元`
      : totalBoxOffice;
    return [{
      id,
      title,
      url,
      mobileUrl: url,
      extra: totalBoxOfficeWithUnit ? { info: `${totalBoxOfficeWithUnit}总票房` } : undefined,
    }];
  }).slice(0, 30);
  if (!items.length) throw new Error('Empty Maoyan box office');
  return { updatedTime: data.movieList?.updateInfo?.updateTimestamp ?? Date.now(), items };
}

function mapCnBetaArticleUrl(url: string) {
  const id = url.match(/(\d+)\.htm(?:\?|$)/)?.[1];
  if (!id) return url;
  return `https://www.cnbeta.com.tw/articles/tech/${id}.htm`;
}

async function fetchCnBeta(source: string) {
  if (source === 'cnbeta-health') {
    const upstream = await fetch('https://www.cnbeta.com.tw/topics/697.htm', {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`cnBeta returned ${upstream.status}`);
    const html = await upstream.text();
    const seen = new Set<string>();
    const items = Array.from(html.matchAll(/<a[^>]+href=["']([^"']*\/articles\/[^"']+\.htm)["'][^>]*>([\s\S]*?)<\/a>/gi))
      .flatMap((match) => {
        const url = new URL(match[1], 'https://www.cnbeta.com.tw').href;
        const title = decodeHtml(match[2]);
        if (!title || title === '详细内容' || seen.has(url)) return [];
        seen.add(url);
        return [{
          id: url.match(/(\d+)\.htm(?:\?|$)/)?.[1] ?? url,
          title,
          url,
          mobileUrl: url,
        }];
      })
      .slice(0, 30);
    if (!items.length) throw new Error('Empty cnBeta health topic');
    return { updatedTime: Date.now(), items };
  }

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
    'weread-hot-search': 'hot_search',
    'weread-newbook': 'newbook',
    'weread-novel': 'general_novel_rising',
    'weread-all': 'all',
    'weread-masterpiece': 'newrating_publish',
    'weread-potential': 'newrating_potential_publish',
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
      bookInfo?: { bookId?: string; title?: string; author?: string; newRating?: number };
    }>;
  };
  const items = (data.books ?? []).flatMap((entry) => {
    const book = entry.bookInfo;
    if (!book?.bookId || !book.title) return [];
    return [{
      id: book.bookId,
      title: book.title,
      byline: book.author,
      url: `https://weread.qq.com/web/bookDetail/${getWereadId(book.bookId)}`,
      extra: Number.isFinite(book.newRating)
        ? { info: `推荐值 ${(book.newRating! / 10).toFixed(1)}%` }
        : undefined,
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
    const items = Array.from(html.matchAll(/<li\s+class=["']media clearfix["']>([\s\S]*?)<\/li>/gi)).flatMap((match) => {
      const block = match[1];
      const anchor = block.match(/<a\s+class=["']fleft["']\s+href=["'](https:\/\/book\.douban\.com\/subject\/(\d+)\/)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!anchor) return [];
      const score = block.match(/subject-rating[\s\S]*?<span\s+class=["']font-small fleft["']>\s*([\d.]+)\s*<\/span>/i)?.[1];
      return [{
        id: anchor[2],
        title: decodeHtml(anchor[3]),
        url: anchor[1],
        extra: score ? { info: `评分 ${score}` } : undefined,
      }];
    });
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

async function fetchYouku(listUrl = 'https://www.youku.com/channel/webtv/list') {
  const upstream = await fetch(listUrl, {
    headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok) throw new Error(`Youku returned ${upstream.status}`);
  const html = await upstream.text();
  const markerIndex = html.indexOf('window.__INITIAL_DATA__');
  const braceStart = html.indexOf('{', markerIndex);
  if (markerIndex === -1 || braceStart === -1) throw new Error('Youku __INITIAL_DATA__ not found');

  let depth = 0;
  let inString = false;
  let escaped = false;
  let braceEnd = -1;
  for (let index = braceStart; index < html.length; index += 1) {
    const char = html[index];
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
      if (depth === 0) {
        braceEnd = index;
        break;
      }
    }
  }
  if (braceEnd === -1) throw new Error('Youku __INITIAL_DATA__ is incomplete');

  type YoukuItem = { title?: string; videoLink?: string; link?: string };
  type YoukuComponent = { tag?: string; itemList?: YoukuItem[] };
  type YoukuModule = { components?: YoukuComponent[] };
  const data = JSON.parse(html.slice(braceStart, braceEnd + 1).replace(/\bundefined\b/g, 'null')) as {
    moduleList?: YoukuModule[];
  };
  const rankingModule = (data.moduleList ?? []).find((module) => (
    module.components?.some((component) => component.tag === 'WEB_RANKING')
  ));
  const defaultRanking = rankingModule?.components?.find((component) => component.tag === 'WEB_RANKING');
  const seen = new Set<string>();
  const items = (defaultRanking?.itemList ?? []).flatMap((item) => {
    const title = decodeHtml(item.title ?? '');
    const path = item.videoLink || item.link || '';
    const url = path.startsWith('//') ? `https:${path}` : path;
    if (!title || !/^https:\/\/v\.youku\.com\//.test(url) || seen.has(url)) return [];
    seen.add(url);
    return [{
      id: url.match(/id_([^.?/]+)/)?.[1] ?? url,
      title,
      url,
    }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchBilibiliPopularAll() {
  const upstream = await fetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1', {
    headers: { ...browserHeaders, Referer: 'https://www.bilibili.com/' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!upstream.ok) throw new Error(`Bilibili returned ${upstream.status}`);
  const data = await upstream.json() as {
    data?: {
      list?: Array<{
        bvid?: string;
        title?: string;
        owner?: { name?: string };
        stat?: { view?: number };
      }>;
    };
  };

  const items = (data.data?.list ?? []).flatMap((item) => {
    if (!item.bvid || !item.title) return [];
    const url = `https://www.bilibili.com/video/${item.bvid}`;
    return [{
      id: item.bvid,
      title: item.owner?.name ? `${item.title} · ${item.owner.name}` : item.title,
      url,
      mobileUrl: url,
      extra: item.stat?.view ? { info: String(item.stat.view) } : undefined,
    }];
  });

  return { updatedTime: Date.now(), items };
}

async function fetchMusic(source: string) {
  if (source === 'music-apple-cn') {
    const pageUrl = 'https://music.apple.com/cn/playlist/%E6%AF%8F%E5%91%A8%E7%83%AD%E9%97%A8-100-%E9%A6%96-%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86/pl.939cf56e73c44970b81fd9648f859223';
    const html = await fetchText(pageUrl, pageUrl, 'text/html,application/xhtml+xml');
    const payload = html.match(
      /<script[^>]+id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i,
    )?.[1];
    if (!payload) throw new Error('Apple Music chart data was not found');
    type AppleTrack = {
      title?: string;
      artistName?: string;
      contentDescriptor?: {
        identifiers?: { storeAdamID?: string };
        url?: string;
      };
    };
    const data = JSON.parse(payload) as {
      data?: Array<{
        data?: {
          sections?: Array<{ itemKind?: string; items?: AppleTrack[] }>;
        };
      }>;
    };
    const tracks = data.data?.[0]?.data?.sections
      ?.find((section) => section.itemKind === 'trackLockup')?.items ?? [];
    const items = tracks.flatMap((song) => {
      const id = song.contentDescriptor?.identifiers?.storeAdamID;
      const url = song.contentDescriptor?.url;
      if (!id || !song.title || !url) return [];
      return [{
        id,
        title: song.title,
        byline: song.artistName,
        url,
      }];
    }).slice(0, 30);
    if (!items.length) throw new Error('Apple Music chart was empty');
    return { updatedTime: Date.now(), items };
  }

  if (source.startsWith('music-netease-')) {
    const playlistId = '3778678';
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
      title: song.name,
      byline: (song.ar ?? []).map((artist) => artist.name).join('/'),
      url: `https://music.163.com/#/song?id=${song.id}`,
    }));
    return { updatedTime: Date.now(), items };
  }

  if (source.startsWith('music-qq-')) {
    const topId = '26';
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
        title: song.songname,
        byline: (song.singer ?? []).map((artist) => artist.name).join('/'),
        url: `https://y.qq.com/n/ryqq/songDetail/${song.songmid}`,
      }];
    });
    return { updatedTime: Date.now(), items };
  }

  if (source.startsWith('music-kugou-')) {
    const rankId = '8888';
    const upstream = await fetch(`https://www.kugou.com/yy/rank/home/1-${rankId}.html?from=rank`, {
      headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml', Referer: 'https://www.kugou.com/' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`Kugou returned ${upstream.status}`);
    const html = await upstream.text();
    const items = Array.from(html.matchAll(/<li[^>]+title=["']([^"']+)["'][^>]+data-index=["']\d+["'][\s\S]*?<a\s+href=["'](https:\/\/www\.kugou\.com\/mixsong\/([^"']+)\.html)["'][^>]+class=["']pc_temp_songname["']/gi))
      .map((match) => {
        const label = decodeHtml(match[1]);
        const separatorIndex = label.indexOf(' - ');
        const artist = separatorIndex > 0 ? label.slice(0, separatorIndex).trim() : '';
        const title = separatorIndex > 0 ? label.slice(separatorIndex + 3).trim() : label;
        return { id: match[3], title, byline: artist, url: match[2] };
      });
    return { updatedTime: Date.now(), items };
  }

  if (source === 'music-kuwo-hot') {
    const upstream = await fetch('https://kbangserver.kuwo.cn/ksong.s?from=pc&fmt=json&pn=0&rn=30&type=bang&data=content&id=16', {
      headers: { ...browserHeaders, Referer: 'https://www.kuwo.cn/rankList' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error(`Kuwo Music returned ${upstream.status}`);
    const data = await upstream.json() as {
      musiclist?: Array<{ id?: string; name?: string; artist?: string }>;
    };
    const items = (data.musiclist ?? []).flatMap((song) => {
      if (!song.id || !song.name) return [];
      return [{
        id: song.id,
        title: song.name,
        byline: song.artist,
        url: `https://www.kuwo.cn/play_detail/${song.id}`,
      }];
    });
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
      title: song.music_title,
      byline: song.singer,
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
  if (source === 'ai-bot-daily') return fetchAiBotDaily();
  if (source === 'aihot-hot') return fetchAihotHot();
  if (source.startsWith('ai-media-')) return fetchAiMediaLatest(source);
  if (source === 'infzm-hot') return fetchInfzmHot();
  if (source === 'dili360-hot') return fetchDili360Hot();
  if (source === 'xinhua-latest') return fetchXinhuaLatest();
  if (source === 'cctv-latest') return fetchCctvLatest();
  if (source === 'jiemian-flash') return fetchJiemianFlash();
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
  if (source === 'youku-tv') {
    return fetchYouku('https://www.youku.com/channel/webtv/list');
  }
  if (source === 'youku-movie') {
    return fetchYouku('https://www.youku.com/channel/webmovie/list');
  }
  if (source === 'bilibili-popular-all') return fetchBilibiliPopularAll();
  if (source === 'fanqie-top') return fetchFanqieTop();
  if (source === 'qidian-hotsales') return fetchQidianHotsales();
  if (source === 'hongguo-hot') return fetchHongguoHot();
  if (source === 'maoyan-box-office') return fetchMaoyanBoxOffice();
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
    if (hasOfficialFetcher(definition.source)) {
      data = await fetchOfficial(definition.source);
    } else {
      data = await fetchDirect(definition.upstreamId);
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
