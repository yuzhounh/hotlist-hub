const h = { Accept: 'text/html,*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/537.0 Safari/537.36' };
const html = await fetch('https://www.eet-china.com/mp', { headers: { ...h, Referer: 'https://www.eet-china.com' } }).then((r) => r.text());
const idx = html.indexOf('new-title');
console.log(html.slice(idx - 100, idx + 500));
