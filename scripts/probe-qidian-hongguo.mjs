const mobileHeaders = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/json,*/*',
};

function extractJsonScript(html, id) {
  const re = new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`);
  const match = html.match(re);
  return match ? JSON.parse(match[1]) : null;
}

async function main() {
  const qidianHtml = await (await fetch('https://m.qidian.com/rank/hotsales', { headers: mobileHeaders })).text();
  const qidianData = extractJsonScript(qidianHtml, 'vite-plugin-ssr_pageContext');
  console.log('qidian keys', Object.keys(qidianData?.pageContext ?? {}));
  console.log('qidian pageData keys', Object.keys(qidianData?.pageContext?.pageData ?? {}));
  console.log('qidian sample', JSON.stringify(qidianData?.pageContext ?? {}).slice(0, 700));

  const rankHtml = await (await fetch('https://fanqienovel.com/page/rank', { headers: mobileHeaders })).text();
  const idx = rankHtml.indexOf('bookList');
  console.log('\nfanqie rank snippet', rankHtml.slice(idx, idx + 800));

  const stateMatch = rankHtml.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
  console.log('\ninitial state', !!stateMatch, stateMatch ? stateMatch[1].slice(0, 400) : 'none');

  const nextData = extractJsonScript(rankHtml, '__NEXT_DATA__');
  console.log('\nnext keys', nextData ? Object.keys(nextData) : null);

  for (const url of [
    'https://fanqienovel.com/api/rank/short_play/list/v1?rank_type=1&offset=0&limit=30',
    'https://fanqienovel.com/api/rank/short_play/hot/list/v1?offset=0&limit=30',
    'https://fanqienovel.com/api/author/rank/rank_list/v1/?rank_type=1',
  ]) {
    const res = await fetch(url, { headers: { ...mobileHeaders, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    console.log('\n', url, res.status, (await res.text()).slice(0, 400));
  }
}

main().catch(console.error);
