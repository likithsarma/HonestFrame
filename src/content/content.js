// Content script entry point: wires settings, scanning and the replacer together.
(async () => {
  const HF = self.HF;
  if (!HF || HF.started) return;
  HF.started = true;
  HF.enabled = true;

  try {
    const { enabled } = await chrome.storage.local.get('enabled');
    HF.enabled = enabled !== false; // on by default
  } catch {
    /* storage unavailable: stay enabled */
  }

  // Only work on thumbnails near the viewport, so a long page doesn't fire
  // hundreds of requests at once.
  function nearViewport(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const margin = window.innerHeight * 1.5;
    return r.bottom > -margin && r.top < window.innerHeight + margin;
  }

  function scan() {
    if (!HF.enabled || !HF.isSupportedPage()) return;
    for (const { img, videoId } of HF.findThumbnails()) {
      if (nearViewport(img)) HF.replacer.handle(img, videoId);
    }
  }

  HF.startObserver(scan);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.enabled) {
      HF.enabled = changes.enabled.newValue !== false;
      if (HF.enabled) scan();
      else HF.replacer.restoreAll();
    }

    if (changes.shuffleAt) {
      HF.replacer.restoreAll();
      HF.replacer.forgetFrames();
      if (HF.enabled) scan();
    }
  });

  scan();
})();
