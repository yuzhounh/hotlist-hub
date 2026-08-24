'use client';

function SortHandleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="4.5" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="4.5" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="11.5" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="11.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

type SortModeToggleProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function SortModeToggle({ enabled, onToggle }: SortModeToggleProps) {
  return (
    <button
      className={`header-icon-btn sort-mode-toggle${enabled ? ' is-active' : ''}`}
      type="button"
      aria-label={enabled ? '退出排序模式' : '开启排序模式'}
      aria-pressed={enabled}
      title={enabled ? '退出排序模式' : '开启排序模式'}
      onClick={onToggle}
    >
      <SortHandleIcon />
    </button>
  );
}
