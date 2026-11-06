import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectFrame } from '../src/engine/frame-selector.js';

const level = { width: 160, height: 90, count: 92, cols: 5, rows: 5 };

test('maps frame index to sheet, row, column and pixel offsets', () => {
  // rng chosen so that frameIndex lands on a known value inside [lo, hi]
  // count=92 -> lo=4, hi=ceil(92*0.95)-1=87, span=84
  const f = selectFrame(level, () => (60 - 4) / 84 + 1e-9); // frameIndex 60
  assert.equal(f.frameIndex, 60);
  assert.equal(f.sheetIndex, 2); // 60 / 25
  assert.equal(f.col, 0); // (60 % 25) = 10 -> 10 % 5
  assert.equal(f.row, 2); // floor(10 / 5)
  assert.equal(f.sx, 0);
  assert.equal(f.sy, 180);
});

test('stays inside the edge margins across the whole rng range', () => {
  for (let i = 0; i <= 1000; i++) {
    const r = Math.min(i / 1000, 0.999999);
    const f = selectFrame(level, () => r);
    assert.ok(f.frameIndex >= 4 && f.frameIndex <= 87, `frame ${f.frameIndex} out of range`);
  }
});

test('never returns a frame beyond the count, even on the last partial sheet', () => {
  for (let i = 0; i < 500; i++) {
    const f = selectFrame(level, Math.random, { edgeMargin: 0 });
    assert.ok(f.frameIndex >= 0 && f.frameIndex < 92);
    assert.ok(f.col < 5 && f.row < 5);
    assert.ok(f.sheetIndex < 4);
  }
});

test('short storyboards ignore the margin and still work', () => {
  const tiny = { width: 160, height: 90, count: 5, cols: 5, rows: 1 };
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(selectFrame(tiny).frameIndex);
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3, 4]);
});

test('single-frame level returns frame 0', () => {
  const one = { width: 48, height: 27, count: 1, cols: 1, rows: 1 };
  const f = selectFrame(one);
  assert.equal(f.frameIndex, 0);
  assert.equal(f.sx, 0);
  assert.equal(f.sy, 0);
});

test('is actually random', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(selectFrame(level).frameIndex);
  assert.ok(seen.size > 20);
});
