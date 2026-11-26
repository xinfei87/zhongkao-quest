/**
 * 在线“问老师”（V2，AI 讲解兜底）。
 *
 * 安全红线（绝对不要碰）：
 * - 任何 API Key 都不许写进仓库、代码、提交历史。Key 只能由家长在家长入口手动粘贴，
 *   只保存在本机浏览器的 localStorage（键名见下），永不上传、不进 git、不进同步口令码。
 * - 请求只发给 Google Gemini 官方接口，只传：题目、选项、学生选的答案、正确答案、
 *   已看过的提示级数、本题一句话解析。不传姓名、学校、设备信息等任何个人信息。
 * - 没填 Key、调用失败、超时、429 时，一律回落到静态解析，页面绝不卡死。
 * - 同一题的 AI 讲解做 localStorage 缓存（key 含 questionId），第二次直接读缓存，不重复花钱。
 */
export const TEACHER_KEY_LS = 'zkq_teacher_key';
export const TEACHER_MODEL_LS = 'zkq_teacher_model';
export const TEACHER_CACHE_PREFIX = 'zkq_teacher_';
// V2：默认模型 gemini-2.5-flash-lite（2026-11-26 实测：老 Key 调 list-models 返回 200，
// 列表里有它，又快又能用）。不要用 gemini-2.5-flash（已下线）和 gemini-4-hydrogen
//（免费层 28-94 秒才回一句，太慢）。
export const TEACHER_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
// 默认模型 404 时的回落模型（同在实测的模型列表里）
export const TEACHER_FALLBACK_MODEL = 'gemini-flash-lite-latest';
export const TEACHER_KEY_URL = 'https://aistudio.google.com/apikey';

/** 系统提示词（锁死）：初三能听懂的大白话，一次只讲一步，先反问再讲，不直接甩答案 */
export const TEACHER_SYSTEM_PROMPT = [
  '你是一位耐心细致的初中老师，正在给一个初三学生讲一道他刚做错的中考基础题。',
  '规则：1）只用初三学生能听懂的大白话，不要用术语堆砌；',
  '2）一次只讲一步，每段不超过 150 字；',
  '3）先反问一句“你觉得第一步该先看什么”，等学生想一想再讲，不要一上来就把完整答案甩出来；',
  '4）先讲他选错的那一步错在哪，再讲正确的做法；',
  '5）最后留一道同考点的变式小问让他自己试，不要直接给变式题的答案。',
].join('\n');

/** 本机有没有存 Key（只做有无判断，绝不把 Key 值打出来） */
export function hasTeacherKey(storage) {
  try {
    return Boolean(storage?.getItem?.(TEACHER_KEY_LS)?.trim());
  } catch {
    return false;
  }
}

/** 只给家长看 Key 的末 4 位（**** + 后 4 位），完整 Key 永远不显示 */
export function getTeacherKeySuffix(storage) {
  try {
    const k = storage?.getItem?.(TEACHER_KEY_LS)?.trim() || '';
    return k ? `****${k.slice(-4)}` : '';
  } catch {
    return '';
  }
}

export function getTeacherModel(storage) {
  try {
    return storage?.getItem?.(TEACHER_MODEL_LS)?.trim() || TEACHER_DEFAULT_MODEL;
  } catch {
    return TEACHER_DEFAULT_MODEL;
  }
}

export function saveTeacherKey(storage, key) {
  try {
    if (!key?.trim()) storage?.removeItem?.(TEACHER_KEY_LS);
    else storage?.setItem?.(TEACHER_KEY_LS, key.trim());
  } catch { /* 浏览器不让存就当没填，不报错 */ }
}

export function saveTeacherModel(storage, model) {
  try {
    if (!model?.trim()) storage?.removeItem?.(TEACHER_MODEL_LS);
    else storage?.setItem?.(TEACHER_MODEL_LS, model.trim());
  } catch { /* 同上 */ }
}

/** 拼给 AI 的用户消息（纯函数，便于测试；只含题目相关内容） */
export function buildTeacherUserText({ question, topicName, myAnswer, hintsShown = 0 }) {
  const q = question || {};
  const lines = [
    `题目（${topicName || '中考基础题'}）：${q.prompt || ''}`,
  ];
  if (Array.isArray(q.choices) && q.choices.length) {
    lines.push(`选项：${q.choices.map((c) => `${c.key}. ${c.text}`).join('；')}`);
  }
  if (myAnswer !== undefined && myAnswer !== null && myAnswer !== '') {
    lines.push(`学生选的答案：${myAnswer}`);
  }
  lines.push(`正确答案：${q.answer || ''}`);
  if (q.explanation) lines.push(`本题一句话解析：${q.explanation}`);
  lines.push(`学生已经看过的提示级数：${hintsShown} 级（共 3 级），看了还是不懂。`);
  lines.push('请按系统提示词讲这道题。');
  return lines.join('\n');
}

function cacheKey(questionId) {
  return `${TEACHER_CACHE_PREFIX}${questionId}`;
}

export function readTeacherCache(storage, questionId) {
  try {
    const raw = storage?.getItem?.(cacheKey(questionId));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return typeof obj?.text === 'string' && obj.text ? obj.text : null;
  } catch {
    return null;
  }
}

function writeTeacherCache(storage, questionId, text) {
  try {
    storage?.setItem?.(cacheKey(questionId), JSON.stringify({ text, at: Date.now() }));
  } catch { /* 缓存写不进也不影响做题 */ }
}

/**
 * 问老师一次。返回 { text, cached }；失败时抛错，调用方必须 catch 后回落到静态解析。
 * @param {object} p.question 题目；p.topicName 考点名；p.myAnswer 学生答案
 * @param {number} p.hintsShown 已看提示级数；p.storage localStorage；p.fetchImpl fetch（测试可注入）
 * @param {number} [p.timeoutMs=20000] 超时 20 秒即放弃
 */
export async function askTeacher({
  question, topicName, myAnswer, hintsShown = 0,
  storage, fetchImpl = fetch, timeoutMs = 20000,
} = {}) {
  if (!question?.id) throw new Error('题目不完整，问不了老师');
  const cached = readTeacherCache(storage, question.id);
  if (cached) return { text: cached, cached: true };

  const key = storage?.getItem?.(TEACHER_KEY_LS)?.trim();
  if (!key) throw new Error('NO_KEY');
  const model = getTeacherModel(storage);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // V2：先调默认模型；404（模型下线/改名）时改调回落模型再试一次，其他错误不重试
  const callOnce = async (m) => {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TEACHER_SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: buildTeacherUserText({ question, topicName, myAnswer, hintsShown }) }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
        }),
        signal: ctrl.signal,
      },
    );
    return res;
  };
  try {
    let res = await callOnce(model);
    if (res.status === 404 && model !== TEACHER_FALLBACK_MODEL) {
      res = await callOnce(TEACHER_FALLBACK_MODEL);
    }
    if (!res.ok) {
      if (res.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(`HTTP_${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
    if (!text) throw new Error('EMPTY');
    writeTeacherCache(storage, question.id, text);
    return { text, cached: false };
  } finally {
    clearTimeout(timer);
  }
}
