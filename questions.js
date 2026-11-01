// Built-in question bank. Keywords are the ideas a good answer usually mentions;
// scoring.js matches them loosely (validate also matches validation).
export const ROLES = {
  software: {
    label: 'Software Engineer',
    questions: [
      { q: 'Tell me about a project you built. What was your role and what did you learn?', keywords: ['project', 'built', 'role', 'team', 'learned', 'challenge', 'result', 'users'] },
      { q: 'How do you find and fix a bug that is hard to reproduce?', keywords: ['log', 'reproduce', 'debug', 'test', 'isolate', 'root', 'monitor', 'hypothesis'] },
      { q: 'Explain the difference between a process and a thread.', keywords: ['process', 'thread', 'memory', 'share', 'concurrency', 'context', 'isolated'] },
      { q: 'How would you design a URL shortener?', keywords: ['hash', 'database', 'cache', 'scale', 'redirect', 'unique', 'collision', 'reads'] },
      { q: 'Describe a time you disagreed with a teammate on a technical decision.', keywords: ['listened', 'data', 'trade', 'agreed', 'compromise', 'result', 'team'] },
      { q: 'What happens when you type a URL into the browser and press Enter?', keywords: ['dns', 'tcp', 'http', 'server', 'request', 'response', 'render', 'tls'] },
      { q: 'How do you make sure your code is good before you ship it?', keywords: ['tests', 'review', 'lint', 'edge', 'refactor', 'automated', 'readable'] },
    ],
  },
  analyst: {
    label: 'Data Analyst',
    questions: [
      { q: 'Walk me through how you would clean a messy dataset.', keywords: ['missing', 'duplicates', 'outliers', 'types', 'null', 'format', 'validate', 'consistent'] },
      { q: 'What is the difference between a LEFT JOIN and an INNER JOIN?', keywords: ['join', 'left', 'inner', 'match', 'null', 'row', 'table'] },
      { q: 'Sales dropped last month. How would you find out why?', keywords: ['segment', 'trend', 'compare', 'season', 'region', 'cause', 'data', 'chart'] },
      { q: 'Tell me about a dashboard or report you made. Who used it?', keywords: ['kpi', 'stakeholder', 'chart', 'metric', 'insight', 'decision', 'filter'] },
      { q: 'How do you decide which chart to use?', keywords: ['compare', 'trend', 'distribution', 'bar', 'line', 'scatter', 'audience'] },
      { q: 'What is a p-value, in simple words?', keywords: ['probability', 'null', 'hypothesis', 'chance', 'significance', 'evidence'] },
      { q: 'How do you check that your analysis is correct?', keywords: ['validate', 'cross', 'sample', 'totals', 'peer', 'review', 'assumptions'] },
    ],
  },
  marketing: {
    label: 'Marketing',
    questions: [
      { q: 'How would you launch a new product on a small budget?', keywords: ['audience', 'channel', 'social', 'content', 'budget', 'measure', 'target', 'campaign'] },
      { q: 'Which metrics would you track for a social media campaign?', keywords: ['reach', 'engagement', 'clicks', 'conversion', 'ctr', 'followers', 'roi', 'impressions'] },
      { q: 'Tell me about a campaign you admire, and why.', keywords: ['audience', 'message', 'brand', 'emotion', 'result', 'creative', 'story'] },
      { q: 'How do you define a target audience?', keywords: ['demographic', 'persona', 'research', 'behaviour', 'needs', 'segment', 'survey'] },
      { q: 'A campaign is underperforming. What do you do?', keywords: ['data', 'test', 'creative', 'audience', 'budget', 'analyse', 'adjust'] },
      { q: 'How would you use SEO to grow website traffic?', keywords: ['keywords', 'content', 'backlinks', 'search', 'ranking', 'page', 'technical'] },
      { q: 'How do you measure brand awareness?', keywords: ['survey', 'search', 'mentions', 'reach', 'recall', 'share', 'traffic'] },
    ],
  },
  sales: {
    label: 'Sales',
    questions: [
      { q: 'Sell me this pen.', keywords: ['need', 'question', 'benefit', 'value', 'problem', 'close', 'customer'] },
      { q: 'A customer says your product is too expensive. What do you say?', keywords: ['value', 'listen', 'benefit', 'roi', 'compare', 'objection', 'options'] },
      { q: 'Tell me about a time you missed a target. What did you change?', keywords: ['target', 'pipeline', 'learned', 'plan', 'follow', 'improved', 'result'] },
      { q: 'How do you build a pipeline of new leads?', keywords: ['prospect', 'referral', 'linkedin', 'calls', 'email', 'network', 'qualify', 'follow'] },
      { q: 'How do you keep a long-term client happy?', keywords: ['trust', 'follow', 'check', 'listen', 'feedback', 'relationship', 'support'] },
      { q: 'What do you do in the first five minutes of a sales call?', keywords: ['rapport', 'questions', 'agenda', 'needs', 'listen', 'research'] },
      { q: 'How do you know when a deal is ready to close?', keywords: ['budget', 'decision', 'timeline', 'signals', 'needs', 'objections', 'commit'] },
    ],
  },
};

export function pickQuestions(roleId, n = 5, rand = Math.random) {
  const pool = [...ROLES[roleId].questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
