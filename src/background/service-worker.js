// HonestFrame service worker.
// Content scripts ask for a frame by video ID; this worker does the network
// and image work (storyboard spec -> sprite sheet -> cropped JPEG) and replies
// with a data URL. All requests go to YouTube / ytimg.com only.

import { fetchSpec, parseSpec, pickLevel, buildSheetUrl } from '../engine/storyboard.js';
import { selectFrame } from '../engine/frame-selector.js';
import { cropFrame } from '../engine/image-processor.js';
import * as cache from '../engine/cache.js';

const MAX_CONCURRENT = 3;
const VIDEO_ID_RE = /^[\w-]{11}$/;

// --- concurrency limiter -------------------------------------------------
let active = 0;
const queue = [];

function limit(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const { task, resolve, reject } = queue.shift();
    active++;
    task()
      .then(resolve, reject)
      .finally(() => {
        active--;
        pump();
      });
  }
}

// --- frame pipeline ------------------------------------------------------
const inflight = new Map(); // videoId -> Promise, so a video is never processed twice at once

async function buildFrame(videoId) {
  const spec = await fetchSpec(videoId);
  if (!spec) throw new Error('no storyboard');

  const parsed = parseSpec(spec);
  const level = pickLevel(parsed);
  if (!level) throw new Error('unusable storyboard');

  const frame = selectFrame(level);
  const sheetUrl = buildSheetUrl(parsed, level, frame.sheetIndex);
  return cropFrame(sheetUrl, frame);
}

async function getFrame(videoId) {
  const cached = await cache.getFrame(videoId);
  if (cached) return { ok: true, dataUrl: cached };
  if (cache.hasRecentFailure(videoId)) return { ok: false, reason: 'recent-failure' };

  if (!inflight.has(videoId)) {
    const p = limit(() => buildFrame(videoId))
      .then(async (dataUrl) => {
        await cache.setFrame(videoId, dataUrl);
        return { ok: true, dataUrl };
      })
      .catch((err) => {
        cache.markFailed(videoId);
        return { ok: false, reason: String(err && err.message ? err.message : err) };
      })
      .finally(() => inflight.delete(videoId));
    inflight.set(videoId, p);
  }
  return inflight.get(videoId);
}

// --- messaging -----------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !msg || typeof msg.type !== 'string') return false;

  if (msg.type === 'GET_FRAME') {
    if (!VIDEO_ID_RE.test(msg.videoId || '')) {
      sendResponse({ ok: false, reason: 'bad-video-id' });
      return false;
    }
    getFrame(msg.videoId).then(sendResponse);
    return true; // keep the channel open for the async reply
  }

  if (msg.type === 'CLEAR_CACHE') {
    cache.clearAll().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
