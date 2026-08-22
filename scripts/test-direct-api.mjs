const sources = ['caixin', 'eastmoney', 'eastmoney-stock', 'jd', 'taobao', 'tonghuashun', 'yicai'];
const base = process.argv[2] ?? 'http://localhost:3000';

for (const source of sources) {
  try {
    const res = await fetch(`${base}/api/hot?source=direct:${source}`, { signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    console.log(`${source}: ${res.status} items=${data.items?.length ?? 0} first=${data.items?.[0]?.title?.slice(0, 30) ?? data.message ?? 'none'}`);
  } catch (error) {
    console.log(`${source}: FAIL ${error.message}`);
  }
}
