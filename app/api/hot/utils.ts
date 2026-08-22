export type UnifiedItem = {
  id: string | number;
  title: string;
  url: string;
  mobileUrl?: string;
  extra?: { info?: string | false; diff?: number };
};

export type HotResult = {
  updatedTime?: number | string;
  items: UnifiedItem[];
};

export const browserHeaders = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
};

export function decodeHtml(text: string) {
  const namedEntities: Record<string, string> = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  };
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

function readXmlTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')) : '';
}

export function parseFeed(xml: string): UnifiedItem[] {
  const rssItems = Array.from(xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)).map((match, index) => {
    const block = match[1];
    const title = readXmlTag(block, 'title');
    const link = readXmlTag(block, 'link') || readXmlTag(block, 'guid');
    return { id: link || index, title, url: link };
  });
  if (rssItems.length) return rssItems.filter((item) => item.title && /^https?:\/\//i.test(item.url));

  return Array.from(xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)).map((match, index) => {
    const block = match[1];
    const title = readXmlTag(block, 'title');
    const link = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? '';
    return { id: link || index, title, url: decodeHtml(link) };
  }).filter((item) => item.title && /^https?:\/\//i.test(item.url));
}

export async function fetchText(url: string, referer?: string, accept?: string) {
  const response = await fetch(url, {
    headers: {
      ...browserHeaders,
      Accept: accept ?? 'application/json, text/plain, text/html, application/xml, */*',
      Referer: referer ?? url,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

export async function fetchJson<T>(url: string, referer?: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...browserHeaders,
      Referer: referer ?? url,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function dedupeItems(items: UnifiedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || String(item.id || '') || item.title.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scrapeAnchors(html: string, pattern: RegExp, mapLink: (href: string, title: string, index: number) => UnifiedItem | null) {
  const seen = new Set<string>();
  const items: UnifiedItem[] = [];
  for (const match of html.matchAll(pattern)) {
    const href = match[1].startsWith('//') ? `https:${match[1]}` : match[1];
    const title = decodeHtml(match[2]);
    if (!title || seen.has(href)) continue;
    const item = mapLink(href, title, items.length);
    if (!item?.url || !item.title) continue;
    seen.add(item.url);
    items.push(item);
  }
  return items;
}
