# Intervu.AI Lite

**Live:** https://intervu-ai-lite.vercel.app/

Practise a 5-question mock interview in the browser. Pick a role (Software Engineer, Data Analyst, Marketing, Sales), hear each question read aloud, answer by speaking or typing, and get scores out of 100 with tips, a bar chart and a PDF report. No account, no server, no paid API.

Our CodeSlayer team designed Intervu.AI. Afterwards I built my own browser-only version.

## How it works
- Questions come from a built-in bank (`questions.js`, 7 per role, 5 picked at random).
- `speechSynthesis` reads each question aloud. The Web Speech API turns your spoken answer into text (Chrome and Edge). In other browsers you type the answer.
- Scoring is rule-based (`scoring.js`), not AI:
  - Pace: 120–160 words per minute is ideal. Scored only for spoken answers.
  - Filler words: um, uh, like, you know, and similar.
  - Length: 60–180 words is ideal.
  - Key ideas: role keywords for each question.
- Weights: key ideas 35, length 25, pace 20, filler words 20.
- PDF report made in the browser with jsPDF.

## Run locally
Any static server works, for example:

```bash
npx serve .
```

## Tests
The scoring functions have 13 tests (Node 18+, no dependencies):

```bash
npm test
```

## Limits
- Speech recognition in Chrome uses the browser's own speech service, so it needs an internet connection.
- Keyword matching uses simple suffix stemming, and words like "like" or "actually" are always counted as fillers, so scores are a guide, not a grade.
