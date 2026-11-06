// Observer: re-scans the page when YouTube adds cards (infinite scroll),
// navigates without a reload (SPA), or the user scrolls/resizes.
// Everything funnels into one debounced callback.
(() => {
  if (self.HF && self.HF.startObserver) return;
  const HF = (self.HF = self.HF || {});

  const DEBOUNCE_MS = 200;

  HF.startObserver = (onChange) => {
    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        onChange();
      }, DEBOUNCE_MS);
    };

    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href'],
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('yt-navigate-finish', schedule);

    return () => {
      mo.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('yt-navigate-finish', schedule);
      if (timer) clearTimeout(timer);
    };
  };
})();
