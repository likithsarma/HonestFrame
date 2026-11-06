# Chrome Web Store listing: copy and paste

## Name
HonestFrame

## Summary (max 132 characters)
See the video, not the bait. Replaces YouTube thumbnails with real frames from the video. No account, no tracking.

## Category
Productivity

## Language
English

## Detailed description
Thumbnails are designed to win clicks, not to describe the video. HonestFrame replaces them with a randomly chosen frame from the video itself, so you see what is actually in it before you decide to watch.

What it does
- Replaces thumbnails on YouTube Home, Search results and the recommendations beside a video
- Picks a random real frame from each video (not AI-generated)
- Keeps working as you scroll and navigate
- Leaves the original thumbnail in place when a video has no usable preview frames, such as live streams
- One-click on/off switch and a "Shuffle frames" button

Privacy
- No account, no analytics, no ads, no HonestFrame server
- Frames are made on your device from YouTube's own preview images
- Requests go only to YouTube and its image servers
- Your only saved setting is the on/off switch

Please note: one frame is still only one moment. HonestFrame gives you a more honest preview, but it cannot guarantee that a single frame represents the whole video.

HonestFrame is an independent project and is not affiliated with or endorsed by YouTube or Google.

## Single purpose (Privacy practices tab)
Replace YouTube video thumbnails with frames taken from the videos themselves.

## Permission justifications (Privacy practices tab)
- storage: Saves the user's on/off setting, and holds generated frames for the current browser session.
- Host permission https://www.youtube.com/*: Runs the content script on YouTube pages to find thumbnails, and fetches each video's public watch page (without cookies) to read its preview-image information.
- Host permission https://*.ytimg.com/*: Downloads YouTube's preview image sheets so a single frame can be cropped from them.
- Remote code: No. The extension does not load or run remote code.

## Data usage disclosures (Privacy practices tab)
Select none of the data-collection categories. Confirm all three certifications:
- Not sold or transferred to third parties outside approved use cases
- Not used or transferred for purposes unrelated to the item's single purpose
- Not used or transferred to determine creditworthiness or for lending

## Privacy policy URL
Use the public URL of PRIVACY.md in your GitHub repository, for example:
https://github.com/<your-username>/honestframe/blob/main/PRIVACY.md

## Assets you need to add yourself
- Screenshots: at least 1, ideally 3-5, at 1280x800 (or 640x400). Suggested: Home page before/after, Search results, the popup.
- Store icon: 128x128 (already in assets/icons/icon128.png)
- Small promo tile: 440x280 (optional but recommended)

## Before you submit
1. Register a Chrome Web Store developer account at https://chrome.google.com/webstore/devconsole (one-time US$5 fee).
2. Upload honestframe-store-v0.1.0.zip (manifest.json at the root of the zip).
3. Fill in the tabs above, then submit for review. Review typically takes a few days; extensions with host permissions can take longer.
