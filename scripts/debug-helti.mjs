const h = { Accept: 'text/html,*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' };
const caixin = await fetch('https://www.caixin.com/', { headers: h }).then((r) => r.text());
console.log('caixin', caixin.length, caixin.includes('news_list'));
console.log([...caixin.matchAll(/<a[^>]+href="(https:\/\/www\.caixin\.com\/[^"]+)"[^>]*>([^<]{8,})<\/a>/g)].slice(0, 3));

const xinyu = await fetch('https://www.eet-china.com/mp', { headers: { ...h, Referer: 'https://www.eet-china.com' } }).then((r) => r.text());
console.log('xinyu', xinyu.length, xinyu.includes('new-list'), xinyu.includes('new-title'));
console.log([...xinyu.matchAll(/href="(\/mp\/a\d+\.html)"[^>]*class="[^"]*new-title[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].slice(0, 3));
console.log([...xinyu.matchAll(/class="new-title"[\s\S]*?href="(\/mp\/a\d+\.html)"[\s\S]*?>([\s\S]*?)<\/a>/g)].slice(0, 3));
