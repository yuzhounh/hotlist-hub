const ITEM_METRIC_LABELS: Record<string, '热度' | '阅读' | '播放' | '实时讨论'> = {
  'newsnow:baidu': '热度',
  'newsnow:cls-hot': '阅读',
  'newsnow:douyin': '热度',
  'newsnow:toutiao': '热度',
  'dailyhot:qq-news': '热度',
  'dailyhot:kuaishou': '热度',
  'direct:music-bilibili': '热度',
  'newsnow:weibo': '热度',
  'direct:bilibili-popular-all': '播放',
  'newsnow:tieba': '实时讨论',
  'dailyhot:36kr': '阅读',
};

export function formatItemMetric(source: string, value?: string | false) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  const label = ITEM_METRIC_LABELS[source];
  if (!label) return trimmed || undefined;

  const numeric = Number(
    trimmed
      .replace(/^(?:热度|阅读|播放)\s*/u, '')
      .replaceAll(',', '')
      .trim(),
  );
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

  const wan = numeric / 10_000;
  const formatted = wan < 0.05
    ? '<0.1'
    : wan.toFixed(1);
  return `${formatted}万${label}`;
}
