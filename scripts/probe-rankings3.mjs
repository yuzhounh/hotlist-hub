const mobileHeaders = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'application/json,text/html,*/*',
};

async function get(url, headers = mobileHeaders) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  console.log(res.status, url);
  return { res, text };
}

// Hongguo - parse HTML for RSC payload / scripts
const hg = (await get('https://hongguoduanju.com/category?tab=1')).text;
for (const pat of ['bookList', 'seriesList', 'videoList', 'playlet', 'short_play', 'category/list', 'rank/list', '__NEXT_DATA__', 'self.__next_f.push']) {
  console.log(pat, hg.includes(pat));
}
const chunks = [...hg.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].slice(0, 3);
console.log('next chunks', chunks.length, chunks[0]?.[1]?.slice(0, 200));

for (const url of [
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=8&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=2&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/category/feed/v/?category_id=0&tab_type=1&sort_type=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/category/feed/v/?category_id=0&tab_type=2&sort_type=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/category/feed/v/?category_id=0&tab_type=1&sort_type=2&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/category/feed/v/?category_id=0&tab_type=2&sort_type=2&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/short_play/category/list/v/?tab=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/short_play/category/list/v/?tab=2&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/short_play/home/list/v/?tab=1&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/short_play/home/list/v/?tab=2&offset=0&limit=30&app_id=8662',
]) {
  const { text, res } = await get(url);
  if (res.ok && text.startsWith('{')) {
    const j = JSON.parse(text);
    const data = j.data;
    const sample = Array.isArray(data) ? data[0] : (data?.book_list?.[0] ?? data?.books?.[0] ?? data?.list?.[0] ?? data);
    console.log('  code', j.code, 'sample keys', sample && typeof sample === 'object' ? Object.keys(sample) : typeof data, JSON.stringify(sample).slice(0, 300));
  } else console.log('  fail', text.slice(0, 120));
}

// Migu via m.music.migu.cn
for (const url of [
  'https://m.music.migu.cn/migu/remoting/ranking_list_tag?nid=22296055&pageSize=30&pageNo=0',
  'https://m.music.migu.cn/migu/remoting/ranking_list_tag?nid=23189399&pageSize=30&pageNo=0',
  'https://music.migu.cn/v3/api/rank/detail?rankId=23189399&pageNum=1&pageSize=30',
  'https://music.migu.cn/v3/api/rank/detail?rankId=2625440&pageNum=1&pageSize=30',
]) {
  const { text } = await get(url, { ...mobileHeaders, Referer: 'https://music.migu.cn/v5/' });
  console.log('migu body', text.slice(0, 500));
}

// MGTV
for (const url of [
  'https://pcweb.api.mgtv.com/rank/config?allowedRC=1&platform=pcweb',
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
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=13&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=14&pn=1&pc=30',
  'https://pcweb.api.mgtv.com/rank/list?allowedRC=1&platform=pcweb&channelId=0&rankType=15&pn=1&pc=30',
]) {
  const { text } = await get(url, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0', Referer: 'https://www.mgtv.com/' });
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    if (j.code === 200) console.log('MGTV OK rankType', url.match(/rankType=(\d+)/)?.[1], 'list', j.data?.list?.length, JSON.stringify(j.data?.list?.[0] ?? j.data).slice(0, 250));
    else if (url.includes('config')) console.log('config', JSON.stringify(j).slice(0, 500));
  }
}
