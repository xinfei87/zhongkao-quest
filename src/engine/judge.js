/**
 * 判分器：选择题、数值/分数/多个解、简答（可退化到自评）。
 * 纯函数，无 DOM 依赖，方便单元测试。
 */

const FULLWIDTH = /[\uFF01-\uFF5E]/g;
const SUP = { '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4', '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9', '⁻': '^-' };

/** 统一全角、空白、乘号、上标 */
export function normalize(input = '') {
  let s = String(input)
    .replace(FULLWIDTH, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[，、；;]/g, ',')
    .replace(/[×·✕]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[＝]/g, '=')
    .replace(/\s+/g, '')
    .trim();
  for (const [k, v] of Object.entries(SUP)) s = s.split(k).join(v);
  return s.toLowerCase();
}

/** 从答案里拆出多个解：'7，-3/4，5' -> ['7','-3/4','5'] */
export function answerParts(answer = '') {
  return String(answer)
    .replace(/[；;、]/g, ',')
    .replace(/，/g, ',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 解析数值：整数 / 小数 / 分数 / 百分数 / 科学计数 / 含单位后缀（只取数字部分） */
export function parseNumber(raw) {
  if (raw == null) return null;
  let s = normalize(raw);
  if (!s) return null;
  s = s.replace(/^[a-z]=/, '');            // x=5
  s = s.replace(/(度|元|米|厘米|千克|克|秒|分钟|小时|牛|帕|瓦|焦|伏|安|欧|升|毫升|摄氏)$/g, '');
  const pct = s.endsWith('%');
  if (pct) s = s.slice(0, -1);
  if (/^[-+]?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return pct ? n / 100 : n;
  }
  const frac = s.match(/^([-+]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (!den) return null;
    return Number(frac[1]) / den;
  }
  const sci = s.match(/^([-+]?\d+(?:\.\d+)?)\*10\^([-+]?\d+)$/);
  if (sci) return Number(sci[1]) * Math.pow(10, Number(sci[2]));
  return null;
}

const close = (a, b) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-6);

/** 判断一组输入是否与答案（可多个解，顺序无关）一致 */
export function judgeNumeric(answer, inputs) {
  const expected = answerParts(answer).map(parseNumber);
  const got = (Array.isArray(inputs) ? inputs : [inputs]).map(parseNumber);
  if (expected.some((n) => n === null)) return null; // 答案本身不可解析，交给人
  if (got.length !== expected.length || got.some((n) => n === null)) return false;
  const used = new Array(got.length).fill(false);
  for (const e of expected) {
    const i = got.findIndex((g, idx) => !used[idx] && close(g, e));
    if (i < 0) return false;
    used[i] = true;
  }
  return true;
}

export function judgeChoice(question, key) {
  const answer = normalize(question.answer);
  if (normalize(key) === answer) return true;
  // 容错：学生选的是选项文字
  const hit = (question.choices || []).find((c) => normalize(c.key) === answer);
  return !!hit && normalize(key) === normalize(hit.text);
}

/** 简答题：能判定就返回布尔，判不了返回 null（交给孩子自评） */
export function judgeShort(answer, text) {
  const a = normalize(answer);
  const b = normalize(text);
  if (!a || !b) return null;
  if (a === b) return true;
  // 多解：任意顺序包含
  const pa = answerParts(answer).map(normalize);
  if (pa.length > 1) {
    const pb = answerParts(text).map(normalize);
    if (pa.length === pb.length && pa.every((x) => pb.includes(x))) return true;
  }
  return null;
}

/**
 * 统一入口
 * @returns {true|false|null} null 表示需要学生自评
 */
export function judge(question, input) {
  switch (question.type) {
    case 'choice':
      return judgeChoice(question, input);
    case 'numeric':
      return judgeNumeric(question.answer, input);
    default:
      return judgeShort(question.answer, input);
  }
}

/** 题目是否需要多个输入框 */
export function inputCount(question) {
  if (question.type !== 'numeric') return 1;
  return Math.max(1, answerParts(question.answer).length);
}
