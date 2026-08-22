function parseHongguo(html) {
  const items = [];
  const re = /<a[^>]+href="\/detail\?series_id=(\d+)"[^>]*>[\s\S]*?<img[^>]+alt="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) && items.length < 35) {
    items.push({
      id: m[1],
      title: m[2],
      url: `https://hongguoduanju.com/detail?series_id=${m[1]}`,
    });
  }
  return items;
}

for (const url of [
  'https://hongguoduanju.com/category?tab=1',
  'https://hongguoduanju.com/category?tab=2',
  'https://hongguoduanju.com/category?sort_type=2',
  'https://hongguoduanju.com/category?tab=1&sort_type=2',
  'https://hongguoduanju.com/category?tab=2&sort_type=1',
  'https://hongguoduanju.com/category?tab=2&sort_type=2',
]) {
  const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } })).text();
  const items = parseHongguo(html);
  console.log(url, 'items', items.length, items[0]?.title);
}

// fetch category_page js for api hints
const js = await (await fetch('https://lf-fe.fqnovelstatic.com/obj/novel-fanqie-fe/growth/incentive-h5-monorepo/apps/hongguo/static/js/async/category_page.14f8885f.js')).text();
const apis = [...new Set(js.match(/\/reading\/[^"'`]+/g) || [])];
console.log('\napis in category_page js', apis.slice(0, 30));
