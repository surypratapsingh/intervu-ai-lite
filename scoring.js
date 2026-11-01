// Rule-based answer scoring. Pure functions, no DOM, so they run in Node tests too.

// ponytail: "like" and "actually" are sometimes real words, so filler counts run a little high.
export const FILLERS = ['um', 'umm', 'uh', 'uhh', 'uhm', 'er', 'erm', 'ah', 'like', 'basically', 'actually', 'literally', 'you know', 'i mean', 'kind of', 'sort of'];
export const WEIGHTS = { pace: 20, fillers: 20, length: 25, keywords: 35 };
export const IDEAL_WPM = [120, 160];
export const IDEAL_WORDS = [60, 180];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const normalise = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const countWords = (text) => (normalise(text).match(/[a-z0-9']+/g) || []).length;

export function countFillers(text) {
  const t = normalise(text);
  return FILLERS.reduce((n, f) => n + (t.match(new RegExp(`(?<![a-z0-9'])${f}(?![a-z0-9'])`, 'g')) || []).length, 0);
}

export const wordsPerMinute = (wordCount, seconds) => (seconds > 0 ? Math.round(wordCount / (seconds / 60)) : null);

// 100 inside 120-160 wpm, falling to 0 at 60 and 220.
export function paceScore(wpm) {
  if (wpm == null) return null;
  const [lo, hi] = IDEAL_WPM;
  if (wpm >= lo && wpm <= hi) return 100;
  return clamp(100 - (wpm < lo ? lo - wpm : wpm - hi) * (100 / 60));
}

// Each filler per 100 words costs 15 points.
export const fillerScore = (fillers, wordCount) => (wordCount ? clamp(100 - (fillers / wordCount) * 100 * 15) : 0);

// 100 for 60-180 words; shorter scales down to 0, longer loses a point per 3 words, never below 40.
export function lengthScore(wordCount) {
  const [lo, hi] = IDEAL_WORDS;
  if (wordCount < lo) return clamp((wordCount / lo) * 100);
  if (wordCount <= hi) return 100;
  return clamp(Math.max(40, 100 - (wordCount - hi) / 3));
}

// ponytail: naive suffix stemming (validate ~ validation); a real stemmer if keyword misses show up.
const stem = (kw) => (kw.length > 4 ? kw.replace(/(ation|ing|ed|es|s|e)$/, '') : kw);

export function keywordScore(text, keywords, target = 3) {
  const t = normalise(text);
  const matched = keywords.filter((kw) => new RegExp(`(?<![a-z0-9])${stem(kw.toLowerCase())}`).test(t));
  return { score: clamp((matched.length / target) * 100), matched, missing: keywords.filter((k) => !matched.includes(k)) };
}

export function weightedOverall(scores) {
  let sum = 0, weight = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    if (scores[k] == null) continue;
    sum += scores[k] * w;
    weight += w;
  }
  return weight ? Math.round(sum / weight) : 0;
}

// seconds = time spent speaking; null when the answer was typed (pace is then not scored).
export function scoreAnswer({ text, seconds = null, keywords = [] }) {
  const wordCount = countWords(text);
  const fillers = countFillers(text);
  const wpm = seconds ? wordsPerMinute(wordCount, seconds) : null;
  const kw = keywordScore(text, keywords);
  const scores = { pace: paceScore(wpm), fillers: fillerScore(fillers, wordCount), length: lengthScore(wordCount), keywords: kw.score };
  const result = { wordCount, fillers, wpm, matched: kw.matched, missing: kw.missing, scores, overall: weightedOverall(scores) };
  result.tips = tipsFor(result);
  return result;
}

export function tipsFor({ wordCount, fillers, wpm, scores, missing }) {
  if (!wordCount) return ['No answer recorded. Even a short answer scores better than none.'];
  const tips = [];
  if (wpm != null && wpm < IDEAL_WPM[0]) tips.push(`You spoke at ${wpm} words per minute, a little slow. Aim for 120–160.`);
  if (wpm != null && wpm > IDEAL_WPM[1]) tips.push(`You spoke at ${wpm} words per minute, a little fast. Pause between points and aim for 120–160.`);
  if (scores.fillers < 70) tips.push(`You used ${fillers} filler word${fillers === 1 ? '' : 's'} (um, like, you know…). A short silent pause sounds more confident.`);
  if (wordCount < IDEAL_WORDS[0]) tips.push(`Short answer (${wordCount} words). Add an example: the situation, what you did, and the result.`);
  if (wordCount > IDEAL_WORDS[1]) tips.push(`Long answer (${wordCount} words). Lead with your main point, then give one example.`);
  if (scores.keywords < 100 && missing.length) tips.push(`Mention key ideas such as ${missing.slice(0, 3).join(', ')}.`);
  return tips.length ? tips : ['Strong answer. Keep this structure.'];
}

const avg = (xs) => {
  const v = xs.filter((x) => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

export function scoreSession(results) {
  const categories = {};
  for (const k of Object.keys(WEIGHTS)) categories[k] = avg(results.map((r) => r.scores[k]));
  return { overall: avg(results.map((r) => r.overall)) ?? 0, categories };
}
