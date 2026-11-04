'use client';

// Lightweight bilingual (Simplified Chinese / English) layer for Hotlist Hub.
// Default language is Simplified Chinese; the choice is stored in localStorage
// and switched from the settings drawer (mobile) or the header (desktop).

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'hotlist-lang';

// Chinese source string -> English. Keys are the exact UI strings used in code.
const DICT: Record<string, string> = {
  '界面语言': 'Language',
  'Switch to English': 'Switch to English',
  '切换为中文': 'Switch to Chinese',
  '快捷设置与导航': 'Quick settings and navigation',
  '打开功能菜单': 'Open menu',
  '热榜分类': 'Ranking categories',
  '热榜汇': 'Hotlist Hub',
  '关闭菜单': 'Close menu',
  '列表控制': 'List controls',
  '卡片排序': 'Card sorting',
  '切换榜单': 'Switch ranking',
  '账户与同步': 'Account & sync',
  '外观主题': 'Theme',
  '刷新数据': 'Refresh',
  '更新中': 'Updating…',
  '正在更新当前页…': 'Updating current page…',
  '刷新当前页数据': 'Refresh current page',
  '切换浅色模式': 'Switch to light mode',
  '切换深色模式': 'Switch to dark mode',
  '退出排序模式': 'Exit sort mode',
  '开启排序模式': 'Enable sort mode',
  '设置保存在本机': 'Settings saved on this device',
  '正在同步设置…': 'Syncing settings…',
  '个性化设置已同步': 'Personalization synced',
  '同步失败，已保存在本机': 'Sync failed, saved on this device',
  '登录加载中': 'Loading sign-in',
  '登录中…': 'Signing in…',
  'Google 登录': 'Sign in with Google',
  '从云端恢复设置': 'Restore settings from cloud',
  '重置手动排序': 'Reset manual sorting',
  '退出': 'Sign out',
  '用户': 'User',
  '账户：{name}': 'Account: {name}',
  '语言 / Language': 'Language',
  '简体中文': '简体中文',
  'English': 'English',
  // page.tsx display strings
  '全部': 'All',
  '收藏': 'Favorites',
  '全部热榜': 'All rankings',
  '我的收藏': 'My favorites',
  '新闻': 'News',
  '科技': 'Tech',
  '视频': 'Video',
  '阅读': 'Reading',
  '社交': 'Social',
  '财经': 'Finance',
  '音乐': 'Music',
  '其他': 'Other',
  '热榜一屏尽览，此刻正在发生': 'All hot lists in one screen — what is happening right now',
  '聚焦搜索框': 'Focus search box',
  '搜索': 'Search',
  '搜索平台或热点内容': 'Search platforms or trending content',
  '搜索平台或热点内容…': 'Search platforms or trending content…',
  '清除搜索': 'Clear search',
  '拖动卡片或在拖动按钮上按 Alt＋方向键调整顺序，变更会同步到账号。':
    'Drag cards, or focus a drag handle and press Alt + arrow keys, to reorder. Changes sync to your account.',
  '卡片默认按加入收藏的顺序排列；可开启排序模式手动调整。':
    'Cards default to the order you added them; enable sort mode to reorder manually.',
  '数字和英文名称优先，其余卡片按拼音排序。':
    'Numbered and English names come first; the rest are sorted by pinyin.',
  '平台热榜卡片墙': 'Platform hot-list card wall',
  '使用上次数据 · {time}': 'Using cached data · {time}',
  '暂不可用': 'Unavailable',
  '等待加载': 'Waiting to load',
  '正在抓取…': 'Fetching…',
  '拖动排序': 'Drag to sort',
  '拖动排序；Alt＋↑/↓ 可用键盘移动': 'Drag to sort; use Alt + ↑/↓ to move with the keyboard',
  '刷新中': 'Refreshing',
  '刷新该榜单': 'Refresh this list',
  '收起宽度': 'Collapse width',
  '展开视图': 'Expand view',
  '展开视图（双倍列宽）': 'Expand view (double column width)',
  '收起列表': 'Collapse list',
  '展开内容': 'Expand content',
  '收起列表（显示 {n} 条）': 'Collapse list (showing {n})',
  '展开内容（共 {total} 条，最多 {max} 条）': 'Expand content ({total} items, up to {max})',
  '取消收藏': 'Remove from favorites',
  '收藏该榜单': 'Add to favorites',
  '该来源当前公共接口不可用': "This source's public API is currently unavailable",
  '正在加载全部平台数据…': 'Loading all platform data…',
  '正在获取最新热榜…': 'Fetching the latest hot lists…',
  ' · 连续失败 {n} 次': ' · {n} consecutive failures',
  ' · 显示 {shown}/{total} 条': ' · showing {shown}/{total}',
  '查看完整榜单': 'View full list',
  '还没有收藏的平台，切换到其他分类后点击卡片上的星标即可添加':
    'No favorite platforms yet. Switch to another category and click the star on a card to add it.',
  '没有找到匹配的热点或平台': 'No matching trending content or platforms',
  '平台分页': 'Platform pagination',
  '上一页': 'Previous',
  '下一页': 'Next',
  '第 {page} 页，共 {pages} 页': 'Page {page} of {pages}',
  '热榜汇 · 数据仅用于趋势浏览': 'Hotlist Hub · Data for trend browsing only',
  // ranking-navigation.tsx chrome
  '榜单导航': 'Ranking navigation',
  '外部榜单': 'External rankings',
  '浏览今日热榜全部分类': 'Browse all hot-list categories',
  '16 个分类入口': '16 category entries',
  '外部榜单导航': 'External ranking navigation',
  '关闭': 'Close',
  '今日分类': "Today's categories",
  '搜索分类…': 'Search categories…',
  '没有匹配的分类': 'No matching categories',
  '今日热榜全部分类': 'All hot-list categories',
  '确定将收藏卡片恢复为加入收藏的顺序吗？': 'Restore favorite cards to the order you added them?',
};

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (zh: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'zh') setLangState(saved);
    } catch {
      /* ignore */
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'zh')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (zh: string, vars?: Record<string, string | number>) => {
      let text = lang === 'en' ? DICT[zh] ?? zh : zh;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split('{' + name + '}').join(String(value));
        }
      }
      return text;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function LangSelect({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      className={className ?? 'hotlist-lang-select'}
      aria-label={t('语言 / Language')}
      title={t('语言 / Language')}
      value={lang}
      onChange={(event) => setLang(event.target.value as Lang)}
    >
      <option value="zh">简体中文</option>
      <option value="en">English</option>
    </select>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const toggle = () => setLang(lang === 'zh' ? 'en' : 'zh');

  return (
    <button
      type="button"
      className={className ?? 'header-icon-btn lang-toggle-btn'}
      onClick={toggle}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换为中文'}
      title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
    >
      <span className="lang-toggle-text">
        {lang === 'zh' ? 'EN' : '中'}
      </span>
    </button>
  );
}
