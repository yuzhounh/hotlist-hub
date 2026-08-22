const mobileHeaders = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/json,*/*',
};

function extractJsonScript(html, id) {
  const re = new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`);
  const match = html.match(re);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

async function get(url, headers = mobileHeaders) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  console.log('\n', res.status, url);
  return { res, text };
}

// Qidian mobile SSR
const q = await get('https://m.qidian.com/rank/hotsales');
const qd = extractJsonScript(q.text, 'vite-plugin-ssr_pageContext');
console.log('qidian ctx keys', Object.keys(qd?.pageContext ?? {}));
const pd = qd?.pageContext?.pageData ?? qd?.pageContext?.data ?? qd?.pageContext;
console.log('pageData type', typeof pd, Array.isArray(pd) ? pd.length : Object.keys(pd ?? {}));
console.log('sample', JSON.stringify(pd).slice(0, 1200));

// Hongguo - search HTML for api urls and json
const hg = await get('https://hongguoduanju.com/category?tab=1');
const apiMatches = [...new Set(hg.text.match(/https?:\/\/[^"'`\s]+api[^"'`\s]*/gi) ?? [])].slice(0, 20);
console.log('\nhongguo api urls', apiMatches);
const stateMatch = hg.text.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
console.log('initial state', stateMatch ? stateMatch[1].slice(0, 500) : 'none');
const jsonLd = hg.text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
console.log('jsonld', jsonLd?.[1]?.slice(0, 300));

// try fanqie/hongguo APIs
for (const url of [
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/category/list/v/?category_id=0&tab_type=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/rank/list/v/?rank_type=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/rank/list/v/?rank_type=2&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/category/list/v/?category_id=0&tab_type=2&offset=0&limit=30&app_id=8662',
]) {
  const { text, res } = await get(url, { ...mobileHeaders, Accept: 'application/json' });
  if (res.ok) console.log('  body', text.slice(0, 400));
}

// Migu ranking
for (const url of [
  'http://m.10086.cn/migu/remoting/ranking_list_tag?nid=22296055&pageSize=30&pageNo=0',
  'http://m.10086.cn/migu/remoting/ranking_list_tag?nid=23189399&pageSize=30&pageNo=0',
  'https://music.migu.cn/v3/api/rank/list?rankId=23189399',
  'https://music.migu.cn/v3/api/rank/detail?rankId=23189399&pageNum=1&pageSize=30',
]) {
  const { text } = await get(url, { ...mobileHeaders, Referer: 'https://music.migu.cn/' });
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    console.log('migu', url, 'keys', Object.keys(j), 'sample', JSON.stringify(j).slice(0, 500));
  } else console.log('migu html', text.slice(0, 200));
}

// Mango TV
for (const url of [
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=2&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=3&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=4&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=5&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=6&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=7&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=8&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=9&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=10&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=11&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=12&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/channel/home?allowedRC=1&platform=pcweb&channelId=0',
  'https://pcweb.api.mgtv.com/rank/config?allowedRC=1&platform=pcweb',
]) {
  const { text } = await get(url, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0', Referer: 'https://www.mgtv.com/' });
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    if (j.code === 200) console.log('MGTV OK', url, JSON.stringify(j.data).slice(0, 400));
  }
}
