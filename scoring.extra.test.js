import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countWords, countFillers, wordsPerMinute, paceScore, fillerScore, lengthScore,
  keywordScore, weightedOverall, scoreAnswer, scoreSession,
} from './scoring.js';

describe('countWords', () => {
  it('counts words', () => {
    assert.equal(countWords('  Hello,   world! It\'s fine. '), 4);
    assert.equal(countWords(''), 0);
    assert.equal(countWords(undefined), 0);
    assert.equal(countWords(null), 0);
    assert.equal(countWords(42), 1);
  });

  it('handles empty, very long and Unicode input', () => {
    assert.equal(countWords('   '), 0);
    assert.equal(countWords('x'.repeat(10000)), 1);
    assert.equal(countWords('नमस्ते दुनिया hello world'), 4);
    assert.equal(countWords('Héllo wörld 123'), 3);
    assert.equal(countWords(''), 0);
  });
});

describe('countFillers', () => {
  it('finds fillers', () => {
    assert.equal(countFillers('Um, so I uh think, you know, it like works'), 4);
    assert.equal(countFillers('My umbrella is likely erased'), 0);
    assert.equal(countFillers('um um UM'), 3);
    assert.equal(countFillers('like'), 1);
    assert.equal(countFillers('likely'), 0);
    assert.equal(countFillers(' like '), 1);
  });

  it('handles empty, very long and Unicode input', () => {
    assert.equal(countFillers(''), 0);
    assert.equal(countFillers('um '.repeat(5000)), 5000);
    assert.equal(countFillers('नमस्ते दुनिया'), 0);
    assert.equal(countFillers('like आप हैं'), 1);
    assert.equal(countFillers('like like like'), 3);
  });
});

describe('wordsPerMinute', () => {
  it('computes wpm', () => {
    assert.equal(wordsPerMinute(150, 60), 150);
    assert.equal(wordsPerMinute(70, 30), 140);
    assert.equal(wordsPerMinute(10, 0), null);
    assert.equal(wordsPerMinute(0, -1), null);
    assert.equal(wordsPerMinute(0, 0), null);
    assert.equal(wordsPerMinute(0, 60), 0);
  });

  it('handles empty, very long and Unicode input', () => {
    assert.equal(wordsPerMinute(countWords('नमस्ते दुनिया'), 60), 2);
    assert.equal(wordsPerMinute(10000, 60), 10000);
    assert.equal(wordsPerMinute(10000, 0), null);
  });
});

describe('paceScore', () => {
  it('scores pace', () => {
    assert.equal(paceScore(140), 100);
    assert.equal(paceScore(120), 100);
    assert.equal(paceScore(90), 50);
    assert.equal(paceScore(60), 0);
    assert.equal(paceScore(30), 0);
    assert.equal(paceScore(190), 50);
    assert.equal(paceScore(220), 0);
    assert.equal(paceScore(null), null);
    assert.equal(paceScore(undefined), null);
  });
});

describe('fillerScore', () => {
  it('scores fillers', () => {
    assert.equal(fillerScore(0, 100), 100);
    assert.equal(fillerScore(2, 100), 70);
    assert.equal(fillerScore(10, 50), 0);
    assert.equal(fillerScore(0, 0), 0);
    assert.equal(fillerScore(0, null), 0);
    assert.equal(fillerScore(0, undefined), 0);
  });
});

describe('lengthScore', () => {
  it('scores length', () => {
    assert.equal(lengthScore(0), 0);
    assert.equal(lengthScore(30), 50);
    assert.equal(lengthScore(100), 100);
    assert.equal(lengthScore(240), 80);
    assert.equal(lengthScore(1000), 40);
    assert.equal(lengthScore(-5), 0);
    assert.equal(lengthScore(null), 0);
  });
});

describe('keywordScore', () => {
  it('scores keywords', () => {
    const r = keywordScore('We validated the data and removed duplicate rows.', ['validate', 'duplicates', 'outliers']);
    assert.deepEqual(r.matched, ['validate', 'duplicates']);
    assert.deepEqual(r.missing, ['outliers']);
    assert.equal(r.score, 67);
    assert.equal(keywordScore('nothing relevant', ['dns']).score, 0);
    assert.equal(keywordScore('dns tcp http tls', ['dns', 'tcp', 'http', 'tls']).score, 100);
    assert.deepEqual(keywordScore('', [], 3).matched, []);
    assert.deepEqual(keywordScore('   ', ['x']).missing, ['x']);
    assert.equal(keywordScore('Validate', ['validate'], 1).score, 100);
    assert.equal(keywordScore(undefined, ['x']).score, 0);
    assert.equal(keywordScore('नमस्ते दुनिया और पर्यावरण', ['पर्यावरण', 'नमस्ते']).score, 67);
  });
});

describe('weightedOverall', () => {
  it('combines scores', () => {
    assert.equal(weightedOverall({ pace: 100, fillers: 100, length: 100, keywords: 100 }), 100);
    assert.equal(weightedOverall({ pace: null, fillers: 100, length: 0, keywords: 100 }), 69);
    assert.equal(weightedOverall({}), 0);
    assert.equal(weightedOverall({ pace: null }), 0);
    assert.equal(weightedOverall({ pace: 100, fillers: null }), 100);
  });
});

describe('scoreAnswer', () => {
  it('scores an answer', () => {
    const r = scoreAnswer({ text: 'I check the logs, try to reproduce it, then write a test.', keywords: ['log', 'reproduce', 'test'] });
    assert.equal(r.wpm, null);
    assert.equal(r.scores.pace, null);
    assert.equal(r.scores.keywords, 100);
    assert.ok(r.tips.some((t) => t.startsWith('Short answer')));
  });

  it('scores a spoken answer', () => {
    const text = 'um so basically I like um built the project you know '.repeat(8);
    const r = scoreAnswer({ text, seconds: 60, keywords: ['project', 'built', 'team'] });
    assert.equal(r.wordCount, 88);
    assert.equal(r.wpm, 88);
    assert.ok(r.scores.pace < 100);
    assert.equal(r.scores.fillers, 0);
    assert.ok(r.tips.some((t) => t.includes('a little slow')));
    assert.ok(r.tips.some((t) => t.includes('filler')));
  });

  it('handles empty, very long and Unicode input', () => {
    const empty = scoreAnswer({ text: '', seconds: 10, keywords: ['x'] });
    assert.equal(empty.overall, 0);
    assert.deepEqual(empty.tips, ['No answer recorded. Even a short answer scores better than none.']);

    const big = scoreAnswer({ text: ' '.repeat(100000), seconds: 60, keywords: [] });
    assert.equal(big.wordCount, 0);
    assert.equal(big.scores.length, 0);
    assert.equal(big.overall, 0);

    const hindi = scoreAnswer({ text: 'नमस्ते दुनिया', seconds: 60, keywords: [] });
    assert.equal(hindi.wordCount, 2);
    assert.equal(Object.keys(hindi.scores).length, 4);
    assert.ok(Number.isFinite(hindi.overall));
  });
});

describe('scoreSession', () => {
  it('averages answers', () => {
    const s = scoreSession([
      { overall: 80, scores: { pace: 100, fillers: 60, length: 100, keywords: 67 } },
      { overall: 60, scores: { pace: null, fillers: 100, length: 50, keywords: 33 } },
    ]);
    assert.equal(s.overall, 70);
    assert.deepEqual(s.categories, { pace: 100, fillers: 80, length: 75, keywords: 50 });
  });

  it('handles empty and null', () => {
    assert.equal(scoreSession([]).overall, 0);
    assert.deepEqual(scoreSession([]).categories, { pace: null, fillers: null, length: null, keywords: null });
    assert.deepEqual(scoreSession([{ overall: null, scores: { pace: 50 } }]).categories, { pace: 50, fillers: null, length: null, keywords: null });
  });
});
