import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countWords, countFillers, wordsPerMinute, paceScore, fillerScore, lengthScore,
  keywordScore, weightedOverall, scoreAnswer, scoreSession, tipsFor,
} from './scoring.js';
import { ROLES, pickQuestions } from './questions.js';

test('tipsFor: empty answer gets one tip', () => {
  assert.deepEqual(tipsFor({ wordCount: 0, fillers: 0, wpm: null, scores: { fillers: 100, keywords: 100 }, missing: [] }),
    ['No answer recorded. Even a short answer scores better than none.']);
});

test('tipsFor: slow pace, fillers and missing key ideas each add a tip', () => {
  const tips = tipsFor({ wordCount: 100, fillers: 1, wpm: 90, scores: { fillers: 50, keywords: 33 }, missing: ['dns', 'tcp', 'http', 'tls'] });
  assert.equal(tips.length, 3);
  assert.match(tips[0], /90 words per minute, a little slow/);
  assert.match(tips[1], /^You used 1 filler word \(/);
  assert.equal(tips[2], 'Mention key ideas such as dns, tcp, http.');
});

test('tipsFor: short and long answers, and a strong answer', () => {
  const ok = { fillers: 100, keywords: 100 };
  assert.match(tipsFor({ wordCount: 10, fillers: 0, wpm: 140, scores: ok, missing: [] })[0], /^Short answer \(10 words\)/);
  assert.match(tipsFor({ wordCount: 200, fillers: 0, wpm: 140, scores: ok, missing: [] })[0], /^Long answer \(200 words\)/);
  assert.deepEqual(tipsFor({ wordCount: 100, fillers: 0, wpm: 140, scores: ok, missing: [] }), ['Strong answer. Keep this structure.']);
});

test('countWords ignores punctuation and extra spaces', () => {
  assert.equal(countWords('  Hello,   world! It\'s fine. '), 4);
  assert.equal(countWords(''), 0);
  assert.equal(countWords(undefined), 0);
});

test('countFillers finds single and multi-word fillers, not parts of words', () => {
  assert.equal(countFillers('Um, so I uh think, you know, it like works'), 4);
  assert.equal(countFillers('My umbrella is likely erased'), 0);
  assert.equal(countFillers('um um UM'), 3);
});

test('wordsPerMinute', () => {
  assert.equal(wordsPerMinute(150, 60), 150);
  assert.equal(wordsPerMinute(70, 30), 140);
  assert.equal(wordsPerMinute(10, 0), null);
});

test('paceScore is 100 in 120-160 and 0 at 60 or 220', () => {
  assert.equal(paceScore(140), 100);
  assert.equal(paceScore(120), 100);
  assert.equal(paceScore(90), 50);
  assert.equal(paceScore(60), 0);
  assert.equal(paceScore(30), 0);
  assert.equal(paceScore(190), 50);
  assert.equal(paceScore(220), 0);
  assert.equal(paceScore(null), null);
});

test('fillerScore drops 15 points per filler per 100 words', () => {
  assert.equal(fillerScore(0, 100), 100);
  assert.equal(fillerScore(2, 100), 70);
  assert.equal(fillerScore(10, 50), 0);
  assert.equal(fillerScore(0, 0), 0);
});

test('lengthScore', () => {
  assert.equal(lengthScore(0), 0);
  assert.equal(lengthScore(30), 50);
  assert.equal(lengthScore(100), 100);
  assert.equal(lengthScore(240), 80);
  assert.equal(lengthScore(1000), 40);
});

test('keywordScore matches word forms and lists what is missing', () => {
  const r = keywordScore('We validated the data and removed duplicate rows.', ['validate', 'duplicates', 'outliers']);
  assert.deepEqual(r.matched, ['validate', 'duplicates']);
  assert.deepEqual(r.missing, ['outliers']);
  assert.equal(r.score, 67);
  assert.equal(keywordScore('nothing relevant', ['dns']).score, 0);
  assert.equal(keywordScore('dns tcp http tls', ['dns', 'tcp', 'http', 'tls']).score, 100);
});

test('weightedOverall skips missing categories', () => {
  assert.equal(weightedOverall({ pace: 100, fillers: 100, length: 100, keywords: 100 }), 100);
  assert.equal(weightedOverall({ pace: null, fillers: 100, length: 0, keywords: 100 }), 69);
  assert.equal(weightedOverall({}), 0);
});

test('scoreAnswer: typed answer has no pace score', () => {
  const r = scoreAnswer({ text: 'I check the logs, try to reproduce it, then write a test.', keywords: ['log', 'reproduce', 'test'] });
  assert.equal(r.wpm, null);
  assert.equal(r.scores.pace, null);
  assert.equal(r.scores.keywords, 100);
  assert.ok(r.tips.some((t) => t.startsWith('Short answer')));
});

test('scoreAnswer: spoken answer scores pace and flags fillers', () => {
  const text = 'um so basically I like um built the project you know '.repeat(8);
  const r = scoreAnswer({ text, seconds: 60, keywords: ['project', 'built', 'team'] });
  assert.equal(r.wordCount, 88);
  assert.equal(r.wpm, 88);
  assert.ok(r.scores.pace < 100);
  assert.equal(r.scores.fillers, 0);
  assert.ok(r.tips.some((t) => t.includes('a little slow')));
  assert.ok(r.tips.some((t) => t.includes('filler')));
});

test('scoreAnswer: empty answer scores 0 with one tip', () => {
  const r = scoreAnswer({ text: '', seconds: 10, keywords: ['x'] });
  assert.equal(r.overall, 0);
  assert.deepEqual(r.tips, ['No answer recorded. Even a short answer scores better than none.']);
});

test('scoreSession averages answers and ignores missing pace', () => {
  const s = scoreSession([
    { overall: 80, scores: { pace: 100, fillers: 60, length: 100, keywords: 67 } },
    { overall: 60, scores: { pace: null, fillers: 100, length: 50, keywords: 33 } },
  ]);
  assert.equal(s.overall, 70);
  assert.deepEqual(s.categories, { pace: 100, fillers: 80, length: 75, keywords: 50 });
});

test('question bank: every role has at least 5 questions with keywords', () => {
  assert.deepEqual(Object.keys(ROLES), ['software', 'analyst', 'marketing', 'sales']);
  for (const role of Object.values(ROLES)) {
    assert.ok(role.questions.length >= 5);
    for (const q of role.questions) assert.ok(q.q && q.keywords.length >= 5);
  }
  const picked = pickQuestions('sales', 5);
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked.map((q) => q.q)).size, 5);
});
