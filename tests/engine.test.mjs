import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeNumeric, judgeChoice, judgeShort, judge, inputCount } from '../src/engine/judge.js';
import { diagnose, buildHardIndex, pickConfirmQuestion } from '../src/engine/backtrack.js';
import { recordAnswer, buildSession, pickFocusTopic, groupByTopic, completeSession } from '../src/engine/scheduler.js';

test('数值判分：分数、小数、百分数互通', () => {
  assert.equal(judgeNumeric('3/4', ['0.75']), true);
  assert.equal(judgeNumeric('50%', ['0.5']), true);
  assert.equal(judgeNumeric('-2.5', ['-2.5']), true);
  assert.equal(judgeNumeric('9', ['8']), false);
});

test('数值判分：多个解顺序无关，数量必须一致', () => {
  assert.equal(judgeNumeric('7，-3/4，5', ['-0.75', '5', '7']), true);
  assert.equal(judgeNumeric('3，-3', ['3']), false);
  assert.equal(inputCount({ type: 'numeric', answer: '7，-3/4，5' }), 3);
});

test('选择题同时接受选项字母和选项原文', () => {
  const q = { type: 'choice', answer: 'C', choices: [{ key: 'C', text: '分子、原子' }, { key: 'A', text: '天体' }] };
  assert.equal(judgeChoice(q, 'c'), true);
  assert.equal(judgeChoice(q, '分子、原子'), true);
  assert.equal(judgeChoice(q, 'A'), false);
  assert.equal(judge(q, 'C'), true);
});

test('简答：全角空格与上下标归一，判不出时返回 null', () => {
  assert.equal(judgeShort('2x²+x', ' 2x^2 + x '), true);
  assert.equal(judgeShort('a+b=b+a', 'ａ＋ｂ＝ｂ＋ａ'), true);
  assert.equal(judgeShort('如：水箱原有 100 L 水', '我不知道'), null);
});

// ---- 回溯 ----
const deps = [
  { from: 'A', to: 'B', strength: 'hard' },
  { from: 'B', to: 'C', strength: 'hard' },
  { from: 'X', to: 'C', strength: 'soft' },
  { from: 'D', to: 'A', strength: 'hard' },
];
const mkQ = (id, topicId, difficulty = 'basic') => ({ id, topicId, difficulty, type: 'choice', prompt: id, answer: 'A' });
const questions = [
  mkQ('c1', 'C'), mkQ('c2', 'C', 'standard'),
  mkQ('b1', 'B'), mkQ('b2', 'B'),
  mkQ('a1', 'A'), mkQ('a2', 'A'),
  mkQ('d1', 'D'),
];
const byTopic = groupByTopic(questions);
const topicById = Object.fromEntries(['A', 'B', 'C', 'D'].map((id) => [id, { id, name: id, description: 'x' }]));

test('回溯只走 hard 边、最多 2 层', () => {
  const hard = buildHardIndex(deps);
  assert.deepEqual(hard.get('C'), ['B']);
  assert.equal(hard.has('X'), false);

  const diag = diagnose({ topicId: 'C', deps, questionsByTopic: byTopic, topicById });
  assert.ok(diag);
  // D 在第 3 层，不能被摸到；最深能到 A（2 层）
  assert.equal(diag.path.includes('D'), false);
  assert.ok(diag.path.includes('A'));
  assert.ok(diag.questions.every((q) => q.origin === 'backtrack'));
  assert.ok(diag.questions.length <= 3);
  assert.equal(diag.root, 'A');
});

test('回溯追加题不超过 3 道，且优先基础题', () => {
  const diag = diagnose({ topicId: 'C', deps, questionsByTopic: byTopic, topicById });
  assert.ok(diag.questions.length <= 3);
  assert.ok(diag.questions.filter((q) => q.difficulty === 'basic').length >= 1);
  // 不会把当前考点的题塞回来
  assert.equal(diag.questions.some((q) => q.topicId === 'C'), false);
});

test('确认题挑同考点、非原题、优先 basic', () => {
  const q = pickConfirmQuestion({ topicId: 'C', questionsByTopic: byTopic, excludeIds: ['c1'] });
  assert.deepEqual(q, mkQ('c2', 'C', 'standard'));
  assert.equal(pickConfirmQuestion({ topicId: 'NONE', questionsByTopic: byTopic }), null);
});

// ---- 调度与记录 ----
test('错题连续答对两次后移出', () => {
  const state = { points: 0, wrongBook: [], recent: [], topicStats: {}, flashcards: {} };
  const q = questions[0];
  recordAnswer(state, { subject: 'math', question: q, correct: false });
  assert.equal(state.wrongBook[0].status, 'new');
  recordAnswer(state, { subject: 'math', question: q, correct: true });
  assert.equal(state.wrongBook[0].status, 'reviewing');
  recordAnswer(state, { subject: 'math', question: q, correct: true });
  assert.equal(state.wrongBook[0].status, 'cleared');
});

test('组关：第一题一定是基础题，且不超题量', () => {
  const topics = [...new Set(questions.map((q) => q.topicId))].map((id) => ({ id, chapter: 'ch1', name: id }));
  const state = { recent: [], topicStats: {}, wrongBook: [], flashcards: {} };
  const session = buildSession({ subject: 'math', topics, questions, state, size: 4 });
  assert.equal(session.questions.length, 4);
  assert.equal(session.questions[0].difficulty, 'basic');
  assert.equal(new Set(session.questions.map((q) => q.id)).size, 4);
});

test('薄弱考点优先被选中，已掌握考点排后', () => {
  const topics = [{ id: 'A', chapter: 'c' }, { id: 'B', chapter: 'c' }];
  const state = {
    topicStats: {
      A: { seen: 5, correct: 5, wrongStreak: 0, mastered: true },
      B: { seen: 2, correct: 0, wrongStreak: 2, mastered: false },
    },
  };
  assert.equal(pickFocusTopic({ topics, questionsByTopic: byTopic, state }).id, 'B');
});

test('初三优先：九年级考点排在七八年级之前', () => {
  const topics = [
    { id: 'g7', chapter: '七上', grade: 7 },
    { id: 'g9', chapter: '九上', grade: 9 },
  ];
  const qbt = new Map([['g7', [mkQ('x1', 'g7')]], ['g9', [mkQ('x2', 'g9')]]]);
  const state = { topicStats: {} };
  assert.equal(pickFocusTopic({ topics, questionsByTopic: qbt, state }).id, 'g9');
});

test('收关：连击按天累加，同日不重复加', () => {
  const state = { points: 0, streak: { days: 0, lastDate: '', best: 0 }, sessions: [] };
  completeSession(state, { subject: 'math', minutes: 10, correct: 3, total: 4, date: '2026-11-26' });
  assert.equal(state.streak.days, 1);
  completeSession(state, { subject: 'math', minutes: 10, correct: 3, total: 4, date: '2026-11-26' });
  assert.equal(state.streak.days, 1);
  completeSession(state, { subject: 'math', minutes: 10, correct: 3, total: 4, date: '2026-11-27' });
  assert.equal(state.streak.days, 2);
  assert.equal(state.points, 30);
});
