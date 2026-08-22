const h = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  Accept: 'application/json,text/html,*/*',
};

async function tryFetch(label, url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { ...h, ...opts.headers }, signal: AbortSignal.timeout(15000), ...opts });
    const text = await res.text();
    console.log('\n===', label, res.status, url);
    console.log(text.slice(0, 1000));
    return { text, res };
  } catch (e) {
    console.log('\n===', label, 'ERR', e.message);
    return { text: '', res: null };
  }
}

function extractJsonScript(html, id) {
  const re = new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`);
  const match = html.match(re);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

// Qidian probes
const qidianUrls = [
  'https://www.qidian.com/rank/hotsales/',
  'https://www.qidian.com/rank/readindex/',
  'https://m.qidian.com/api/rank/hotsales?pageIndex=1&pageSize=30',
  'https://www.qidian.com/ajax/book/category/booklist?categoryId=-1&subCategoryId=-1&pageNum=1&pageSize=30&order=4',
];
for (const url of qidianUrls) {
  const { text } = await tryFetch('qidian', url, { headers: { Referer: 'https://www.qidian.com/rank/' } });
  if (text.includes('vite-plugin-ssr_pageContext')) {
    const data = extractJsonScript(text, 'vite-plugin-ssr_pageContext');
    console.log('  pageContext keys', Object.keys(data?.pageContext ?? {}));
    console.log('  pageData sample', JSON.stringify(data?.pageContext?.pageData ?? data?.pageContext).slice(0, 600));
  }
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    console.log('  json keys', Object.keys(j));
    console.log('  json sample', JSON.stringify(j).slice(0, 600));
  }
}

// Hongguo
const hgHtml = (await tryFetch('hongguo', 'https://hongguoduanju.com/category?tab=1')).text;
const next = extractJsonScript(hgHtml, '__NEXT_DATA__');
console.log('\nhongguo next pageProps keys', Object.keys(next?.props?.pageProps ?? {}));
console.log('hongguo sample', JSON.stringify(next?.props?.pageProps ?? {}).slice(0, 800));

for (const url of [
  'https://hongguoduanju.com/category?tab=2',
  'https://api5-normal-lf.huoshan.com/reading/bookapi/rank/list/v/?rank_type=1&offset=0&limit=30',
]) {
  const { text } = await tryFetch('hongguo2', url);
  if (text.includes('__NEXT_DATA__')) {
    const n = extractJsonScript(text, '__NEXT_DATA__');
    console.log('  tab pageProps', JSON.stringify(n?.props?.pageProps ?? {}).slice(0, 500));
  }
}

// Migu
for (const url of [
  'https://music.migu.cn/v3/api/music/topSong?topId=2&page=1&pageSize=30',
  'https://u.musicapp.migu.cn/v3.0/h5/rank?columnId=2&pageIndex=1&pageSize=30',
  'https://c.musicapp.migu.cn/v3.0/h5/rank?columnId=2&pageIndex=1&pageSize=30',
  'https://j.musicapp.migu.cn/v3.0/h5/rank?columnId=2&pageIndex=1&pageSize=30',
]) {
  const { text } = await tryFetch('migu', url, { headers: { Referer: 'https://music.migu.cn/' } });
  if (text.startsWith('{')) {
    try {
      const j = JSON.parse(text);
      console.log('  keys', Object.keys(j), 'code', j.code, 'sample', JSON.stringify(j).slice(0, 400));
    } catch {}
  }
}

// Mango TV
for (const url of [
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=1&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=2&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=3&pn=1&pc=30',
]) {
  const { text } = await tryFetch('mgtv', url, { headers: { Referer: 'https://www.mgtv.com/' } });
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    console.log('  code', j.code, 'list len', j.data?.list?.length, 'sample', JSON.stringify(j.data?.list?.[0] ?? j).slice(0, 400));
  }
}
