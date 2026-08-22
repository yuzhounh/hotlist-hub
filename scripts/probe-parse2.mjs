for (const tab of [1, 2]) {
  const html = await (await fetch(`https://hongguoduanju.com/category?tab=${tab}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
  })).text();
  console.log('tab', tab, 'series_id count', (html.match(/series_id=/g) || []).length);
  const idx = html.indexOf('series_id=');
  console.log(html.slice(idx, idx + 400));
}

// MGTV rank page
for (const url of [
  'https://www.mgtv.com/rank/',
  'https://www.mgtv.com/top/',
  'https://www.mgtv.com/b/66888/',
]) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' }, redirect: 'follow' });
  const html = await res.text();
  console.log('\n', res.status, res.url, 'len', html.length);
  for (const pat of ['videoId', 'clipId', 'title', 'rank', 'hot']) {
    console.log(' ', pat, (html.match(new RegExp(pat, 'gi')) || []).length);
  }
  const vid = html.match(/videoId["':=\s]+(\d+)/i);
  console.log(' sample video', vid?.[1]);
}

// Migu - scrape rank page
const miguHtml = await (await fetch('https://music.migu.cn/v5/#/topSongs', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' },
})).text();
console.log('\nmigu html len', miguHtml.length, miguHtml.slice(0, 300));

// try h5 nf migu
for (const url of [
  'https://h5.nf.migu.cn/app/v4/p/rank/detail.html?rankId=2625440',
  'https://h5.nf.migu.cn/app/v4/p/rank/detail.html?rankId=23189399',
  'https://h5.nf.migu.cn/app/v4/p/rank/detail.html?rankId=2',
]) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } });
  const html = await res.text();
  console.log('\nmigu h5', res.status, url, html.length);
  console.log(html.slice(0, 400));
}
