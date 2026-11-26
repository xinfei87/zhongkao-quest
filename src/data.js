/** 数据加载：按科目懒加载，带内存缓存与版本参数 */
const BASE = new URL('../data/', import.meta.url);
const cache = new Map();

async function getJSON(path, v) {
  const url = new URL(path, BASE);
  if (v) url.searchParams.set('v', v);
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`加载失败：${path} (${res.status})`);
  return res.json();
}

let indexPromise = null;

export function loadIndex() {
  indexPromise ||= getJSON('index.json');
  return indexPromise;
}

export async function loadSubject(id) {
  if (cache.has(id)) return cache.get(id);
  const index = await loadIndex();
  const v = String(index.generatedAt || '').slice(0, 10).replace(/-/g, '');
  const p = Promise.all([
    getJSON(`topics/${id}.json`, v),
    getJSON(`questions/${id}.json`, v),
    getJSON(`deps/${id}.json`, v),
  ]).then(([topics, questions, deps]) => {
    const subject = index.subjects.find((s) => s.id === id);
    topics.forEach((t) => { t.subject = id; });
    return {
      subject,
      topics,
      questions,
      deps,
      topicById: Object.fromEntries(topics.map((t) => [t.id, t])),
      questionsById: new Map(questions.map((q) => [q.id, q])),
    };
  });
  cache.set(id, p);
  return p;
}

export function preload(id) {
  loadSubject(id).catch(() => {});
}
