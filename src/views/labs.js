import { esc, toast } from '../util.js';
import { LABS_BY_SUBJECT } from '../labs.js';
import { loadSubject } from '../data.js';

const SUBJECT_NAME = { math: '数学', chinese: '语文', english: '英语', physics: '物理', chemistry: '化学' };

export function renderLabs(app, root) {
  const picked = app.labSubject || 'physics';
  const list = LABS_BY_SUBJECT[picked] || [];

  root.innerHTML = `
    <h1 style="font-size:22px;margin-bottom:4px">可视化实验室</h1>
    <p class="hint" style="margin-bottom:14px">抽象概念讲不清的时候，先动手看一遍。看完回来只做 1 题。</p>
    <div class="subject-pills">
      ${Object.keys(LABS_BY_SUBJECT).map((k) => `<button class="pill ${k === picked ? 'on' : ''}" data-sub="${k}">${SUBJECT_NAME[k] || k}</button>`).join('')}
    </div>
    <div style="margin-top:14px">
      ${list.map((lab) => `
        <div class="card lab-card">
          <div class="lab-head">
            <span class="lab-dot">⚗</span>
            <div class="row-main">
              <div class="row-title">${esc(lab.title)}</div>
              <div class="row-sub">在 wedulab.com 新标签打开</div>
            </div>
          </div>
          <div class="lab-task">看之前先记住任务：${esc(lab.task)}</div>
          <div class="btn-row" style="margin-top:4px">
            <a class="btn btn-sm btn-primary" href="${lab.url}" target="_blank" rel="noopener noreferrer">打开实验</a>
            <button class="btn btn-sm" data-test="${lab.id}">看完测 1 题</button>
          </div>
        </div>`).join('')}
    </div>
  `;

  root.querySelectorAll('[data-sub]').forEach((b) => {
    b.onclick = () => { app.labSubject = b.dataset.sub; renderLabs(app, root); };
  });

  root.querySelectorAll('[data-test]').forEach((b) => {
    b.onclick = async () => {
      const lab = list.find((l) => l.id === b.dataset.test);
      b.disabled = true;
      b.textContent = '出题中…';
      try {
        const d = await loadSubject(lab.subject);
        const basics = d.questions.filter((q) => q.difficulty === 'basic');
        const topicIds = new Set(
          d.topics.filter((t) => {
            const text = `${t.name}${t.chapter}${t.domain}`;
            return lab.keys.some((k) => text.includes(k));
          }).map((t) => t.id),
        );
        const q = basics.find((x) => topicIds.has(x.topicId)) || basics[0];
        if (!q) throw new Error('这一科暂时没有基础题');
        app.startMiniQuiz({
          questions: [q],
          title: '实验后巩固 1 题',
          data: { ...d, subject: lab.subject },
          onDone: () => app.go('labs'),
        });
      } catch (e) {
        toast(e.message);
        b.disabled = false;
        b.textContent = '看完测 1 题';
      }
    };
  });
}
