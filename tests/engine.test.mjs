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

test('V2 分层：没练过的考点先补七年级地基，不再默认优先九年级', () => {
  const topics = [
    { id: 'g7', chapter: '七上', grade: 7 },
    { id: 'g9', chapter: '九上', grade: 9 },
  ];
  const qbt = new Map([['g7', [mkQ('x1', 'g7')]], ['g9', [mkQ('x2', 'g9')]]]);
  const state = { topicStats: {} };
  // 基础差的学生先把七年级地基补牢，再往上走
  assert.equal(pickFocusTopic({ topics, questionsByTopic: qbt, state }).id, 'g7');
});

test('V2 分层：错得最多的考点优先，哪怕它是七年级的', () => {
  const topics = [
    { id: 'g7', chapter: '七上', grade: 7 },
    { id: 'g8', chapter: '八上', grade: 8 },
  ];
  const qbt = new Map([['g7', [mkQ('x1', 'g7')]], ['g8', [mkQ('x2', 'g8')]]]);
  const state = { topicStats: { g8: { seen: 4, correct: 0, wrongStreak: 4, mastered: false } } };
  assert.equal(pickFocusTopic({ topics, questionsByTopic: qbt, state }).id, 'g8');
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

// ---- V2：实验室匹配（全量审计后的收紧规则） ----
import { labForTopic } from '../src/labs.js';
import { buildHintLevels } from '../src/engine/hints.js';
import { pickVariantQuestion } from '../src/engine/backtrack.js';
import { buildTeacherUserText, TEACHER_SYSTEM_PROMPT, TEACHER_DEFAULT_MODEL, TEACHER_FALLBACK_MODEL, askTeacher } from '../src/engine/teacher.js';
import { createTeacherShare, decodeTeacherShare } from '../src/store/teacherShare.js';
import { encodeState } from '../src/store/sync.js';
import { computeToday, computeTrend, computeTeacherUse, computeWeakTop } from '../src/views/dashboard.js';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const loadJSON = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));

test('V2 实验室：解方程等 5 个必 null 考点一个都不许配实验', () => {
  // 注意：这里故意把 chapter/domain 写成“陷阱值”，证明它们不再参与匹配
  const mustNull = [
    { id: 'cnm_220', name: '直接开平方法', chapter: '九上 第二十五章 一元二次方程', domain: '数与代数', description: '形如 x²=p 或 (x+m)²=p 的方程，利用平方根的意义直接求解。', subject: 'math' },
    { id: 'cnm_211', name: '平均数', chapter: '八下 第二十四章 数据的分析', domain: '统计与概率', description: '理解平均数是反映一组数据集中趋势的统计量，会求算术平均数。', subject: 'math' },
    { id: 'cnm_276', name: '锐角三角函数的定义', chapter: '九下 第三十二章 锐角三角函数', domain: '图形与几何', description: '在直角三角形中，锐角的正弦、余弦、正切分别是对边比斜边、邻边比斜边、对边比邻边。', subject: 'math' },
    { id: 'cnm_116', name: '直角三角形的两个锐角互余', chapter: '八上 第十三章 三角形', domain: '图形与几何', description: '直角三角形的两个锐角互余；有两个角互余的三角形是直角三角形。', subject: 'math' },
    { id: 'cnp_004', name: '速度的测量', chapter: '八上 第一章 机械运动', domain: '运动和相互作用', description: '会用刻度尺和停表（或传感器）测量物体运动的平均速度，知道实验原理是 v = s/t，能分析斜面上小车前后半程的速度变化。', subject: 'physics' },
  ];
  for (const t of mustNull) {
    assert.equal(labForTopic(t, t.subject), null, `${t.id} ${t.name} 不应配到实验`);
  }
});

test('V2 实验室：对口考点必须配到对口实验', () => {
  const cases = [
    [{ name: '勾股定理', description: '直角三角形两直角边的平方和等于斜边的平方。' }, 'pythagoras', 'math'],
    [{ name: '一次函数图象的平移', description: '一次函数图象上下左右平移的规律。' }, 'func', 'math'],
    [{ name: '凸透镜成像的规律', description: '探究凸透镜成像时物距、像距与像的性质的关系。' }, 'optics', 'physics'],
    [{ name: '概率的意义与等可能事件的概率', description: '理解概率的意义，会求等可能事件的概率。' }, 'chance', 'math'],
    [{ name: '欧姆定律', description: '导体中的电流，跟导体两端的电压成正比，跟导体的电阻成反比。' }, 'volt', 'physics'],
  ];
  for (const [topic, id, subject] of cases) {
    assert.equal(labForTopic(topic, subject)?.id, id, `${topic.name} 应配到 ${id}`);
  }
});

test('V2 实验室：显式映射表——图形平移绝不进函数实验', () => {
  assert.equal(labForTopic({ id: 'cnm_072', name: '平移的概念与性质', description: '图形平移的概念与性质。' }, 'math'), null);
  assert.equal(labForTopic({ id: 'cnm_073', name: '平移作图', description: '按要求做平移作图。' }, 'math'), null);
});

test('V2 提示：手写三级提示原样返回；没写的题三级也永远不为空', () => {
  const q = { hint1: '考什么', hint2: '第一步', hint3: '半成品', explanation: '结论' };
  assert.deepEqual(buildHintLevels(q, { name: '考点' }), ['考什么', '第一步', '半成品']);
  const bare = buildHintLevels({ explanation: '结论句' }, { name: '某考点', description: '考点介绍' });
  assert.equal(bare.length, 3);
  assert.ok(bare.every((s) => typeof s === 'string' && s.length > 0));
});

test('V2 提示：全库每道题的三级提示都不为空', () => {
  const files = readdirSync(join(DATA, 'questions')).filter((f) => f.endsWith('.json'));
  let n = 0;
  for (const file of files) {
    const qs = loadJSON(`questions/${file}`);
    const topics = loadJSON(`topics/${file}`);
    const byId = Object.fromEntries(topics.map((t) => [t.id, t]));
    for (const q of qs) {
      const levels = buildHintLevels(q, byId[q.topicId] || {});
      assert.equal(levels.length, 3, q.id);
      assert.ok(levels.every((s) => s.length > 0), `${q.id} 有一级提示是空的`);
      n += 1;
    }
  }
  assert.ok(n > 4000, `全库应有 4000+ 道题，实际 ${n}`);
});

test('V2 错题变式：优先同考点另一道基础题，没有才返回 null', () => {
  const byTopic = groupByTopic([
    mkQ('orig', 'T'), mkQ('v1', 'T'), mkQ('v2', 'T', 'standard'),
  ]);
  const v = pickVariantQuestion({ topicId: 'T', questionsByTopic: byTopic, excludeIds: ['orig'] });
  assert.equal(v.id, 'v1');
  assert.equal(pickVariantQuestion({ topicId: 'T', questionsByTopic: byTopic, excludeIds: ['orig', 'v1', 'v2'] }), null);
});

test('V2 错题本：记下学生当时选的答案', () => {
  const state = { topicStats: {}, wrongBook: [], recent: [], points: 0 };
  recordAnswer(state, { subject: 'chinese', question: mkQ('q1', 'T'), correct: false, myAnswer: 'B' });
  assert.equal(state.wrongBook[0].myAnswer, 'B');
  assert.equal(state.wrongBook[0].questionId, 'q1');
});

test('V2 问老师：只传题目相关内容，不传个人信息；系统提示词锁死讲法', () => {
  const text = buildTeacherUserText({
    question: { prompt: '1+1=?', choices: [{ key: 'A', text: '2' }], answer: 'A', explanation: '略' },
    topicName: '有理数',
    myAnswer: 'B',
    hintsShown: 2,
  });
  assert.ok(text.includes('1+1=?') && text.includes('学生选的答案：B') && text.includes('学生已经看过的提示级数：2 级'));
  assert.ok(!text.includes('小飞') && !text.includes('学校'));
  assert.ok(TEACHER_SYSTEM_PROMPT.includes('一次只讲一步'));
  assert.ok(TEACHER_SYSTEM_PROMPT.includes('150'));
  assert.equal(TEACHER_DEFAULT_MODEL, 'gemini-2.5-flash-lite');
  assert.equal(TEACHER_FALLBACK_MODEL, 'gemini-flash-lite-latest');
});

const memStore = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};

test('V2 问老师：默认模型 404 时改调回落模型；第二次读缓存不再发请求', async () => {
  const storage = memStore();
  storage.setItem('zkq_teacher_key', 'test-key');
  let calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url.includes('gemini-2.5-flash-lite')) return { ok: false, status: 404 };
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '先想第一步是什么。' }] } }] }),
    };
  };
  const q = { id: 'q1', prompt: '题', answer: 'A', explanation: '略' };
  const r1 = await askTeacher({ question: q, topicName: '考点', myAnswer: 'B', storage, fetchImpl: fakeFetch });
  assert.equal(r1.text, '先想第一步是什么。');
  assert.equal(r1.cached, false);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('gemini-2.5-flash-lite') && calls[1].includes('gemini-flash-lite-latest'));
  const r2 = await askTeacher({ question: q, topicName: '考点', myAnswer: 'B', storage, fetchImpl: fakeFetch });
  assert.equal(r2.cached, true);
  assert.equal(calls.length, 2);
});

test('V2 问老师：没填 Key、429 都抛错（调用方回落静态解析，不卡死）', async () => {
  const storage = memStore();
  await assert.rejects(
    askTeacher({ question: { id: 'q1', prompt: '题', answer: 'A' }, storage, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }),
    /NO_KEY/,
  );
  storage.setItem('zkq_teacher_key', 'k');
  await assert.rejects(
    askTeacher({ question: { id: 'q2', prompt: '题', answer: 'A' }, storage, fetchImpl: async () => ({ ok: false, status: 429 }) }),
    /RATE_LIMIT/,
  );
});

test('V2 老师分享码：往返不丢数据，快照里没有 PIN；过期报错', async () => {
  const state = {
    profile: { name: '小飞', pin: '1234', dailyQuestions: 4 },
    points: 10, sessions: [], today: null, topicStats: {}, wrongBook: [],
  };
  const code = await createTeacherShare(state);
  assert.ok(code.startsWith('T7-'));
  const payload = await decodeTeacherShare(code);
  assert.equal(payload.state.profile.name, '小飞');
  assert.equal(payload.state.profile.pin, undefined);
  assert.ok(payload.exp > Date.now());
  // 过期的码：手工拼一个过期 payload
  const expired = 'T7-' + (await encodeState({ kind: 'teacher', generatedAt: 0, exp: 1, state }));
  await assert.rejects(decodeTeacherShare(expired), /过期/);
  await assert.rejects(decodeTeacherShare('ZKQ1-xxxx'), /T7-/);
});

test('V2 看板：今日/趋势/问老师统计都从 state 里算，不编数', () => {
  const state = {
    profile: { dailyGoalMinutes: 30 },
    sessions: [
      { date: '2026-11-26', subject: 'math', minutes: 20, correct: 3, total: 4 },
      { date: '2026-11-25', subject: 'chinese', minutes: 10, correct: 1, total: 4 },
    ],
    today: { date: '2026-11-26', subject: 'math', done: true },
    teacherAsks: ['2026-11-26', '2026-11-20'],
    hintLog: [{ d: '2026-11-26', level: 3 }, { d: '2026-11-26', level: 1 }],
    topicStats: {}, wrongBook: [],
  };
  // 注意：computeToday/computeTrend 用当天日期；只断言结构不断言具体日期
  const t = computeToday(state, [{ id: 'math', name: '数学' }]);
  assert.ok('done' in t && 'minutes' in t && 'goal' in t);
  const trend = computeTrend(state, 7);
  assert.equal(trend.length, 7);
  const u = computeTeacherUse(state);
  assert.ok(u.asks >= 0 && u.hints >= 0 && 'maxLevel' in u);
  const weak = computeWeakTop(
    { wrongBook: [{ questionId: 'q1', topicId: 'T', subject: 'math', count: 3, status: 'new', myAnswer: 'B' }] },
    { T: { name: '考点 T' } },
    new Map([['q1', { prompt: '题干？', answer: 'A', choices: [{ key: 'A', text: '对' }, { key: 'B', text: '错' }] }]]),
    5,
  );
  assert.equal(weak[0].name, '考点 T');
  assert.equal(weak[0].prompt, '题干？');
  assert.ok(weak[0].myAnswer.includes('B'));
});

test('V2 数据完整性：全部 7 科 id 不重复、topicId 存在、答案在选项里', () => {
  const index = loadJSON('index.json');
  assert.equal(index.totalTopics, 958);
  assert.equal(index.totalQuestions, 4039);
  assert.equal(index.subjects.length, 7);
  for (const sub of index.subjects) {
    const topics = loadJSON(`topics/${sub.id}.json`);
    const qs = loadJSON(`questions/${sub.id}.json`);
    const deps = loadJSON(`deps/${sub.id}.json`);
    assert.equal(topics.length, sub.topicCount, sub.id);
    assert.equal(qs.length, sub.questionCount, sub.id);
    assert.equal(qs.filter((q) => q.difficulty === 'basic').length, sub.basicCount, sub.id);
    const tids = new Set(topics.map((t) => t.id));
    const qids = new Set();
    for (const q of qs) {
      assert.ok(!qids.has(q.id), `重复题目 id ${q.id}`);
      qids.add(q.id);
      assert.ok(tids.has(q.topicId), `${q.id} 的 topicId ${q.topicId} 不存在`);
      assert.ok(q.answer, `${q.id} 答案为空`);
      if (q.type === 'choice') {
        assert.ok(q.choices.some((c) => c.key === q.answer), `${q.id} 答案不在选项里`);
      }
    }
    for (const d of deps) {
      assert.ok(tids.has(d.from) && tids.has(d.to), `deps 两端不存在 ${d.from}→${d.to}`);
    }
  }
});
