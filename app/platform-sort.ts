const platformNameCollator = new Intl.Collator('zh-CN-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

export function comparePlatformName(a: string, b: string) {
  const group = (name: string) => {
    const trimmed = name.trim();
    if (/^\d/.test(trimmed)) return 0;
    if (/^[a-z]/i.test(trimmed)) return 1;
    return 2;
  };
  const groupDifference = group(a) - group(b);
  if (groupDifference !== 0) return groupDifference;
  return platformNameCollator.compare(a, b);
}

export function orderFavoritePlatforms<T extends { source: string }>(
  platforms: T[],
  favoriteSources: Iterable<string>,
  manualOrder: string[],
) {
  const sourceSet = new Set(platforms.map((platform) => platform.source));
  const savedOrder = manualOrder.filter((source) => sourceSet.has(source));
  const insertionOrder = [...favoriteSources].filter((source) => sourceSet.has(source));
  const orderedSources = [
    ...savedOrder,
    ...insertionOrder.filter((source) => !savedOrder.includes(source)),
  ];
  const sortIndex = new Map(orderedSources.map((source, index) => [source, index]));
  return platforms.sort((a, b) => (
    (sortIndex.get(a.source) ?? Number.MAX_SAFE_INTEGER) - (sortIndex.get(b.source) ?? Number.MAX_SAFE_INTEGER)
  ));
}

export function reorderSources(sources: string[], dragged: string, target: string) {
  if (dragged === target) return sources;
  const next = sources.filter((source) => source !== dragged);
  const targetIndex = next.indexOf(target);
  if (targetIndex === -1) return sources;
  next.splice(targetIndex, 0, dragged);
  return next;
}
