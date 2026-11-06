import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSpec,
  pickLevel,
  sheetCount,
  buildSheetUrl,
  extractSpecFromHtml,
  fetchSpec,
} from '../src/engine/storyboard.js';

// Modeled on the real spec format: baseUrl|w#h#count#cols#rows#intervalMs#name#sigh|...
const SPEC =
  'https://i.ytimg.com/sb/abcDEF12345/storyboard3_L$L/$N.jpg?sqp=SQP' +
  '|48#27#100#10#10#0#default#rs$AAA' +
  '|80#45#92#10#10#2000#M$M#rs$BBB' +
  '|160#90#92#5#5#2000#M$M#rs$CCC' +
  '|320#180#92#3#3#2000#M$M#rs$DDD';

test('parseSpec reads every level', () => {
  const p = parseSpec(SPEC);
  assert.equal(p.levels.length, 4);
  assert.deepEqual(
    { w: p.levels[2].width, h: p.levels[2].height, n: p.levels[2].count, c: p.levels[2].cols, r: p.levels[2].rows },
    { w: 160, h: 90, n: 92, c: 5, r: 5 },
  );
  assert.equal(p.levels[2].index, 2);
  assert.equal(p.levels[2].sigh, 'rs$CCC');
});

test('parseSpec rejects garbage', () => {
  assert.equal(parseSpec(''), null);
  assert.equal(parseSpec(null), null);
  assert.equal(parseSpec('not a spec'), null);
  assert.equal(parseSpec('http://insecure/x|1#1#1#1#1#0#n#s'), null);
  assert.equal(parseSpec('https://x/$L|bad#level'), null);
});

test('parseSpec skips malformed levels but keeps good ones', () => {
  const p = parseSpec('https://x/$L/$N.jpg|oops|160#90#10#5#5#1000#M$M#sig');
  assert.equal(p.levels.length, 1);
  assert.equal(p.levels[0].index, 1);
});

test('pickLevel prefers the sharpest level within the width cap', () => {
  const p = parseSpec(SPEC);
  assert.equal(pickLevel(p).width, 320);
  assert.equal(pickLevel(p, { maxWidth: 200 }).width, 160);
});

test('pickLevel ignores levels with too few frames', () => {
  const p = parseSpec('https://x/$L/$N.jpg|320#180#1#1#1#0#default#s|160#90#40#5#5#1000#M$M#s');
  assert.equal(pickLevel(p).width, 160);
});

test('sheetCount splits frames across sheets', () => {
  const p = parseSpec(SPEC);
  assert.equal(sheetCount(p.levels[2]), 4); // 92 frames / 25 per sheet
  assert.equal(sheetCount(p.levels[3]), 11); // 92 / 9
});

test('buildSheetUrl fills $L, $N, $M and appends sigh', () => {
  const p = parseSpec(SPEC);
  const url = buildSheetUrl(p, p.levels[2], 3);
  assert.equal(url, 'https://i.ytimg.com/sb/abcDEF12345/storyboard3_L2/M3.jpg?sqp=SQP&sigh=rs$CCC');
});

test('buildSheetUrl starts a query string when the base has none', () => {
  const p = parseSpec('https://x/$L/$N.jpg|160#90#40#5#5#1000#M$M#sig');
  assert.equal(buildSheetUrl(p, p.levels[0], 0), 'https://x/0/M0.jpg?sigh=sig');
});

test('extractSpecFromHtml decodes JSON escapes', () => {
  const html = '..."storyboards":{"playerStoryboardSpecRenderer":{"spec":"https://x/$L?a=1\\u0026b=2|1#1#1#1#1#0#n#s"},"other":1}...';
  assert.equal(extractSpecFromHtml(html), 'https://x/$L?a=1&b=2|1#1#1#1#1#0#n#s');
});

test('extractSpecFromHtml returns null when absent', () => {
  assert.equal(extractSpecFromHtml('<html>no storyboards here</html>'), null);
});

function streamOf(text, chunkSize) {
  const bytes = new TextEncoder().encode(text);
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(i, i + chunkSize));
      i += chunkSize;
    },
  });
}

test('fetchSpec finds a spec split across stream chunks', async () => {
  const html = 'x'.repeat(5000) + '"playerStoryboardSpecRenderer":{"spec":"https://x/$L|1#1#1#1#1#0#n#s"}' + 'y'.repeat(5000);
  const fake = async () => ({ ok: true, status: 200, body: streamOf(html, 37) });
  assert.equal(await fetchSpec('abcDEF12345', fake), 'https://x/$L|1#1#1#1#1#0#n#s');
});

test('fetchSpec returns null for pages without a storyboard', async () => {
  const fake = async () => ({ ok: true, status: 200, body: streamOf('<html>live stream</html>', 10) });
  assert.equal(await fetchSpec('abcDEF12345', fake), null);
});

test('fetchSpec throws on HTTP errors', async () => {
  const fake = async () => ({ ok: false, status: 429, body: null });
  await assert.rejects(() => fetchSpec('abcDEF12345', fake), /429/);
});
