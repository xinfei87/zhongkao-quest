/**
 * 实验室匹配全量审计（V2）。
 * 用法：node scripts/audit-labs.mjs
 * 对 data/topics/*.json 里的每个考点跑一遍新版 labForTopic（explainLabMatch），
 * 输出一张表：考点 → 配到的实验 → 命中的主关键词；同时用旧版匹配逻辑
 * （domain+chapter 也参与匹配、单字泛词能触发）重算一遍“原来”的数字做对照。
 * 输出：终端打印 + 写 scripts/lab-audit.md（一起提交，人工过一遍这张表）。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { explainLabMatch, LABS } from '../src/labs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'lab-audit.md');

// ---- 旧版匹配逻辑（V2 之前，照抄当时 src/labs.js 的 keys 与打分法） ----
// 文本 = name + chapter + domain + description；只要 keys 里有 1 个词命中就返回，
// topic.subject 在题库 JSON 里不存在，跨科过滤从未生效。
const OLD_LABS = [
  { id: 'func', subject: 'math', keys: ['函数', '一次函数', '二次函数', '反比例', '图像', '正比例'] },
  { id: 'pythagoras', subject: 'math', keys: ['勾股', '直角三角形', '平方根', '无理数'] },
  { id: 'geo', subject: 'math', keys: ['几何', '三角形', '四边形', '圆', '棱柱', '圆锥', '表面积', '体积', '视图', '对称', '相似'] },
  { id: 'construct', subject: 'math', keys: ['尺规', '作图', '垂直平分线', '角平分线', '圆'] },
  { id: 'chance', subject: 'math', keys: ['概率', '随机', '统计', '频率', '数据分析', '抽样'] },
  { id: 'wonder', subject: 'math', keys: ['规律', '探究', '综合与实践'] },
  { id: 'volt', subject: 'physics', keys: ['电', '电流', '电压', '电阻', '欧姆', '电功率', '电路', '串并联'] },
  { id: 'machine', subject: 'physics', keys: ['杠杆', '滑轮', '斜面', '机械', '功', '机械效率'] },
  { id: 'motion', subject: 'physics', keys: ['运动', '速度', '牛顿', '惯性', '力', '平衡', '摩擦', '质量', '密度'] },
  { id: 'sound', subject: 'physics', keys: ['声', '音调', '响度', '音色', '振动', '噪声'] },
  { id: 'optics', subject: 'physics', keys: ['光', '反射', '折射', '透镜', '成像', '平面镜', '凸透镜'] },
  { id: 'float', subject: 'physics', keys: ['压强', '浮力', '液体', '阿基米德', '大气压'] },
  { id: 'heat', subject: 'physics', keys: ['热', '温度', '内能', '熔化', '凝固', '汽化', '液化', '比热容', '物态'] },
  { id: 'waves', subject: 'physics', keys: ['波', '振动', '频率', '波长', '电磁波'] },
  { id: 'fields', subject: 'physics', keys: ['磁场', '电磁感应', '电荷', '磁感线'] },
  { id: 'atom', subject: 'physics', keys: ['原子', '核', '光谱', '微观'] },
  { id: 'periodic', subject: 'chemistry', keys: ['元素', '周期', '原子', '相对原子质量', '化学式'] },
  { id: 'reaction', subject: 'chemistry', keys: ['化学方程式', '反应', '质量守恒', '配平', '化合', '分解', '置换', '复分解'] },
  { id: 'gas', subject: 'chemistry', keys: ['氧气', '二氧化碳', '制取', '收集', '装置', '气体制备'] },
  { id: 'analysis', subject: 'chemistry', keys: ['酸碱', '盐', '离子', '检验', '滴定', 'pH', '中和'] },
  { id: 'catalyst', subject: 'chemistry', keys: ['催化剂', '速率', '过氧化氢'] },
  { id: 'sulfur', subject: 'chemistry', keys: ['硫', '二氧化硫', '空气污染', '酸雨'] },
  { id: 'mechanism', subject: 'chemistry', keys: ['机理', '燃烧', '氧化', '还原'] },
  { id: 'oracle', subject: 'chinese', keys: ['字', '汉字', '字形', '造字', '文言', '古诗', '词语'] },
  { id: 'verb', subject: 'english', keys: ['时态', '动词', '语法', '句子', 'be', '一般现在', '一般过去', '现在完成'] },
];

function oldMatch(topic) {
  const text = `${topic.name || ''} ${topic.chapter || ''} ${topic.domain || ''} ${topic.description || ''}`;
  let best = null;
  let bestScore = 0;
  for (const lab of OLD_LABS) {
    const score = lab.keys.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      best = lab;
      bestScore = score;
    }
  }
  return best;
}

// ---- 跑全库 ----
const files = readdirSync(join(ROOT, 'data', 'topics')).filter((f) => f.endsWith('.json')).sort();
const rows = [];
let beforeMatched = 0;
for (const file of files) {
  const subjectId = file.replace('.json', '');
  const topics = JSON.parse(readFileSync(join(ROOT, 'data', 'topics', file), 'utf8'));
  for (const t of topics) {
    const before = oldMatch(t);
    if (before) beforeMatched += 1;
    const after = explainLabMatch(t, subjectId);
    rows.push({
      topicId: t.id,
      subject: subjectId,
      name: t.name,
      before: before?.id || '-',
      after: after?.labId || '-',
      hits: after ? after.primaryHits.join('、') : '',
    });
  }
}
const total = rows.length;
const afterRows = rows.filter((r) => r.after !== '-');
const afterMatched = afterRows.length;
const removed = rows.filter((r) => r.before !== '-' && r.after === '-');
const changed = rows.filter((r) => r.before !== '-' && r.after !== '-' && r.before !== r.after);
const kept = rows.filter((r) => r.before !== '-' && r.before === r.after);
const added = rows.filter((r) => r.before === '-' && r.after !== '-');

const byLab = {};
for (const r of afterRows) byLab[r.after] = (byLab[r.after] || 0) + 1;

const lines = [];
lines.push('# 实验室匹配审计表（V2）');
lines.push('');
lines.push(`生成时间：${new Date().toISOString().slice(0, 10)}；考点总数 ${total} 个。`);
lines.push('');
lines.push('## 对照数字');
lines.push('');
lines.push(`- 旧版匹配（domain+chapter 也参与、单字泛词能触发）：配到实验 ${beforeMatched} 个考点。`);
lines.push(`- 新版匹配（只用 name+description、主关键词收紧、显式映射表）：配到实验 ${afterMatched} 个考点。`);
lines.push(`- 删掉的误配：${removed.length} 个（旧版配到、新版返回 null）。`);
lines.push(`- 换实验的：${changed.length} 个（旧版配 A、新版配 B）。`);
lines.push(`- 保持不变的：${kept.length} 个。新增配到的：${added.length} 个。`);
lines.push('');
lines.push('## 新版各实验配到的考点数');
lines.push('');
for (const lab of LABS) {
  if (byLab[lab.id]) lines.push(`- ${lab.id}（${lab.title}）：${byLab[lab.id]} 个`);
}
lines.push('');
lines.push('## 全量表（只列配到实验的考点；没配到的返回 null，不占表）');
lines.push('');
lines.push('| topicId | 科目 | 考点 | 实验 | 命中的主关键词 | 旧版配到 |');
lines.push('|---|---|---|---|---|---|');
for (const r of afterRows) {
  lines.push(`| ${r.topicId} | ${r.subject} | ${r.name} | ${r.after} | ${r.hits} | ${r.before} |`);
}
lines.push('');
lines.push('## 删掉的误配（旧版配到、新版 null，共 ' + removed.length + ' 个）');
lines.push('');
for (const r of removed) {
  lines.push(`- ${r.topicId} ${r.name}（${r.subject}）：旧版 → ${r.before}`);
}
lines.push('');
lines.push('## 换实验的（共 ' + changed.length + ' 个）');
lines.push('');
for (const r of changed) {
  lines.push(`- ${r.topicId} ${r.name}（${r.subject}）：${r.before} → ${r.after}`);
}
const md = lines.join('\n');
writeFileSync(OUT, md);

console.log(`考点总数 ${total}；旧版配到 ${beforeMatched} 个，新版配到 ${afterMatched} 个；删掉误配 ${removed.length} 个，换实验 ${changed.length} 个，保持 ${kept.length} 个，新增 ${added.length} 个。`);
console.log(`审计表已写到 ${OUT}`);
