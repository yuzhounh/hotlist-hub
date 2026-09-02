const platformNameCollator = new Intl.Collator('zh-CN-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

// Bucket each character: 0 = digit, 1 = ASCII letter, 2 = everything else
// (CJK + punctuation). The pinyin collator orders CJK before Latin, so a
// naive whole-string compare would place "X · AI榜" after "X · 曝光榜".
// Splitting into same-bucket runs and comparing bucket-first at every position
// keeps the requested 数字 → 英文字母 → 拼音 order recursively per segment.
function charBucket(ch: string): 0 | 1 | 2 {
  if (ch >= '0' && ch <= '9') return 0;
  if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) return 1;
  return 2;
}

function segmentName(name: string): Array<[0 | 1 | 2, string]> {
  const segments: Array<[0 | 1 | 2, string]> = [];
  let bucket: 0 | 1 | 2 | null = null;
  let buffer = '';
  for (const ch of name) {
    const current = charBucket(ch);
    if (bucket === null) {
      bucket = current;
      buffer = ch;
    } else if (current === bucket) {
      buffer += ch;
    } else {
      segments.push([bucket, buffer]);
      bucket = current;
      buffer = ch;
    }
  }
  if (bucket !== null && buffer) segments.push([bucket, buffer]);
  return segments;
}

export function comparePlatformName(a: string, b: string) {
  const segmentsA = segmentName(a);
  const segmentsB = segmentName(b);
  const length = Math.min(segmentsA.length, segmentsB.length);
  for (let index = 0; index < length; index += 1) {
    const [bucketA, textA] = segmentsA[index];
    const [bucketB, textB] = segmentsB[index];
    if (bucketA !== bucketB) return bucketA - bucketB;
    const difference = platformNameCollator.compare(textA, textB);
    if (difference !== 0) return difference;
  }
  return segmentsA.length - segmentsB.length;
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
