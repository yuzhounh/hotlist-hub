const html1 = await (await fetch('https://hongguoduanju.com/category?tab=1', { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } })).text();
const scripts = [...html1.matchAll(/src=\"([^\"]+\.js)\"/g)].map(m => m[1]);
console.log('scripts', scripts.slice(0, 10));

// search inline for api path
for (const pat of ['category', 'tab_type', 'sort_type', 'bookapi', 'series_id', 'tab=2']) {
  const i = html1.indexOf(pat);
  if (i >= 0) console.log(pat, html1.slice(Math.max(0,i-40), i+120));
}

const html2 = await (await fetch('https://hongguoduanju.com/category?tab=2', { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } })).text();
console.log('\ntab2 title', html2.match(/<title>([^<]+)/)?.[1]);
console.log('tab2 has 最热', html2.includes('最热'));
console.log('tab2 active tab markers', [...html2.matchAll(/tab[^\"]{0,30}/gi)].slice(0,10));

// try fanqie bookmall with tab_type for short drama
for (const url of [
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=8&cell_id=0&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=9&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=10&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=11&offset=0&limit=30&app_id=8662',
  'https://api5-normal-lf.fqnovel.com/reading/bookapi/bookmall/tab/v/?tab_type=12&offset=0&limit=30&app_id=8662',
]) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', Accept: 'application/json' } });
  const text = await res.text();
  if (!text.startsWith('{')) { console.log('fail', url); continue; }
  const j = JSON.parse(text);
  const cell = j.data?.tab_item?.[0]?.cell_data?.[0];
  const books = cell?.cell_data?.[0]?.book_data ?? cell?.book_data ?? [];
  console.log('\n', url.match(/tab_type=\d+/)[0], 'books', books.length, books[0]?.book_name ?? books[0]?.title ?? JSON.stringify(cell).slice(0,200));
}
