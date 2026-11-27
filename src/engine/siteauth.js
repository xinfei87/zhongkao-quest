/**
 * V2.5 全站口令 + 共享 Key（简易版，2026-11-27 修订：包里同时带孩子进度快照）。
 *
 * 用户已定：给老师发一个网址 + 账号 + 密码，老师就能完整体验整个系统，
 * 看到的和孩子这台设备上的一模一样（做题记录、错题本、积分都在），不用再
 * 让老师贴什么分享码、导什么同步口令码。
 *
 * 做法：家长在 iPad 上生成共享包时，包里除了 Key，还带一份孩子当前存档的
 * 快照（生成那一刻的样子）。老师登录时解密，Key 存进 zkq_teacher_key，
 * 快照直接写进本机存档，看到的就是孩子那台设备上的样子。
 * 老师在自己设备上做的题只留在他自己设备上，不会传回 iPad。
 * 孩子进度变多了想让老师看到最新的：家长重新生成一次包，老师退出登录
 * 再进一次（“我的”页有“退出登录”），就带上了最新快照。
 *
 * 安全底线（仓库是公开的，GitHub Pages 的文件谁都能直接下载）：
 * - Key 绝不能以明文进仓库、进代码、进任何公开文件。
 * - Key 和孩子存档在仓库里只以密文形式存在（data/shared-key.json），
 *   口令就是解密它们的钥匙；没口令的人拿到密文也没用；有口令的人才能
 *   解出 Key 和存档（用户已接受：有口令的人理论上能把 Key 抠出来，
 *   简易版只给信任的老师）。
 * - 快照里家长 PIN 被换成随机数（见 teacherShare.js 的 stripStateForShare），
 *   老师那台设备上的家长入口打不开，也拿不到真的 PIN。
 *
 * 加密：PBKDF2（SHA-256，10 万次，随机 16 字节 salt）派生 → AES-GCM 256。
 * 明文是 JSON {key, state}，先用 deflate 压一下（存档几十 KB，压完小得多；
 * 没有 CompressionStream 的环境就退化为不压缩，包里 zip 字段标明）。
 * 共享包格式 JSON {v:1, zip:0|1, salt:<base64>, iv:<base64>, data:<base64>}。
 * 解出的 Key 必须以 AQ. 开头且长度大于 20，否则按“口令不对或包已损坏”处理。
 * 用 WebCrypto（crypto.subtle）：浏览器要 HTTPS 才能用，GitHub Pages 是 HTTPS；
 * Node 19+ 自带 globalThis.crypto，单测可以直接跑。
 */
export const SITE_ACCOUNT = 'test';
export const SITE_AUTH_LS = 'zkq_auth';
export const PBKDF2_ITERATIONS = 100000;

// 和 data.js 同一套写法：从本文件位置算 data/ 目录
const SHARED_PACK_URL = new URL('../../data/shared-key.json', import.meta.url).toString();

const subtle = () => globalThis.crypto?.subtle ?? null;

/** ArrayBuffer → base64（btoa 只认二进制串，先逐字节转） */
export function b64encode(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** base64 → ArrayBuffer（非法 base64 时 atob 抛错，调用方转成友好提示） */
export function b64decode(str) {
  const s = atob(str);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

/** 账号必须是 test（写死常量） */
export function isSiteAccount(account) {
  return (account ?? '').trim() === SITE_ACCOUNT;
}

/** 本机登录过（zkq_auth 有值）→ 直接进站 */
export function isSiteAuthed(storage) {
  try {
    return Boolean(storage?.getItem?.(SITE_AUTH_LS));
  } catch {
    return false;
  }
}

/** 登录成功后写标记（值记当天日期，供以后查什么时候登过） */
export function markSiteAuthed(storage, dateStr) {
  try {
    storage?.setItem?.(SITE_AUTH_LS, dateStr);
  } catch { /* 存不进就当没登录，下次再输一次口令 */ }
}

async function deriveKey(password, saltBuf) {
  const s = subtle();
  const base = await s.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return s.deriveKey(
    { name: 'PBKDF2', salt: saltBuf, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** 有 CompressionStream 就 deflate 压一下；没有或压失败返回 null（调用方用原文） */
async function deflateBytes(bytes) {
  if (typeof CompressionStream !== 'function') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/** 解压（只在包标了 zip:1 时调用；解不开按“包已损坏”处理） */
async function inflateBytes(bytes) {
  if (typeof DecompressionStream !== 'function') throw new Error('浏览器不支持解压');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * 把 Key + 孩子存档快照加密成共享包（家长在 iPad 上生成）。
 * state 传脱敏后的快照（stripStateForShare），不传就是只有 Key 的包。
 * opts.compress=false 可强制不压缩（单测覆盖不压缩的包也能解）。
 * 密码只进这次调用，不存任何地方。
 */
export async function encryptSharedKey(key, password, state = null, opts = {}) {
  const s = subtle();
  if (!s) throw new Error('浏览器不支持加密');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ck = await deriveKey(password, salt);
  const plain = new TextEncoder().encode(JSON.stringify({ key, state: state ?? null }));
  let bytes = plain;
  let zip = 0;
  if (opts.compress !== false) {
    const zipped = await deflateBytes(plain);
    if (zipped && zipped.length < plain.length) {
      bytes = zipped;
      zip = 1;
    }
  }
  const data = await s.encrypt({ name: 'AES-GCM', iv }, ck, bytes);
  return { v: 1, zip, salt: b64encode(salt), iv: b64encode(iv), data: b64encode(data) };
}

/**
 * 解共享包。返回 {key, state}：key 是 Key 明文，state 是孩子存档快照（没有就是 null）。
 * 报错只给这三种友好提示，原始错误不往外漏：
 * - “共享 Key 包还没生成”：包缺字段或 salt/iv/data 为空（占位文件就是这个状态）
 * - “共享 Key 包已损坏”：base64 解不开、解压失败、解出的不是合法 JSON
 * - “口令不对或包已损坏”：口令错（AES-GCM 校验失败）或解出的 Key 不是 AQ. 开头的
 */
export async function decryptSharedKey(pack, password) {
  if (!pack || typeof pack !== 'object' || pack.v !== 1 || !pack.salt || !pack.iv || !pack.data) {
    throw new Error('共享 Key 包还没生成');
  }
  const s = subtle();
  if (!s) throw new Error('浏览器不支持加密');
  let salt;
  let iv;
  let data;
  try {
    salt = b64decode(pack.salt);
    iv = b64decode(pack.iv);
    data = b64decode(pack.data);
  } catch {
    throw new Error('共享 Key 包已损坏');
  }
  let plain;
  try {
    const ck = await deriveKey(password, salt);
    plain = await s.decrypt({ name: 'AES-GCM', iv }, ck, data);
  } catch {
    throw new Error('口令不对或包已损坏');
  }
  let bytes = new Uint8Array(plain);
  if (pack.zip) {
    try {
      bytes = await inflateBytes(bytes);
    } catch {
      throw new Error('共享 Key 包已损坏');
    }
  }
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('共享 Key 包已损坏');
  }
  const key = payload?.key;
  if (typeof key !== 'string' || !key.startsWith('AQ.') || key.length <= 20) {
    throw new Error('口令不对或包已损坏');
  }
  const state = payload?.state ?? null;
  if (state !== null && (typeof state !== 'object' || Array.isArray(state))) {
    throw new Error('共享 Key 包已损坏');
  }
  return { key, state };
}

/** 取仓库里的共享包。404 / 取不到 / 不是 JSON / 缺字段 → 按“包还没生成/已损坏”报。 */
export async function loadSharedPack(fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(SHARED_PACK_URL, { cache: 'no-cache' });
  } catch {
    throw new Error('共享 Key 包还没生成');
  }
  if (!res.ok) throw new Error('共享 Key 包还没生成');
  let pack;
  try {
    pack = await res.json();
  } catch {
    throw new Error('共享 Key 包已损坏');
  }
  if (!pack || typeof pack !== 'object' || !pack.salt || !pack.iv || !pack.data) {
    throw new Error('共享 Key 包还没生成');
  }
  return pack;
}
