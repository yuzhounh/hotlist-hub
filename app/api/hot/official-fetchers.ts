import { createHash } from 'node:crypto';
import { OFFICIAL_SOURCE_IDS } from '../../official-source-ids';
import {
  decodeHtml,
  fetchJson,
  fetchText,
  parseFeed,
  type HotResult,
  type UnifiedItem,
} from './utils';

function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

async function fetchWeiboHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { realtime?: Array<{ note?: string; word?: string; word_scheme?: string; num?: number }> } }>(
    'https://weibo.com/ajax/side/hotSearch',
    'https://weibo.com/',
  );
  const items = (data.data?.realtime ?? []).flatMap((entry) => {
    const title = entry.note || entry.word;
    if (!title) return [];
    const q = entry.word_scheme || entry.word || title;
    return [{ id: q, title, url: `https://s.weibo.com/weibo?q=${encodeURIComponent(q)}`, extra: entry.num ? { info: String(entry.num) } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchZhihuHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ id?: string; detail_text?: string; target?: { title?: string; url?: string; id?: number } }> }>(
    'https://api.zhihu.com/topstory/hot-list?limit=50',
    'https://www.zhihu.com/hot',
  );
  const items = (data.data ?? []).flatMap((entry, index) => {
    const title = entry.target?.title?.trim();
    if (!title) return [];
    const questionId = entry.target?.url?.match(/questions\/(\d+)/)?.[1]
      ?? (entry.target?.id ? String(entry.target.id) : undefined) ?? entry.id ?? String(index);
    const url = `https://www.zhihu.com/question/${questionId}`;
    return [{ id: entry.id ?? questionId, title, url, mobileUrl: url, extra: entry.detail_text ? { info: entry.detail_text } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchTiebaHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { bang_topic?: { topic_list?: Array<{ topic_id?: number; topic_name?: string }> } } }>(
    'https://tieba.baidu.com/hottopic/browse/topicList',
    'https://tieba.baidu.com/',
  );
  const items = (data.data?.bang_topic?.topic_list ?? []).flatMap((entry) => entry.topic_name && entry.topic_id ? [{
    id: entry.topic_id,
    title: entry.topic_name,
    url: `https://tieba.baidu.com/hottopic/browse/hottopic?topic_id=${entry.topic_id}`,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchDoubanChart(): Promise<HotResult> {
  const data = await fetchJson<{ items?: Array<{ id: string; title: string; rating?: { count?: number } }> }>(
    'https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie?start=0&limit=30&category=%E7%83%AD%E9%97%A8&type=%E5%85%A8%E9%83%A8',
    'https://movie.douban.com/',
  );
  return {
    updatedTime: Date.now(),
    items: (data.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      url: `https://movie.douban.com/subject/${item.id}/`,
      extra: item.rating?.count ? { info: String(item.rating.count) } : undefined,
    })),
  };
}

async function fetchBaiduHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { cards?: Array<{ content?: unknown }> } }>(
    'https://top.baidu.com/api/board?platform=wise&tab=realtime',
    'https://top.baidu.com/',
  );
  type BaiduEntry = { word?: string; desc?: string; hotScore?: string | number; rawUrl?: string; url?: string };
  const flatten = (node: unknown): BaiduEntry[] => {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node === 'object' && node !== null && 'word' in node) return [node as BaiduEntry];
    if (typeof node === 'object' && node !== null && 'content' in node) {
      return flatten((node as { content?: unknown }).content);
    }
    return [];
  };
  const items = (data.data?.cards ?? []).flatMap((card) => flatten(card.content)).flatMap((entry) => {
    const title = entry.word || entry.desc;
    if (!title) return [];
    return [{ id: title, title, url: entry.rawUrl || entry.url || `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`, extra: entry.hotScore ? { info: String(entry.hotScore) } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchFeedHot(url: string, referer: string): Promise<HotResult> {
  const xml = await fetchText(url, referer, 'application/rss+xml, application/xml, text/xml, */*');
  return { updatedTime: Date.now(), items: parseFeed(xml) };
}

async function fetchHackerNews(): Promise<HotResult> {
  const ids = await fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json', 'https://news.ycombinator.com/');
  const items = (await Promise.all(ids.slice(0, 30).map(async (id) => {
    const item = await fetchJson<{ title?: string; url?: string; score?: number }>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 'https://news.ycombinator.com/');
    if (!item.title) return null;
    return { id, title: item.title, url: item.url || `https://news.ycombinator.com/item?id=${id}`, extra: item.score ? { info: String(item.score) } : undefined };
  }))).filter(Boolean) as UnifiedItem[];
  return { updatedTime: Date.now(), items };
}

async function fetchJuejinHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ content?: { content_id?: string; title?: string } }> }>(
    'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0',
    'https://juejin.cn/',
  );
  const items = (data.data ?? []).flatMap((entry) => entry.content?.title && entry.content.content_id ? [{
    id: entry.content.content_id,
    title: entry.content.title,
    url: `https://juejin.cn/post/${entry.content.content_id}`,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchBilibiliHotSearch(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { trending?: { list?: Array<{ keyword?: string; show_name?: string; heat?: number }> } } }>(
    'https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50',
    'https://www.bilibili.com/',
  );
  const items = (data.data?.trending?.list ?? []).flatMap((entry) => {
    const title = entry.show_name || entry.keyword;
    if (!title) return [];
    return [{ id: title, title, url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(entry.keyword || title)}`, extra: entry.heat ? { info: String(entry.heat) } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchWallstreetcnQuick(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { items?: Array<{ id?: number; title?: string; content_text?: string; uri?: string }> } }>(
    'https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30',
    'https://wallstreetcn.com/',
  );
  const items = (data.data?.items ?? []).flatMap((entry) => {
    const title = entry.title || entry.content_text?.slice(0, 80);
    if (!title) return [];
    return [{ id: entry.id ?? title, title: decodeHtml(title), url: entry.uri?.startsWith('http') ? entry.uri : `https://wallstreetcn.com/live/${entry.id}` }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchThepaperHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { hotNews?: Array<{ contId?: string; name?: string }> } }>(
    'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
    'https://www.thepaper.cn/',
  );
  const items = (data.data?.hotNews ?? []).flatMap((entry) => entry.name && entry.contId ? [{
    id: entry.contId,
    title: entry.name,
    url: `https://www.thepaper.cn/newsDetail_forward_${entry.contId}`,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchSspaiHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ id?: number; title?: string }> }>(
    'https://sspai.com/api/v1/article/tag/page/get?limit=30&offset=0&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=true',
    'https://sspai.com/',
  );
  const items = (data.data ?? []).flatMap((entry) => entry.id && entry.title ? [{ id: entry.id, title: entry.title, url: `https://sspai.com/post/${entry.id}` }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchV2exHot(): Promise<HotResult> {
  const data = await fetchJson<Array<{ id?: number; title?: string; url?: string; replies?: number }>>('https://www.v2ex.com/api/topics/hot.json', 'https://www.v2ex.com/');
  const items = data.flatMap((entry) => entry.title && entry.url ? [{ id: entry.id ?? entry.url, title: entry.title, url: entry.url, extra: entry.replies ? { info: `${entry.replies} 回复` } : undefined }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchIqiyiHot(): Promise<HotResult> {
  type IqiyiRankItem = {
    entity_id?: string | number;
    title?: string;
    display_name?: string;
    page_url?: string;
    rank_prefix?: string;
    desc?: string;
  };
  const data = await fetchJson<{ items?: Array<{ video?: Array<{ data?: IqiyiRankItem[] }> }> }>(
    'https://mesh.if.iqiyi.com/portal/lw/v7/channel/card/videoTab?channelName=recommend&play_record=false&img_size=_284_160&data_source=v7_rec_sec_hot_rank_list&tempId=85&data_id=-1&count=30&block_id=hot_ranklist&showOrder=1&device=14a4b5ba98e790dce6dc07482447cf48&from=webapp',
    'https://www.iqiyi.com/ranks1/home',
  );
  const items = (data.items?.[0]?.video?.[0]?.data ?? []).flatMap((entry) => {
    const title = entry.display_name || entry.title;
    if (!title || !entry.page_url) return [];
    const url = entry.page_url.startsWith('//') ? `https:${entry.page_url}` : entry.page_url;
    return [{
      id: entry.entity_id ?? url,
      title,
      url,
      extra: entry.rank_prefix || entry.desc
        ? { info: [entry.rank_prefix, entry.desc].filter(Boolean).join(' · ') }
        : undefined,
    }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchToutiaoHot(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ Title?: string; Url?: string; HotValue?: string | number }> }>(
    'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    'https://www.toutiao.com/',
  );
  const items = (data.data ?? []).flatMap((entry, index) => entry.Title ? [{
    id: entry.Title,
    title: entry.Title,
    url: entry.Url || `https://www.toutiao.com/trending/${index}/`,
    extra: entry.HotValue ? { info: String(entry.HotValue) } : undefined,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchAcfunHot(): Promise<HotResult> {
  const data = await fetchJson<{ rankList?: Array<{ contentId?: number; title?: string; likeCount?: number }> }>(
    'https://www.acfun.cn/rest/pc-direct/rank/channel?channelId=0&rankPeriod=DAY',
    'https://www.acfun.cn/',
  );
  const items = (data.rankList ?? []).flatMap((entry) => entry.contentId && entry.title ? [{
    id: entry.contentId,
    title: entry.title,
    url: `https://www.acfun.cn/v/ac${entry.contentId}`,
    extra: entry.likeCount ? { info: String(entry.likeCount) } : undefined,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchHelloGithub(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ item_id?: string; title?: string; author?: string }> }>(
    'https://abroad.hellogithub.com/v1/?sort_by=featured&page=1',
    'https://hellogithub.com/',
  );
  const items = (data.data ?? []).flatMap((entry) => entry.item_id && entry.title ? [{
    id: entry.item_id,
    title: entry.author ? `${entry.title} · ${entry.author}` : entry.title,
    url: `https://hellogithub.com/repository/${entry.item_id}`,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchSinaRoll(lid: string): Promise<HotResult> {
  const data = await fetchJson<{ result?: { data?: Array<{ title?: string; url?: string }> } }>(
    `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=${lid}&k=&num=30&page=1`,
    lid === '2509' ? 'https://news.sina.com.cn/' : 'https://www.sina.com.cn/',
  );
  const items = (data.result?.data ?? []).flatMap((entry) => entry.title && entry.url ? [{
    id: entry.url,
    title: entry.title,
    url: entry.url.startsWith('http') ? entry.url : `https:${entry.url}`,
  }] : []);
  return { updatedTime: Date.now(), items };
}

async function fetchHtmlAnchors(url: string, referer: string, pattern: RegExp, mapUrl: (href: string) => string, limit = 30): Promise<HotResult> {
  const html = await fetchText(url, referer, 'text/html,application/xhtml+xml');
  const seen = new Set<string>();
  const items: UnifiedItem[] = [];
  for (const match of html.matchAll(pattern)) {
    if (items.length >= limit) break;
    const href = mapUrl(match[1]);
    const title = decodeHtml(match[2]);
    if (!title || title.length < 4 || seen.has(href)) continue;
    seen.add(href);
    items.push({ id: href, title, url: href });
  }
  return { updatedTime: Date.now(), items };
}

async function fetchGithubTrending(): Promise<HotResult> {
  const html = await fetchText('https://github.com/trending?since=daily', 'https://github.com/', 'text/html');
  const items = Array.from(html.matchAll(/<h2[^>]*>\s*<a[^>]+href="(\/[^"]+)"[^>]*>\s*([\s\S]*?)<\/a>/gi)).slice(0, 30).flatMap((match) => {
    const title = decodeHtml(match[2]);
    return title ? [{ id: match[1], title, url: `https://github.com${match[1]}` }] : [];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchJin10Flash(): Promise<HotResult> {
  const text = await fetchText('https://www.jin10.com/flash_newest.js', 'https://www.jin10.com/', '*/*');
  const items = Array.from(text.matchAll(/"id":"(\d+)","time":"[^"]*","type":\d,"data":\{"content":"([^"]+)"/g)).slice(0, 30).map((match) => ({
    id: match[1],
    title: decodeHtml(match[2]),
    url: `https://www.jin10.com/detail/${match[1]}.html`,
  })).filter((item) => item.title);
  return { updatedTime: Date.now(), items };
}

// ===== 26 platforms migrated from third-party (NewsNow/DailyHot) to direct =====

// A. Pure JSON API fetchers

async function fetchDouyinHot(): Promise<HotResult> {
  // Official web hot search API, no signature required (per official-api-analysis.md).
  const data = await fetchJson<{ data?: { word_list?: Array<{ sentence_id?: string; word?: string; hot_value?: number }> } }>(
    'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383',
    'https://www.douyin.com/',
  );
  const items = (data.data?.word_list ?? []).flatMap((entry, index) => {
    const title = entry.word;
    if (!title) return [];
    const id = entry.sentence_id ?? `douyin-${index}`;
    return [{ id, title, url: `https://www.douyin.com/hot/${id}`, mobileUrl: `https://www.douyin.com/hot/${id}`, extra: entry.hot_value ? { info: String(entry.hot_value) } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchClsHot(): Promise<HotResult> {
  // Fixed sign value (per official-api-analysis.md / helti backend cls.source.ts).
  const data = await fetchJson<{ data?: Array<{ id?: number; title?: string; brief?: string; reading_num?: string | number }> }>(
    'https://www.cls.cn/v3/depth/list/1000?app=CailianpressWeb&id=1000&last_time=&os=web&rn=20&sv=8.4.6&sign=a7aebfb9c660af8779033e0aa8f03a58',
    'https://www.cls.cn/depth?id=1000',
  );
  const items = (data.data ?? []).flatMap((entry) => {
    if (!entry.id || !entry.title) return [];
    return [{ id: entry.id, title: entry.title, url: `https://www.cls.cn/detail/${entry.id}`, mobileUrl: `https://www.cls.cn/detail/${entry.id}`, extra: entry.reading_num ? { info: String(entry.reading_num) } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchDongqiudi(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { articles?: Array<{ id?: string | number; title?: string }> } }>(
    'https://www.dongqiudi.com/api/app/tabs/web/1.json',
    'https://www.dongqiudi.com/',
  );
  const items = (data.data?.articles ?? []).flatMap((entry) => {
    if (!entry.id || !entry.title) return [];
    return [{ id: entry.id, title: entry.title, url: `https://www.dongqiudi.com/articles/${entry.id}` }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetch36kr(): Promise<HotResult> {
  // Must use POST (GET returns 81-byte error per analysis).
  const data = await fetchJson<{ data?: { hotRankList?: Array<{ itemId?: string; templateMaterial?: { widgetTitle?: string; widgetImage?: string; authorName?: string }; publishTime?: number }> } }>(
    'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot',
    'https://www.36kr.com/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ partner_id: 'wap', param: { siteId: 1, platformId: 2 }, timestamp: Date.now() }),
    },
  );
  const items = (data.data?.hotRankList ?? []).flatMap((entry) => {
    const title = entry.templateMaterial?.widgetTitle;
    if (!title || !entry.itemId) return [];
    return [{ id: entry.itemId, title, url: `https://www.36kr.com/p/${entry.itemId}`, mobileUrl: `https://m.36kr.com/p/${entry.itemId}` }];
  });
  return { updatedTime: Date.now(), items };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

async function fetchHistoryToday(): Promise<HotResult> {
  const now = new Date();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const data = await fetchJson<Record<string, Record<string, Array<{ title?: string; year?: string; link?: string }>>>>(`https://baike.baidu.com/cms/home/eventsOnHistory/${month}.json?_=${Date.now()}`, 'https://baike.baidu.com/');
  const list = data[month]?.[`${month}${day}`] ?? [];
  const items = list.flatMap((entry, index) => {
    const title = entry.title ? decodeHtml(entry.title) : '';
    if (!title) return [];
    const url = entry.link || 'https://baike.baidu.com/calendar/';
    return [{ id: entry.year || index, title: `${entry.year ? entry.year + '年：' : ''}${title}`, url, mobileUrl: url }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchMiyousheNews(gids: number, gamePath: string): Promise<HotResult> {
  const data = await fetchJson<{ data?: { list?: Array<{ post?: { post_id?: string; subject?: string; content?: string; view_status?: number }; user?: { nickname?: string } }> } }>(
    `https://bbs-api-static.miyoushe.com/painter/wapi/getNewsList?client_type=4&gids=${gids}&last_id=&page_size=30&type=1`,
    'https://www.miyoushe.com/',
  );
  const items = (data.data?.list ?? []).flatMap((entry) => {
    const post = entry.post;
    if (!post?.post_id || !post.subject) return [];
    return [{ id: post.post_id, title: post.subject, url: `https://www.miyoushe.com/${gamePath}/article/${post.post_id}`, mobileUrl: `https://m.miyoushe.com/${gamePath}/#/article/${post.post_id}`, extra: entry.user?.nickname ? { info: entry.user.nickname } : post.view_status ? { info: String(post.view_status) } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchNeteaseNews(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { list?: Array<{ docid?: string; title?: string; source?: string }> } }>(
    'https://m.163.com/fe/api/hot/news/flow',
    'https://m.163.com/',
  );
  const items = (data.data?.list ?? []).flatMap((entry) => {
    if (!entry.docid || !entry.title) return [];
    return [{ id: entry.docid, title: entry.title, url: `https://www.163.com/dy/article/${entry.docid}.html`, mobileUrl: `https://m.163.com/dy/article/${entry.docid}.html`, extra: entry.source ? { info: entry.source } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchQqNews(): Promise<HotResult> {
  const data = await fetchJson<{ idlist?: Array<{ newslist?: Array<{ id?: string; title?: string; abstract?: string; source?: string; hotEvent?: { hotScore?: number | string } }> }> }>(
    'https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50',
    'https://news.qq.com/',
  );
  const list = data.idlist?.[0]?.newslist ?? [];
  // Slice(1) to drop the pinned headline entry (per helti reference).
  const items = list.slice(1).flatMap((entry) => {
    if (!entry.id || !entry.title) return [];
    return [{ id: entry.id, title: entry.title, url: `https://new.qq.com/rain/a/${entry.id}`, mobileUrl: `https://view.inews.qq.com/k/${entry.id}`, extra: entry.hotEvent?.hotScore ? { info: String(entry.hotEvent.hotScore) } : entry.source ? { info: entry.source } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchSmzdm(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ article_id?: string; title?: string; nickname?: string; collection_count?: string | number; jump_link?: string }> }>(
    'https://post.smzdm.com/rank/json_more/?unit=1',
    'https://www.smzdm.com/',
  );
  const items = (data.data ?? []).flatMap((entry) => {
    if (!entry.article_id || !entry.title) return [];
    const url = entry.jump_link || `https://www.smzdm.com/p/${entry.article_id}/`;
    return [{ id: entry.article_id, title: entry.title, url, mobileUrl: url, extra: entry.collection_count ? { info: String(entry.collection_count) } : entry.nickname ? { info: entry.nickname } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchWeatheralarm(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { page?: { list?: Array<{ alertid?: string; title?: string; issuetime?: string; url?: string; pic?: string }> } } }>(
    'http://www.nmc.cn/rest/findAlarm?pageNo=1&pageSize=20&signaltype=&signallevel=&province=',
    'http://www.nmc.cn/',
  );
  const items = (data.data?.page?.list ?? []).flatMap((entry) => {
    if (!entry.alertid || !entry.title) return [];
    const url = entry.url ? `http://www.nmc.cn${entry.url}` : 'http://www.nmc.cn/publish/alarm.html';
    return [{ id: entry.alertid, title: entry.title, url, mobileUrl: url, extra: entry.issuetime ? { info: entry.issuetime } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchYystv(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ id?: string | number; title?: string; author?: string; createtime?: number }> }>(
    'https://www.yystv.cn/home/get_home_docs_by_page',
    'https://www.yystv.cn/',
  );
  const items = (data.data ?? []).flatMap((entry) => {
    if (!entry.id || !entry.title) return [];
    return [{ id: entry.id, title: entry.title, url: `https://www.yystv.cn/p/${entry.id}`, mobileUrl: `https://www.yystv.cn/p/${entry.id}`, extra: entry.author ? { info: entry.author } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchLol(): Promise<HotResult> {
  const data = await fetchJson<{ data?: { result?: Array<{ iDocID?: string; sTitle?: string; sAuthor?: string; iTotalPlay?: string | number }> } }>(
    'https://apps.game.qq.com/cmc/zmMcnTargetContentList?r0=json&page=1&num=30&target=24&source=web_pc',
    'https://lol.qq.com/',
    { headers: { Accept: 'application/json' } },
  );
  const items = (data.data?.result ?? []).flatMap((entry) => {
    if (!entry.iDocID || !entry.sTitle) return [];
    const url = `https://lol.qq.com/news/detail.shtml?docid=${encodeURIComponent(entry.iDocID)}`;
    return [{ id: entry.iDocID, title: entry.sTitle, url, mobileUrl: url, extra: entry.iTotalPlay ? { info: String(entry.iTotalPlay) } : entry.sAuthor ? { info: entry.sAuthor } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchCankaoxiaoxi(): Promise<HotResult> {
  const data = await fetchJson<{ list?: Array<{ id?: string; title?: string; url?: string; publishTime?: string }> }>(
    'https://china.cankaoxiaoxi.com/json/channel/zhongguo/list.json',
    'https://www.cankaoxiaoxi.com/',
  );
  const items = (data.list ?? []).flatMap((entry) => {
    if (!entry.id || !entry.title) return [];
    const url = entry.url || `https://www.cankaoxiaoxi.com/${entry.id}.html`;
    return [{ id: entry.id, title: entry.title, url, mobileUrl: url, extra: entry.publishTime ? { info: entry.publishTime } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

// B. POST JSON API

async function fetchQqVideoHot(): Promise<HotResult> {
  const rankUrl = 'https://v.qq.com/biu/ranks/?t=hotsearch&channel=0';
  const html = await fetchText(rankUrl, rankUrl, 'text/html,application/xhtml+xml');
  const items: UnifiedItem[] = [];
  for (const match of html.matchAll(/<li class="item_list[^>]*>([\s\S]*?)<\/li>/gi)) {
    const block = match[1];
    const rank = block.match(/<span class="num">(\d+)<\/span>/i)?.[1];
    const anchor = block.match(/<a[^>]+href="([^"]+)"[^>]*class="name"[^>]*title="([^"]+)"/i);
    if (!rank || !anchor) continue;
    const title = decodeHtml(anchor[2]);
    let url = decodeHtml(anchor[1]);
    if (url.startsWith('//')) url = `https:${url}`;
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const heat = block.match(/bar_inner" style="width:([\d.]+)%/i)?.[1];
    const rising = block.includes('icon_rise_xs');
    items.push({
      id: `${rank}-${title}`,
      title,
      url,
      mobileUrl: url,
      extra: {
        info: heat ? `热度 ${Math.round(Number(heat))}%` : undefined,
        diff: rising ? 1 : undefined,
      },
    });
  }
  return { updatedTime: Date.now(), items: items.slice(0, 30) };
}

// C. RSS (NodeSeek already handled via fetchFeedHot inline in map)

// D. HTML regex-parsed fetchers

async function fetchGelonghui(): Promise<HotResult> {
  const html = await fetchText('https://www.gelonghui.com/', 'https://www.gelonghui.com/', 'text/html,application/xhtml+xml');
  const seen = new Set<string>();
  const items: UnifiedItem[] = [];
  for (const match of html.matchAll(/<li[^>]+class="[^"]*article-li[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)) {
    const block = match[1];
    const linkMatch = block.match(/<a[^>]+href="([^"]+)"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!linkMatch) continue;
    const href = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://www.gelonghui.com${linkMatch[1]}`;
    const title = decodeHtml(linkMatch[2]);
    if (!title || title.length < 4 || seen.has(href)) continue;
    seen.add(href);
    const id = href.match(/\/p\/(\d+)/)?.[1] ?? href;
    items.push({ id, title, url: href, mobileUrl: href });
    if (items.length >= 30) break;
  }
  return { updatedTime: Date.now(), items };
}

async function fetchHuxiu(): Promise<HotResult> {
  // Requires Referer or WAF returns a small challenge page.
  const html = await fetchText('https://www.huxiu.com/moment/', 'https://www.huxiu.com/', 'text/html,application/xhtml+xml');
  const seen = new Set<string>();
  const items: UnifiedItem[] = [];
  for (const match of html.matchAll(/<a[^>]+href="(\/article\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = `https://www.huxiu.com${match[1]}`;
    const title = decodeHtml(match[2]);
    if (!title || title.length < 4 || seen.has(href)) continue;
    seen.add(href);
    const id = match[1].match(/\/article\/(\d+)/)?.[1] ?? href;
    items.push({ id, title, url: href, mobileUrl: href });
    if (items.length >= 30) break;
  }
  return { updatedTime: Date.now(), items };
}

async function fetchIfeng(): Promise<HotResult> {
  const html = await fetchText('https://www.ifeng.com/', 'https://www.ifeng.com/', 'text/html,application/xhtml+xml');
  // Extract hotNews1 array from embedded `var allData = {...}`.
  const seen = new Set<string>();
  const items: UnifiedItem[] = [];
  // Match individual news entries with title+url in the hotNews blocks.
  for (const match of html.matchAll(/"title"\s*:\s*"([^"]+)"[\s\S]{0,300}?"url"\s*:\s*"(https?:\/\/[^"]+)"/g)) {
    const title = decodeHtml(match[1]);
    const url = match[2];
    if (!title || title.length < 4 || seen.has(url)) continue;
    seen.add(url);
    const id = url.match(/\/(\d+)\.shtml/)?.[1] ?? url;
    items.push({ id, title, url, mobileUrl: url });
    if (items.length >= 30) break;
  }
  return { updatedTime: Date.now(), items };
}

async function fetchKuaishou(): Promise<HotResult> {
  const html = await fetchText('https://www.kuaishou.com/?isHome=1', 'https://www.kuaishou.com/', 'text/html,application/xhtml+xml');
  // Extract window.__APOLLO_STATE__ JSON, then find visionHotRank items.
  const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*([\s\S]*?);\s*\(function\s*\(\s*\)/);
  if (!apolloMatch?.[1]) return { updatedTime: Date.now(), items: [] };
  let apollo: Record<string, unknown>;
  try {
    apollo = JSON.parse(apolloMatch[1]) as Record<string, unknown>;
  } catch {
    return { updatedTime: Date.now(), items: [] };
  }
  const client = apollo.defaultClient as Record<string, unknown> | undefined;
  if (!client || typeof client !== 'object') return { updatedTime: Date.now(), items: [] };
  const visionKey = Object.keys(client).find((k) => /visionHotRank|vision.*[Hh]ot.*[Rr]ank/.test(k));
  const vision = visionKey ? (client[visionKey] as { items?: Array<{ __ref?: string; id?: string }> } | undefined) : undefined;
  const rawItems = vision?.items ?? [];
  const items: UnifiedItem[] = [];
  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i] as Record<string, unknown> | undefined;
    const ref = (typeof it?.__ref === 'string' ? it.__ref : null) || (typeof it?.id === 'string' ? it.id : null);
    const node = ref ? (client[ref] as Record<string, unknown> | undefined) : undefined;
    const name = typeof node?.name === 'string' ? node.name : '';
    const poster = typeof node?.poster === 'string' ? node.poster : '';
    const vid = /clientCacheKey=([A-Za-z0-9]+)/.exec(poster)?.[1] ?? `apollo-${i}`;
    const link = `https://www.kuaishou.com/short-video/${vid}`;
    if (!name) continue;
    items.push({ id: vid, title: name, url: link, mobileUrl: link });
    if (items.length >= 30) break;
  }
  return { updatedTime: Date.now(), items };
}

async function fetchPcbeta(): Promise<HotResult> {
  // Discuz RSS; may hit a JS challenge wall depending on IP/UA.
  const xml = await fetchText('https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&auth=0', 'https://bbs.pcbeta.com/', 'application/rss+xml, application/xml, text/xml, */*');
  return { updatedTime: Date.now(), items: parseFeed(xml) };
}

// E. Signature-required fetchers

function genCoolapkAppToken(): string {
  // Ported from work/helti-daily-hot-api/src/token/coolapk.ts (pure MD5 + timestamp).
  const idSegments = [10, 6, 6, 6, 14];
  const deviceId = idSegments.map((len) => Math.random().toString(36).substring(2, len)).join('-');
  const now = Math.round(Date.now() / 1000);
  const hexNow = '0x' + now.toString(16);
  const md5Now = md5(now.toString());
  const s = `token://com.coolapk.market/c67ef5943784d09750dcfbb31020f0ab?${md5Now}$${deviceId}&com.coolapk.market`;
  const md5S = md5(Buffer.from(s).toString('base64'));
  return md5S + deviceId + hexNow;
}

async function fetchCoolapk(): Promise<HotResult> {
  const data = await fetchJson<{ data?: Array<{ id?: string | number; message?: string; username?: string; shareUrl?: string; tpic?: string }> }>(
    'https://api.coolapk.com/v6/page/dataList?url=/feed/statList?cacheExpires=300&statType=day&sortField=detailnum&title=今日热门&title=今日热门&subTitle=&page=1',
    'https://www.coolapk.com/',
    {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-App-Id': 'com.coolapk.market',
        'X-App-Token': genCoolapkAppToken(),
        'X-Sdk-Int': '29',
        'X-Sdk-Locale': 'zh-CN',
        'X-App-Version': '11.0',
        'X-Api-Version': '11',
        'X-App-Code': '2101202',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mi 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.5563.15 Mobile Safari/537.36',
      },
    },
  );
  const items = (data.data ?? []).flatMap((entry) => {
    const title = entry.message;
    const url = entry.shareUrl;
    if (!title || !url) return [];
    return [{ id: entry.id ?? url, title, url, mobileUrl: url, extra: entry.username ? { info: entry.username } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

function sign51cto(requestPath: string, payload: Record<string, unknown>, timestamp: number, token: string): string {
  // Ported from work/helti-daily-hot-api/src/token/tools.ts.
  payload.timestamp = timestamp;
  payload.token = token;
  const sortedParams = String(Object.keys(payload).sort());
  return md5(md5(requestPath) + md5(sortedParams + md5(token) + timestamp));
}

async function fetch51cto(): Promise<HotResult> {
  const tokenResponse = await fetchJson<{ data?: { data?: { token?: string } } }>('https://api-media.51cto.com/api/token-get', 'https://www.51cto.com/');
  const token = tokenResponse.data?.data?.token ?? '';
  const requestPath = 'index/index/recommend';
  const params: Record<string, unknown> = { page: 1, page_size: 50, limit_time: 0, name_en: '' };
  const timestamp = Date.now();
  const sign = sign51cto(requestPath, params, timestamp, token);
  const url = new URL(`https://api-media.51cto.com/${requestPath}`);
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', '50');
  url.searchParams.set('limit_time', '0');
  url.searchParams.set('name_en', '');
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('token', token);
  url.searchParams.set('sign', sign);
  const data = await fetchJson<{ data?: { data?: { list?: Array<{ source_id?: string; title?: string; cover?: string; abstract?: string; url?: string }> } } }>(url.toString(), 'https://www.51cto.com/');
  const items = (data.data?.data?.list ?? []).flatMap((entry) => {
    if (!entry.source_id || !entry.title) return [];
    const url = entry.url || `https://www.51cto.com/article/${entry.source_id}.html`;
    return [{ id: entry.source_id, title: entry.title, url, mobileUrl: url, extra: entry.abstract ? { info: entry.abstract } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

async function fetchKaopu(): Promise<HotResult> {
  // Azure Blob public JSON, no auth (per analysis; may not be reachable from all environments).
  const data = await fetchJson<Array<{ id?: string; title?: string; url?: string; publish_time?: string; source?: string }>>(
    'https://kaopustorage.blob.core.windows.net/news-prod/news_list_hans_0.json',
    'https://kaopu.news/',
  );
  const items = (Array.isArray(data) ? data : []).flatMap((entry) => {
    const title = entry.title;
    const url = entry.url || (entry.id ? `https://kaopu.news/${entry.id}` : '');
    if (!title || !url) return [];
    return [{ id: entry.id ?? url, title, url, mobileUrl: url, extra: entry.source || entry.publish_time ? { info: [entry.source, entry.publish_time].filter(Boolean).join(' · ') } : undefined }];
  });
  return { updatedTime: Date.now(), items };
}

export const officialFetchers: Record<string, () => Promise<HotResult>> = {
  'newsnow:weibo': fetchWeiboHot,
  'newsnow:zhihu': fetchZhihuHot,
  'newsnow:tieba': fetchTiebaHot,
  'newsnow:douban': fetchDoubanChart,
  'newsnow:baidu': fetchBaiduHot,
  'newsnow:ithome': () => fetchFeedHot('https://www.ithome.com/rss/', 'https://www.ithome.com/'),
  'newsnow:solidot': () => fetchFeedHot('https://www.solidot.org/index.rss', 'https://www.solidot.org/'),
  'newsnow:hackernews': fetchHackerNews,
  'newsnow:juejin': fetchJuejinHot,
  'newsnow:bilibili-hot-search': fetchBilibiliHotSearch,
  'newsnow:wallstreetcn-quick': fetchWallstreetcnQuick,
  'newsnow:thepaper': fetchThepaperHot,
  'newsnow:sspai': fetchSspaiHot,
  'newsnow:v2ex-share': fetchV2exHot,
  'newsnow:iqiyi-hot-ranklist': fetchIqiyiHot,
  'newsnow:toutiao': fetchToutiaoHot,
  'newsnow:jin10': fetchJin10Flash,
  'newsnow:github-trending-today': fetchGithubTrending,
  'newsnow:producthunt': () => fetchFeedHot('https://www.producthunt.com/feed', 'https://www.producthunt.com/'),
  'newsnow:sputniknewscn': () => fetchFeedHot('https://sputniknews.cn/export/rss2/archive/index.xml', 'https://sputniknews.cn/'),
  'newsnow:zaobao': () => fetchHtmlAnchors('https://www.zaobao.com.sg/realtime/china', 'https://www.zaobao.com/', /href="(\/realtime\/china\/story[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => `https://www.zaobao.com.sg${href}`),
  'newsnow:hupu': () => fetchHtmlAnchors('https://bbs.hupu.com/all-gambia', 'https://bbs.hupu.com/', /href="(\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => `https://bbs.hupu.com${href}`),
  'newsnow:nowcoder': () => fetchHtmlAnchors('https://www.nowcoder.com/', 'https://www.nowcoder.com/', /href="(\/discuss\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => `https://www.nowcoder.com${href}`),
  'newsnow:steam': () => fetchHtmlAnchors('https://store.steampowered.com/stats/stats/?l=schinese', 'https://store.steampowered.com/', /href="(https:\/\/store\.steampowered\.com\/app\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => href),
  'newsnow:chongbuluo-hot': () => fetchHtmlAnchors('https://www.chongbuluo.com/forum.php?mod=guide&view=hot', 'https://www.chongbuluo.com/', /href="(forum\.php\?mod=viewthread[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => `https://www.chongbuluo.com/${href}`),
  'newsnow:aihot': () => fetchHtmlAnchors('https://aihot.virxact.com/all', 'https://aihot.virxact.com/', /href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*>([\s\S]*?)<\/a>/gi, (href) => href),
  'dailyhot:acfun': fetchAcfunHot,
  'dailyhot:dgtle': () => fetchHtmlAnchors('https://www.dgtle.com/', 'https://www.dgtle.com/', /href="(https:\/\/www\.dgtle\.com\/article-[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => href),
  'dailyhot:douban-group': () => fetchHtmlAnchors('https://www.douban.com/group/explore', 'https://www.douban.com/', /href="(https:\/\/www\.douban\.com\/group\/topic\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => href),
  'dailyhot:geekpark': () => fetchFeedHot('https://www.geekpark.net/rss', 'https://www.geekpark.net/'),
  'dailyhot:guokr': () => fetchHtmlAnchors('https://www.guokr.com/', 'https://www.guokr.com/', /href="(https:\/\/www\.guokr\.com\/article\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (href) => href),
  'dailyhot:hellogithub': fetchHelloGithub,
  'dailyhot:ifanr': () => fetchFeedHot('https://www.ifanr.com/feed', 'https://www.ifanr.com/'),
  'dailyhot:ithome-xijiayi': () => fetchHtmlAnchors('https://www.ithome.com/tag/xijiayi/', 'https://www.ithome.com/', /href="(https:\/\/www\.ithome\.com\/[^"]+)"[^>]*class="title"[^>]*>([\s\S]*?)<\/a>/gi, (href) => href),
  'dailyhot:ngabbs': () => fetchHtmlAnchors('https://ngabbs.com/', 'https://bbs.nga.cn/', /href="\/read\.php\?tid=(\d+)"[^>]*>([\s\S]*?)<\/a>/gi, (tid) => `https://ngabbs.com/read.php?tid=${tid}`),
  'dailyhot:nytimes': () => fetchFeedHot('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', 'https://www.nytimes.com/'),
  'dailyhot:sina-news': () => fetchSinaRoll('2509'),
  'dailyhot:sina': () => fetchSinaRoll('2510'),
  // ===== 26 platforms migrated from third-party (NewsNow/DailyHot) to direct =====
  'newsnow:douyin': fetchDouyinHot,
  'newsnow:cls-hot': fetchClsHot,
  'newsnow:dongqiudi': fetchDongqiudi,
  'newsnow:cankaoxiaoxi': fetchCankaoxiaoxi,
  'newsnow:ifeng': fetchIfeng,
  'newsnow:kaopu': fetchKaopu,
  'newsnow:coolapk': fetchCoolapk,
  'newsnow:pcbeta-windows11': fetchPcbeta,
  'newsnow:qqvideo-tv-hotsearch': fetchQqVideoHot,
  'newsnow:gelonghui': fetchGelonghui,
  'dailyhot:36kr': fetch36kr,
  'dailyhot:51cto': fetch51cto,
  'dailyhot:history': fetchHistoryToday,
  'dailyhot:honkai': () => fetchMiyousheNews(1, 'bh3'),
  'dailyhot:huxiu': fetchHuxiu,
  'dailyhot:kuaishou': fetchKuaishou,
  'dailyhot:lol': fetchLol,
  'dailyhot:miyoushe': () => fetchMiyousheNews(2, 'ys'),
  'dailyhot:netease-news': fetchNeteaseNews,
  'dailyhot:nodeseek': () => fetchFeedHot('https://rss.nodeseek.com/', 'https://www.nodeseek.com/'),
  'dailyhot:qq-news': fetchQqNews,
  'dailyhot:smzdm': fetchSmzdm,
  'dailyhot:starrail': () => fetchMiyousheNews(6, 'sr'),
  'dailyhot:weatheralarm': fetchWeatheralarm,
  'dailyhot:yystv': fetchYystv,
};

export function hasOfficialFetcher(sourceId: string) {
  return OFFICIAL_SOURCE_IDS.has(sourceId) && Object.hasOwn(officialFetchers, sourceId);
}

export async function fetchOfficial(sourceId: string) {
  const fetcher = officialFetchers[sourceId];
  if (!fetcher) throw new Error(`No official fetcher for ${sourceId}`);
  return fetcher();
}
