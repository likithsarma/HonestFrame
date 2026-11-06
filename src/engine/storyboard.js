// Storyboard engine: fetches and parses YouTube's storyboard spec.
//
// The spec is an internal YouTube detail, not a public API. It looks like:
//   baseUrl|level0|level1|...
// where each level is:
//   width#height#frameCount#columns#rows#intervalMs#name#sigh
// and baseUrl contains the placeholders $L (level index) and $N (name),
// while name may contain $M (sheet index).

const SPEC_RE = /"playerStoryboardSpecRenderer":\{"spec":"((?:[^"\\]|\\.)*)"/;
const MAX_BYTES = 3 * 1024 * 1024; // give up if the spec is not in the first 3 MB
const OVERLAP = 4000; // spec strings are ~1 KB; keep a tail so a match can't be split across chunks

/**
 * Parse a raw storyboard spec string.
 * @returns {{baseUrl: string, levels: Array<object>} | null}
 */
export function parseSpec(spec) {
  if (typeof spec !== 'string' || !spec.includes('|')) return null;
  const parts = spec.split('|');
  const baseUrl = parts[0];
  if (!baseUrl.startsWith('https://')) return null;

  const levels = [];
  for (let i = 1; i < parts.length; i++) {
    const f = parts[i].split('#');
    if (f.length < 8) continue;
    const width = parseInt(f[0], 10);
    const height = parseInt(f[1], 10);
    const count = parseInt(f[2], 10);
    const cols = parseInt(f[3], 10);
    const rows = parseInt(f[4], 10);
    const intervalMs = parseInt(f[5], 10);
    const name = f[6];
    const sigh = f.slice(7).join('#'); // sigh never contains '#', but be safe
    if (![width, height, count, cols, rows].every((n) => Number.isFinite(n) && n > 0)) continue;
    levels.push({
      index: i - 1, // matches $L in the base URL
      width,
      height,
      count,
      cols,
      rows,
      intervalMs: Number.isFinite(intervalMs) ? intervalMs : 0,
      name,
      sigh,
    });
  }
  return levels.length ? { baseUrl, levels } : null;
}

/**
 * Choose the level to sample from: the sharpest level that is still small
 * enough to be cheap to download, with enough frames to be worth sampling.
 */
export function pickLevel(parsed, { maxWidth = 400, minFrames = 4 } = {}) {
  if (!parsed) return null;
  const usable = parsed.levels.filter((l) => l.count >= minFrames);
  const pool = usable.length ? usable : parsed.levels;
  const fitting = pool.filter((l) => l.width <= maxWidth);
  const candidates = fitting.length ? fitting : pool;
  return candidates.reduce((best, l) => (l.width > best.width ? l : best), candidates[0]);
}

/** Number of sprite sheets a level is split across. */
export function sheetCount(level) {
  return Math.ceil(level.count / (level.cols * level.rows));
}

/** Build the URL of one sprite sheet of a level. */
export function buildSheetUrl(parsed, level, sheetIndex) {
  let url = parsed.baseUrl
    .replace('$L', String(level.index))
    .replace('$N', level.name)
    .replace('$M', String(sheetIndex));
  if (level.sigh) url += (url.includes('?') ? '&' : '?') + 'sigh=' + level.sigh;
  return url;
}

/** Pull the spec string out of watch-page HTML (or a chunk of it). */
export function extractSpecFromHtml(html) {
  const m = SPEC_RE.exec(html);
  if (!m) return null;
  try {
    return JSON.parse('"' + m[1] + '"'); // decodes & and friends
  } catch {
    return null;
  }
}

/**
 * Fetch the storyboard spec for a video. Streams the watch page and stops as
 * soon as the spec has been seen, so we download a fraction of the page.
 * Cookies are not sent, so nothing about the user's account is involved.
 * @returns {Promise<string|null>} raw spec, or null when the video has none
 *   (live streams, premieres, very new uploads, unavailable videos)
 */
export async function fetchSpec(videoId, fetchImpl = fetch) {
  const res = await fetchImpl(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
    credentials: 'omit',
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!res.ok || !res.body) throw new Error(`watch page HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let tail = '';
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      const window = tail + decoder.decode(value, { stream: true });
      const spec = extractSpecFromHtml(window);
      if (spec) return spec;
      tail = window.slice(-OVERLAP);
      if (total > MAX_BYTES) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return null;
}
