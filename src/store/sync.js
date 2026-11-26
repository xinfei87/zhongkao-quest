/**
 * 跨端同步：把存档压成一段口令码，手机复制到平板粘贴即可。
 * 有 CompressionStream 时先 deflate 再 base64，没有就退化为纯 base64。
 */
const PREFIX = 'ZKQ1-';
const PREFIX_GZ = 'ZKQ1G-';

const b64encode = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64decode = (str) => {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
};

export async function encodeState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream === 'function') {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    return PREFIX_GZ + b64encode(buf);
  }
  return PREFIX + b64encode(bytes);
}

export async function decodeState(code) {
  const raw = String(code || '').trim().replace(/\s+/g, '');
  if (raw.startsWith(PREFIX_GZ)) {
    const bytes = b64decode(raw.slice(PREFIX_GZ.length));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const text = await new Response(stream).text();
    return JSON.parse(text);
  }
  if (raw.startsWith(PREFIX)) {
    return JSON.parse(new TextDecoder().decode(b64decode(raw.slice(PREFIX.length))));
  }
  throw new Error('口令码格式不对，应以 ZKQ1- 开头');
}
