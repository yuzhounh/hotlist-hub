'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories, categoryCounts, platformFetchLabel, sourceCatalog, type PlatformDefinition } from './source-catalog';
import { HeaderActions } from './components/header-actions';
import { useAuth } from './components/auth-provider';

type HotItem = { title: string; url?: string; heat?: string; rising?: boolean };
type Platform = PlatformDefinition & {
  updated: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  items: HotItem[];
};

const INITIALIZED_KEY = 'rebanghui-initialized';
const CACHE_KEY = 'rebanghui-platform-cache';
const FAVORITES_KEY = 'rebanghui-favorites';
const CARD_PREFS_KEY = 'rebanghui-card-prefs';
const SORT_MODE_KEY = 'rebanghui-sort-mode';
const FAVORITES_CATEGORY = '收藏';

type CardPrefsData = {
  wide: string[];
  expanded: string[];
  clicks: Record<string, number>;
  order: Record<string, string[]>;
};

const EMPTY_CARD_PREFS: CardPrefsData = {
  wide: [],
  expanded: [],
  clicks: {},
  order: {},
};

function readCardPrefs(): CardPrefsData {
  try {
    const raw = localStorage.getItem(CARD_PREFS_KEY);
    if (!raw) return { ...EMPTY_CARD_PREFS };
    const parsed = JSON.parse(raw) as Partial<CardPrefsData>;
    const valid = new Set(sourceCatalog.map((platform) => platform.source));
    const wide = Array.isArray(parsed.wide) ? parsed.wide.filter((source) => valid.has(source)) : [];
    const expanded = Array.isArray(parsed.expanded) ? parsed.expanded.filter((source) => valid.has(source)) : [];
    const order = parsed.order && typeof parsed.order === 'object'
      ? Object.fromEntries(
        Object.entries(parsed.order).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.filter((source) => valid.has(source)) : [],
        ]),
      )
      : {};
    const clicks = parsed.clicks && typeof parsed.clicks === 'object'
      ? Object.fromEntries(Object.entries(parsed.clicks).filter(([source]) => valid.has(source)))
      : {};
    return { wide, expanded, clicks, order };
  } catch {
    return { ...EMPTY_CARD_PREFS };
  }
}

function writeCardPrefs(data: CardPrefsData) {
  localStorage.setItem(CARD_PREFS_KEY, JSON.stringify(data));
}

function readFavoriteSources(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as string[];
    if (!Array.isArray(list)) return new Set();
    const valid = new Set(sourceCatalog.map((platform) => platform.source));
    return new Set(list.filter((source) => valid.has(source)));
  } catch {
    return new Set();
  }
}

function writeFavoriteSources(sources: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...sources]));
}

type PlatformCacheEntry = Pick<Platform, 'source' | 'updated' | 'status' | 'items'>;

function readPlatformCache(): PlatformCacheEntry[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlatformCacheEntry[];
  } catch {
    return [];
  }
}

function mergeCacheIntoPlatforms(cached: PlatformCacheEntry[]): Platform[] {
  if (!cached.length) return platforms;
  const map = new Map(cached.map((entry) => [entry.source, entry]));
  return platforms.map((platform) => {
    const hit = map.get(platform.source);
    if (!hit || hit.status === 'idle' || hit.status === 'loading') return platform;
    return { ...platform, updated: hit.updated, status: hit.status, items: hit.items };
  });
}

function writePlatformCache(list: Platform[]) {
  const payload = list
    .filter((platform) => platform.status === 'success' || platform.status === 'error')
    .map(({ source, updated, status, items }) => ({ source, updated, status, items }));
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

type SourceResponse = {
  updatedTime?: number | string;
  items?: Array<{
    id: string | number;
    title: string;
    url: string;
    mobileUrl?: string;
    extra?: { info?: string | false; diff?: number };
  }>;
};

const platforms: Platform[] = sourceCatalog.map((platform) => ({
  ...platform,
  updated: '等待更新',
  status: 'idle',
  items: [],
}));

const DEFAULT_ITEM_LIMIT = 10;
const EXPANDED_ITEM_LIMIT = 30;

function CardWideIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {collapsed ? (
        <>
          <rect x="1.5" y="4.5" width="4.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.35" />
          <rect x="10" y="4.5" width="4.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.35" />
          <path d="M6.5 8h3M7.75 6.5 9 8l-1.25 1.5M8.25 6.5 7 8l1.25 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <rect x="3" y="4.5" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.35" />
          <path d="M7 8h2M8 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function CardMoreIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 5.5h8M4 8h8M4 10.5h5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d={collapsed ? 'M11.5 10.5v3.5M10 12.25h3' : 'M10 13.5h3.5'} stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function CardRefreshIcon() {
  return <span className="card-refresh-icon" aria-hidden="true">↻</span>;
}

function CardDragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="4.5" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="4.5" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="11.5" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="11.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function CardFavoriteIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.6l1.45 2.94a.8.8 0 00.6.44l3.24.47-2.34 2.28a.8.8 0 00-.23.71l.55 3.23L8 11.77l-2.9 1.52.55-3.23a.8.8 0 00-.23-.71L3.08 6.45l3.24-.47a.8.8 0 00.6-.44L8 2.6z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function sortSourcesByClicks(
  sources: string[],
  clicks: Record<string, number>,
) {
  const nameBySource = new Map(sourceCatalog.map((platform) => [platform.source, platform.name]));
  return [...sources].sort((a, b) => {
    const clickDiff = (clicks[b] ?? 0) - (clicks[a] ?? 0);
    if (clickDiff !== 0) return clickDiff;
    return comparePlatformName(nameBySource.get(a) ?? a, nameBySource.get(b) ?? b);
  });
}

function getCategorySources(category: string, favoriteSources: Set<string>) {
  if (category === FAVORITES_CATEGORY) return [...favoriteSources];
  if (category === '全部') return sourceCatalog.map((platform) => platform.source);
  return sourceCatalog.filter((platform) => platform.category === category).map((platform) => platform.source);
}

function filterPlatforms(
  list: Platform[],
  category: string,
  query: string,
  favoriteSources: Set<string>,
  clicks: Record<string, number>,
  categoryOrder: string[],
) {
  const keyword = query.trim().toLowerCase();
  const filtered = list
    .filter((platform) => {
      if (category === FAVORITES_CATEGORY) return favoriteSources.has(platform.source);
      if (category === '全部') return true;
      return platform.category === category;
    })
    .map((platform) => ({
      ...platform,
      items: keyword
        ? platform.items.filter((item) => `${platform.name} ${item.title}`.toLowerCase().includes(keyword))
        : platform.items,
    }))
    .filter((platform) => !keyword || platform.items.length > 0);

  const sourceSet = new Set(filtered.map((platform) => platform.source));
  const manualOrder = categoryOrder.filter((source) => sourceSet.has(source));
  const manualIndex = new Map(manualOrder.map((source, index) => [source, index]));
  const unorderedSources = filtered
    .filter((platform) => !manualIndex.has(platform.source))
    .sort((a, b) => {
      const clickDiff = (clicks[b.source] ?? 0) - (clicks[a.source] ?? 0);
      if (clickDiff !== 0) return clickDiff;
      return comparePlatformName(a.name, b.name);
    })
    .map((platform) => platform.source);
  const sortIndex = new Map<string, number>([
    ...manualOrder.map((source, index) => [source, index] as const),
    ...unorderedSources.map((source, index) => [source, manualOrder.length + index] as const),
  ]);

  return filtered.sort((a, b) => {
    const orderDiff = (sortIndex.get(a.source) ?? Number.MAX_SAFE_INTEGER) - (sortIndex.get(b.source) ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;
    const clickDiff = (clicks[b.source] ?? 0) - (clicks[a.source] ?? 0);
    if (clickDiff !== 0) return clickDiff;
    return comparePlatformName(a.name, b.name);
  });
}

function reorderCategorySources(sources: string[], dragged: string, target: string) {
  if (dragged === target) return sources;
  const next = sources.filter((source) => source !== dragged);
  const targetIndex = next.indexOf(target);
  if (targetIndex === -1) return sources;
  next.splice(targetIndex, 0, dragged);
  return next;
}

function formatUpdated(value?: number | string) {
  if (!value) return '刚刚更新';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '刚刚更新';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return '刚刚更新';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  return `${Math.floor(minutes / 1440)} 天前`;
}

function startsWithChinese(name: string) {
  return /^[\u4e00-\u9fff]/.test(name.trim());
}

function comparePlatformName(a: string, b: string) {
  const aChinese = startsWithChinese(a);
  const bChinese = startsWithChinese(b);
  if (aChinese !== bChinese) return aChinese ? -1 : 1;
  return a.localeCompare(b, aChinese ? 'zh-CN' : 'en', { sensitivity: 'base', numeric: true });
}

async function fetchPlatform(platform: Platform): Promise<Platform> {
  try {
    const response = await fetch(`/api/hot?source=${encodeURIComponent(platform.source)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Source unavailable');
    const payload = await response.json() as SourceResponse;
    const items = (payload.items ?? [])
      .filter((item) => item.title && item.url)
      .slice(0, 30)
      .map((item) => ({
        title: item.title,
        url: item.mobileUrl || item.url,
        heat: typeof item.extra?.info === 'string' ? item.extra.info : undefined,
        rising: typeof item.extra?.diff === 'number' && item.extra.diff > 0,
      }));
    if (!items.length) throw new Error('Empty source');
    return { ...platform, items, updated: formatUpdated(payload.updatedTime), status: 'success' };
  } catch {
    return { ...platform, items: [], updated: '获取失败', status: 'error' };
  }
}

export default function Home() {
  const { user, ready: authReady } = useAuth();
  const [category, setCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [livePlatforms, setLivePlatforms] = useState(platforms);
  const [favoriteSources, setFavoriteSources] = useState<Set<string>>(() => new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [cardPrefs, setCardPrefs] = useState<CardPrefsData>(() => ({ ...EMPTY_CARD_PREFS }));
  const [sortModeEnabled, setSortModeEnabled] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggingSource, setDraggingSource] = useState<string | null>(null);
  const suppressedTip = useRef<string | null>(null);
  const dragSourceRef = useRef<string | null>(null);
  const platformGridRef = useRef<HTMLElement | null>(null);
  const shouldScrollAfterPageChange = useRef(false);
  const resolvedCategoryUserId = useRef<string | null | undefined>(undefined);

  const wideSources = useMemo(() => new Set(cardPrefs.wide), [cardPrefs.wide]);
  const expandedSources = useMemo(() => new Set(cardPrefs.expanded), [cardPrefs.expanded]);

  const visiblePlatforms = useMemo(
    () => filterPlatforms(
      livePlatforms,
      category,
      query,
      favoriteSources,
      cardPrefs.clicks,
      cardPrefs.order[category] ?? [],
    ),
    [category, query, livePlatforms, favoriteSources, cardPrefs.clicks, cardPrefs.order],
  );

  const categoryTabCount = useCallback((item: string) => (
    item === '全部'
      ? sourceCatalog.length
      : item === FAVORITES_CATEGORY
        ? favoriteSources.size
        : categoryCounts[item]
  ), [favoriteSources.size]);

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(visiblePlatforms.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pagedPlatforms = visiblePlatforms.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pagedSources = useMemo(() => pagedPlatforms.map((platform) => platform.source), [pagedPlatforms]);
  const livePlatformsRef = useRef(livePlatforms);

  useEffect(() => {
    livePlatformsRef.current = livePlatforms;
  }, [livePlatforms]);

  const loadPlatforms = useCallback(async (sources: string[], force = false, options?: { trackGlobalRefresh?: boolean }) => {
    const uniqueSources = [...new Set(sources)];
    if (!uniqueSources.length) return;

    let targets = platforms.filter((platform) => uniqueSources.includes(platform.source));
    if (!force) {
      targets = targets.filter((platform) => {
        const current = livePlatformsRef.current.find((item) => item.source === platform.source);
        return !current || current.status === 'idle';
      });
    }
    if (!targets.length) return;

    const trackGlobalRefresh = options?.trackGlobalRefresh ?? true;
    if (trackGlobalRefresh) setIsRefreshing(true);
    setLivePlatforms((current) => current.map((platform) => (
      targets.some((target) => target.source === platform.source)
        ? { ...platform, status: 'loading', updated: '连接中' }
        : platform
    )));

    let cursor = 0;
    const workers = Array.from({ length: Math.min(8, targets.length) }, async () => {
      while (cursor < targets.length) {
        const platform = targets[cursor++];
        const result = await fetchPlatform(platform);
        setLivePlatforms((current) => {
          const next = current.map((item) => item.source === result.source ? result : item);
          writePlatformCache(next);
          return next;
        });
      }
    });

    await Promise.all(workers);
    if (trackGlobalRefresh) setIsRefreshing(false);
  }, []);

  const refreshPlatform = useCallback((source: string) => {
    void loadPlatforms([source], true, { trackGlobalRefresh: false });
  }, [loadPlatforms]);

  const updateCardPrefs = useCallback((updater: (current: CardPrefsData) => CardPrefsData) => {
    setCardPrefs((current) => {
      const next = updater(current);
      writeCardPrefs(next);
      return next;
    });
  }, []);

  const toggleWide = useCallback((source: string) => {
    updateCardPrefs((current) => {
      const wide = new Set(current.wide);
      if (wide.has(source)) wide.delete(source);
      else wide.add(source);
      return { ...current, wide: [...wide] };
    });
  }, [updateCardPrefs]);

  const toggleExpanded = useCallback((source: string) => {
    updateCardPrefs((current) => {
      const expanded = new Set(current.expanded);
      if (expanded.has(source)) expanded.delete(source);
      else expanded.add(source);
      return { ...current, expanded: [...expanded] };
    });
  }, [updateCardPrefs]);

  const recordCardClick = useCallback((source: string) => {
    updateCardPrefs((current) => {
      const clicks = { ...current.clicks, [source]: (current.clicks[source] ?? 0) + 1 };
      if (sortModeEnabled) {
        return { ...current, clicks };
      }
      const categorySources = getCategorySources(category, favoriteSources);
      return {
        ...current,
        clicks,
        order: {
          ...current.order,
          [category]: sortSourcesByClicks(categorySources, clicks),
        },
      };
    });
  }, [category, favoriteSources, sortModeEnabled, updateCardPrefs]);

  const toggleSortMode = useCallback(() => {
    setSortModeEnabled((current) => {
      const next = !current;
      localStorage.setItem(SORT_MODE_KEY, next ? '1' : '0');
      return next;
    });
    dragSourceRef.current = null;
    setDraggingSource(null);
    setDropTarget(null);
  }, []);

  const reorderPlatforms = useCallback((dragged: string, target: string) => {
    updateCardPrefs((current) => {
      const categoryKey = category;
      const visibleSources = visiblePlatforms.map((platform) => platform.source);
      const baseOrder = current.order[categoryKey]?.length
        ? [
          ...current.order[categoryKey].filter((source) => visibleSources.includes(source)),
          ...visibleSources.filter((source) => !current.order[categoryKey].includes(source)),
        ]
        : [...visibleSources];
      const nextOrder = reorderCategorySources(baseOrder, dragged, target);
      return { ...current, order: { ...current.order, [categoryKey]: nextOrder } };
    });
  }, [category, updateCardPrefs, visiblePlatforms]);

  const toggleFavorite = useCallback((source: string) => {
    setFavoriteSources((current) => {
      const next = new Set(current);
      const adding = !next.has(source);
      if (adding) next.add(source);
      else next.delete(source);
      writeFavoriteSources(next);

      if (adding) {
        const platform = livePlatformsRef.current.find((item) => item.source === source);
        if (platform && (platform.status === 'idle' || platform.status === 'error')) {
          void loadPlatforms([source], true, { trackGlobalRefresh: false });
        }
      }

      return next;
    });
  }, [loadPlatforms]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const favorites = readFavoriteSources();
      setFavoriteSources(favorites);
      setCardPrefs(readCardPrefs());
      setSortModeEnabled(localStorage.getItem(SORT_MODE_KEY) === '1');

      const cached = readPlatformCache();
      if (cached.length) {
        const hydrated = mergeCacheIntoPlatforms(cached);
        setLivePlatforms(hydrated);
        livePlatformsRef.current = hydrated;
      }

      const initialized = sessionStorage.getItem(INITIALIZED_KEY) === '1';
      if (!initialized) {
        void loadPlatforms(platforms.map((platform) => platform.source), true).then(() => {
          sessionStorage.setItem(INITIALIZED_KEY, '1');
        });
      } else {
        const favoriteList = [...favorites];
        void loadPlatforms(favoriteList, true);
      }
      setClientReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clientReady || !authReady) return;
    const userId = user?.uid ?? null;
    if (resolvedCategoryUserId.current === userId) return;

    setCategory(userId && favoriteSources.size > 0 ? FAVORITES_CATEGORY : '全部');
    setCurrentPage(1);
    resolvedCategoryUserId.current = userId;
  }, [authReady, clientReady, favoriteSources.size, user?.uid]);

  const refreshVisible = useCallback(() => {
    void loadPlatforms(pagedSources, true);
  }, [loadPlatforms, pagedSources]);

  useEffect(() => {
    if (!shouldScrollAfterPageChange.current) return;
    shouldScrollAfterPageChange.current = false;

    const frame = requestAnimationFrame(() => {
      platformGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => cancelAnimationFrame(frame);
  }, [safePage]);

  const healthyCount = livePlatforms.filter((platform) => platform.status === 'success').length;
  const loadingCount = livePlatforms.filter((platform) => platform.status === 'loading').length;

  const changePage = (page: number) => {
    shouldScrollAfterPageChange.current = true;
    setCurrentPage(Math.min(Math.max(page, 1), pageCount));
  };

  const categoryHeading = category === '全部'
    ? '全部热榜'
    : category === FAVORITES_CATEGORY
      ? '我的收藏'
      : `${category}热榜`;

  return (
    <main>
      <header className="site-header app-shell">
        <div className="site-header-main">
          <div className="site-header-brand">
            <div className="brand-title"><span className="brand-icon" aria-hidden="true"><i /><i /><i /></span><h1>热榜汇</h1></div>
            <p className="site-tagline">全网热榜一屏尽览，此刻正在发生</p>
            <div className="status-line"><span><b /> {clientReady && loadingCount ? `正在连接 ${loadingCount} 个来源` : '实时数据已连接'}</span><span suppressHydrationWarning>{clientReady ? healthyCount : '—'}/{platforms.length} 个平台可用</span><span>条目直达原文</span></div>
          </div>
          <HeaderActions
            isRefreshing={isRefreshing}
            onRefresh={refreshVisible}
            sortModeEnabled={sortModeEnabled}
            onToggleSortMode={toggleSortMode}
          />
        </div>
      </header>

      <div className="primary-bar">
        <nav className="primary-tabs app-shell" aria-label="热榜分类">
          <button
            className={category === FAVORITES_CATEGORY ? 'active' : ''}
            onClick={() => { setCategory(FAVORITES_CATEGORY); setCurrentPage(1); }}
          >
            {FAVORITES_CATEGORY}{' '}
            <small>{categoryTabCount(FAVORITES_CATEGORY)}</small>
          </button>
          <span className="primary-tabs-divider" aria-hidden="true" />
          <button
            className={category === '全部' ? 'active' : ''}
            onClick={() => { setCategory('全部'); setCurrentPage(1); }}
          >
            全部{' '}
            <small>{categoryTabCount('全部')}</small>
          </button>
          {categories.slice(1).map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => { setCategory(item); setCurrentPage(1); }}
            >
              {item}{' '}
              <small>{categoryTabCount(item)}</small>
            </button>
          ))}
        </nav>
      </div>

      <div className="app-shell page-body">
        <div className="view-toolbar">
          <div className="search">
            <button className="search-field-btn search-focus-btn" type="button" aria-label="聚焦搜索框" title="搜索" onClick={() => searchInputRef.current?.focus()}>
              <span className="search-magnifier-icon" aria-hidden="true" />
            </button>
            <input ref={searchInputRef} aria-label="搜索平台或热点内容" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} type="search" placeholder="搜索平台或热点内容…" />
            <button className="search-field-btn search-clear-btn" type="button" aria-label="清除搜索" title="清除搜索" disabled={!query} onClick={() => { setQuery(''); setCurrentPage(1); searchInputRef.current?.focus(); }}>
              <span className="search-clear-icon" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="content-heading">
          <div><h2>{categoryHeading}</h2><p>{category === FAVORITES_CATEGORY ? '收藏的平台会显示在这里，点击卡片上的星标即可添加或取消。' : sortModeEnabled ? '拖动卡片标题栏左侧可调整顺序（优先级最高）；点击条目会计入该卡片点击次数。' : '阅读模式下按点击次数自动排序；每次点击条目都会增加该卡片点击次数并自动前移。右上角可开启排序模式以手动调整顺序。'}</p></div>
          <span>{visiblePlatforms.length} 个平台 · 第 {safePage}/{pageCount} 页</span>
        </div>

        {visiblePlatforms.length ? (
          <section ref={platformGridRef} id="platform-grid" className="card-grid three-column" aria-label="平台热榜卡片墙">
            {pagedPlatforms.map((platform) => {
              const isWide = wideSources.has(platform.source);
              const isExpanded = expandedSources.has(platform.source);
              const visibleLimit = isExpanded ? EXPANDED_ITEM_LIMIT : DEFAULT_ITEM_LIMIT;
              const hasMoreItems = platform.items.length > DEFAULT_ITEM_LIMIT;
              const isFavorite = favoriteSources.has(platform.source);
              const cardClicks = cardPrefs.clicks[platform.source] ?? 0;
              const isDragging = draggingSource === platform.source;
              const isDropTarget = dropTarget === platform.source;
              const fetchLabel = platformFetchLabel(platform);

              return (
              <article
                className={`platform-card${isWide ? ' is-wide' : ''}${sortModeEnabled && isDragging ? ' is-dragging' : ''}${sortModeEnabled && isDropTarget ? ' is-drop-target' : ''}`}
                key={platform.source}
                onDragOver={sortModeEnabled ? (event) => {
                  event.preventDefault();
                  if (dragSourceRef.current && dragSourceRef.current !== platform.source) {
                    setDropTarget(platform.source);
                  }
                } : undefined}
                onDragLeave={sortModeEnabled ? () => {
                  if (dropTarget === platform.source) setDropTarget(null);
                } : undefined}
                onDrop={sortModeEnabled ? (event) => {
                  event.preventDefault();
                  const dragged = dragSourceRef.current;
                  if (dragged && dragged !== platform.source) reorderPlatforms(dragged, platform.source);
                  dragSourceRef.current = null;
                  setDraggingSource(null);
                  setDropTarget(null);
                } : undefined}
              >
                <header className="card-head">
                  {sortModeEnabled ? (
                    <button
                      type="button"
                      className="card-drag-handle"
                      draggable
                      aria-label="拖动排序"
                      title="拖动排序"
                      onDragStart={(event) => {
                        dragSourceRef.current = platform.source;
                        setDraggingSource(platform.source);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', platform.source);
                      }}
                      onDragEnd={() => {
                        dragSourceRef.current = null;
                        setDraggingSource(null);
                        setDropTarget(null);
                      }}
                    >
                      <CardDragHandleIcon />
                    </button>
                  ) : null}
                  <a href={platform.url} target="_blank" rel="noreferrer">
                    <span className="platform-icon">
                      <span className="platform-icon-fallback" style={{ background: platform.color }}>{platform.short}</span>
                      {/* Platform logos use a native image so the fallback can take over immediately on load errors. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={platform.logo} alt="" width="128" height="128" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    </span>
                    <span><strong>{platform.name}</strong><small>{platform.category} · {platform.updated}{cardClicks > 0 ? ` · 点击 ${cardClicks}` : ''}</small></span>
                  </a>
                  <div className="card-actions">
                    <button
                      type="button"
                      className={`card-action-btn${platform.status === 'loading' ? ' is-spinning' : ''}`}
                      aria-label={platform.status === 'loading' ? '刷新中' : '刷新该榜单'}
                      title={platform.status === 'loading' ? '刷新中' : '刷新该榜单'}
                      disabled={platform.status === 'loading'}
                      onClick={() => refreshPlatform(platform.source)}
                    >
                      <CardRefreshIcon />
                    </button>
                    <button
                      type="button"
                      className={`card-action-btn${isWide ? ' is-active' : ''}`}
                      aria-label={isWide ? '收起宽度' : '展开视图'}
                      title={isWide ? '收起宽度' : '展开视图（双倍列宽）'}
                      aria-pressed={isWide}
                      onClick={() => toggleWide(platform.source)}
                    >
                      <CardWideIcon collapsed={!isWide} />
                    </button>
                    {hasMoreItems ? (
                      <button
                        type="button"
                        className={`card-action-btn${isExpanded ? ' is-active' : ''}`}
                        aria-label={isExpanded ? '收起列表' : '展开内容'}
                        title={isExpanded
                          ? `收起列表（显示 ${DEFAULT_ITEM_LIMIT} 条）`
                          : `展开内容（共 ${platform.items.length} 条，最多 ${EXPANDED_ITEM_LIMIT} 条）`}
                        aria-pressed={isExpanded}
                        onClick={() => toggleExpanded(platform.source)}
                      >
                        <CardMoreIcon collapsed={!isExpanded} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`card-action-btn${isFavorite ? ' is-favorite' : ''}`}
                      aria-label={isFavorite ? '取消收藏' : '收藏该榜单'}
                      title={isFavorite ? '取消收藏' : '收藏该榜单'}
                      aria-pressed={isFavorite}
                      onClick={() => toggleFavorite(platform.source)}
                    >
                      <CardFavoriteIcon filled={isFavorite} />
                    </button>
                  </div>
                </header>
                {platform.items.length ? <ol className="hot-list">
                  {platform.items.slice(0, visibleLimit).map((item, index) => {
                    const tipId = `${platform.source}-${index}`;
                    const showTip = activeTip === tipId;
                    const openTip = () => {
                      if (suppressedTip.current !== tipId) setActiveTip(tipId);
                    };
                    const closeTip = () => {
                      setActiveTip(null);
                      suppressedTip.current = null;
                    };
                    const dismissTip = () => {
                      setActiveTip(null);
                      suppressedTip.current = tipId;
                    };
                    const navigateItem = () => recordCardClick(platform.source);

                    const hasMeta = Boolean(item.heat || item.rising);

                    return (
                    <li
                      key={`${item.url ?? item.title}-${index}`}
                      className={`has-tip${showTip ? ' tip-open' : ''}${hasMeta ? ' has-meta' : ''}`}
                      onMouseEnter={openTip}
                      onMouseLeave={closeTip}
                    >
                      <span className={`rank ${index < 3 ? 'top' : ''}`}>{index + 1}</span>
                      <span className="hot-title-cell">
                        {item.url ? (
                          <a className="hot-title-link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => { navigateItem(); dismissTip(); }}>{item.title}</a>
                        ) : (
                          <span className="hot-title unavailable">{item.title}</span>
                        )}
                      </span>
                      <span className="item-meta">{item.rising && <b>↑</b>}{item.heat}</span>
                      {item.url ? (
                        <a
                          className={`hot-tip${showTip ? ' visible' : ''}`}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { navigateItem(); dismissTip(); }}
                        >
                          <span className={`rank ${index < 3 ? 'top' : ''}`} aria-hidden="true">{index + 1}</span>
                          <span className="hot-tip-text">{item.title}</span>
                          {hasMeta && <span className="hot-tip-meta-slot" aria-hidden="true">{item.rising && <b>↑</b>}{item.heat}</span>}
                        </a>
                      ) : (
                        <span className={`hot-tip hot-tip-static${showTip ? ' visible' : ''}`}>
                          <span className={`rank ${index < 3 ? 'top' : ''}`} aria-hidden="true">{index + 1}</span>
                          <span className="hot-tip-text">{item.title}</span>
                          {hasMeta && <span className="hot-tip-meta-slot" aria-hidden="true">{item.rising && <b>↑</b>}{item.heat}</span>}
                        </span>
                      )}
                    </li>
                    );
                  })}
                </ol> : <div className="card-empty">{platform.status === 'error' ? '该来源当前公共接口不可用' : platform.status === 'idle' ? '正在加载全部平台数据…' : '正在获取最新热榜…'}</div>}
                <footer>
                  <span className={platform.status === 'error' ? 'source-error' : ''}>
                    <i /> {platform.status === 'error' ? '暂不可用' : platform.status === 'success' ? '更新正常' : platform.status === 'idle' ? '等待加载' : '连接中'}
                    {platform.items.length ? ` · 显示 ${Math.min(visibleLimit, platform.items.length)}/${platform.items.length} 条` : ''}
                    {fetchLabel !== '本站直连' ? ` · ${fetchLabel}` : ''}
                  </span>
                  <a className="full-list" href={platform.url} target="_blank" rel="noreferrer">查看完整榜单</a>
                </footer>
              </article>
              );
            })}
          </section>
        ) : <div className="empty-state">{category === FAVORITES_CATEGORY ? '还没有收藏的平台，切换到其他分类后点击卡片上的星标即可添加' : '没有找到匹配的热点或平台'}</div>}

        {visiblePlatforms.length > pageSize && <nav className="pagination" aria-label="平台分页">
          <button onClick={() => changePage(safePage - 1)} disabled={safePage === 1}>上一页</button>
          <span>第 {safePage} 页，共 {pageCount} 页</span>
          <button onClick={() => changePage(safePage + 1)} disabled={safePage === pageCount}>下一页</button>
        </nav>}

        <footer className="site-footer"><span>热榜汇 · 数据仅用于趋势浏览</span><span>共收录 {platforms.length} 个平台</span></footer>
      </div>
    </main>
  );
}
