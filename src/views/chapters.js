import { esc } from '../util.js';

export function renderChapters(app, root) {
  const picked = app.pickedSubject || app.index.subjects[0].id;
  const subject = app.index.subjects.find((s) => s.id === picked) || app.index.subjects[0];

  const groups = new Map();
  for (const c of subject.chapters) {
    const book = c.key.split(' ')[0] || '其他';
    if (!groups.has(book)) groups.set(book, []);
    groups.get(book).push(c);
  }

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn btn-sm btn-ghost" id="back">← 返回</button>
    </div>
    <h1 style="font-size:22px;margin-bottom:4px">自选章节</h1>
    <p class="hint" style="margin-bottom:14px">挑一章，只练这一章的基础题。</p>
    <div class="subject-pills">
      ${app.index.subjects.map((s) => `<button class="pill ${s.id === subject.id ? 'on' : ''}" data-sub="${s.id}">${esc(s.name)}</button>`).join('')}
    </div>
    <div class="chapter-group">
      ${[...groups.entries()].map(([book, list]) => `
        <div class="chapter-head">${esc(book)}</div>
        ${list.map((c) => `
          <button class="chapter-item" data-chapter="${esc(c.key)}">
            <span>${esc(c.key.replace(book, '').trim() || book)}</span>
            <span class="cnt">${c.questionCount} 题</span>
          </button>`).join('')}
      `).join('')}
    </div>
  `;

  root.querySelector('#back').onclick = () => app.go('home');
  root.querySelectorAll('[data-sub]').forEach((b) => {
    b.onclick = () => { app.pickedSubject = b.dataset.sub; renderChapters(app, root); };
  });
  root.querySelectorAll('[data-chapter]').forEach((b) => {
    b.onclick = () => app.startSession({ subjectId: subject.id, chapter: b.dataset.chapter });
  });
}
