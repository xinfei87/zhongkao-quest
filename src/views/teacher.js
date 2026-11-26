/**
 * 老师只读查看（V2，本机版）。
 * 入口：首页“我是老师”或“我的 → 我是老师”。老师粘贴家长给的分享码（T7- 开头），
 * 只能看家长看板同样的内容（今日完成、掌握度、薄弱 Top 5、趋势、问老师/提示统计），
 * 不能改设置、不能兑换积分、不能清空进度、看不到 PIN 和 Key。
 * 看到的数据是家长生成分享码那一刻的快照，不是实时数据；过期（7 天）后须家长重新生成。
 */
import { esc, toast } from '../util.js';
import { decodeTeacherShare } from '../store/teacherShare.js';
import { loadSubject } from '../data.js';
import {
  computeToday, todayCardHTML,
  computeMastery, masteryHTML,
  computeWeakTop, weakTopHTML,
  computeTrend, trendHTML,
  computeTeacherUse, teacherUseHTML,
} from './dashboard.js';

export function renderTeacher(app, root) {
  const snap = app.teacherSnapshot || null;

  // 还没粘贴分享码：先贴码
  if (!snap) {
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-sm btn-ghost" id="back">← 返回首页</button>
      </div>
      <section class="card" style="max-width:520px;margin:24px auto">
        <h1 style="font-size:20px;margin-bottom:6px">老师查看（只读）</h1>
        <p class="hint">粘贴家长给你的分享码（T7- 开头），就能看学生的学习情况。只能看，不能改；也看不到家长 PIN 和 AI 的 Key。</p>
        <p class="hint" style="margin-top:8px">数据是家长生成分享码那一刻的快照，不是实时数据；分享码 7 天内有效，过期请家长重新生成。</p>
        <textarea class="answer-input" id="tcode" rows="3" style="margin-top:14px;font-family:monospace;font-size:13px" placeholder="粘贴 T7- 开头的分享码"></textarea>
        <button class="btn btn-primary" id="view" style="margin-top:12px">查看学生进度</button>
      </section>`;
    root.querySelector('#back').onclick = () => app.go('home');
    root.querySelector('#view').onclick = async () => {
      const code = root.querySelector('#tcode').value;
      if (!code.trim()) return toast('先粘贴分享码');
      try {
        const payload = await decodeTeacherShare(code);
        app.teacherSnapshot = payload;
        renderTeacher(app, root);
      } catch (e) {
        toast(e.message || '分享码不对');
      }
    };
    return;
  }

  const s = snap.state;
  const today = computeToday(s, app.index.subjects);
  const trend = computeTrend(s, 7);
  const teacherUse = computeTeacherUse(s);
  const generatedAt = new Date(snap.generatedAt).toLocaleString('zh-CN');
  const expAt = new Date(snap.exp).toLocaleString('zh-CN');

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn btn-sm btn-ghost" id="back">← 返回首页</button>
      <button class="btn btn-sm btn-ghost" id="exit">退出查看</button>
    </div>
    <h1 style="font-size:22px;margin-bottom:4px">${esc(s.profile?.name || '初三同学')}的学习情况</h1>
    <p class="hint" style="margin-bottom:14px">只读查看，不能修改。数据来自家长分享的快照，生成于 ${esc(generatedAt)}，有效期至 ${esc(expAt)}；不是实时数据，想看最新进度请家长重新生成分享码。</p>

    <h2 class="sec-title">今日完成情况</h2>
    <div class="card" style="padding:14px 18px">
      ${todayCardHTML(today)}
    </div>

    <h2 class="sec-title">知识掌握情况（按科目）</h2>
    <div class="card" style="padding:6px 18px" id="mastery-box">
      <p class="hint" style="padding:14px 0">统计中…</p>
    </div>

    <h2 class="sec-title">薄弱 Top 5</h2>
    <div class="card" style="padding:6px 18px" id="weak-box">
      <p class="hint" style="padding:14px 0">统计中…</p>
    </div>

    <h2 class="sec-title">最近 7 天正确率趋势</h2>
    <div class="card" style="padding:6px 18px">
      ${trendHTML(trend)}
    </div>

    <h2 class="sec-title">问老师与提示（本周）</h2>
    <div class="card" style="padding:14px 18px">
      ${teacherUseHTML(teacherUse)}
    </div>
  `;

  root.querySelector('#back').onclick = () => app.go('home');
  root.querySelector('#exit').onclick = () => {
    app.teacherSnapshot = null;
    renderTeacher(app, root);
  };

  Promise.all(app.index.subjects.map((sub) => loadSubject(sub.id).catch(() => null))).then((sets) => {
    const topicById = {};
    const questionsById = new Map();
    const subjectData = [];
    sets.forEach((d, i) => {
      if (!d) return;
      Object.assign(topicById, d.topicById);
      d.questionsById.forEach((q, id) => questionsById.set(id, q));
      subjectData.push({ subject: app.index.subjects[i], topics: d.topics });
    });
    const masteryBox = root.querySelector('#mastery-box');
    if (masteryBox) masteryBox.innerHTML = masteryHTML(computeMastery(s, subjectData));
    const weakBox = root.querySelector('#weak-box');
    if (weakBox) weakBox.innerHTML = weakTopHTML(computeWeakTop(s, topicById, questionsById, 5));
  });
}
