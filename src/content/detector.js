// Video detector: finds YouTube thumbnail <img> elements and the video ID
// each one belongs to. Selectors live here and only here, so when YouTube
// changes its markup this is the one file to touch.
(() => {
  if (self.HF && self.HF.findThumbnails) return;
  const HF = (self.HF = self.HF || {});

  // Pages we handle in the MVP: Home, Search results, and the watch-page sidebar.
  const SUPPORTED_PATHS = ['/', '/results', '/watch'];

  // Old layout (ytd-thumbnail) and the newer lockup layout (yt-thumbnail-view-model).
  const THUMB_IMG = 'ytd-thumbnail img, yt-thumbnail-view-model img';

  // Hover / inline-preview players carry their own images; leave them alone.
  const SKIP_ANCESTORS = 'ytd-video-preview, ytd-moving-thumbnail-renderer, #video-preview';

  HF.isSupportedPage = () => SUPPORTED_PATHS.includes(location.pathname);

  HF.videoIdFromHref = (href) => {
    try {
      const u = new URL(href, location.origin);
      if (u.pathname !== '/watch') return null; // also excludes /shorts/...
      const v = u.searchParams.get('v');
      return v && /^[\w-]{11}$/.test(v) ? v : null;
    } catch {
      return null;
    }
  };

  /** @returns {Array<{img: HTMLImageElement, videoId: string}>} */
  HF.findThumbnails = (root = document) => {
    const found = [];
    for (const img of root.querySelectorAll(THUMB_IMG)) {
      if (img.closest(SKIP_ANCESTORS)) continue;
      const a = img.closest('a[href]');
      if (!a) continue;
      const videoId = HF.videoIdFromHref(a.getAttribute('href'));
      if (videoId) found.push({ img, videoId });
    }
    return found;
  };
})();
