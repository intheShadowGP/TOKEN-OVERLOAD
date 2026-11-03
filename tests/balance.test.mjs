import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './simulate.mjs';

test('équilibrage : premières parties ni triviales ni interminables (joueur glouton, 4 clics/s)', () => {
  const runs = simulate({ runs: 3, quiet: true });
  assert.equal(runs.length, 3);
  const [first, second, third] = runs.map((r) => r.time / 60);
  assert.ok(first >= 10 && first <= 60, `1re renaissance en ${first.toFixed(1)} min`);
  assert.ok(second >= 10 && second <= 90, `2e renaissance en ${second.toFixed(1)} min`);
  assert.ok(third >= 5 && third <= 90, `3e renaissance en ${third.toFixed(1)} min`);
});
