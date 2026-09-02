'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories, categoryCounts, normalizeSourceId, sourceCatalog, type PlatformDefinition } from './source-catalog';
import { HeaderActions } from './components/header-actions';
import { THEME_KEY } from './components/theme-toggle';
import { useAuth } from './components/auth-provider';
import { formatItemMetric } from './metric-format';
import { comparePlatformName, orderFavoritePlatforms, reorderSources } from './platform-sort';
import {
  readCloudPreferences,
  writeCloudPreferences,
  type ThemePreference,
  type UserPreferences,
} from './lib/user-preferences';

type HotItem = { title: string; byline?: string; url?: string; heat?: string; rising?: boolean };

function HotItemLabel({ item }: { item: HotItem }) {
  return <>
    <span className="item-primary-text">{item.title}</span>
    {item.byline && <span className="item-byline"><span className="item-byline-separator" aria-hidden="true"> · </span>{item.byline}</span>}
  </>;
}

type Platform = PlatformDefinition & {
  updated: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  items: HotItem[];
  consecutiveFailures: number;
};

const CACHE_KEY = 'rebanghui-platform-cache-v3';
const FAVORITES_KEY = 'rebanghui-favorites';
const CARD_PREFS_KEY = 'rebanghui-card-prefs';
const CARD_ORDER_VERSION_KEY = 'rebanghui-card-order-version';
const CARD_ORDER_VERSION = 'favorites-only-v1';
const SORT_MODE_KEY = 'rebanghui-sort-mode';
const NAVIGATION_STATE_KEY = 'rebanghui-navigation-state-v1';
const FAVORITES_CATEGORY = '收藏';

type CardPrefsData = {
  wide: string[];
  expanded: string[];
  order: Record<string, string[]>;
};

const EMPTY_CARD_PREFS: CardPrefsData = {
  wide: [],
  expanded: [],
  order: {},
};

function cleanSourceIds(items: unknown) {
  if (!Array.isArray(items)) return [];
  const valid = new Set(sourceCatalog.map((platform) => platform.source));
  return [...new Set(items
    .filter((source): source is string => typeof source === 'string')
    .map(normalizeSourceId)
    .filter((source) => valid.has(source)))];
}

function readCardPrefs(): CardPrefsData {
  try {
    const shouldResetOrder = localStorage.getItem(CARD_ORDER_VERSION_KEY) !== CARD_ORDER_VERSION;
    const raw = localStorage.getItem(CARD_PREFS_KEY);
    if (!raw) {
      if (shouldResetOrder) localStorage.setItem(CARD_ORDER_VERSION_KEY, CARD_ORDER_VERSION);
      return { ...EMPTY_CARD_PREFS };
    }
    const parsed = JSON.parse(raw) as Partial<CardPrefsData>;
    const wide = cleanSourceIds(parsed.wide);
    const expanded = cleanSourceIds(parsed.expanded);
    const order = !shouldResetOrder && parsed.order && typeof parsed.order === 'object'
      ? Object.fromEntries(
        Object.entries(parsed.order).map(([key, value]) => [
          key,
          cleanSourceIds(value),
        ]),
      )
      : {};
    if (shouldResetOrder) localStorage.setItem(CARD_ORDER_VERSION_KEY, CARD_ORDER_VERSION);
    return { wide, expanded, order };
  } catch {
    return { ...EMPTY_CARD_PREFS };
  }
}

function writeCardPrefs(data: CardPrefsData) {
  localStorage.setItem(CARD_PREFS_KEY, JSON.stringify(data));
}

function readNavigationState() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(NAVIGATION_STATE_KEY) ?? '') as {
      category?: string;
      page?: number;
    };
    const validCategories = new Set([FAVORITES_CATEGORY, '全部', ...categories]);
    if (!parsed.category || !validCategories.has(parsed.category)) return null;
    const page = Number.isInteger(parsed.page) && Number(parsed.page) > 0 ? Number(parsed.page) : 1;
    return { category: parsed.category, page };
  } catch {
    return null;
  }
}

function writeNavigationState(category: string, page: number) {
  sessionStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify({ category, page }));
}

function readFavoriteSources(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as string[];
    if (!Array.isArray(list)) return new Set();
    return new Set(cleanSourceIds(list));
  } catch {
    return new Set();
  }
}

function writeFavoriteSources(sources: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...sources]));
}

function readThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemePreference(theme: ThemePreference) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

type PlatformCacheEntry = Pick<Platform, 'source' | 'updated' | 'status' | 'items' | 'consecutiveFailures'>;

function readPlatformCache(): PlatformCacheEntry[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlatformCacheEntry[];
    return parsed.map((entry) => ({ ...entry, source: normalizeSourceId(entry.source) }));
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
    return {
      ...platform,
      updated: hit.updated,
      status: hit.status,
      items: hit.items,
      consecutiveFailures: hit.consecutiveFailures ?? 0,
    };
  });
}

function writePlatformCache(list: Platform[]) {
  const payload = list
    .filter((platform) => platform.status === 'success' || platform.status === 'error')
    .map(({ source, updated, status, items, consecutiveFailures }) => ({ source, updated, status, items, consecutiveFailures }));
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

type SourceResponse = {
  updatedTime?: number | string;
  items?: Array<{
    id: string | number;
    title: string;
    byline?: string;
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
  consecutiveFailures: 0,
}));

const DEFAULT_ITEM_LIMIT = 10;
const EXPANDED_ITEM_LIMIT = 30;
const PAGE_SIZE = 9;
const PAGE_MAX_CONCURRENCY = 12;
const FETCH_RETRY_DELAYS_MS = [1500];

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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

function mergeUnique(primary: string[], secondary: string[]) {
  return [...new Set([...primary, ...secondary])];
}

function mergeCardPreferences(local: CardPrefsData, remote?: Partial<CardPrefsData>): CardPrefsData {
  const favoriteOrder = mergeUnique(
    cleanSourceIds(remote?.order?.[FAVORITES_CATEGORY]),
    cleanSourceIds(local.order[FAVORITES_CATEGORY]),
  );
  const order: Record<string, string[]> = favoriteOrder.length
    ? { [FAVORITES_CATEGORY]: favoriteOrder }
    : {};
  return {
    wide: mergeUnique(cleanSourceIds(remote?.wide), cleanSourceIds(local.wide)),
    expanded: mergeUnique(cleanSourceIds(remote?.expanded), cleanSourceIds(local.expanded)),
    order,
  };
}

function filterPlatforms(
  list: Platform[],
  category: string,
  query: string,
  favoriteSources: Set<string>,
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
        ? platform.items.filter((item) => `${platform.name} ${item.title} ${item.byline ?? ''}`.toLowerCase().includes(keyword))
        : platform.items,
    }))
    .filter((platform) => !keyword || platform.items.length > 0);

  if (category !== FAVORITES_CATEGORY) return filtered.sort((a, b) => comparePlatformName(a.name, b.name));

  return orderFavoritePlatforms(filtered, favoriteSources, categoryOrder);
}

function formatUpdated(value?: number | string) {
  if (!value) return '刚刚抓取';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '刚刚抓取';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return '刚刚抓取';
  if (minutes < 60) return `${minutes} 分钟前抓取`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前抓取`;
  return `${Math.floor(minutes / 1440)} 天前抓取`;
}

async function fetchPlatform(platform: Platform): Promise<Platform> {
  try {
    const response = await fetch(`/api/hot?source=${encodeURIComponent(platform.source)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Source unavailable');
    const payload = await response.json() as SourceResponse;
    const safeUrl = (value?: string) => {
      if (!value || /javascript\s*:/i.test(value) || /[\u0000-\u001f]/.test(value)) return undefined;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
      } catch {
        return undefined;
      }
    };
    const items = (payload.items ?? [])
      .map((item) => ({ ...item, resolvedUrl: safeUrl(item.mobileUrl || item.url) }))
      .filter((item) => item.title && item.resolvedUrl)
      .slice(0, 30)
      .map((item) => ({
        title: item.title,
        byline: item.byline,
        url: item.resolvedUrl,
        heat: formatItemMetric(platform.source, item.extra?.info),
        rising: typeof item.extra?.diff === 'number' && item.extra.diff > 0,
      }));
    if (!items.length) throw new Error('Empty source');
    return { ...platform, items, updated: formatUpdated(payload.updatedTime), status: 'success', consecutiveFailures: 0 };
  } catch {
    return {
      ...platform,
      updated: platform.items.length ? platform.updated : '获取失败',
      status: 'error',
      consecutiveFailures: platform.consecutiveFailures + 1,
    };
  }
}

async function fetchPlatformWithRetry(platform: Platform): Promise<Platform> {
  let result = await fetchPlatform(platform);
  for (const delay of FETCH_RETRY_DELAYS_MS) {
    if (result.status === 'success') return result;
    await sleep(delay);
    result = await fetchPlatform(platform);
  }
  return result;
}

async function runPlatformFetchPool(
  targets: Platform[],
  concurrency: number,
  onResult: (result: Platform) => void,
) {
  if (!targets.length) return;
  const workerCount = Math.min(concurrency, targets.length);
  let cursor = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < targets.length) {
      const platform = targets[cursor++];
      onResult(await fetchPlatformWithRetry(platform));
    }
  });
  await Promise.all(workers);
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
  const [theme, setTheme] = useState<ThemePreference>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [preferenceSyncStatus, setPreferenceSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggingSource, setDraggingSource] = useState<string | null>(null);
  const suppressedTip = useRef<string | null>(null);
  const dragSourceRef = useRef<string | null>(null);
  const platformGridRef = useRef<HTMLElement | null>(null);
  const shouldScrollAfterPageChange = useRef(false);
  const sessionLoadStarted = useRef(false);
  const sessionLoadComplete = useRef(false);
  const cloudLoadedUserId = useRef<string | null>(null);
  const prevNavigation = useRef({ category: '全部', safePage: 1, query: '' });

  const wideSources = useMemo(() => new Set(cardPrefs.wide), [cardPrefs.wide]);
  const expandedSources = useMemo(() => new Set(cardPrefs.expanded), [cardPrefs.expanded]);

  const visiblePlatforms = useMemo(
    () => filterPlatforms(
      livePlatforms,
      category,
      query,
      favoriteSources,
      cardPrefs.order[category] ?? [],
    ),
    [category, query, livePlatforms, favoriteSources, cardPrefs.order],
  );

  const categoryTabCount = useCallback((item: string) => (
    item === '全部'
      ? sourceCatalog.length
      : item === FAVORITES_CATEGORY
        ? favoriteSources.size
        : categoryCounts[item]
  ), [favoriteSources.size]);

  const pageSize = PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(visiblePlatforms.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pagedPlatforms = visiblePlatforms.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pagedSources = useMemo(() => pagedPlatforms.map((platform) => platform.source), [pagedPlatforms]);
  const livePlatformsRef = useRef(livePlatforms);

  useEffect(() => {
    livePlatformsRef.current = livePlatforms;
  }, [livePlatforms]);

  const loadPlatforms = useCallback(async (sources: string[], force = false, options?: { trackGlobalRefresh?: boolean; concurrency?: number }) => {
    const uniqueSources = [...new Set(sources)];
    if (!uniqueSources.length) return;

    const platformBySource = new Map(livePlatformsRef.current.map((platform) => [platform.source, platform]));
    let targets = uniqueSources
      .map((source) => platformBySource.get(source))
      .filter((platform): platform is Platform => platform !== undefined);
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

    const applyResult = (result: Platform) => {
      setLivePlatforms((current) => {
        const next = current.map((item) => item.source === result.source ? result : item);
        writePlatformCache(next);
        return next;
      });
    };

    const baseConcurrency = options?.concurrency ?? 8;
    await runPlatformFetchPool(targets, baseConcurrency, applyResult);
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

  const toggleSortMode = useCallback(() => {
    if (category !== FAVORITES_CATEGORY) return;
    setSortModeEnabled((current) => {
      const next = !current;
      localStorage.setItem(SORT_MODE_KEY, next ? '1' : '0');
      return next;
    });
    dragSourceRef.current = null;
    setDraggingSource(null);
    setDropTarget(null);
  }, [category]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      applyThemePreference(next);
      return next;
    });
  }, []);

  const restoreCloudPreferences = useCallback(() => {
    const uid = user?.uid;
    if (!uid) return;
    void (async () => {
      setPreferenceSyncStatus('syncing');
      try {
        const remote = await readCloudPreferences(uid);
        if (!remote) {
          setPreferenceSyncStatus('synced');
          return;
        }
        const favorites = new Set(cleanSourceIds(remote.favorites));
        const restoredCardPrefs = mergeCardPreferences(
          { ...EMPTY_CARD_PREFS },
          remote.version === 4 ? remote.cardPrefs : { ...remote.cardPrefs, order: {} },
        );
        const restoredTheme = remote.theme === 'dark' ? 'dark' : 'light';
        setFavoriteSources(favorites);
        writeFavoriteSources(favorites);
        setCardPrefs(restoredCardPrefs);
        writeCardPrefs(restoredCardPrefs);
        const restoredSortMode = category === FAVORITES_CATEGORY && Boolean(remote.sortModeEnabled);
        setSortModeEnabled(restoredSortMode);
        localStorage.setItem(SORT_MODE_KEY, restoredSortMode ? '1' : '0');
        setTheme(restoredTheme);
        applyThemePreference(restoredTheme);
        setPreferenceSyncStatus('synced');
      } catch {
        setPreferenceSyncStatus('error');
      }
    })();
  }, [category, user?.uid]);

  const resetSorting = useCallback(() => {
    if (!window.confirm('确定将收藏卡片恢复为加入收藏的顺序吗？')) return;
    updateCardPrefs((current) => {
      const order = { ...current.order };
      delete order[FAVORITES_CATEGORY];
      return { ...current, order };
    });
  }, [updateCardPrefs]);

  const reorderPlatforms = useCallback((dragged: string, target: string) => {
    if (category !== FAVORITES_CATEGORY) return;
    updateCardPrefs((current) => {
      const insertionOrder = [...favoriteSources];
      const baseOrder = current.order[FAVORITES_CATEGORY]?.length
        ? [
          ...current.order[FAVORITES_CATEGORY].filter((source) => favoriteSources.has(source)),
          ...insertionOrder.filter((source) => !current.order[FAVORITES_CATEGORY].includes(source)),
        ]
        : insertionOrder;
      const nextOrder = reorderSources(baseOrder, dragged, target);
      return { ...current, order: { ...current.order, [FAVORITES_CATEGORY]: nextOrder } };
    });
  }, [category, favoriteSources, updateCardPrefs]);

  const movePlatform = useCallback((source: string, direction: -1 | 1) => {
    const sources = visiblePlatforms.map((platform) => platform.source);
    const index = sources.indexOf(source);
    const target = sources[index + direction];
    if (target) reorderPlatforms(source, target);
  }, [reorderPlatforms, visiblePlatforms]);

  const toggleFavorite = useCallback((source: string) => {
    const adding = !favoriteSources.has(source);
    const next = new Set(favoriteSources);
    if (adding) next.add(source);
    else next.delete(source);
    writeFavoriteSources(next);
    setFavoriteSources(next);

    updateCardPrefs((current) => {
      const existingOrder = current.order[FAVORITES_CATEGORY];
      if (!existingOrder?.length) return current;
      const nextOrder = existingOrder.filter((item) => item !== source);
      if (adding) nextOrder.push(source);
      return { ...current, order: { ...current.order, [FAVORITES_CATEGORY]: nextOrder } };
    });

    if (adding) {
      const platform = livePlatformsRef.current.find((item) => item.source === source);
      if (platform && (platform.status === 'idle' || platform.status === 'error')) {
        void loadPlatforms([source], true, { trackGlobalRefresh: false });
      }
    }
  }, [favoriteSources, loadPlatforms, updateCardPrefs]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const favorites = readFavoriteSources();
      const preferences = readCardPrefs();
      const initialTheme = readThemePreference();
      const navigation = readNavigationState();
      setFavoriteSources(favorites);
      setCardPrefs(preferences);
      writeCardPrefs(preferences);
      setSortModeEnabled(false);
      localStorage.setItem(SORT_MODE_KEY, '0');
      setTheme(initialTheme);
      applyThemePreference(initialTheme);
      setThemeReady(true);
      if (navigation) {
        setCategory(navigation.category);
        setCurrentPage(navigation.page);
      } else if (favorites.size > 0) {
        setCategory(FAVORITES_CATEGORY);
      }

      const cached = readPlatformCache();
      if (cached.length) {
        const hydrated = mergeCacheIntoPlatforms(cached);
        setLivePlatforms(hydrated);
        livePlatformsRef.current = hydrated;
      }

      setClientReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!clientReady || !authReady) return;
    const uid = user?.uid;
    if (!uid) {
      cloudLoadedUserId.current = null;
      queueMicrotask(() => setPreferenceSyncStatus('local'));
      return;
    }
    if (cloudLoadedUserId.current === uid) return;

    let cancelled = false;
    void (async () => {
      setPreferenceSyncStatus('syncing');
      try {
        const remote = await readCloudPreferences(uid);
        if (cancelled) return;
        const localFavorites = readFavoriteSources();
        const localCardPrefs = readCardPrefs();
        const remoteCardPrefs = remote?.version === 4
          ? remote.cardPrefs
          : remote?.cardPrefs ? { ...remote.cardPrefs, order: {} } : undefined;
        const mergedCardPrefs = mergeCardPreferences(localCardPrefs, remoteCardPrefs);
        const favorites = new Set(mergeUnique(cleanSourceIds(remote?.favorites), [...localFavorites]));
        const mergedTheme = remote?.theme === 'dark' || remote?.theme === 'light'
          ? remote.theme
          : readThemePreference();
        const mergedSortMode = false;

        setFavoriteSources(favorites);
        writeFavoriteSources(favorites);
        setCardPrefs(mergedCardPrefs);
        writeCardPrefs(mergedCardPrefs);
        setSortModeEnabled(mergedSortMode);
        localStorage.setItem(SORT_MODE_KEY, mergedSortMode ? '1' : '0');
        setTheme(mergedTheme);
        applyThemePreference(mergedTheme);

        const merged: UserPreferences = {
          version: 4,
          favorites: [...favorites],
          cardPrefs: mergedCardPrefs,
          sortModeEnabled: mergedSortMode,
          theme: mergedTheme,
          updatedAt: Date.now(),
        };
        await writeCloudPreferences(uid, merged);
        if (cancelled) return;
        cloudLoadedUserId.current = uid;
        setPreferenceSyncStatus('synced');
      } catch {
        if (!cancelled) setPreferenceSyncStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, clientReady, user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || cloudLoadedUserId.current !== uid || !clientReady) return;
    setPreferenceSyncStatus('syncing');
    const timeout = window.setTimeout(() => {
      const preferences: UserPreferences = {
        version: 4,
        favorites: [...favoriteSources],
        cardPrefs,
        sortModeEnabled,
        theme,
        updatedAt: Date.now(),
      };
      void writeCloudPreferences(uid, preferences)
        .then(() => setPreferenceSyncStatus('synced'))
        .catch(() => setPreferenceSyncStatus('error'));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [cardPrefs, clientReady, favoriteSources, sortModeEnabled, theme, user?.uid]);

  useEffect(() => {
    if (!clientReady || !authReady || sessionLoadStarted.current) return;
    sessionLoadStarted.current = true;

    const visibleSources = filterPlatforms(
      livePlatformsRef.current,
      category,
      '',
      favoriteSources,
      cardPrefs.order[category] ?? [],
    ).map((platform) => platform.source);
    const pageSources = visibleSources.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    prevNavigation.current = { category, safePage, query: '' };

    void (async () => {
      setIsRefreshing(true);
      try {
        if (pageSources.length) {
          await loadPlatforms(pageSources, true, {
            trackGlobalRefresh: false,
            concurrency: Math.min(PAGE_MAX_CONCURRENCY, pageSources.length),
          });
        }
      } finally {
        setIsRefreshing(false);
        sessionLoadComplete.current = true;
      }
    })();
  }, [authReady, cardPrefs.order, category, clientReady, favoriteSources, loadPlatforms, safePage]);

  useEffect(() => {
    if (!clientReady) return;
    writeNavigationState(category, safePage);
  }, [category, clientReady, safePage]);

  useEffect(() => {
    if (!clientReady || !sessionLoadComplete.current) return;

    const prev = prevNavigation.current;
    if (prev.category === category && prev.safePage === safePage && prev.query === query) return;
    prevNavigation.current = { category, safePage, query };

    const pageSources = [...pagedSources];

    void (async () => {
      if (pageSources.length) {
        await loadPlatforms(pageSources, false, {
          trackGlobalRefresh: false,
          concurrency: Math.min(PAGE_MAX_CONCURRENCY, pageSources.length),
        });
      }
    })();
  }, [category, clientReady, loadPlatforms, pagedSources, query, safePage, visiblePlatforms]);

  const refreshVisible = useCallback(() => {
    void loadPlatforms(pagedSources, true, {
      concurrency: Math.min(PAGE_MAX_CONCURRENCY, pagedSources.length),
    });
  }, [loadPlatforms, pagedSources]);

  useEffect(() => {
    if (!shouldScrollAfterPageChange.current) return;
    shouldScrollAfterPageChange.current = false;

    const frame = requestAnimationFrame(() => {
      platformGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => cancelAnimationFrame(frame);
  }, [safePage]);

  const changePage = (page: number) => {
    shouldScrollAfterPageChange.current = true;
    setCurrentPage(Math.min(Math.max(page, 1), pageCount));
  };

  const selectCategory = (nextCategory: string) => {
    if (nextCategory !== FAVORITES_CATEGORY && sortModeEnabled) {
      setSortModeEnabled(false);
      localStorage.setItem(SORT_MODE_KEY, '0');
      dragSourceRef.current = null;
      setDraggingSource(null);
      setDropTarget(null);
    }
    setCategory(nextCategory);
    setCurrentPage(1);
  };

  const favoriteSortModeEnabled = category === FAVORITES_CATEGORY && sortModeEnabled;

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
            <p className="site-tagline">热榜一屏尽览，此刻正在发生</p>
          </div>
          <HeaderActions
            isRefreshing={isRefreshing}
            onRefresh={refreshVisible}
            sortModeEnabled={favoriteSortModeEnabled}
            sortModeAvailable={category === FAVORITES_CATEGORY}
            onToggleSortMode={toggleSortMode}
            theme={theme}
            themeReady={themeReady}
            onToggleTheme={toggleTheme}
            preferenceSyncStatus={preferenceSyncStatus}
            onRestoreCloud={restoreCloudPreferences}
            onResetSorting={resetSorting}
          />
        </div>
      </header>

      <div className="primary-bar">
        <nav className="primary-tabs app-shell" aria-label="热榜分类">
          <button
            className={category === FAVORITES_CATEGORY ? 'active' : ''}
            onClick={() => selectCategory(FAVORITES_CATEGORY)}
          >
            {FAVORITES_CATEGORY}{' '}
            <small>{categoryTabCount(FAVORITES_CATEGORY)}</small>
          </button>
          <span className="primary-tabs-divider" aria-hidden="true" />
          <button
            className={category === '全部' ? 'active' : ''}
            onClick={() => selectCategory('全部')}
          >
            全部{' '}
            <small>{categoryTabCount('全部')}</small>
          </button>
          {categories.slice(1).map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => selectCategory(item)}
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
          <div><h2>{categoryHeading}</h2><p>{category === FAVORITES_CATEGORY ? favoriteSortModeEnabled ? '拖动卡片或在拖动按钮上按 Alt＋方向键调整顺序，变更会同步到账号。' : '卡片默认按加入收藏的顺序排列；可开启排序模式手动调整。' : '数字和英文名称优先，其余卡片按拼音排序。'}</p></div>
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
              const isDragging = draggingSource === platform.source;
              const isDropTarget = dropTarget === platform.source;
              const statusLabel = platform.status === 'error'
                ? platform.items.length ? `使用上次数据 · ${platform.updated}` : '暂不可用'
                : platform.status === 'success'
                  ? platform.updated
                  : platform.status === 'idle' ? '等待加载' : '正在抓取…';

              return (
              <article
                className={`platform-card${isWide ? ' is-wide' : ''}${favoriteSortModeEnabled && isDragging ? ' is-dragging' : ''}${favoriteSortModeEnabled && isDropTarget ? ' is-drop-target' : ''}`}
                key={platform.source}
                onDragOver={favoriteSortModeEnabled ? (event) => {
                  event.preventDefault();
                  if (dragSourceRef.current && dragSourceRef.current !== platform.source) {
                    setDropTarget(platform.source);
                  }
                } : undefined}
                onDragLeave={favoriteSortModeEnabled ? () => {
                  if (dropTarget === platform.source) setDropTarget(null);
                } : undefined}
                onDrop={favoriteSortModeEnabled ? (event) => {
                  event.preventDefault();
                  const dragged = dragSourceRef.current;
                  if (dragged && dragged !== platform.source) reorderPlatforms(dragged, platform.source);
                  dragSourceRef.current = null;
                  setDraggingSource(null);
                  setDropTarget(null);
                } : undefined}
              >
                <header className="card-head">
                  {favoriteSortModeEnabled ? (
                    <button
                      type="button"
                      className="card-drag-handle"
                      draggable
                      aria-label="拖动排序"
                      title="拖动排序；Alt＋↑/↓ 可用键盘移动"
                      onKeyDown={(event) => {
                        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                        event.preventDefault();
                        movePlatform(platform.source, event.key === 'ArrowUp' ? -1 : 1);
                      }}
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
                      <img
                        src={platform.logo}
                        alt=""
                        width="128"
                        height="128"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                          event.currentTarget.previousElementSibling?.classList.add('is-visible');
                        }}
                      />
                    </span>
                    <span className="card-title-wrap">
                      <span className="card-title">
                        <strong className="card-brand">{platform.brand}</strong>
                        {platform.listName ? (
                          <>
                            <span className="card-title-sep" aria-hidden="true">·</span>
                            <span className="card-list-name">{platform.listName}</span>
                          </>
                        ) : null}
                      </span>
                      <small>{platform.category}</small>
                    </span>
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
                          <a className="hot-title-link" href={item.url} target="_blank" rel="noopener noreferrer" onClick={dismissTip} aria-label={item.byline ? `${item.title}，${item.byline}` : undefined}><HotItemLabel item={item} /></a>
                        ) : (
                          <span className="hot-title unavailable"><HotItemLabel item={item} /></span>
                        )}
                      </span>
                      <span className="item-meta">{item.rising && <b>↑</b>}{item.heat}</span>
                      {item.url ? (
                        <a
                          className={`hot-tip${showTip ? ' visible' : ''}`}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={dismissTip}
                        >
                          <span className={`rank ${index < 3 ? 'top' : ''}`} aria-hidden="true">{index + 1}</span>
                          <span className="hot-tip-text"><HotItemLabel item={item} /></span>
                          {hasMeta && <span className="hot-tip-meta-slot" aria-hidden="true">{item.rising && <b>↑</b>}{item.heat}</span>}
                        </a>
                      ) : (
                        <span className={`hot-tip hot-tip-static${showTip ? ' visible' : ''}`}>
                          <span className={`rank ${index < 3 ? 'top' : ''}`} aria-hidden="true">{index + 1}</span>
                          <span className="hot-tip-text"><HotItemLabel item={item} /></span>
                          {hasMeta && <span className="hot-tip-meta-slot" aria-hidden="true">{item.rising && <b>↑</b>}{item.heat}</span>}
                        </span>
                      )}
                    </li>
                    );
                  })}
                </ol> : <div className="card-empty">{platform.status === 'error' ? '该来源当前公共接口不可用' : platform.status === 'idle' ? '正在加载全部平台数据…' : '正在获取最新热榜…'}</div>}
                <footer>
                  <span className={platform.status === 'error' ? 'source-error' : ''}>
                    <i /> {statusLabel}
                    {platform.consecutiveFailures > 0 ? ` · 连续失败 ${platform.consecutiveFailures} 次` : ''}
                    {platform.items.length ? ` · 显示 ${Math.min(visibleLimit, platform.items.length)}/${platform.items.length} 条` : ''}
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

        <footer className="site-footer">
          <span>热榜汇 · 数据仅用于趋势浏览</span>
        </footer>
      </div>
    </main>
  );
}
