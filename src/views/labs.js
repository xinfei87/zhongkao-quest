import { esc, toast } from '../util.js';
import { LABS_BY_SUBJECT, labMeta } from '../labs.js';
import { loadSubject } from '../data.js';

const SUBJECT_NAME = { math: '数学', chinese: '语文', english: '英语', physics: '物理', chemistry: '化学' };

export function renderLabs(app, root) {
  const picked = app.labSubject || 'physics';
  // V2：中考重点推荐的两个实验置顶（光学、函数），其余保持原顺序
  const list = [...(LABS_BY_SUBJECT[picked] || [])].sort((a, b) => {
    const ra = labMeta(a.id).recommended ? 0 : 1;
    const rb = labMeta(b.id).recommended ? 0 : 1;
    return ra - rb;
  });

  root.innerHTML = `
    <h1 style="font-size:22px;margin-bottom:4px">可视化实验室</h1>
    <p class="hint" style="margin-bottom:14px">抽象概念讲不清的时候，先动手看一遍。看完回来只做 1 题。</p>
    <p class="hint" style="margin-bottom:14px">演示都在 wedulab.com 新标签打开（站内没有 3D 演示），1-3 秒加载，全中文，不用登录。</p>
    <div class="subject-pills">
      ${Object.keys(LABS_BY_SUBJECT).map((k) => `<button class="pill ${k === picked ? 'on' : ''}" data-sub="${k}">${SUBJECT_NAME[k] || k}</button>`).join('')}
    </div>
    <div style="margin-top:14px">
      ${list.map((lab) => {
        const meta = labMeta(lab.id);
        const paired = (meta.quizTopics || []).length > 0;
        return `
        <div class="card lab-card">
          <div class="lab-head">
            <span class="lab-dot">⚗</span>
            <div class="row-main">
              <div class="row-title">${esc(lab.title)}${meta.recommended ? ' <span class="chip" style="color:#B45309">⭐ 中考重点推荐</span>' : ''}</div>
              <div class="row-sub">在 wedulab.com 新标签打开</div>
            </div>
          </div>
          <div class="lab-task">看之前先记住任务：${esc(lab.task)}</div>
          ${meta.guide ? `<p class="hint" style="margin-top:8px">📌 操作指引：${esc(meta.guide)}</p>` : ''}
          ${meta.scopeNote ? `<p class="hint" style="margin-top:8px">⚠️ 只看范围：${esc(meta.scopeNote)}</p>` : ''}
          <div class="btn-row" style="margin-top:4px">
            <a class="btn btn-sm btn-primary" href="${lab.url}" target="_blank" rel="noopener noreferrer">打开实验</a>
            ${paired
              ? `<button class="btn btn-sm" data-test="${lab.id}">看完测 1 题</button>`
              : `<button class="btn btn-sm" data-chapters="${lab.id}">回站内练相关章节</button>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  root.querySelectorAll('[data-sub]').forEach((b) => {
    b.onclick = () => { app.labSubject = b.dataset.sub; renderLabs(app, root); };
  });

  // V2：没有对口题的实验不假装有针对题，直接回章节页练相关章节
  root.querySelectorAll('[data-chapters]').forEach((b) => {
    b.onclick = () => app.go('chapters');
  });

  root.querySelectorAll('[data-test]').forEach((b) => {
    b.onclick = async () => {
      const lab = list.find((l) => l.id === b.dataset.test);
      const meta = labMeta(lab.id);
      b.disabled = true;
      b.textContent = '出题中…';
      try {
        const d = await loadSubject(lab.subject);
        // V2：只从写死的对口考点里出基础题；再也不取“该科第一道基础题”凑数
        const topics = (meta.quizTopics || []);
        const q = d.questions.find((x) => x.difficulty === 'basic' && topics.includes(x.topicId))
          || d.questions.find((x) => topics.includes(x.topicId));
        if (!q) throw new Error('这个实验还没有对口的基础题，先去练相关章节');
        app.startMiniQuiz({
          questions: [q],
          title: '实验后巩固 1 题',
          data: { ...d, subject: lab.subject },
          // V2：退出测题回实验室页，不是首页
          returnTo: 'labs',
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
