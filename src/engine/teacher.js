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
// V2.3：默认模型改成 gemini-3.5-flash-lite。2026-11-27 实测：老 Key 调
// gemini-2.5-flash-lite 直接 404（“no longer available to new users”，官方让改
// 用 gemini-3.5-flash-lite），站里每次问老师都先白白撞一次 404 再回落，既慢又
// 费一次请求；3.5-flash-lite 实测 1.1 秒出答案，flash-lite-latest 1.2 秒。
// 不要用 gemini-2.5-flash（已下线）和 gemini-4-hydrogen（免费层 28-94 秒才回一句，太慢）。
export const TEACHER_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
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

/** Key 看起来像 Gemini Key：去空格后以 AQ. 开头、长度大于 20。
 * 登录页“重新贴 Key”用这条口径；解密包里是同一条（见 siteauth.js）。
 * 注意：这只是格式检查，不是联网验证——贴错 Key 进站后问老师会报 NO_KEY/HTTP_401。 */
export function isValidTeacherKey(key) {
  const k = typeof key === 'string' ? key.trim() : '';
  return k.startsWith('AQ.') && k.length > 20;
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

/** V2.4：清掉一道题的首问缓存（“换个问法再问一次”时用，逼它重新问） */
export function clearTeacherCache(storage, questionId) {
  try { storage?.removeItem?.(cacheKey(questionId)); } catch { /* 不报错 */ }
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
 * @param {boolean} [p.force=false] 为 true 时跳过缓存直接重新问（“换个问法再问一次”）
 */
export async function askTeacher({
  question, topicName, myAnswer, hintsShown = 0,
  storage, fetchImpl = fetch, timeoutMs = 20000, force = false,
} = {}) {
  if (!question?.id) throw new Error('题目不完整，问不了老师');
  if (!force) {
    const cached = readTeacherCache(storage, question.id);
    if (cached) return { text: cached, cached: true };
  }

  const text = await callTeacherApi({
    key: requireTeacherKey(storage),
    model: getTeacherModel(storage),
    systemText: TEACHER_SYSTEM_PROMPT,
    contents: [{ role: 'user', parts: [{ text: buildTeacherUserText({ question, topicName, myAnswer, hintsShown }) }] }],
    fetchImpl, timeoutMs,
  });
  writeTeacherCache(storage, question.id, text);
  return { text, cached: false };
}

/** 取 Key，没有就抛 NO_KEY（调用方据此提示去家长入口设置） */
function requireTeacherKey(storage) {
  const key = storage?.getItem?.(TEACHER_KEY_LS)?.trim();
  if (!key) throw new Error('NO_KEY');
  return key;
}

/**
 * 调一次 Gemini generateContent（首问和追问共用）。
 * 先调指定模型；404（模型下线/改名）时改调回落模型再试一次，其他错误不重试。
 * 超时、429、空回复都抛错，调用方 catch 后回落到静态解析，页面绝不卡死。
 */
async function callTeacherApi({ key, model, systemText, contents, fetchImpl = fetch, timeoutMs = 20000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const callOnce = async (m) => fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
      }),
      signal: ctrl.signal,
    },
  );
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
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/* ================= V2.4 多轮讨论 =================
 * 每道题一个 thread，存在 localStorage（键名 zkq_teacher_thread_<questionId>），
 * 形状 [{ role: 'user' | 'teacher', text }]。第一轮就是首问的老师讲解（已进 thread，
 * 不用重新问）；切到别的题回来，这道题的讨论记录还在。家长看板只统计次数，不看内容。
 */
export const TEACHER_THREAD_PREFIX = 'zkq_teacher_thread_';
/** 学生连续回这么多次还没过关键步骤，老师直接给完整做法并收尾，不再反问 */
export const TEACHER_MAX_STUDENT_TURNS = 6;

function threadKey(questionId) {
  return `${TEACHER_THREAD_PREFIX}${questionId}`;
}

/** thread → JSON 字符串（纯函数，便于测试；脏条目直接丢掉） */
export function serializeTeacherThread(thread) {
  try {
    const clean = (Array.isArray(thread) ? thread : []).filter(
      (m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'teacher'),
    ).map((m) => ({ role: m.role, text: m.text }));
    return JSON.stringify(clean);
  } catch {
    return '[]';
  }
}

/** JSON 字符串 → thread（纯函数；解析失败或格式不对都回 []，不抛错） */
export function parseTeacherThread(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'teacher'),
    ).map((m) => ({ role: m.role, text: m.text }));
  } catch {
    return [];
  }
}

export function readTeacherThread(storage, questionId) {
  try {
    return parseTeacherThread(storage?.getItem?.(threadKey(questionId)));
  } catch {
    return [];
  }
}

export function writeTeacherThread(storage, questionId, thread) {
  try {
    storage?.setItem?.(threadKey(questionId), serializeTeacherThread(thread));
  } catch { /* 写不进也不影响做题 */ }
}

export function clearTeacherThread(storage, questionId) {
  try {
    storage?.removeItem?.(threadKey(questionId));
  } catch { /* 不报错 */ }
}

/**
 * 拼追问的 contents（纯函数，便于测试）。
 * 第 0 条永远是原题上下文（user）；之后是 thread：一轮 teacher 首答 → model，
 * 再 user/teacher 交替。Gemini 多轮要求 user/model 严格交替，同 role 连续出现时
 * 合并进上一条，绝不发两条同 role 相邻的消息。
 */
export function buildTeacherFollowUpContents({ question, topicName, myAnswer, hintsShown = 0, thread = [] }) {
  const contents = [{ role: 'user', parts: [{ text: buildTeacherUserText({ question, topicName, myAnswer, hintsShown }) }] }];
  for (const m of Array.isArray(thread) ? thread : []) {
    if (!m || typeof m.text !== 'string') continue;
    const role = m.role === 'teacher' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last.role === role) last.parts[0].text += `\n${m.text}`;
    else contents.push({ role, parts: [{ text: m.text }] });
  }
  return contents;
}

/**
 * 追问用的 system prompt：原老师人设不变，再加追问规则——
 * 答对了夸一句推进下一步，答错了温和指出、给更小的提示，一次只讲一步；
 * 学生回够 TEACHER_MAX_STUDENT_TURNS 次还没过关键步骤，直接给完整做法收尾。
 */
export function buildTeacherFollowUpSystemPrompt(userTurns = 0) {
  const extra = [
    '现在是同一道题的继续讨论：学生已经听过你的第一段讲解，正在回你的反问。',
    '根据他这次回的话接着讲：答对了先夸一句，再推进下一步；答错了温和指出错在哪，再给一个比刚才更小的提示；一次只讲一步，每段不超过 150 字；不要直接把完整答案甩出来。',
  ];
  if (userTurns >= TEACHER_MAX_STUDENT_TURNS) {
    extra.push(`学生已经连续回了 ${userTurns} 次还没过关键步骤，这次直接给完整做法，分步写清楚，然后收尾鼓励他去做下一题，不要再反问。`);
  }
  return `${TEACHER_SYSTEM_PROMPT}\n${extra.join('\n')}`;
}

/**
 * 追问一次（学生回了一句话之后）。返回 { text, cached: false }；失败时抛错。
 * thread 必须以一条 user 消息结尾（就是学生刚回的那句）；追问不写首问缓存。
 * @param {Array} p.thread [{role:'user'|'teacher', text}]，含学生刚回的最后一句
 */
export async function askTeacherFollowUp({
  question, topicName, myAnswer, hintsShown = 0, thread = [],
  storage, fetchImpl = fetch, timeoutMs = 20000,
} = {}) {
  if (!question?.id) throw new Error('题目不完整，问不了老师');
  const msgs = Array.isArray(thread) ? thread : [];
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') {
    throw new Error('讨论记录不完整，先让学生回一句话');
  }
  const userTurns = msgs.filter((m) => m.role === 'user').length;
  const text = await callTeacherApi({
    key: requireTeacherKey(storage),
    model: getTeacherModel(storage),
    systemText: buildTeacherFollowUpSystemPrompt(userTurns),
    contents: buildTeacherFollowUpContents({ question, topicName, myAnswer, hintsShown, thread: msgs }),
    fetchImpl, timeoutMs,
  });
  return { text, cached: false };
}
