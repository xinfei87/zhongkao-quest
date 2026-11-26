/**
 * 轻量先修回溯：只沿 hard 边，最多 2 层，追加题不超过 3 道。
 * 纯函数，便于单元测试。
 */

/** to -> [from...]，只保留 hard 边 */
export function buildHardIndex(deps = []) {
  const index = new Map();
  for (const d of deps) {
    if (d.strength === 'soft') continue;
    if (!index.has(d.to)) index.set(d.to, []);
    index.get(d.to).push(d.from);
  }
  return index;
}

const isBasic = (q) => q.difficulty === 'basic';

/**
 * @param {object} p
 * @param {string} p.topicId       当前卡住的知识点
 * @param {Array}  p.deps          先修边 [{from,to,strength}]
 * @param {Map}    p.questionsByTopic
 * @param {object} p.topicById     用于取讲解/闪卡
 * @param {number} [p.maxDepth=2]
 * @param {number} [p.maxQuestions=3]
 * @returns {{path:string[], root:string, questions:Array, flashcard:object}|null}
 */
export function diagnose({ topicId, deps, questionsByTopic, topicById, maxDepth = 2, maxQuestions = 3 }) {
  const hard = buildHardIndex(deps);
  const levels = [[topicId]];
  const seen = new Set([topicId]);
  const parentOf = new Map();

  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const id of levels[d - 1]) {
      for (const from of hard.get(id) || []) {
        if (seen.has(from)) continue;
        seen.add(from);
        parentOf.set(from, id);
        next.push(from);
      }
    }
    if (!next.length) break;
    levels.push(next);
  }

  // 从最深一层开始找「有基础题」的根因
  const withBasic = (ids) => ids.filter((id) => (questionsByTopic.get(id) || []).some(isBasic));
  const layers = [];
  for (let d = levels.length - 1; d >= 1; d--) {
    const cands = withBasic(levels[d]);
    if (cands.length) layers.push({ depth: d, ids: cands });
  }
  if (!layers.length) return null;

  const questions = [];
  const used = new Set();
  const pickedRoots = [];
  for (const layer of layers) {
    for (const id of layer.ids) {
      if (questions.length >= maxQuestions) break;
      const pool = (questionsByTopic.get(id) || []).filter((q) => !used.has(q.id));
      const basic = pool.filter(isBasic);
      const take = (basic.length ? basic : pool).slice(0, Math.min(2, maxQuestions - questions.length));
      if (!take.length) continue;
      take.forEach((q) => {
        used.add(q.id);
        questions.push({ ...q, origin: 'backtrack', rootTopicId: id });
      });
      pickedRoots.push(id);
      if (questions.length >= maxQuestions) break;
    }
    if (questions.length >= maxQuestions) break;
  }
  if (!questions.length) return null;

  // 展示用路径：沿着真正的先修链从当前点走到根因
  const path = [topicId];
  let node = pickedRoots[0];
  const back = [];
  while (node && node !== topicId) {
    back.unshift(node);
    node = parentOf.get(node);
  }
  path.push(...back);

  const rootTopic = topicById?.[pickedRoots[0]] || null;
  return {
    path,
    root: pickedRoots[0],
    questions,
    flashcard: rootTopic
      ? {
          topicId: rootTopic.id,
          front: `「${rootTopic.name}」你还记得它解决什么问题吗？`,
          back: rootTopic.description || (rootTopic.mastery || []).join('；') || '回到课本这一节的开头，先看例题。',
        }
      : null,
  };
}

/** 连错后的「基础确认题」：同考点、非本题、优先 basic */
export function pickConfirmQuestion({ topicId, questionsByTopic, excludeIds = [] }) {
  const pool = (questionsByTopic.get(topicId) || []).filter((q) => !excludeIds.includes(q.id));
  if (!pool.length) return null;
  const basic = pool.filter(isBasic);
  return (basic.length ? basic : pool)[0];
}

/**
 * V2 错题变式题：同一考点的另一道题（优先 basic），用来代替“原题重练”。
 * 答对变式题才算一次有效——背住原题答案是过不了关的。
 * 没有其他同考点题时返回 null，调用方再回落到原题。
 */
export function pickVariantQuestion({ topicId, questionsByTopic, excludeIds = [] }) {
  const pool = (questionsByTopic.get(topicId) || []).filter((q) => !excludeIds.includes(q.id));
  if (!pool.length) return null;
  const basic = pool.filter(isBasic);
  return (basic.length ? basic : pool)[0];
}
