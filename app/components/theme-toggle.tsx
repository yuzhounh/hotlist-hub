'use client';

export const THEME_KEY = 'rebanghui-theme';

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle({ theme, ready, onToggle }: { theme: 'light' | 'dark'; ready: boolean; onToggle: () => void }) {
  const nextThemeLabel = theme === 'dark' ? '切换浅色模式' : '切换深色模式';

  return (
    <button
      className="header-icon-btn"
      type="button"
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      onClick={onToggle}
      disabled={!ready}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
