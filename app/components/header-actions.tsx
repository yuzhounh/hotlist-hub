'use client';

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
}: HeaderActionsProps) {
  return (
    <div className="site-header-actions">
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
  );
}
