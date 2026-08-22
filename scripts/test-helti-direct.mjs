const browserHeaders = {
  Accept: 'text/html,application/xhtml+xml,application/json,text/plain,*/*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
};

function decodeHtml(text) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function testCaixin() {
  const res = await fetch('https://www.caixin.com/', { headers: browserHeaders, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const seen = new Set();
  const items = Array.from(html.matchAll(/<a[^>]+href="(https:\/\/www\.caixin\.com\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map((m) => ({ id: m[1], title: decodeHtml(m[2]), url: m[1] }))
    .filter((item) => item.title.length > 6 && !seen.has(item.url) && seen.add(item.url));
  return items.slice(0, 5);
}

async function testEastmoney() {
  const res = await fetch('https://www.eastmoney.com/', { headers: { ...browserHeaders, Referer: 'https://www.eastmoney.com/' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const items = Array.from(html.matchAll(/<a[^>]+href=["'](https:\/\/finance\.eastmoney\.com\/a\/\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((m, i) => ({ id: i, title: decodeHtml(m[2]), url: m[1] }))
    .filter((item) => item.title);
  return [...new Map(items.map((item) => [item.url, item])).values()].slice(0, 5);
}

async function testEastmoneyStock() {
  const res = await fetch('https://emappdata.eastmoney.com/stockrank/getAllCurrentList', {
    method: 'POST',
    headers: { ...browserHeaders, 'Content-Type': 'application/json', Referer: 'https://guba.eastmoney.com/' },
    body: JSON.stringify({ appId: 'appId01', globalId: '786e4c21-70dc-435a-93bb-38', marketType: '', pageNo: 1, pageSize: 30 }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  return (data.data ?? []).slice(0, 5).map((item) => ({ id: item.sc, title: item.sc, url: `https://guba.eastmoney.com/rank/` }));
}

async function testJd() {
  const res = await fetch('https://www.jd.com/', { headers: { ...browserHeaders, Referer: 'https://www.jd.com/' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const rankLinkPattern = /\/\/www\.jd\.com\/(?:phb|jxinfo|zxnews)\/[A-Za-z0-9_/.-]+\.html/;
  const items = [];
  const seen = new Set();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].startsWith('//') ? `https:${match[1]}` : match[1];
    const title = decodeHtml(match[2]);
    if (!title || !rankLinkPattern.test(href) || seen.has(href)) continue;
    seen.add(href);
    items.push({ id: href, title, url: href });
    if (items.length >= 5) break;
  }
  return items;
}

async function testTaobao() {
  const res = await fetch('https://www.taobao.com/', { headers: { ...browserHeaders, Referer: 'https://www.taobao.com/' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const match = /window\.staticConfig\s*=/.exec(html);
  if (!match) throw new Error('no staticConfig');
  const braceStart = html.indexOf('{', match.index);
  let depth = 0; let inString = false; let escaped = false;
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
      if (depth === 0) {
        const config = JSON.parse(html.slice(braceStart, i + 1));
        const items = [];
        const walk = (value) => {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value)) return value.forEach(walk);
          const { itemId, shortTitle, clickUrl } = value;
          if (itemId && shortTitle && /(?:item\.taobao\.com|detail\.tmall\.com)\/item\.htm/.test(String(clickUrl))) {
            items.push({ id: itemId, title: shortTitle, url: clickUrl.startsWith('//') ? `https:${clickUrl}` : clickUrl });
          }
          Object.values(value).forEach(walk);
        };
        walk(config);
        return items.slice(0, 5);
      }
    }
  }
  throw new Error('parse failed');
}

async function testTonghuashun() {
  const res = await fetch('https://www.10jqka.com.cn/', { headers: browserHeaders, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const items = Array.from(html.matchAll(/<a[^>]+href=["'](\/\/news\.10jqka\.com\.cn\/[^"']+\.shtml|https:\/\/news\.10jqka\.com\.cn\/[^"']+\.shtml)["'][\s\S]*?<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi))
    .map((m, i) => {
      const url = m[1].startsWith('//') ? `https:${m[1]}` : m[1];
      return { id: i, title: decodeHtml(m[2]), url };
    })
    .filter((item) => item.title);
  return [...new Map(items.map((item) => [item.url, item])).values()].slice(0, 5);
}

async function testXinyu() {
  const res = await fetch('https://www.eet-china.com/mp', { headers: { ...browserHeaders, Referer: 'https://www.eet-china.com' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const items = Array.from(html.matchAll(/<a[^>]+href=["'](\/mp\/a\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((m, i) => ({ id: i, title: decodeHtml(m[2]), url: `https://www.eet-china.com${m[1]}` }))
    .filter((item) => item.title && item.title.length > 4);
  return [...new Map(items.map((item) => [item.url, item])).values()].slice(0, 5);
}

async function testYicai() {
  const res = await fetch('https://www.yicai.com/', { headers: { ...browserHeaders, Referer: 'https://www.yicai.com/' }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const items = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/gi))
    .map((m, i) => {
      const link = m[1].startsWith('http') ? m[1] : `https://www.yicai.com${m[1]}`;
      return { id: i, title: decodeHtml(m[2]), url: link };
    })
    .filter((item) => item.title && item.url.includes('yicai.com'));
  return [...new Map(items.map((item) => [item.url, item])).values()].slice(0, 5);
}

const tests = [
  ['caixin', testCaixin],
  ['eastmoney', testEastmoney],
  ['eastmoney-stock', testEastmoneyStock],
  ['jd', testJd],
  ['taobao', testTaobao],
  ['tonghuashun', testTonghuashun],
  ['xinyu', testXinyu],
  ['yicai', testYicai],
];

for (const [name, fn] of tests) {
  try {
    const items = await fn();
    console.log(`${name}: OK (${items.length})`, items[0]?.title ?? '');
  } catch (error) {
    console.log(`${name}: FAIL`, error.message);
  }
}
