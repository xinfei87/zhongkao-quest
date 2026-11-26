/**
 * 三级提示（V2，纯函数，便于单元测试）。
 * hint1 = 这题考什么 + 关键词；hint2 = 第一步先做什么；hint3 = 做到一半的半成品，只差最后一步。
 * 题目数据里可选字段 hint1/hint2/hint3；没有时按下面顺序回落，三个级别永远不为空，
 * 绝不允许点提示后出现空白（V2 修的 P0 bug 之一）。
 */
export function buildHintLevels(q = {}, topic = {}) {
  const clean = (s) => String(s ?? '').trim();
  const fromQ = [clean(q.hint1), clean(q.hint2), clean(q.hint3)];
  const steps = (Array.isArray(q.steps) ? q.steps : []).map(clean).filter(Boolean);
  const expl = clean(q.explanation);
  const desc = clean(topic.description);
  const mastery = (topic.mastery || []).map(clean).filter(Boolean).join('；');
  const name = clean(topic.name) || '这个考点';

  // 第 1 级：考什么 + 关键词。优先用题库手写，其次用考点介绍，其次用分步讲解的第一步。
  const h1 = fromQ[0]
    || desc
    || (steps[0] ? `这题考「${name}」：${steps[0]}` : '')
    || (expl ? `这题考「${name}」：${expl}` : '')
    || `这题考「${name}」，先看清题目问的是什么，再看选项里哪个和它有关。`;

  // 第 2 级：第一步先做什么。优先用题库手写，其次用分步讲解的第一步。
  const h2 = fromQ[1]
    || (steps[0] ? `第一步：${steps[0]}` : '')
    || `第一步：先把题目里的已知条件圈出来，再想想「${name}」最先用哪条规则。`;

  // 第 3 级：半成品，只差最后一步。优先用题库手写，其次用分步讲解的前几步 + 最后一步。
  const h3 = fromQ[2]
    || (steps.length > 1
      ? `做到一半了：${steps.slice(0, -1).join('；')}。只差最后一步：${steps[steps.length - 1]}`
      : '')
    || (expl ? `关键一步：${expl}` : '')
    || `最后一步：对照「${name}」的要点${mastery ? `（${mastery}）` : '（看课本这一节的例题）'}，把结果写出来。`;

  return [h1, h2, h3];
}

/** 提示一共分几级（界面显示 1/3、2/3、3/3 用） */
export const HINT_LEVELS = 3;
