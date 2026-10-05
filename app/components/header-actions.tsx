'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AuthButton } from './auth-button';
import { RankingNavigation } from './ranking-navigation';
import { SortModeToggle } from './sort-mode-toggle';
import { ThemeToggle } from './theme-toggle';

type HeaderActionsProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
  sortModeEnabled: boolean;
  sortModeAvailable: boolean;
  onToggleSortMode: () => void;
  theme: 'light' | 'dark';
  themeReady: boolean;
  onToggleTheme: () => void;
  preferenceSyncStatus: 'local' | 'syncing' | 'synced' | 'error';
  onRestoreCloud: () => void;
  onResetSorting: () => void;
  currentCategory?: string;
  onSelectCategory?: (category: string) => void;
  categoryTabCount?: (category: string) => number;
  categoryList?: string[];
};

export function HeaderActions({
  isRefreshing,
  onRefresh,
  sortModeEnabled,
  sortModeAvailable,
  onToggleSortMode,
  theme,
  themeReady,
  onToggleTheme,
  preferenceSyncStatus,
  onRestoreCloud,
  onResetSorting,
  currentCategory = '全部',
  onSelectCategory,
  categoryTabCount,
  categoryList = [],
}: HeaderActionsProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* 桌面端平铺操作区（≥ 820px） */}
      <div className="site-header-actions desktop-header-actions">
        {sortModeAvailable && <SortModeToggle enabled={sortModeEnabled} onToggle={onToggleSortMode} />}
        <RankingNavigation />
        <button
          className={`header-icon-btn header-refresh${isRefreshing ? ' is-spinning' : ''}`}
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isRefreshing ? '更新中' : '刷新数据'}
          title={isRefreshing ? '正在更新当前页…' : '刷新当前页数据'}
        >
          <span className="header-refresh-icon" aria-hidden="true">↻</span>
        </button>
        <ThemeToggle theme={theme} ready={themeReady} onToggle={onToggleTheme} />
        <AuthButton
          syncStatus={preferenceSyncStatus}
          onRestoreCloud={onRestoreCloud}
          onResetSorting={onResetSorting}
        />
      </div>

      {/* 移动端顶栏右侧（< 820px，仅保留汉堡菜单按钮） */}
      <div className="site-header-actions mobile-header-actions">
        <button
          className="header-icon-btn mobile-menu-trigger"
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开功能菜单"
          title="打开功能菜单"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* 移动端右侧抽屉面板 */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="mobile-drawer-layer" role="presentation">
          <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <aside className="mobile-drawer-panel" role="dialog" aria-modal="true" aria-label="快捷设置与导航">
            <div className="mobile-drawer-head">
              <div className="brand-title" style={{ margin: 0, gap: '8px' }}>
                <span className="brand-icon" aria-hidden="true" style={{ width: 28, height: 28, padding: 6, borderRadius: 8 }}>
                  <i style={{ width: 3 }} /><i style={{ width: 3 }} /><i style={{ width: 3 }} />
                </span>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>热榜汇</span>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="关闭菜单"
              >
                ×
              </button>
            </div>

            <div className="mobile-drawer-body">
              {/* 刷新热榜数据 */}
              <div className="mobile-menu-section">
                <span className="mobile-menu-section-title">数据刷新</span>
                <button
                  type="button"
                  className={`mobile-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
                  onClick={() => {
                    onRefresh();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isRefreshing}
                >
                  <span className="mobile-menu-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="header-refresh-icon" aria-hidden="true" style={{ fontSize: '17px', lineHeight: 1 }}>↻</span>
                    {isRefreshing ? '正在更新数据…' : '刷新当前热榜'}
                  </span>
                </button>
              </div>

              {/* 热榜分类导航 */}
              {categoryList.length > 0 && onSelectCategory && (
                <div className="mobile-menu-section">
                  <span className="mobile-menu-section-title">热榜分类</span>
                  <div className="mobile-category-grid">
                    {categoryList.map((cat) => {
                      const isActive = currentCategory === cat;
                      const count = categoryTabCount ? categoryTabCount(cat) : 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          className={`mobile-category-btn${isActive ? ' is-active' : ''}`}
                          onClick={() => {
                            onSelectCategory(cat);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <span className="mobile-category-name">{cat}</span>
                          <span className="mobile-category-count">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 列表控制 */}
              {sortModeAvailable && (
                <div className="mobile-menu-section">
                  <span className="mobile-menu-section-title">列表控制</span>
                  <div className="mobile-menu-item">
                    <span className="mobile-menu-label">自定义卡片排序</span>
                    <SortModeToggle enabled={sortModeEnabled} onToggle={onToggleSortMode} />
                  </div>
                </div>
              )}

              {/* 全网榜单 */}
              <div className="mobile-menu-section">
                <span className="mobile-menu-section-title">全网榜单分类</span>
                <div className="mobile-menu-item">
                  <span className="mobile-menu-label">切换榜单分类</span>
                  <RankingNavigation />
                </div>
              </div>
            </div>

            <div className="mobile-drawer-foot">
              <div className="mobile-menu-item">
                <span className="mobile-menu-label">外观主题</span>
                <ThemeToggle theme={theme} ready={themeReady} onToggle={onToggleTheme} />
              </div>

              <div className="mobile-menu-item mobile-menu-auth">
                <span className="mobile-menu-label">账户与同步</span>
                <AuthButton
                  syncStatus={preferenceSyncStatus}
                  onRestoreCloud={onRestoreCloud}
                  onResetSorting={onResetSorting}
                />
              </div>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}

