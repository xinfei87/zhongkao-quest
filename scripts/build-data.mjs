/**
 * 从 _source/ 下的开源数据（cn-math-taxonomy, CC BY-NC 4.0）
 * 裁剪出初中五科子集，生成站点使用的 data/ 目录。
 *
 * 用法：node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, '_source');
const OUT = path.join(ROOT, 'data');

const SUBJECTS = [
  { id: 'math', name: '数学', short: '数', color: '#2563EB', source: 'math' },
  { id: 'chinese', name: '语文', short: '语', color: '#B45309', source: 'chinese' },
  { id: 'english', name: '英语', short: '英', color: '#7C3AED', source: 'english' },
  { id: 'physics', name: '物理', short: '物', color: '#0F766E', source: 'physics' },
  { id: 'chemistry', name: '化学', short: '化', color: '#BE123C', source: 'chemistry' },
];

const read = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
const write = (rel, data) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log(`  ${rel.padEnd(32)} ${kb} KB`);
};

/** 判断知识点属于目标科目（数学没有 subject 字段） */
const subjectOf = (t) => t.subject || 'math';

/** 章名归一化：去掉末尾小节号（1.2 / 25.2），并按 年级+学期 排序 */
const chapterOf = (t) => (t.chapter || `${t.grade} 年级`).replace(/\s+\d+(?:\.\d+)+$/, '').trim();
const bookOrder = (chapter) => {
  const cn = { 七: 7, 八: 8, 九: 9 };
  const m = chapter.match(/([七八九])年级?|九年级/);
  const grade = m ? cn[m[1]] : 7;
  const term = /下册/.test(chapter) ? 2 : /全一册/.test(chapter) ? 3 : 1;
  return grade * 10 + term;
};

const topicsAll = read('topics.json');
const depsAll = read('dependencies.json');
const questionsAll = SUBJECTS.map((s) => read(`questions_${s.source}.json`)).flat();

// ---- 1. 过滤初中（7~9 年级） ----
const isJunior = (t) => Number(t.grade) >= 7 && Number(t.grade) <= 9;
const topicById = new Map(topicsAll.map((t) => [t.id, t]));
const juniorTopics = topicsAll.filter(
  (t) => isJunior(t) && SUBJECTS.some((s) => s.id === subjectOf(t)),
);
const juniorIds = new Set(juniorTopics.map((t) => t.id));

// ---- 2. 题库：只保留初中知识点下的题，且难度字段合法的 ----
const labels = { basic: '基础', standard: '常规', challenge: '提升', advanced: '拔高' };
const questions = questionsAll
  .filter((q) => juniorIds.has(q.topicId))
  .map((q) => {
    const out = {
      id: q.id,
      topicId: q.topicId,
      difficulty: labels[q.difficulty] ? q.difficulty : 'standard',
      type: q.type === 'choice' || q.type === 'numeric' ? q.type : 'short',
      prompt: q.prompt,
      answer: q.answer,
      explanation: q.explanation || '',
    };
    if (Array.isArray(q.choices) && q.choices.length) {
      out.choices = q.choices.map((c) => ({ key: c.key, text: c.text }));
    }
    return out;
  });

// 没有题的考点无法出关，剔除
const topicWithQuestions = new Set(questions.map((q) => q.topicId));
const keptTopics = juniorTopics.filter((t) => topicWithQuestions.has(t.id));
const keptIds = new Set(keptTopics.map((t) => t.id));
const keptQuestions = questions.filter((q) => keptIds.has(q.topicId));

// ---- 3. 先修边：两端都在保留集合内 ----
const deps = depsAll
  .filter((d) => keptIds.has(d.topicId) && keptIds.has(d.prerequisiteId))
  .map((d) => ({ from: d.prerequisiteId, to: d.topicId, strength: d.strength === 'soft' ? 'soft' : 'hard' }));

// ---- 4. 按科目打包 ----
const index = { generatedAt: new Date().toISOString(), totalTopics: 0, totalQuestions: 0, subjects: [] };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const s of SUBJECTS) {
  const ts = keptTopics.filter((t) => subjectOf(t) === s.id);
  const ids = new Set(ts.map((t) => t.id));
  const qs = keptQuestions.filter((q) => ids.has(q.topicId));

  const chapters = new Map();
  for (const t of ts) {
    const key = chapterOf(t);
    if (!chapters.has(key)) chapters.set(key, { key, order: bookOrder(key), topicCount: 0, questionCount: 0 });
    chapters.get(key).topicCount += 1;
  }
  for (const q of qs) {
    const t = topicById.get(q.topicId);
    chapters.get(chapterOf(t)).questionCount += 1;
  }

  write(`topics/${s.id}.json`, ts.map((t) => ({
    id: t.id,
    name: t.name,
    grade: t.grade,
    semester: t.semester || '',
    chapter: chapterOf(t),
    domain: t.domain || '',
    description: t.description || '',
    mastery: Array.isArray(t.mastery_criteria) ? t.mastery_criteria.slice(0, 3) : [],
  })));

  write(`deps/${s.id}.json`, deps.filter((d) => ids.has(d.from) && ids.has(d.to)));
  write(`questions/${s.id}.json`, qs);

  index.subjects.push({
    id: s.id,
    name: s.name,
    short: s.short,
    color: s.color,
    topicCount: ts.length,
    questionCount: qs.length,
    basicCount: qs.filter((q) => q.difficulty === 'basic').length,
    chapters: [...chapters.values()].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key, 'zh')),
  });
  index.totalTopics += ts.length;
  index.totalQuestions += qs.length;
}

write('index.json', index);

console.log('\n合计：', index.totalTopics, '个考点 /', index.totalQuestions, '道题');
for (const s of index.subjects) {
  console.log(`  ${s.name}: ${s.topicCount} 考点, ${s.questionCount} 题 (基础 ${s.basicCount}), ${s.chapters.length} 章`);
}
