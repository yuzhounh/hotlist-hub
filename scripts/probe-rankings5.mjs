const hg = await (await fetch('https://hongguoduanju.com/category?tab=1', {
  headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
})).text();

// find series_id patterns
const ids = [...hg.matchAll(/series_id\\":(\d+)/g)].map(m => m[1]);
console.log('tab1 series ids count', ids.length, ids.slice(0, 5));

const titles = [...hg.matchAll(/series_name\\":\\"([^\\"]+)\\"/g)].map(m => m[1]);
console.log('titles', titles.slice(0, 5));

const detailLinks = [...hg.matchAll(/href=\\"(\/detail\/[^\\"]+)\\"/g)].map(m => m[1]);
console.log('detail links', detailLinks.slice(0, 5));

// try JSON embedded
const jsonChunks = [...hg.matchAll(/\{"series_id":\d+[\s\S]{0,500}?\}/g)].slice(0, 2);
console.log('json chunks', jsonChunks.map(m => m[0].slice(0, 200)));

const hg2 = await (await fetch('https://hongguoduanju.com/category?tab=2', {
  headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
})).text();
const ids2 = [...hg2.matchAll(/series_id\\":(\d+)/g)].map(m => m[1]);
console.log('tab2 series ids count', ids2.length, ids2.slice(0, 5));

// MGTV homepage scrape
const mgtv = await (await fetch('https://www.mgtv.com/', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' },
})).text();
console.log('mgtv len', mgtv.length);
for (const pat of ['rank', '排行榜', 'topList', 'hotList', 'videoId', 'clipId']) {
  console.log(pat, (mgtv.match(new RegExp(pat, 'gi')) || []).length);
}
const rankMatch = mgtv.match(/rank[\s\S]{0,2000}/i);
console.log('rank snippet', rankMatch?.[0]?.slice(0, 500));

// try mgtv channel API
for (const url of [
  'https://pcweb.api.mgtv.com/channel/home?allowedRC=1&platform=pcweb&channelId=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/list/top?allowedRC=1&platform=pcweb&channelId=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/list/hot?allowedRC=1&platform=pcweb&channelId=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/top?allowedRC=1&platform=pcweb&channelId=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/hot?allowedRC=1&platform=pcweb&channelId=0&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankId=1&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankId=2&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankId=3&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankId=4&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankId=5&pn=1&pc=30',
]) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.mgtv.com/' } });
  const text = await res.text();
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    if (j.code === 200) console.log('MGTV OK', url, JSON.stringify(j.data).slice(0, 300));
    else console.log('MGTV fail', url.split('?')[1].slice(0,60), j.code, j.msg);
  }
}

// Migu - try legacy path without TLS issue
for (const url of [
  'http://m.music.migu.cn/migu/remoting/ranking_list_tag?nid=2625440&pageSize=30&pageNo=0',
  'http://m.music.migu.cn/migu/remoting/ranking_list_tag?nid=23189399&pageSize=30&pageNo=0',
  'https://c.musicapp.migu.cn/v3.0/content/query_rank_content.do?rankId=2625440&pageNo=1&pageSize=30',
  'https://c.musicapp.migu.cn/v3.0/content/query_rank_content.do?rankId=23189399&pageNo=1&pageSize=30',
]) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.migu.cn/' }, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    console.log('migu', res.status, url.split('?')[0], text.slice(0, 300));
  } catch (e) { console.log('migu err', url, e.message); }
}
