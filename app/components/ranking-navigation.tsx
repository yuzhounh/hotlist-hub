'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type RankingCategory = {
  name: string;
  url: string;
  count?: number;
  description: string;
};

const RANKING_SITES = [
  { name: 'NewsNOW', host: 'newsnow.busiyi.world', url: 'https://newsnow.busiyi.world/c/hottest' },
  { name: 'TTKIT 每日热点', host: 'ttkit.cn', url: 'https://ttkit.cn/daily-hot' },
  { name: 'X 热帖', host: 'sopilot.net', url: 'https://sopilot.net/zh/hot-tweets' },
  { name: '极简热榜', host: 'top.open2hub.com', url: 'https://top.open2hub.com/' },
  { name: '今日热榜', host: 'hot.sapi.run', url: 'https://hot.sapi.run/#/' },
  { name: '今日热榜', host: 'hot.xhily.com', url: 'https://hot.xhily.com/' },
  { name: '今日热榜', host: 'tophub.today', url: 'https://tophub.today/c/news' },
  { name: '全网热榜', host: 'rebang.today', url: 'https://rebang.today/' },
];

const CATEGORY_GROUPS: Array<{ title: string; items: RankingCategory[] }> = [
  {
    title: '热门分类',
    items: [
      { name: '综合', count: 490, url: 'https://tophub.today/c/news', description: '全站综合热门榜单' },
      { name: '科技', count: 415, url: 'https://tophub.today/c/tech', description: '科技与互联网资讯' },
      { name: '娱乐', count: 1085, url: 'https://tophub.today/c/ent', description: '影视、明星与娱乐内容' },
      { name: '社区', count: 243, url: 'https://tophub.today/c/community', description: '社区与讨论平台' },
      { name: '购物', count: 85, url: 'https://tophub.today/c/shopping', description: '购物与消费趋势' },
      { name: '财经', count: 324, url: 'https://tophub.today/c/finance', description: '财经、市场与商业资讯' },
      { name: '开发', count: 290, url: 'https://tophub.today/c/developer', description: '开发者与技术社区' },
      { name: 'AI', count: 215, url: 'https://tophub.today/c/ai', description: '人工智能热门内容' },
      { name: '设计', count: 30, url: 'https://tophub.today/c/design', description: '设计与创意资讯' },
    ],
  },
  {
    title: '资讯与机构',
    items: [
      { name: '简报', count: 120, url: 'https://tophub.today/c/brief', description: '新闻简报与每日精选' },
      { name: '报刊', count: 873, url: 'https://tophub.today/c/epaper', description: '报纸与电子刊物' },
      { name: '校务', count: 352, url: 'https://tophub.today/c/university', description: '高校与教育机构信息' },
      { name: '政务', count: 1063, url: 'https://tophub.today/c/organization', description: '政府与机构公开信息' },
      { name: '专栏', count: 3360, url: 'https://tophub.today/c/blog', description: '媒体、作者与专业专栏' },
    ],
  },
  {
    title: '其他入口',
    items: [
      { name: '苹果', url: 'https://tophub.today/apple', description: 'Apple 平台相关榜单' },
      { name: '小部件', url: 'https://tophub.today/c/widget', description: '今日热榜小部件' },
    ],
  },
];

function NavigationIcon({ stroke }: { stroke?: string }) {
  return (
    <svg
      className="ranking-navigation-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={stroke ? { stroke, color: stroke } : undefined}
    >
      <path d="m20 4-5.6 10.9L4 20l5.6-10.9L20 4Z" />
      <path d="m9.6 9.1 4.8 5.8" />
    </svg>
  );
}

export function RankingNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 820);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!menuOpen || isMobile) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [menuOpen, isMobile]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (drawerOpen) {
        setDrawerOpen(false);
        triggerRef.current?.focus();
      } else if (menuOpen) {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [drawerOpen, menuOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerCloseRef.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input') ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', trapFocus);
    };
  }, [drawerOpen]);

  const filteredGroups = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN');
    if (!keyword) return CATEGORY_GROUPS;
    return CATEGORY_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => (
        `${item.name} ${item.description}`.toLocaleLowerCase('zh-CN').includes(keyword)
      )),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setQuery('');
    if (isMobile) {
      setMenuOpen(true);
    }
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openDrawer = () => {
    if (!isMobile) {
      setMenuOpen(false);
    }
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="ranking-navigation-wrap" ref={menuWrapRef}>
        <button
          ref={triggerRef}
          className={`header-icon-btn${menuOpen || drawerOpen ? ' is-active' : ''}`}
          type="button"
          aria-label="榜单导航"
          title="榜单导航"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls="ranking-navigation-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <NavigationIcon />
        </button>

        {/* 桌面端下拉浮层 */}
        {menuOpen && !isMobile ? (
          <div className="ranking-navigation-menu" id="ranking-navigation-menu" role="menu">
            <div className="ranking-navigation-menu-title">外部榜单</div>
            {RANKING_SITES.map((site) => (
              <a
                key={site.url}
                className="ranking-site-link"
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <span><strong>{site.name}</strong><small>{site.host}</small></span>
              </a>
            ))}
            <div className="ranking-navigation-menu-divider" />
            <button className="ranking-categories-trigger" type="button" role="menuitem" onClick={openDrawer}>
              <span><strong>浏览今日热榜全部分类</strong><small>16 个分类入口</small></span>
              <b aria-hidden="true">→</b>
            </button>
          </div>
        ) : null}
      </div>

      {/* 移动端外部榜单右侧抽屉 */}
      {menuOpen && isMobile && typeof document !== 'undefined' && createPortal(
        <div className="ranking-drawer-layer" role="presentation" style={{ zIndex: 1020 }}>
          <div className="ranking-drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="ranking-drawer ranking-site-drawer" role="dialog" aria-modal="true" aria-label="外部榜单导航">
            <header className="ranking-drawer-head">
              <div className="brand-title" style={{ margin: 0, gap: '8px' }}>
                <span className="brand-icon" aria-hidden="true" style={{ width: 28, height: 28, padding: 5, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                  <NavigationIcon stroke="#fff" />
                </span>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>外部榜单</span>
              </div>
              <button className="ranking-drawer-close" type="button" aria-label="关闭" onClick={() => setMenuOpen(false)}>×</button>
            </header>
            <div className="ranking-drawer-content">
              <div className="ranking-site-list">
                {RANKING_SITES.map((site) => (
                  <a
                    key={site.url}
                    className="ranking-site-card"
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >
                    <div className="ranking-site-info">
                      <strong>{site.name}</strong>
                      <small>{site.host}</small>
                    </div>
                    <span className="ranking-site-arrow" aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
              <div className="ranking-navigation-menu-divider" style={{ margin: '10px 0' }} />
              <button className="ranking-categories-trigger-card" type="button" onClick={openDrawer}>
                <div className="ranking-site-info">
                  <strong>今日热榜全部分类</strong>
                  <small>16 个分类入口</small>
                </div>
                <b aria-hidden="true">→</b>
              </button>
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* 今日热榜分类抽屉（桌面与移动端统一右侧抽屉） */}
      {drawerOpen && typeof document !== 'undefined' && createPortal(
        <div className="ranking-drawer-layer" role="presentation" style={{ zIndex: 1030 }}>
          <div className="ranking-drawer-backdrop" onClick={closeDrawer} />
          <aside ref={drawerRef} className="ranking-drawer" role="dialog" aria-modal="true" aria-labelledby="ranking-drawer-title">
            <header className="ranking-drawer-head">
              <div className="brand-title" style={{ margin: 0, gap: '8px' }}>
                <span className="brand-icon" aria-hidden="true" style={{ width: 28, height: 28, padding: 5, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </span>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>今日分类</span>
              </div>
              <button ref={drawerCloseRef} className="ranking-drawer-close" type="button" aria-label="关闭" title="关闭" onClick={closeDrawer}>×</button>
            </header>

            <div className="ranking-category-search-wrap">
              <label className="ranking-category-search">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索分类…" />
                {query ? <button type="button" aria-label="清除搜索" onClick={() => setQuery('')}>×</button> : null}
              </label>
            </div>

            <div className="ranking-drawer-content">
              {filteredGroups.map((group) => (
                <section className="ranking-category-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="ranking-category-grid">
                    {group.items.map((item) => (
                      <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="ranking-cat-card">
                        <div className="ranking-cat-row">
                          <strong>{item.name}</strong>
                          {item.count !== undefined ? <small className="mobile-category-count">{item.count}</small> : null}
                        </div>
                        <span className="ranking-cat-desc">{item.description}</span>
                      </a>
                    ))}
                  </div>
                </section>
              ))}
              {!filteredGroups.length ? <div className="ranking-category-empty">没有匹配的分类</div> : null}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}

