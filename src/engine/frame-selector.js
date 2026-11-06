// Frame selector: picks a random frame from a storyboard level and works out
// which sprite sheet it is on and where it sits inside that sheet.

/**
 * @param {{count:number, cols:number, rows:number, width:number, height:number}} level
 * @param {() => number} rng  returns a float in [0, 1); injectable for tests
 * @param {{edgeMargin?: number}} opts
 *   edgeMargin: fraction of the video to skip at each end, because intros,
 *   outros and fade-ins are often black frames. Ignored for very short levels.
 */
export function selectFrame(level, rng = Math.random, { edgeMargin = 0.05 } = {}) {
  const { count, cols, rows, width, height } = level;
  const perSheet = cols * rows;

  let lo = 0;
  let hi = count - 1;
  if (count >= 10) {
    lo = Math.floor(count * edgeMargin);
    hi = Math.max(lo, Math.ceil(count * (1 - edgeMargin)) - 1);
  }

  const frameIndex = lo + Math.floor(rng() * (hi - lo + 1));
  const sheetIndex = Math.floor(frameIndex / perSheet);
  const inSheet = frameIndex % perSheet;
  const col = inSheet % cols;
  const row = Math.floor(inSheet / cols);

  return {
    frameIndex,
    sheetIndex,
    col,
    row,
    sx: col * width,
    sy: row * height,
    width,
    height,
  };
}
