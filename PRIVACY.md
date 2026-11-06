# HonestFrame Privacy Policy

Last updated: 6 November 2026

HonestFrame is a browser extension that replaces YouTube thumbnails with frames taken from the videos themselves. This policy explains what it does with your data.

## What HonestFrame collects

Nothing. HonestFrame has no accounts, no analytics, no advertising and no server of its own. The developer receives no data from your browser.

## What HonestFrame does on your device

- **Settings:** your on/off choice is saved in your browser (`chrome.storage.local`).
- **Frames:** the small preview images it creates are held in memory and in `chrome.storage.session`. Session storage is cleared when you close the browser and is never written to disk.
- **Video IDs:** the IDs of videos visible on the page are used to request preview frames. They are not stored beyond the browser session and are not sent anywhere except to YouTube, as described below.

## Network requests

To build a frame, HonestFrame requests two things, only from Google/YouTube servers:

1. The public watch page of a video on `www.youtube.com`, sent without your cookies, to read the video's preview-image information.
2. A preview image sheet from `*.ytimg.com`.

These requests go directly from your browser to YouTube. They are subject to YouTube's and Google's own privacy policies. HonestFrame sends nothing to any other party.

## Permissions

- `storage`: save your setting and the session cache.
- Access to `www.youtube.com`: run on YouTube pages and read video preview information.
- Access to `*.ytimg.com`: download preview image sheets.

## Remote code

HonestFrame does not load or run code from any remote source.

## Children

HonestFrame does not knowingly collect information from anyone, including children.

## Changes

If this policy changes, the new version will be published in the project's repository with an updated date.

## Contact

Open an issue on the project's GitHub repository.
