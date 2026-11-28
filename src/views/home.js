import { dayKey, esc } from '../util.js';
import { pickSubject, weekStats } from '../engine/scheduler.js';
import { saveState } from '../store/local.js';

export function renderHome(app, root) {
  const s = app.state;
  const subject = pickSubject(app.index.subjects, s);
  if (!subject) {
    root.innerHTML = '<p class="hint">题库为空。</p>';
    return;
  }
  const today = dayKey();
  const done = s.today?.date === today && s.today.done;
  const wrongCount = (s.wrongBook || []).filter((w) => w.status !== 'cleared').length;
  const week = weekStats(s, 7);
  // 每日一关的题量和时间跟着档案走（2026-11-29 起默认 21 题/约 50 分钟）。
  const dailyQ = s.profile.dailyQuestions || 21;
  const dailyMin = s.profile.dailyGoalMinutes || 50;
  // V2：首页显示当前主攻年级（调度已改成先补七年级地基）
  const focusText = s.focus?.grade
    ? `${s.focus.grade}年级${s.focus.topic ? ` · ${s.focus.topic}` : ''}`
    : '先从七年级地基补起';

  root.innerHTML = `
    <section class="card hero">
      <span class="hero-subject">${esc(subject.name)} · ${done ? '今天已完成' : '基础巩固'}</span>
      <h1>${done ? '今天已经打过卡了' : '开始今日一关'}</h1>
      <p class="meta">${done ? '想再练一轮也完全可以' : `约 ${dailyMin} 分钟 · ${dailyQ} 道题 · 第 1 题一定做得出来`}</p>
      <p class="hint" style="margin-top:8px">主攻：${esc(focusText)}</p>
      <button class="btn btn-primary" id="start">${done ? '再来一关' : `开始今日一关（约 ${dailyMin} 分钟）`}</button>
    </section>

    ${!s.profile.onboarded ? `
    <section class="card" style="margin-top:12px">
      <h2 style="font-size:18px;margin-bottom:6px">先认识一下</h2>
      <p class="hint" style="margin-bottom:12px">填一次就好，以后每天打开就是你的进度，不用登录。</p>
      <input class="answer-input" id="ob-name" placeholder="你的名字（比如：小飞）" style="width:100%" />
      <div class="btn-row" style="margin-top:10px">
        <span class="hint" style="align-self:center">每天目标</span>
        ${[15, 30, 45, 50].map((m) => `<button class="btn btn-sm ${m === 50 ? 'btn-primary' : ''}" data-goal="${m}">${m} 分钟</button>`).join('')}
      </div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary" id="ob-done">开始练</button>
        <button class="btn btn-ghost" id="ob-skip">先跳过</button>
      </div>
    </section>` : ''}

    <div class="btn-row" style="margin-top:12px">
      <button class="btn btn-sm" id="swap">换一关</button>
      <button class="btn btn-sm" id="chapters">自选章节</button>
      <button class="btn btn-sm" id="wrong">错题回炉${wrongCount ? `（${wrongCount}）` : ''}</button>
    </div>

    <section class="card" style="margin-top:12px">
      <div class="row">
        <div class="row-main">
          <div class="row-title">⚗ 可视化实验室</div>
          <div class="row-sub">抽象概念先动手看一遍：凸透镜成像、函数图像等 25 个演示（外跳 wedulab.com），看完回来只做 1 道对口题。⭐ 中考重点推荐：光学、函数。</div>
        </div>
        <button class="btn btn-sm" id="go-labs">去看看</button>
      </div>
    </section>

    <h2 class="sec-title">这 7 天</h2>
    <div class="grid-3">
      <div class="stat"><b>${week.days}</b><span>练习天数</span></div>
      <div class="stat"><b>${week.minutes}</b><span>分钟</span></div>
      <div class="stat"><b>${week.rate}%</b><span>正确率</span></div>
    </div>

    <h2 class="sec-title">题库范围</h2>
    <div class="card">
      ${app.index.subjects.map((x) => `
        <div class="row">
          <div class="row-main">
            <div class="row-title">${esc(x.name)}</div>
            <div class="row-sub">${x.topicCount} 个考点 · 其中基础题 ${x.basicCount} 道</div>
          </div>
          <span class="chip">${x.questionCount} 题</span>
        </div>`).join('')}
      <p class="hint" style="margin-top:12px">共 ${app.index.totalTopics} 个考点、${app.index.totalQuestions} 道题，全部来自开源知识图谱与题库，可按章节自由选择。</p>
      <p class="hint" style="margin-top:8px">我是老师？<a href="#/teacher">点这里查看学生进度（需家长分享码，只读）</a></p>
    </div>
  `;

  root.querySelector('#start').onclick = () => app.startSession({ subjectId: subject.id });
  root.querySelector('#swap').onclick = () => app.switchSubject();
  root.querySelector('#chapters').onclick = () => app.go('chapters');
  root.querySelector('#wrong').onclick = () => app.startWrongReview();
  root.querySelector('#go-labs').onclick = () => app.go('labs');

  // V2：孩子档案引导（首次打开填一次）。没有密码，每天打开就是自己的进度。
  const obDone = root.querySelector('#ob-done');
  if (obDone) {
    let goal = 50;
    root.querySelectorAll('[data-goal]').forEach((b) => {
      b.onclick = () => {
        goal = Number(b.dataset.goal);
        root.querySelectorAll('[data-goal]').forEach((x) => x.classList.toggle('btn-primary', x === b));
      };
    });
    obDone.onclick = () => {
      const name = (root.querySelector('#ob-name').value || '').trim();
      s.profile.name = name || '初三同学';
      s.profile.dailyGoalMinutes = goal;
      s.profile.onboarded = true;
      saveState(s);
      renderHome(app, root);
    };
    root.querySelector('#ob-skip').onclick = () => {
      s.profile.onboarded = true;
      saveState(s);
      renderHome(app, root);
    };
  }
}
