<p align="center">
  <img src="public/logo.svg" width="112" alt="Hotlist Hub logo">
</p>

<h1 align="center">Hotlist Hub</h1>

<p align="center"><a href="README.md">简体中文</a> · English</p>

<p align="center"><strong>Real-time trending topics across news, social media, technology, and entertainment on one unified screen.</strong></p>

<p align="center">
  <a href="https://hotlist-hub.pages.dev/"><img src="https://img.shields.io/badge/Website-Cloudflare%20Pages-f38020?style=flat&amp;logo=cloudflare&amp;logoColor=white" alt="Website: Cloudflare Pages"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=flat" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat&amp;logo=react&amp;logoColor=white" alt="React: 19">
</p>

<p align="center">
  <a href="https://hotlist-hub.pages.dev/">Live Demo</a> · <a href="#quick-start">Quick Start</a> · <a href="LICENSE">License</a>
</p>

Hotlist Hub aggregates trending lists from Weibo, Zhihu, Baidu, Bilibili, Douyin, GitHub, 36Kr, V2EX, and more, updating in real time with high-speed caching.

## Features

- **Multi-Platform Trending**: Aggregated feeds categorized into General, Tech, Finance, Entertainment, and Communities.
- **Clean Aesthetic**: Modern responsive layout, dark theme toggle, 40px touch targets for mobile accessibility.
- **1-Click Bilingual Mode**: Instant toggle between Simplified Chinese and English via desktop topbar icon and mobile drawer menu (`[L]` keyboard shortcut).
- **Zero Cold Start**: Cloudflare Edge Workers / Pages Functions architecture with automatic RSS and API caching.

## Quick Start

```powershell
npm install
npm run dev
npm run build
```

## License

[MIT](LICENSE)
