// Image processor: downloads a storyboard sprite sheet and crops one frame.
// Runs in the extension service worker, where fetch is not subject to the
// page's CORS rules (host_permissions cover ytimg.com) and OffscreenCanvas
// is available. Doing it here also means the canvas is never tainted.

/** Fetch a sprite sheet and crop the frame described by `rect` to a JPEG data URL. */
export async function cropFrame(sheetUrl, rect, fetchImpl = fetch) {
  const res = await fetchImpl(sheetUrl, { credentials: 'omit' });
  if (!res.ok) throw new Error(`sprite sheet HTTP ${res.status}`);

  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    // Refuse to guess: if the frame lies outside the sheet, the metadata
    // and the image disagree and we would be showing garbage.
    if (rect.sx + rect.width > bitmap.width || rect.sy + rect.height > bitmap.height) {
      throw new Error('frame outside sprite sheet bounds');
    }
    const canvas = new OffscreenCanvas(rect.width, rect.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, rect.sx, rect.sy, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return await blobToDataUrl(out);
  } finally {
    bitmap.close();
  }
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const STEP = 0x8000;
  for (let i = 0; i < bytes.length; i += STEP) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}
