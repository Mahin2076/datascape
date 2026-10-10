import test from 'node:test';
import assert from 'node:assert/strict';
import {transition, rankGrowth} from '../dist/story.mjs';

test('playback visits each year and stops at the final year', () => {
  let s = transition({year: 2, playing: false}, {type: 'play'}, 3);
  const years = [s.year];
  while (s.playing) {s = transition(s, {type: 'tick'}, 3); years.push(s.year);}
  assert.deepEqual(years, [0, 1, 2, 3]);
  assert.strictEqual(transition(s, {type: 'tick'}, 3), s);
});
test('scrubbing and pausing cancel playback without mutating state', () => {
  const s = Object.freeze({year: 1, playing: true});
  assert.deepEqual(transition(s, {type: 'seek', year: 2}, 3), {year: 2, playing: false});
  assert.deepEqual(transition(s, {type: 'pause'}, 3), {year: 1, playing: false});
  assert.deepEqual(transition(s, {type: 'reveal'}, 3), {year: 3, playing: false});
  for (const year of [-1, 4, 1.5, NaN]) assert.throws(() => transition(s, {type: 'seek', year}, 3));
});
test('fastest rent includes cities whose income grew faster', () => {
  const cities = [
    {data: [{rent: 100, income: 100}, {rent: 120, income: 140}]},
    {data: [{rent: 100, income: 100}, {rent: 110, income: 101}]}
  ];
  const before = JSON.stringify(cities);
  assert.equal(rankGrowth(cities, 1, 'rent')[0].i, 0);
  assert.equal(rankGrowth(cities, 1)[0].i, 1);
  assert.equal(JSON.stringify(cities), before);
});
test('all cities remain ranked when none has rent outpacing income', () => {
  const cities = [{data: [{rent: 100, income: 100}, {rent: 100, income: 120}]}];
  assert.equal(rankGrowth(cities, 1).length, 1);
});
