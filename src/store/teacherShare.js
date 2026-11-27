/**
 * 分享给老师（只读，V2）。
 * 家长在家长入口点“生成老师分享码”，得到一段 7 天有效的快照码，发给老师；
 * 老师在本站“老师查看”入口粘贴，只能看家长看板同样的内容，不能改任何东西。
 *
 * 安全：
 * - 快照里去掉家长 PIN（老师看不到 PIN，也改不了设置）。
 * - Gemini Key 根本不在 state 里（单独存 localStorage），天然不进快照。
 * - 快照是只读数据，老师端没有任何写入入口：不能兑换积分、不能清空进度、
 *   不能改设置、不能生成新的分享码。
 * - 7 天过期后解码直接报错，须家长重新生成。
 * - 编码复用现有 sync.js 的 encodeState/decodeState（压缩 + base64），
 *   外面再包一层 T7- 前缀，和跨端同步口令码（ZKQ1- 开头）区分开。
 */
import { encodeState, decodeState } from './sync.js';

export const TEACHER_SHARE_DAYS = 7;
const PREFIX = 'T7-';

/**
 * 把孩子的学习存档脱敏成“可分享的快照”：
 * - 家长 PIN 换成随机数（老师那台设备上的家长入口打不开，也不会拿到真的 PIN；
 *   1234 这种默认 PIN 更不能留，否则老师随手一试就进了家长入口）。
 * - Gemini Key 不在 state 里，这里再防一手。
 * - 其余（做题记录、错题本、积分、掌握度）原样保留，老师登录后看到的和孩子这台设备上一样。
 */
export function stripStateForShare(state) {
  const stripped = JSON.parse(JSON.stringify(state || {}));
  if (stripped.profile) {
    stripped.profile.pin = String(Math.floor(10000000 + Math.random() * 90000000));
  }
  delete stripped.teacherKey;
  return stripped;
}

export async function createTeacherShare(state) {
  const stripped = stripStateForShare(state);
  const payload = {
    kind: 'teacher',
    version: 1,
    generatedAt: Date.now(),
    exp: Date.now() + TEACHER_SHARE_DAYS * 24 * 60 * 60 * 1000,
    state: stripped,
  };
  return PREFIX + (await encodeState(payload));
}

/** 解码老师分享码。成功返回 payload {kind, generatedAt, exp, state}；失败抛错（调用方显示给用户）。 */
export async function decodeTeacherShare(code) {
  const raw = String(code || '').trim().replace(/\s+/g, '');
  if (!raw.startsWith(PREFIX)) {
    throw new Error('分享码格式不对，应以 T7- 开头（同步口令码是 ZKQ1- 开头，别拿错了）');
  }
  const payload = await decodeState(raw.slice(PREFIX.length));
  if (payload?.kind !== 'teacher') {
    throw new Error('这不是老师分享码，请检查是否复制错了');
  }
  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('分享码已过期（7 天有效），请家长重新生成一个');
  }
  if (!payload.state) throw new Error('分享码里没有数据');
  return payload;
}
