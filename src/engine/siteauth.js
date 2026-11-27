/**
 * V2.5 全站口令 + 共享 Key（简易版）。
 *
 * 用户已定：打开网站先输账号密码，输对的人进去就有 Key、问老师能用。
 * 安全底线（仓库是公开的，GitHub Pages 的文件谁都能直接下载）：
 * - Key 绝不能以明文进仓库、进代码、进任何公开文件。
 * - Key 在仓库里只以密文形式存在（data/shared-key.json），口令就是解密它的钥匙；
 *   没口令的人拿到密文也没用；有口令的人才能解出 Key（用户已接受：有口令的人
 *   理论上能把 Key 抠出来，简易版只给信任的老师）。
 *
 * 加密：PBKDF2（SHA-256，10 万次，随机 16 字节 salt）派生 → AES-GCM 256。
 * 共享包格式 JSON {v:1, salt:<base64>, iv:<base64>, data:<base64>}。
 * 解出的文本必须以 AQ. 开头且长度大于 20，否则按“口令不对或包已损坏”处理。
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

/** 把 Key 加密成共享包（家长在 iPad 上生成）。密码只进这次调用，不存任何地方。 */
export async function encryptSharedKey(key, password) {
  const s = subtle();
  if (!s) throw new Error('浏览器不支持加密');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ck = await deriveKey(password, salt);
  const data = await s.encrypt({ name: 'AES-GCM', iv }, ck, new TextEncoder().encode(key));
  return { v: 1, salt: b64encode(salt), iv: b64encode(iv), data: b64encode(data) };
}

/**
 * 解共享包。返回 Key 明文。
 * 报错只给这三种友好提示，原始错误不往外漏：
 * - “共享 Key 包还没生成”：包缺字段或 salt/iv/data 为空（占位文件就是这个状态）
 * - “共享 Key 包已损坏”：base64 解不开
 * - “口令不对或包已损坏”：口令错（AES-GCM 校验失败）或解出的文本不是 AQ. 开头的 Key
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
  const key = new TextDecoder().decode(plain);
  if (!key.startsWith('AQ.') || key.length <= 20) throw new Error('口令不对或包已损坏');
  return key;
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
