<p align="center">
  <img src="public/logo.svg" width="88" height="88" alt="热榜汇 Logo">
</p>

<h1 align="center">热榜汇</h1>

<p align="center">热榜一屏尽览，此刻正在发生。</p>

<p align="center">
  <a href="https://hotlist-hub.vercel.app">在线访问</a>
</p>

## 项目简介

热榜汇是一个聚合新闻、社交、科技、开发者、视频、音乐、财经、体育等平台热门内容的卡片墙。它提供实时刷新、分类筛选、搜索、收藏、卡片排序、宽卡展示与明暗主题等功能，方便快速浏览当下热点并直达原文。

## 本地运行

需要 Node.js 22.13.0 或更高版本。

```bash
npm install
npm run dev
```

Firebase 登录为可选功能。需要启用时，请复制 `.env.example` 中的变量并填写本地 `.env.local`。

登录后，收藏、收藏页手动排序、卡片宽度、展开状态、主题和排序模式会同步到 Firestore 的 `userPreferences/{uid}` 文档。首次启用时需在对应 Firebase 项目创建 Firestore 数据库，并部署仓库中的访问规则：

```bash
firebase deploy --only firestore:rules
```

## 构建

```bash
npm run lint
npx next build
```

## 致谢与参考项目

热榜汇的设计、数据接入与实现调研受益于以下项目和网站，在此向所有作者和贡献者表示感谢。

1. **[imsyy/DailyHotApi](https://github.com/imsyy/DailyHotApi)**  
   今日热榜 API，一个聚合热门数据的 API 接口，支持 RSS 模式及 Vercel 部署。<br>
   配套前端：[imsyy/DailyHot](https://github.com/imsyy/DailyHot)<br>
   在线页面：[今日热榜](https://hot.imsyy.top/#/)

2. **[liubaicai/DailyHot](https://github.com/liubaicai/DailyHot)**  
   适合 AI 订阅的新闻聚合站。其 [DailyHot API](https://daily-hot-for-ai.vercel.app/) 聚合 50+ 平台热榜数据，支持 JSON / RSS 输出，便于 AI Agent 集成。

3. **[ourongxing/newsnow](https://github.com/ourongxing/newsnow)**  
   Elegant reading of real-time and hottest news。<br>
   在线页面：[NewsNow｜最热](https://newsnow.busiyi.world/c/hottest)

4. **[HelTi/daily-hot-api](https://github.com/HelTi/daily-hot-api)**  
   基于 NestJS 的每日热点聚合 API 服务，支持多平台热榜、手动部署、PM2、Docker、数据存储、历史热点查询、RSS 订阅及 AI 热点分析报告。<br>
   在线页面：[每日热点](https://ttkit.cn/daily-hot)

5. **[chenyiyao/TrendRadar](https://github.com/chenyiyao/TrendRadar)**  
   AI 驱动的舆情与趋势监控工具，聚合多平台热点和 RSS，支持关键词筛选、AI 翻译与分析、MCP，以及微信、飞书、钉钉、Telegram、邮件、ntfy、Bark、Slack 等推送渠道。

6. **[scc749/HotSearch](https://github.com/scc749/HotSearch)**  
   基于 Go 实现的多新闻平台热搜 API，实时抓取各大新闻网站的热搜内容，并提供统一的数据接口。

7. **[tophubs/TopList](https://github.com/tophubs/TopList)**  
   使用 Go 编写的今日热榜聚合项目，通过多协程异步抓取热门头条。<br>
   在线页面：[mo.fish](https://mo.fish)

8. **[huqi-pr/trending-in-one](https://github.com/huqi-pr/trending-in-one)**  
   归档今日头条、知乎与微博热搜，自 2020-11-29 起每小时抓取并按天保存。

9. **justjavac 热榜归档项目**  
   - [justjavac/zhihu-trending-top-search](https://github.com/justjavac/zhihu-trending-top-search)：知乎热搜榜，自 2020-11-24 起记录。
   - [justjavac/weibo-trending-hot-search](https://github.com/justjavac/weibo-trending-hot-search)：微博热搜榜，自 2020-11-24 起记录。
   - [justjavac/zhihu-trending-hot-questions](https://github.com/justjavac/zhihu-trending-hot-questions)：知乎热门话题，自 2020-11-24 起记录。

   以上三个项目均采用每小时抓取、按天归档的方式保存历史榜单：

10. **[tmwgsicp/ForgeRSS](https://github.com/tmwgsicp/ForgeRSS)**  
    将任意网站转换为 RSS 订阅源，支持多引擎抓取与反爬处理，并覆盖抖音、快手、小红书、B 站、知乎、小宇宙、知识星球等平台。

11. **[ShellMonster/DailyHotApi-Go](https://github.com/ShellMonster/DailyHotApi-Go)**  
    基于 `imsyy/DailyHotApi` 的 Go 语言高性能重构版本，为 60+ 新闻、社交与科技热榜提供统一 API。

12. **[今日热榜官网](https://tophub.today/)**

## 说明

本站仅用于趋势浏览。内容与商标归各来源平台及原作者所有，请遵守相应网站的服务条款与使用规范。
