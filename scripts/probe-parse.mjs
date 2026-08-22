function parseHongguo(html) {
  const items = [];
  const re = /<a[^>]+series_id=(\d+)"[^>]*>[\s\S]*?<img[^>]+alt="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) && items.length < 35) {
    items.push({ id: m[1], title: m[2], url: `https://hongguoduanju.com/series/${m[1]}` });
  }
  return items;
}

for (const tab of [1, 2]) {
  const html = await (await fetch(`https://hongguoduanju.com/category?tab=${tab}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
  })).text();
  const items = parseHongguo(html);
  console.log('tab', tab, items.length, items.slice(0, 3));
}

function extractJsonScript(html, id) {
  const re = new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`);
  const match = html.match(re);
  return match ? JSON.parse(match[1]) : null;
}

const qHtml = await (await fetch('https://m.qidian.com/rank/hotsales', {
  headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
})).text();
const data = extractJsonScript(qHtml, 'vite-plugin-ssr_pageContext');
console.log('qidian records', data.pageContext.pageProps.pageData.records.slice(0, 2));
