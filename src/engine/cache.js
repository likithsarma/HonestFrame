// Cache manager. Cropped frames are small (a few KB), so they are kept in
// memory and mirrored to chrome.storage.session, which lives only until the
// browser closes and is never written to disk. Nothing about what the user
// watched is persisted across browser sessions.

const MAX_MEMORY = 300;
const FAIL_TTL_MS = 10 * 60 * 1000; // don't hammer videos that have no storyboard

const frames = new Map(); // videoId -> dataUrl (insertion order = LRU order)
const failures = new Map(); // videoId -> expiry timestamp

const key = (id) => `f:${id}`;

export async function getFrame(videoId) {
  if (frames.has(videoId)) {
    const v = frames.get(videoId);
    frames.delete(videoId);
    frames.set(videoId, v); // refresh LRU position
    return v;
  }
  try {
    const got = await chrome.storage.session.get(key(videoId));
    const v = got[key(videoId)];
    if (v) {
      remember(videoId, v);
      return v;
    }
  } catch {
    /* session storage unavailable: memory-only is fine */
  }
  return null;
}

export async function setFrame(videoId, dataUrl) {
  remember(videoId, dataUrl);
  try {
    await chrome.storage.session.set({ [key(videoId)]: dataUrl });
  } catch {
    // Quota exceeded: drop the mirror and carry on from memory.
    try {
      await chrome.storage.session.clear();
    } catch {
      /* ignore */
    }
  }
}

function remember(videoId, dataUrl) {
  frames.delete(videoId);
  frames.set(videoId, dataUrl);
  while (frames.size > MAX_MEMORY) {
    frames.delete(frames.keys().next().value);
  }
}

export function markFailed(videoId) {
  failures.set(videoId, Date.now() + FAIL_TTL_MS);
}

export function hasRecentFailure(videoId) {
  const until = failures.get(videoId);
  if (!until) return false;
  if (Date.now() > until) {
    failures.delete(videoId);
    return false;
  }
  return true;
}

export async function clearAll() {
  frames.clear();
  failures.clear();
  try {
    await chrome.storage.session.clear();
  } catch {
    /* ignore */
  }
}
