// Thumbnail replacer: asks the service worker for a real frame and swaps it
// into the thumbnail <img>. The original source is remembered so everything
// can be restored when the extension is switched off. If no frame is
// available the original thumbnail is simply left in place.
(() => {
  if (self.HF && self.HF.replacer) return;
  const HF = (self.HF = self.HF || {});

  const MAX_REAPPLY = 5; // YouTube sometimes resets src; don't fight it forever

  let states = new WeakMap(); // img -> { vid, state: 'pending'|'done'|'failed', url, reapplied }
  const memo = new Map(); // videoId -> dataUrl, page-lifetime
  const inflight = new Map(); // videoId -> Promise<string|null>

  async function requestFrame(videoId) {
    if (memo.has(videoId)) return memo.get(videoId);
    if (!inflight.has(videoId)) {
      const p = (async () => {
        try {
          const res = await chrome.runtime.sendMessage({ type: 'GET_FRAME', videoId });
          if (res && res.ok && res.dataUrl) {
            memo.set(videoId, res.dataUrl);
            return res.dataUrl;
          }
        } catch {
          /* extension reloaded or worker unavailable: leave original thumbnail */
        }
        return null;
      })().finally(() => inflight.delete(videoId));
      inflight.set(videoId, p);
    }
    return inflight.get(videoId);
  }

  function rememberOriginal(img) {
    if (img.src && !img.src.startsWith('data:')) {
      img.dataset.hfOrig = img.src;
      if (img.hasAttribute('srcset')) img.dataset.hfOrigSrcset = img.getAttribute('srcset');
    }
  }

  function applyUrl(img, url, videoId) {
    img.removeAttribute('srcset');
    img.src = url;
    img.style.objectFit = 'cover';
    img.dataset.honestframe = videoId;
  }

  function handle(img, videoId) {
    const st = states.get(img);

    if (st && st.vid === videoId) {
      // Same video as before. If YouTube put its own thumbnail back, reapply ours.
      if (st.state === 'done' && img.src !== st.url && st.reapplied < MAX_REAPPLY) {
        st.reapplied++;
        rememberOriginal(img);
        applyUrl(img, st.url, videoId);
      }
      return;
    }

    // New thumbnail, or YouTube recycled this <img> for a different video.
    const entry = { vid: videoId, state: 'pending', url: null, reapplied: 0 };
    states.set(img, entry);
    rememberOriginal(img);

    requestFrame(videoId).then((url) => {
      if (states.get(img) !== entry) return; // recycled or reset while waiting
      if (!HF.enabled) return;
      if (!url) {
        entry.state = 'failed';
        return;
      }
      entry.state = 'done';
      entry.url = url;
      applyUrl(img, url, videoId);
    });
  }

  function restoreAll() {
    for (const img of document.querySelectorAll('img[data-honestframe]')) {
      if (img.dataset.hfOrig) img.src = img.dataset.hfOrig;
      if (img.dataset.hfOrigSrcset) img.setAttribute('srcset', img.dataset.hfOrigSrcset);
      img.style.objectFit = '';
      delete img.dataset.honestframe;
      delete img.dataset.hfOrig;
      delete img.dataset.hfOrigSrcset;
    }
    states = new WeakMap();
  }

  function forgetFrames() {
    memo.clear();
  }

  HF.replacer = { handle, restoreAll, forgetFrames };
})();
