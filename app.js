import { ROLES, pickQuestions } from './questions.js';
import { scoreAnswer, scoreSession } from './scoring.js';

const $ = (id) => document.getElementById(id);
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const LABELS = { pace: 'Pace', fillers: 'Filler words', length: 'Length', keywords: 'Key ideas' };

const state = { role: null, questions: [], i: 0, answers: [], spokenSeconds: 0, rec: null, recStart: 0 };

function show(id) {
  for (const s of ['home', 'interview', 'results']) $(s).hidden = s !== id;
  window.scrollTo(0, 0);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-IN';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

// --- Home ---
$('roles').innerHTML = Object.entries(ROLES)
  .map(([id, r]) => `<button data-role="${id}">${r.label}</button>`).join('');
$('roles').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-role]');
  if (b) start(b.dataset.role);
});

function start(role) {
  Object.assign(state, { role, questions: pickQuestions(role, 5), i: 0, answers: [] });
  $('role-label').textContent = ROLES[role].label;
  $('speech-note').hidden = !!SR;
  $('record').hidden = !SR;
  show('interview');
  askQuestion();
}

// --- Interview ---
function askQuestion() {
  const q = state.questions[state.i];
  state.spokenSeconds = 0;
  $('progress').textContent = `Question ${state.i + 1} of ${state.questions.length}`;
  $('question').textContent = q.q;
  $('answer').value = '';
  $('status').textContent = '';
  $('next').textContent = state.i === state.questions.length - 1 ? 'Finish and see results' : 'Next question';
  speak(q.q);
}

function startRecording() {
  speechSynthesis?.cancel();
  const rec = new SR();
  rec.lang = 'en-IN';
  rec.continuous = true;
  rec.interimResults = true;
  const before = $('answer').value.trim();
  rec.onresult = (e) => {
    let text = '';
    for (const r of e.results) text += r[0].transcript;
    $('answer').value = (before ? before + ' ' : '') + text.trim();
  };
  rec.onerror = (e) => {
    $('status').textContent = e.error === 'not-allowed' ? 'Microphone blocked. Allow it in the address bar, or type your answer.' : `Speech error: ${e.error}. You can type instead.`;
  };
  rec.onend = () => stopRecording();
  state.rec = rec;
  state.recStart = performance.now();
  rec.start();
  $('record').textContent = '⏹ Stop';
  $('record').classList.add('rec');
  $('status').textContent = 'Listening…';
}

function stopRecording() {
  if (!state.rec) return;
  const rec = state.rec;
  state.rec = null;
  state.spokenSeconds += (performance.now() - state.recStart) / 1000;
  rec.onend = null;
  rec.stop();
  $('record').textContent = '🎙 Answer again';
  $('record').classList.remove('rec');
  $('status').textContent = `Recorded ${Math.round(state.spokenSeconds)} s`;
}

$('record').addEventListener('click', () => (state.rec ? stopRecording() : startRecording()));
$('speak').addEventListener('click', () => speak(state.questions[state.i].q));
$('quit').addEventListener('click', () => { stopRecording(); speechSynthesis?.cancel(); show('home'); });

$('next').addEventListener('click', () => {
  stopRecording();
  const q = state.questions[state.i];
  const text = $('answer').value;
  // Pace only counts when the answer was spoken.
  state.answers.push({ q: q.q, text, ...scoreAnswer({ text, seconds: state.spokenSeconds || null, keywords: q.keywords }) });
  state.i += 1;
  if (state.i < state.questions.length) askQuestion();
  else showResults();
});

// --- Results ---
const color = (s) => (s >= 75 ? 'var(--good)' : s >= 50 ? 'var(--mid)' : 'var(--low)');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function bar(label, score) {
  if (score == null) return `<div class="bar"><span>${label}</span><span class="status">not scored (typed)</span><b>–</b></div>`;
  return `<div class="bar"><span>${label}</span><div class="track" role="img" aria-label="${label}: ${score} out of 100"><div class="fill" style="width:${score}%;background:${color(score)}"></div></div><b>${score}</b></div>`;
}

function showResults() {
  speechSynthesis?.cancel();
  const session = scoreSession(state.answers);
  state.session = session;
  $('results-role').textContent = `${ROLES[state.role].label} · ${new Date().toLocaleDateString()}`;
  $('overall').textContent = session.overall;
  $('overall').style.color = color(session.overall);
  $('category-bars').innerHTML = Object.entries(LABELS).map(([k, l]) => bar(l, session.categories[k])).join('');
  $('question-bars').innerHTML = state.answers.map((a, i) => bar(`Q${i + 1}`, a.overall)).join('');
  $('answers').innerHTML = '<h2>Tips for each answer</h2>' + state.answers.map((a, i) => `
    <div class="answer">
      <h3>Q${i + 1}. ${esc(a.q)} <span style="color:${color(a.overall)}">${a.overall}/100</span></h3>
      <div class="status">${a.wordCount} words${a.wpm ? ` · ${a.wpm} wpm` : ''} · ${a.fillers} filler${a.fillers === 1 ? '' : 's'}</div>
      ${a.matched.length ? `<div class="chips">${a.matched.map((m) => `<span>✓ ${esc(m)}</span>`).join('')}</div>` : ''}
      <ul>${a.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>`).join('');
  show('results');
}

$('again').addEventListener('click', () => show('home'));

$('pdf').addEventListener('click', () => {
  if (!window.jspdf) { alert('The PDF library did not load. Check your connection and try again.'); return; }
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16;
  let y = 20;
  const need = (h) => { if (y + h > 282) { doc.addPage(); y = 20; } };
  const text = (s, size = 11, style = 'normal', rgb = [20, 24, 36]) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...rgb);
    const lines = doc.splitTextToSize(s, W - 2 * M);
    need(lines.length * size * 0.45);
    doc.text(lines, M, y);
    y += lines.length * size * 0.45 + 2;
  };
  const pdfBar = (label, score) => {
    need(8);
    doc.setFontSize(10); doc.setTextColor(60, 66, 80); doc.text(label, M, y + 4);
    doc.setFillColor(236, 234, 254); doc.rect(M + 40, y, 110, 5, 'F');
    if (score != null) {
      doc.setFillColor(...(score >= 75 ? [21, 128, 61] : score >= 50 ? [180, 83, 9] : [185, 28, 28]));
      doc.rect(M + 40, y, 110 * score / 100, 5, 'F');
    }
    doc.text(score == null ? '-' : String(score), M + 155, y + 4);
    y += 8;
  };
  const plain = (s) => s.replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7E]/g, '');

  text('Intervu.AI Lite - Interview report', 18, 'bold');
  text(`${ROLES[state.role].label} - ${new Date().toLocaleString()}`, 10, 'normal', [90, 98, 117]);
  y += 2;
  text(`Overall score: ${state.session.overall} / 100`, 14, 'bold');
  y += 2;
  for (const [k, l] of Object.entries(LABELS)) pdfBar(l, state.session.categories[k]);
  y += 2;
  state.answers.forEach((a, i) => pdfBar(`Question ${i + 1}`, a.overall));
  y += 4;
  state.answers.forEach((a, i) => {
    text(plain(`Q${i + 1}. ${a.q}  (${a.overall}/100)`), 11, 'bold');
    text(plain(`${a.wordCount} words${a.wpm ? `, ${a.wpm} wpm` : ''}, ${a.fillers} filler words`), 9, 'normal', [90, 98, 117]);
    if (a.text.trim()) text(plain(`Answer: ${a.text.trim()}`), 9, 'italic', [60, 66, 80]);
    a.tips.forEach((t) => text(plain(`- ${t}`), 10));
    y += 3;
  });
  text('Scores come from simple rules (pace, filler words, length, key ideas), not AI.', 8, 'normal', [120, 126, 140]);
  doc.save(`intervu-report-${state.role}-${new Date().toISOString().slice(0, 10)}.pdf`);
});
