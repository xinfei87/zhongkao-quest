/** 小工具：转义、日期、弹层、提示 */
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pad2 = (n) => String(n).padStart(2, '0');

/** 本地时区的 YYYY-MM-DD（不能用 toISOString，那会偏到 UTC） */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt);
}

export function diffDays(a, b) {
  const ta = new Date(a + 'T00:00:00').getTime();
  const tb = new Date(b + 'T00:00:00').getTime();
  return Math.round((tb - ta) / 86400000);
}

export const uid = () => Math.random().toString(36).slice(2, 9);

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1800);
}

export function openSheet(html) {
  const d = document.getElementById('sheet');
  d.innerHTML = `<div class="sheet-body">${html}</div>`;
  if (!d.open) d.showModal();
  return d;
}

export function closeSheet() {
  const d = document.getElementById('sheet');
  if (d?.open) d.close();
}

export function vibrate(ms = 12) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
