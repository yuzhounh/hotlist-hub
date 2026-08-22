'use client';

import { AuthButton } from './auth-button';
import { SortModeToggle } from './sort-mode-toggle';
import { ThemeToggle } from './theme-toggle';

type HeaderActionsProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
  sortModeEnabled: boolean;
  onToggleSortMode: () => void;
};

export function HeaderActions({ isRefreshing, onRefresh, sortModeEnabled, onToggleSortMode }: HeaderActionsProps) {
  return (
    <div className="site-header-actions">
      <SortModeToggle enabled={sortModeEnabled} onToggle={onToggleSortMode} />
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
      <ThemeToggle />
      <AuthButton />
    </div>
  );
}
