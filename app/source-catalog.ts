import { OFFICIAL_SOURCE_IDS } from './official-source-ids';

export type SourceProvider = 'newsnow' | 'dailyhot' | 'direct';

export type PlatformDefinition = {
  name: string;
  short: string;
  logo: string;
  color: string;
  category: string;
  source: string;
  provider: SourceProvider;
  upstreamId: string;
  url: string;
};

function source(
  name: string,
  short: string,
  color: string,
  category: string,
  provider: SourceProvider,
  upstreamId: string,
  url: string,
): PlatformDefinition {
  return {
    name,
    short,
    logo: `/logos/${provider}-${upstreamId.replace(/[^a-z0-9-]/gi, '-')}.png`,
    color,
    category,
    provider,
    upstreamId,
    source: `${provider}:${upstreamId}`,
    url,
  };
}

export const sourceCatalog: PlatformDefinition[] = [
  source('微博热搜', '微', '#ff4d4f', '社交', 'newsnow', 'weibo', 'https://weibo.com/hot/search'),
  source('知乎热榜', '知', '#1677ff', '社交', 'newsnow', 'zhihu', 'https://www.zhihu.com/hot'),
  source('百度贴吧', '贴', '#315efb', '社交', 'newsnow', 'tieba', 'https://tieba.baidu.com/hottopic/browse/topicList'),
  source('豆瓣新片榜', '豆', '#00a65a', '视频', 'newsnow', 'douban', 'https://movie.douban.com/chart'),
  source('虫部落', '虫', '#22a06b', '社交', 'newsnow', 'chongbuluo-hot', 'https://www.chongbuluo.com/forum.php?mod=guide&view=hot'),

  source('今日头条', '头', '#f04438', '新闻', 'newsnow', 'toutiao', 'https://www.toutiao.com/'),
  source('百度热搜', '百', '#315efb', '新闻', 'newsnow', 'baidu', 'https://top.baidu.com/board?tab=realtime'),
  source('澎湃新闻', '澎', '#52616b', '新闻', 'newsnow', 'thepaper', 'https://www.thepaper.cn/'),
  source('凤凰网', '凤', '#d9272e', '新闻', 'newsnow', 'ifeng', 'https://www.ifeng.com/'),
  source('参考消息', '参', '#c81920', '新闻', 'newsnow', 'cankaoxiaoxi', 'https://www.cankaoxiaoxi.com/'),
  source('靠谱新闻', '靠', '#4b5563', '新闻', 'newsnow', 'kaopu', 'https://kaopu.news/'),

  source('IT之家', 'IT', '#d71920', '科技', 'newsnow', 'ithome', 'https://www.ithome.com/'),
  source('cnBeta 最新资讯', '新', '#1f6fb2', '科技', 'direct', 'cnbeta-latest', 'https://m.cnbeta.com.tw/wap'),
  source('cnBeta 人气资讯', '热', '#e65a35', '科技', 'direct', 'cnbeta-hot', 'https://m.cnbeta.com.tw/wap/hot.htm'),
  source('cnBeta 争议资讯', '议', '#8b5cf6', '科技', 'direct', 'cnbeta-argue', 'https://m.cnbeta.com.tw/wap/argue.htm'),
  source('酷安', '酷', '#10a56a', '科技', 'newsnow', 'coolapk', 'https://www.coolapk.com/'),
  source('AIHOT', 'AI', '#2563eb', '科技', 'newsnow', 'aihot', 'https://aihot.virxact.com/all'),
  source('少数派', '少', '#d71920', '科技', 'newsnow', 'sspai', 'https://sspai.com/'),
  source('Solidot', 'S', '#128277', '科技', 'newsnow', 'solidot', 'https://www.solidot.org/'),
  source('远景论坛', '远', '#3676c8', '科技', 'newsnow', 'pcbeta-windows11', 'https://bbs.pcbeta.com/'),
  source('GitHub Trending', 'GH', '#24292f', '开发者', 'newsnow', 'github-trending-today', 'https://github.com/trending'),
  source('Hacker News', 'Y', '#ff6600', '开发者', 'newsnow', 'hackernews', 'https://news.ycombinator.com/'),
  source('Product Hunt', 'P', '#da552f', '开发者', 'newsnow', 'producthunt', 'https://www.producthunt.com/'),
  source('稀土掘金', '掘', '#1e80ff', '开发者', 'newsnow', 'juejin', 'https://juejin.cn/hot/articles'),
  source('牛客', '牛', '#00bc9b', '开发者', 'newsnow', 'nowcoder', 'https://www.nowcoder.com/'),
  source('V2EX 分享', 'V2', '#778087', '开发者', 'newsnow', 'v2ex-share', 'https://www.v2ex.com/?tab=share'),
  source('哔哩哔哩热搜', 'B', '#00aeec', '视频', 'newsnow', 'bilibili-hot-search', 'https://www.bilibili.com/v/popular/rank/all'),
  source('抖音热点', '抖', '#17191c', '视频', 'newsnow', 'douyin', 'https://www.douyin.com/hot'),
  source('腾讯视频', '腾', '#ff6a00', '视频', 'newsnow', 'qqvideo-tv-hotsearch', 'https://v.qq.com/biu/ranks/?t=hotsearch&channel=0'),
  source('爱奇艺', '爱', '#00be06', '视频', 'newsnow', 'iqiyi-hot-ranklist', 'https://www.iqiyi.com/ranks1/home'),
  source('优酷今日排行榜', '优', '#00a8e8', '视频', 'direct', 'youku-ranking', 'https://www.youku.com/channel/webtv/list'),
  source('红果最热', '红', '#fa7705', '视频', 'direct', 'hongguo-hot', 'https://hongguoduanju.com/category?tab=1'),
  source('豆瓣热门电影', '影', '#00a65a', '视频', 'direct', 'douban-hot-movie', 'https://movie.douban.com/explore?support_type=movie&is_all=false&category=%E7%83%AD%E9%97%A8&type=%E5%85%A8%E9%83%A8'),
  source('豆瓣热门剧集', '剧', '#00a65a', '视频', 'direct', 'douban-hot-tv', 'https://movie.douban.com/tv/?support_type=tv&is_all=false&category=tv&type=tv'),

  source('网易云音乐热歌榜', '云', '#e53935', '音乐', 'direct', 'music-netease-hot', 'https://music.163.com/#/discover/toplist?id=3778678'),
  source('网易云古典榜', '古', '#e53935', '音乐', 'direct', 'music-netease-classical', 'https://music.163.com/#/discover/toplist?id=71384707'),
  source('QQ 音乐流行指数榜', 'Q', '#31c27c', '音乐', 'direct', 'music-qq-pop', 'https://y.qq.com/n/ryqq/toplist/4'),
  source('QQ 音乐抖音热歌榜', '抖', '#31c27c', '音乐', 'direct', 'music-qq-douyin', 'https://y.qq.com/n/ryqq_v2/toplist/60'),
  source('酷狗 TOP500', '酷', '#169af3', '音乐', 'direct', 'music-kugou-top500', 'https://www.kugou.com/yy/rank/home/1-8888.html?from=rank'),
  source('酷狗短视频热歌榜', '短', '#169af3', '音乐', 'direct', 'music-kugou-shortvideo', 'https://www.kugou.com/yy/rank/home/1-52144.html?from=rank'),
  source('B站音乐榜', 'B', '#00aeec', '音乐', 'direct', 'music-bilibili', 'https://music.bilibili.com/pc/rank'),

  source('财联社', '财', '#d71920', '财经', 'newsnow', 'cls-hot', 'https://www.cls.cn/'),
  source('华尔街见闻', '华', '#1665d8', '财经', 'newsnow', 'wallstreetcn-quick', 'https://wallstreetcn.com/live/global'),
  source('雪球热股', '雪', '#1683d8', '财经', 'newsnow', 'xueqiu-hotstock', 'https://xueqiu.com/'),
  source('格隆汇', '格', '#2563eb', '财经', 'newsnow', 'gelonghui', 'https://www.gelonghui.com/'),
  source('金十数据', '金', '#275dcc', '财经', 'newsnow', 'jin10', 'https://www.jin10.com/'),
  source('法布财经', '法', '#10b981', '财经', 'newsnow', 'fastbull-express', 'https://www.fastbull.cn/'),
  source('MKTNews', 'MK', '#4f46e5', '财经', 'newsnow', 'mktnews-flash', 'https://mktnews.net/'),

  source('虎扑', '虎', '#d9232e', '体育', 'newsnow', 'hupu', 'https://bbs.hupu.com/'),
  source('懂球帝', '懂', '#179b52', '体育', 'newsnow', 'dongqiudi', 'https://www.dongqiudi.com/'),

  source('联合早报', '早', '#c9252b', '新闻', 'newsnow', 'zaobao', 'https://www.zaobao.com/'),
  source('俄罗斯卫星通讯社', '俄', '#f08a24', '新闻', 'newsnow', 'sputniknewscn', 'https://sputniknews.cn/'),
  source('Steam 在线', 'ST', '#1b2838', '游戏', 'newsnow', 'steam', 'https://store.steampowered.com/charts/'),
  source('Google News', 'GN', '#4285f4', '新闻', 'direct', 'foreign-google-news', 'https://news.google.com/'),
  source('BBC World', 'BBC', '#b80000', '新闻', 'direct', 'foreign-bbc-world', 'https://www.bbc.com/news/world'),
  source('The Guardian World', 'G', '#052962', '新闻', 'direct', 'foreign-guardian-world', 'https://www.theguardian.com/world'),
  source('NPR News', 'NPR', '#2c63ae', '新闻', 'direct', 'foreign-npr-news', 'https://www.npr.org/sections/news/'),
  source('Al Jazeera', 'AJ', '#d6a84b', '新闻', 'direct', 'foreign-aljazeera', 'https://www.aljazeera.com/'),
  source('Techmeme', 'T', '#2563eb', '科技', 'direct', 'foreign-techmeme', 'https://www.techmeme.com/'),
  source('The Verge', 'V', '#e6007a', '科技', 'direct', 'foreign-theverge', 'https://www.theverge.com/'),
  source('Ars Technica', 'Ars', '#ff4e00', '科技', 'direct', 'foreign-arstechnica', 'https://arstechnica.com/'),
  source('TechCrunch', 'TC', '#0a9e01', '科技', 'direct', 'foreign-techcrunch', 'https://techcrunch.com/'),
  source('Lobsters', 'L', '#ac130d', '开发者', 'direct', 'foreign-lobsters', 'https://lobste.rs/'),
  source('Stack Overflow 热门问题', 'SO', '#f48024', '开发者', 'direct', 'foreign-stackoverflow', 'https://stackoverflow.com/questions?tab=Hot'),
  source('CoinGecko Trending', 'CG', '#8dc63f', '财经', 'direct', 'foreign-coingecko', 'https://www.coingecko.com/en/highlights/trending-crypto'),

  source('知乎日报', '日', '#0084ff', '新闻', 'direct', 'zhihu-daily', 'https://daily.zhihu.com/'),
  source('36氪', '36', '#0b66ff', '科技', 'dailyhot', '36kr', 'https://36kr.com/hot-list/catalog'),
  source('51CTO', '51', '#e74817', '开发者', 'dailyhot', '51cto', 'https://www.51cto.com/'),
  source('AcFun', 'A', '#fd4c5d', '视频', 'dailyhot', 'acfun', 'https://www.acfun.cn/'),
  source('财新网', '财', '#b61d22', '财经', 'direct', 'caixin', 'https://www.caixin.com/'),
  source('数字尾巴', '数', '#20242a', '科技', 'dailyhot', 'dgtle', 'https://www.dgtle.com/'),
  source('豆瓣小组', '组', '#00a65a', '社交', 'dailyhot', 'douban-group', 'https://www.douban.com/group/'),
  source('东方财富', '东', '#e02f2f', '财经', 'direct', 'eastmoney', 'https://finance.eastmoney.com/'),
  source('东方财富热股', '股', '#d81e06', '财经', 'direct', 'eastmoney-stock', 'https://quote.eastmoney.com/center/gridlist.html'),
  source('极客公园', '极', '#111827', '科技', 'dailyhot', 'geekpark', 'https://www.geekpark.net/'),
  source('果壳', '果', '#28a9e0', '科技', 'dailyhot', 'guokr', 'https://www.guokr.com/'),
  source('HelloGitHub', 'HG', '#24292f', '开发者', 'dailyhot', 'hellogithub', 'https://hellogithub.com/'),
  source('历史上的今天', '史', '#8b5e3c', '生活', 'dailyhot', 'history', 'https://baike.baidu.com/calendar/'),
  source('崩坏 3', '崩', '#5b8def', '游戏', 'dailyhot', 'honkai', 'https://www.miyoushe.com/bh3/'),
  source('虎嗅', '嗅', '#f6b900', '科技', 'dailyhot', 'huxiu', 'https://www.huxiu.com/'),
  source('爱范儿', '范', '#ff4b4b', '科技', 'dailyhot', 'ifanr', 'https://www.ifanr.com/'),
  source('IT之家·喜加一', '喜', '#d71920', '游戏', 'dailyhot', 'ithome-xijiayi', 'https://www.ithome.com/'),
  source('简书', '简', '#ea6f5a', '生活', 'direct', 'jianshu', 'https://www.jianshu.com/'),
  source('京东热榜', '京', '#e1251b', '生活', 'direct', 'jd', 'https://www.jd.com/'),
  source('快手热榜', '快', '#ff4906', '视频', 'dailyhot', 'kuaishou', 'https://www.kuaishou.com/'),
  source('英雄联盟', 'LOL', '#b08a46', '游戏', 'dailyhot', 'lol', 'https://lol.qq.com/'),
  source('米游社', '米', '#3b82f6', '游戏', 'dailyhot', 'miyoushe', 'https://www.miyoushe.com/'),
  source('网易新闻', '易', '#d81e06', '新闻', 'dailyhot', 'netease-news', 'https://news.163.com/'),
  source('NGA', 'N', '#6b2f27', '游戏', 'dailyhot', 'ngabbs', 'https://bbs.nga.cn/'),
  source('NodeSeek', 'NS', '#475569', '开发者', 'dailyhot', 'nodeseek', 'https://www.nodeseek.com/'),
  source('纽约时报', 'NY', '#111111', '新闻', 'dailyhot', 'nytimes', 'https://www.nytimes.com/'),
  source('腾讯新闻', '讯', '#1677ff', '新闻', 'dailyhot', 'qq-news', 'https://news.qq.com/'),
  source('新浪新闻', '新', '#e6162d', '新闻', 'dailyhot', 'sina-news', 'https://news.sina.com.cn/'),
  source('新浪网', '浪', '#e6162d', '新闻', 'dailyhot', 'sina', 'https://www.sina.com.cn/'),
  source('什么值得买', '值', '#f04848', '生活', 'dailyhot', 'smzdm', 'https://www.smzdm.com/'),
  source('崩坏：星穹铁道', '星', '#6f78b8', '游戏', 'dailyhot', 'starrail', 'https://www.miyoushe.com/sr/'),
  source('淘宝热榜', '淘', '#ff5000', '生活', 'direct', 'taobao', 'https://www.taobao.com/'),
  source('同花顺财经', '同', '#d71920', '财经', 'direct', 'tonghuashun', 'https://www.10jqka.com.cn/'),
  source('中央气象台', '气', '#2d78c4', '生活', 'dailyhot', 'weatheralarm', 'https://www.nmc.cn/'),
  source('微信读书飙升榜', '读', '#22a45d', '阅读', 'direct', 'weread-rising', 'https://weread.qq.com/web/category/rising'),
  source('微信读书新书榜', '新', '#22a45d', '阅读', 'direct', 'weread-newbook', 'https://weread.qq.com/web/category/newbook'),
  source('微信读书总榜', '总', '#22a45d', '阅读', 'direct', 'weread-all', 'https://weread.qq.com/web/category/all'),
  source('微信读书神作榜', '神', '#22a45d', '阅读', 'direct', 'weread-masterpiece', 'https://weread.qq.com/web/category/newrating_publish'),
  source('豆瓣热门图书榜', '书', '#00a65a', '阅读', 'direct', 'douban-book-chart', 'https://book.douban.com/chart?subcat=all&icn=index-topchart-popular'),
  source('起点畅销榜', '起', '#e1251b', '阅读', 'direct', 'qidian-hotsales', 'https://www.qidian.com/rank/hotsales/'),
  source('第一财经', '一', '#d71920', '财经', 'direct', 'yicai', 'https://www.yicai.com/'),
  source('游研社', '游', '#202124', '游戏', 'dailyhot', 'yystv', 'https://www.yystv.cn/'),
];

export const categoryCounts = Object.fromEntries(
  Array.from(new Set(sourceCatalog.map((item) => item.category))).map((category) => [
    category,
    sourceCatalog.filter((item) => item.category === category).length,
  ]),
) as Record<string, number>;

export const categories = [
  '全部',
  ...Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a] || a.localeCompare(b, 'zh-CN')),
];

export function getSourceDefinition(sourceId: string) {
  return sourceCatalog.find((item) => item.source === sourceId);
}

export function platformFetchLabel(platform: Pick<PlatformDefinition, 'source' | 'provider'>) {
  if (OFFICIAL_SOURCE_IDS.has(platform.source) || platform.provider === 'direct') return '本站直连';
  if (platform.provider === 'newsnow') return 'NewsNow';
  return 'DailyHot';
}
