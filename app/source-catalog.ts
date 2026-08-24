import { OFFICIAL_SOURCE_IDS } from './official-source-ids';

export type SourceProvider = 'newsnow' | 'dailyhot' | 'helti' | 'direct';

export type PlatformDefinition = {
  name: string;
  brand: string;
  listName: string;
  short: string;
  logo: string;
  color: string;
  category: string;
  source: string;
  provider: SourceProvider;
  upstreamId: string;
  url: string;
};

export function formatPlatformName(brand: string, listName = '') {
  return listName ? `${brand} · ${listName}` : brand;
}

function source(
  brand: string,
  listName: string,
  short: string,
  color: string,
  category: string,
  provider: SourceProvider,
  upstreamId: string,
  url: string,
): PlatformDefinition {
  return {
    brand,
    listName,
    name: formatPlatformName(brand, listName),
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
  source('微博', '热搜', '微', '#ff4d4f', '社交', 'newsnow', 'weibo', 'https://weibo.com/hot/search'),
  source('知乎', '热榜', '知', '#1677ff', '社交', 'newsnow', 'zhihu', 'https://www.zhihu.com/hot'),
  source('百度贴吧', '热议榜', '贴', '#315efb', '社交', 'newsnow', 'tieba', 'https://tieba.baidu.com/hottopic/browse/topicList?res_type=1'),
  source('豆瓣', '小组', '组', '#00a65a', '社交', 'dailyhot', 'douban-group', 'https://www.douban.com/group/'),
  source('虎扑', '', '虎', '#d9232e', '社交', 'newsnow', 'hupu', 'https://bbs.hupu.com/'),

  source('今日头条', '头条热榜', '头', '#f04438', '新闻', 'newsnow', 'toutiao', 'https://www.toutiao.com/'),
  source('百度热搜', '', '百', '#315efb', '新闻', 'newsnow', 'baidu', 'https://top.baidu.com/board?tab=realtime'),
  source('澎湃新闻', '', '澎', '#52616b', '新闻', 'newsnow', 'thepaper', 'https://www.thepaper.cn/'),
  source('南方周末', '热门文章', '南', '#d71920', '新闻', 'direct', 'infzm-hot', 'https://www.infzm.com/'),
  source('凤凰网', '热点资讯', '凤', '#d9272e', '新闻', 'newsnow', 'ifeng', 'https://news.ifeng.com/'),
  source('新华网', '最新播报', '新', '#d71920', '新闻', 'direct', 'xinhua-latest', 'https://www.news.cn/'),
  source('央视新闻', '最新资讯', '央', '#005aaa', '新闻', 'direct', 'cctv-latest', 'https://news.cctv.com/news/index.shtml'),
  source('界面新闻', '24小时快报', '界', '#111111', '新闻', 'direct', 'jiemian-flash', 'https://www.jiemian.com/lists/4.html'),
  source('参考消息', '国际资讯', '参', '#c81920', '新闻', 'newsnow', 'cankaoxiaoxi', 'https://www.cankaoxiaoxi.com/'),
  source('知乎', '日报', '日', '#0084ff', '其他', 'direct', 'zhihu-daily', 'https://daily.zhihu.com/'),
  source('网易新闻', '', '易', '#d81e06', '新闻', 'dailyhot', 'netease-news', 'https://news.163.com/'),
  source('腾讯新闻', '', '讯', '#1677ff', '新闻', 'dailyhot', 'qq-news', 'https://news.qq.com/'),
  source('新浪新闻', '', '新', '#e6162d', '新闻', 'dailyhot', 'sina-news', 'https://news.sina.com.cn/'),

  source('IT之家', '', 'IT', '#d71920', '科技', 'newsnow', 'ithome', 'https://www.ithome.com/'),
  source('cnBeta', '最新资讯', '新', '#1f6fb2', '科技', 'direct', 'cnbeta-latest', 'https://m.cnbeta.com.tw/wap'),
  source('cnBeta', '人气资讯', '热', '#e65a35', '科技', 'direct', 'cnbeta-hot', 'https://m.cnbeta.com.tw/wap/hot.htm'),
  source('cnBeta', '争议资讯', '议', '#8b5cf6', '科技', 'direct', 'cnbeta-argue', 'https://m.cnbeta.com.tw/wap/argue.htm'),
  source('少数派', '', '少', '#d71920', '科技', 'newsnow', 'sspai', 'https://sspai.com/'),
  source('爱范儿', '', '范', '#ff4b4b', '科技', 'dailyhot', 'ifanr', 'https://www.ifanr.com/'),
  source('36氪', '人气榜', '36', '#0b66ff', '科技', 'dailyhot', '36kr', 'https://36kr.com/hot-list/catalog'),
  source('AI工具集', '每日 AI 资讯', 'AI', '#5b5bd6', '科技', 'direct', 'ai-bot-daily', 'https://ai-bot.cn/daily-ai-news/'),
  source('机器之心', '最新资讯', '机', '#111827', '科技', 'direct', 'ai-media-jiqizhixin', 'https://www.jiqizhixin.com/'),
  source('量子位', '最新资讯', '量', '#1f6feb', '科技', 'direct', 'ai-media-qbitai', 'https://www.qbitai.com/'),
  source('新智元', '最新资讯', '新', '#ed1c24', '科技', 'direct', 'ai-media-aiera', 'https://aiera.com.cn/'),

  source('稀土掘金', '', '掘', '#1e80ff', '开发者', 'newsnow', 'juejin', 'https://juejin.cn/hot/articles'),
  source('V2EX', '分享', 'V2', '#778087', '开发者', 'newsnow', 'v2ex-share', 'https://www.v2ex.com/?tab=share'),

  source('豆瓣', '新片榜', '豆', '#00a65a', '视频', 'newsnow', 'douban', 'https://movie.douban.com/chart'),
  source('抖音', '热点', '抖', '#17191c', '视频', 'newsnow', 'douyin', 'https://www.douyin.com/hot'),
  source('腾讯视频', '影视排行榜', '腾', '#ff6a00', '视频', 'newsnow', 'qqvideo-tv-hotsearch', 'https://v.qq.com/biu/ranks/?t=hotsearch&channel=0'),
  source('爱奇艺', '热播总榜', '爱', '#00be06', '视频', 'newsnow', 'iqiyi-hot-ranklist', 'https://www.iqiyi.com/ranks1/home'),
  source('红果短剧', '', '红', '#fa7705', '视频', 'direct', 'hongguo-hot', 'https://hongguoduanju.com/category?tab=1'),
  source('快手', '短视频热榜', '快', '#ff5000', '视频', 'dailyhot', 'kuaishou', 'https://www.kuaishou.com/brilliant'),
  source('猫眼', '今日票房', '猫', '#f03d37', '视频', 'direct', 'maoyan-box-office', 'https://piaofang.maoyan.com/dashboard/movie'),
  source('优酷', '电视剧 · 飙升榜', '酷', '#0073e6', '视频', 'direct', 'youku-tv', 'https://www.youku.com/channel/webtv/list'),
  source('优酷', '电影 · 热度榜', '酷', '#0073e6', '视频', 'direct', 'youku-movie', 'https://www.youku.com/channel/webmovie/list'),
  source('哔哩哔哩', '综合热门', 'B', '#00aeec', '视频', 'direct', 'bilibili-popular-all', 'https://www.bilibili.com/v/popular/all'),

  source('网易云音乐', '热歌榜', '云', '#e53935', '音乐', 'direct', 'music-netease-hot', 'https://music.163.com/#/discover/toplist?id=3778678'),
  source('QQ音乐', '热歌榜', 'Q', '#31c27c', '音乐', 'direct', 'music-qq-hot', 'https://y.qq.com/n/ryqq_v2/toplist/26'),
  source('Apple Music', '每周热门 100 首 · 中国大陆', 'A', '#fa2d48', '音乐', 'direct', 'music-apple-cn', 'https://music.apple.com/cn/playlist/%E6%AF%8F%E5%91%A8%E7%83%AD%E9%97%A8-100-%E9%A6%96-%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86/pl.939cf56e73c44970b81fd9648f859223'),
  source('酷狗', 'TOP500', '酷', '#169af3', '音乐', 'direct', 'music-kugou-top500', 'https://www.kugou.com/yy/rank/home/1-8888.html?from=rank'),
  source('哔哩哔哩', '热歌榜', 'B', '#00aeec', '音乐', 'direct', 'music-bilibili', 'https://music.bilibili.com/pc/rank'),
  source('酷我', '热歌榜', '酷', '#ff7a00', '音乐', 'direct', 'music-kuwo-hot', 'https://www.kuwo.cn/rankList'),

  source('财联社', '', '财', '#d71920', '财经', 'newsnow', 'cls-hot', 'https://www.cls.cn/'),
  source('华尔街见闻', '', '华', '#1665d8', '财经', 'newsnow', 'wallstreetcn-quick', 'https://wallstreetcn.com/live/global'),
  source('格隆汇', '', '格', '#2563eb', '财经', 'newsnow', 'gelonghui', 'https://www.gelonghui.com/'),
  source('财新网', '', '财', '#b61d22', '财经', 'direct', 'caixin', 'https://www.caixin.com/'),
  source('东方财富', '', '东', '#e02f2f', '财经', 'direct', 'eastmoney', 'https://finance.eastmoney.com/'),
  source('第一财经', '', '一', '#d71920', '财经', 'direct', 'yicai', 'https://www.yicai.com/'),

  source('微信读书', '飙升榜', '飙', '#22a45d', '阅读', 'direct', 'weread-rising', 'https://weread.qq.com/web/category/rising'),
  source('微信读书', '热搜榜', '热', '#22a45d', '阅读', 'direct', 'weread-hot-search', 'https://weread.qq.com/web/category/hot_search'),
  source('微信读书', '新书榜', '新', '#22a45d', '阅读', 'direct', 'weread-newbook', 'https://weread.qq.com/web/category/newbook'),
  source('微信读书', '小说榜', '小', '#22a45d', '阅读', 'direct', 'weread-novel', 'https://weread.qq.com/web/category/general_novel_rising'),
  source('微信读书', '总榜', '总', '#22a45d', '阅读', 'direct', 'weread-all', 'https://weread.qq.com/web/category/all'),
  source('微信读书', '神作榜', '神', '#22a45d', '阅读', 'direct', 'weread-masterpiece', 'https://weread.qq.com/web/category/newrating_publish'),
  source('微信读书', '神作潜力榜', '潜', '#22a45d', '阅读', 'direct', 'weread-potential', 'https://weread.qq.com/web/category/newrating_potential_publish'),
  source('豆瓣', '热门图书榜', '书', '#00a65a', '阅读', 'direct', 'douban-book-chart', 'https://book.douban.com/chart?subcat=all&icn=index-topchart-popular'),
  source('番茄小说', '巅峰榜', '番', '#ff5a1f', '阅读', 'direct', 'fanqie-top', 'https://fanqienovel.com/?enter_from=menu'),
  source('起点', '畅销榜', '起', '#e1251b', '阅读', 'direct', 'qidian-hotsales', 'https://www.qidian.com/rank/hotsales/'),

  source('历史上的今天', '', '史', '#8b5e3c', '其他', 'dailyhot', 'history', 'https://baike.baidu.com/calendar/'),
  source('中国国家地理', '热度榜', '地', '#c8161d', '其他', 'direct', 'dili360-hot', 'https://www.dili360.com/'),
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
