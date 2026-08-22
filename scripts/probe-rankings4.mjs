const pcHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  Referer: 'https://www.mgtv.com/',
};

async function j(url, headers = pcHeaders) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  return JSON.parse(text);
}

for (let rankType = 0; rankType <= 20; rankType++) {
  const data = await j(`https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=${rankType}&pn=1&pc=5`);
  console.log('rankType', rankType, 'code', data.code, 'msg', data.msg, 'len', data.data?.list?.length, data.data?.list?.[0]?.name ?? data.data?.list?.[0]?.title);
}

// try other params
for (const q of [
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=1&rankType=1&pn=1&pc=5',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=5&_support=10000000',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&cId=0&rankType=1&pn=1&pc=5',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=5&version=5.5.35',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=5&uuid=ffffffff-ffff-ffff-ffff-ffffffffffff',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=5&ticket=',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=5&abroad=0',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=1&pn=1&pc=5&src=mgtv&did=ffffffffffffffffffffffffffffffff',
]) {
  const data = await j(q);
  console.log('alt', q.split('?')[1].slice(0,80), 'code', data.code, 'len', data.data?.list?.length);
}

// hongguo html patterns
const hg = await (await fetch('https://hongguoduanju.com/category?tab=1', { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } })).text();
console.log('hg length', hg.length);
for (const pat of ['book_id', 'series_id', 'video_id', 'playlet', 'book_name', 'title', 'href="/detail', 'hongguoduanju.com/detail']) {
  console.log(pat, (hg.match(new RegExp(pat, 'g')) || []).length);
}
console.log('detail links', hg.match(/href=\"(\/[^\"]+)\"/g)?.slice(0, 10));

// migu openapi attempts
const miguUrls = [
  'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/queryRankContent?rankId=2625440&pageNo=1&pageSize=30',
  'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/queryRankContent?rankId=23189399&pageNo=1&pageSize=30',
  'https://jadeite.migu.cn/jadeite-rank/queryRankContent?rankId=2625440&pageNo=1&pageSize=30',
  'https://jadeite.migu.cn/jadeite-rank/queryRankContent?rankId=23189399&pageNo=1&pageSize=30',
];
for (const url of miguUrls) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', channel: '0146921', Referer: 'https://music.migu.cn/' }, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  console.log('migu', res.status, url, text.slice(0, 400));
}
