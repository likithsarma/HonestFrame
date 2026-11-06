# HonestFrame

> See the video, not the bait.

A privacy-first Chrome extension that replaces YouTube's promotional thumbnails with a randomly chosen real frame from the video itself.

## Why does it exist?

Thumbnails are designed to win clicks, not to describe the video. HonestFrame swaps them for an actual moment from the video so you can decide with a more honest preview. One frame is still only one frame: it improves transparency, it does not guarantee the video matches what you see.

Similar extensions exist (Unthumb, Unclickbait, Clickbait Remover, DeArrow). HonestFrame aims to be a small, reliable, minimal-permission take on the idea.

## Features (v0.1)

- Works on Home, Search results and the watch-page recommendations
- Random frame per video, skipping the first and last 5% (often black)
- Handles infinite scroll and YouTube's in-page navigation
- Only processes thumbnails near the viewport; at most 3 downloads at once
- Cached for the browser session; failed videos are not retried for 10 minutes
- If a video has no usable preview frames (live streams, brand-new uploads) the original thumbnail is left alone. A frame is never invented.
- Popup: on/off switch and "Shuffle frames". Turning it off restores the original thumbnails.

Not in v0.1: Shorts, other browsers, frame-position settings, multiple previews.

## Install (development)

1. Download or clone this folder.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the `honestframe` folder (the one containing `manifest.json`).
4. Open youtube.com. Thumbnails near the top of the page should switch to video frames within a second or two.

After editing code, click the reload icon on the extension's card, then refresh YouTube.

## How it works

```
content script (youtube.com)            service worker
 detector  -> finds thumbnail <img>s     fetch watch page (no cookies), stop streaming
 observer  -> new cards / scroll / nav     as soon as the storyboard spec is found
 replacer  -> asks for a frame  ───────►  parse spec -> pick level -> pick random frame
           <── JPEG data URL ──────────   download sprite sheet -> crop with OffscreenCanvas
```

YouTube publishes a "storyboard" for most videos: sprite sheets of small preview frames. The spec string looks like `baseUrl|w#h#count#cols#rows#interval#name#sigh|...`. HonestFrame picks the sharpest level up to 400 px wide, picks a random frame index, works out which sheet and which cell it is in, and crops it.

The work happens in the service worker rather than the page for two reasons. Content scripts run in an isolated world and cannot read YouTube's `ytInitialPlayerResponse`, so the spec is read from the watch page HTML instead of injecting code into YouTube. And fetching the sprite sheet from the worker avoids cross-origin canvas tainting.

## Project layout

```
manifest.json
src/background/service-worker.js   messaging, concurrency limit, pipeline
src/engine/storyboard.js           spec fetch + parse, URL building
src/engine/frame-selector.js       random frame -> sheet/row/col/pixels
src/engine/image-processor.js      fetch sheet, crop, JPEG
src/engine/cache.js                memory + chrome.storage.session
src/content/detector.js            thumbnail + video ID detection (all selectors live here)
src/content/observer.js            MutationObserver, scroll, navigation
src/content/replacer.js            swap / restore thumbnails
src/content/content.js             entry point and settings
src/popup/                         popup UI
tests/                             unit tests
scripts/check.mjs                  manifest + syntax checks
```

## Development

```
npm test          # unit tests (Node 20+)
npm run check     # manifest, referenced files, syntax
```

Tests cover the spec parser, URL building, streaming spec extraction and frame selection. Detection and replacement run inside YouTube's page and are tested by hand (see below).

### Manual test checklist

- Home, Search and a watch page's sidebar show frames
- Scrolling far down keeps replacing new cards
- Clicking around YouTube without reloading keeps working
- A live stream and a brand-new upload keep their original thumbnails
- Toggle off restores originals; toggle on replaces again
- "Shuffle frames" changes the frames
- DevTools Network tab: requests go only to youtube.com and ytimg.com

## Privacy

- No account, analytics or HonestFrame server
- Permissions: `storage`, and host access to `youtube.com` and `*.ytimg.com`
- The on/off setting is the only thing stored on disk. Frames are kept in session storage, which is cleared when the browser closes.
- The extension does contact YouTube to fetch preview frames. What it never does is send your browsing data or the frames to anyone else.

See [PRIVACY.md](PRIVACY.md) for the full policy.

## Known limitations

- The storyboard format and YouTube's page markup are internal and can change without notice. Selectors are isolated in `detector.js`; the parser is isolated in `storyboard.js`.
- Some videos have letterboxed or low-resolution preview frames.
- Fetching the watch page once per video costs some bandwidth (streaming stops once the spec is found, but it is still more than a thumbnail).
- Review YouTube's terms and the Chrome Web Store policies before publishing.

## Roadmap

- v0.2: better error handling, more page coverage
- v0.3: multiple frame previews, frame-position preferences, Shorts investigation
- v1.0: accessibility pass, Chrome Web Store release

## License

MIT
