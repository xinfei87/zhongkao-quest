import { esc, toast } from '../util.js';
import { weekStats } from '../engine/scheduler.js';
import { saveState } from '../store/local.js';
import { loadSubject } from '../data.js';
import { isSiteAuthed, SITE_AUTH_LS } from '../engine/siteauth.js';
import { TEACHER_KEY_LS } from '../engine/teacher.js';

export function renderMe(app, root) {
  const s = app.state;
  const week = weekStats(s, 7);
  const wrong = (s.wrongBook || []).filter((w) => w.status !== 'cleared');
  const cleared = (s.wrongBook || []).filter((w) => w.status === 'cleared');

  root.innerHTML = `
    <section class="card" style="text-align:center">
      <div class="brand-logo" style="width:56px;height:56px;border-radius:18px;font-size:22px;margin:0 auto 10px">☺</div>
      <h1 style="font-size:20px">${esc(s.profile.name || '初三同学')}</h1>
      <p class="hint">连续 ${s.streak.days || 0} 天 · 最长 ${s.streak.best || 0} 天 · ${s.points || 0} 积分</p>
    </section>

    <h2 class="sec-title">我的记录</h2>
    <div class="grid-3">
      <div class="stat"><b>${week.minutes}</b><span>本周分钟</span></div>
      <div class="stat"><b>${week.total}</b><span>本周题数</span></div>
      <div class="stat"><b>${week.rate}%</b><span>本周正确率</span></div>
    </div>

    <h2 class="sec-title">入口</h2>
    <div class="card" style="padding:6px 18px">
      <div class="row" id="rewards">
        <div class="row-main"><div class="row-title">积分兑换</div><div class="row-sub">${s.points} 积分可用</div></div>
        <span class="hint">›</span>
      </div>
      <div class="row" id="wrongbook">
        <div class="row-main"><div class="row-title">错题本</div><div class="row-sub">待消灭 ${wrong.length} 道 · 已消灭 ${cleared.length} 道</div></div>
        <span class="hint">›</span>
      </div>
      <div class="row" id="chapters">
        <div class="row-main"><div class="row-title">自选章节</div><div class="row-sub">想专门练哪一章</div></div>
        <span class="hint">›</span>
      </div>
      <div class="row" id="parent">
        <div class="row-main"><div class="row-title">家长入口</div><div class="row-sub">需要 PIN 码</div></div>
        <span class="hint">🔒</span>
      </div>
      <div class="row" id="teacher">
        <div class="row-main"><div class="row-title">我是老师</div><div class="row-sub">粘贴家长分享码，只读查看</div></div>
        <span class="hint">›</span>
      </div>
    </div>

    ${isSiteAuthed(localStorage) ? `
    <h2 class="sec-title">账号</h2>
    <div class="card" style="padding:6px 18px">
      <div class="row" id="site-logout">
        <div class="row-main"><div class="row-title">退出登录</div><div class="row-sub">退出后要重新输账号密码才能进；再进时带孩子最新进度</div></div>
        <span class="hint">›</span>
      </div>
    </div>` : ''}

    <h2 class="sec-title">每日题量</h2>
    <div class="card">
      <div class="btn-row">
        ${[3, 4, 5, 12].map((n) => `<button class="btn btn-sm ${s.profile.dailyQuestions === n ? 'btn-primary' : ''}" data-size="${n}">${n === 12 ? '12 题 · 约 30 分钟' : `${n} 题`}</button>`).join('')}
      </div>
      <p class="hint" style="margin-top:10px">题量越大，一关时间越长。12 题约 30 分钟，到点会提示收尾。</p>
    </div>

    <h2 class="sec-title">每天目标</h2>
    <div class="card">
      <div class="btn-row">
        ${[15, 30, 45].map((m) => `<button class="btn btn-sm ${(s.profile.dailyGoalMinutes || 30) === m ? 'btn-primary' : ''}" data-goal="${m}">${m} 分钟</button>`).join('')}
      </div>
      <p class="hint" style="margin-top:10px">做到目标分钟会提示“可以收尾了”，做完当前题就能结束。</p>
    </div>

    <p class="hint" style="margin-top:24px;text-align:center;line-height:1.8">
      题库与知识图谱来自开源项目 cn-math-taxonomy（CC BY-NC 4.0），<br>交互实验来自 wedulab.com。仅供个人学习使用。
    </p>
  `;

  root.querySelector('#rewards').onclick = () => app.go('rewards');
  root.querySelector('#chapters').onclick = () => app.go('chapters');
  root.querySelector('#parent').onclick = () => app.go('parent');
  root.querySelector('#teacher').onclick = () => app.go('teacher');
  root.querySelector('#wrongbook').onclick = () => showWrongBook(app, root);
  // V2.5：只有用账号密码登录过的设备（老师那台）才有“退出登录”；孩子 iPad 没走过口令门，不显示。
  const logout = root.querySelector('#site-logout');
  if (logout) {
    logout.onclick = () => {
      if (!confirm('退出后要重新输账号密码才能进。确定吗？')) return;
      try {
        localStorage.removeItem(SITE_AUTH_LS);
        localStorage.removeItem(TEACHER_KEY_LS);
      } catch { /* 清不掉就当没退，下次再点 */ }
      location.reload();
    };
  }
  root.querySelectorAll('[data-size]').forEach((b) => {
    b.onclick = () => {
      s.profile.dailyQuestions = Number(b.dataset.size);
      saveState(s);
      toast('已设为每天 ' + b.dataset.size + ' 题');
      renderMe(app, root);
    };
  });
  root.querySelectorAll('[data-goal]').forEach((b) => {
    b.onclick = () => {
      s.profile.dailyGoalMinutes = Number(b.dataset.goal);
      saveState(s);
      toast('每天目标已设为 ' + b.dataset.goal + ' 分钟');
      renderMe(app, root);
    };
  });
}

function showWrongBook(app, root) {
  const s = app.state;
  const list = (s.wrongBook || []).filter((w) => w.status !== 'cleared');
  if (!list.length) return toast('错题本是空的，很干净');

  if (app.wrongView === 'on') {
    app.wrongView = null;
    renderMe(app, root);
    return;
  }
  app.wrongView = 'on';
  root.innerHTML = '<p class="hint" style="padding:40px 0;text-align:center">正在整理错题…</p>';

  const subjects = [...new Set(list.map((w) => w.subject))];
  Promise.all(subjects.map((id) => loadSubject(id).catch(() => null))).then((sets) => {
    const topicById = {};
    sets.forEach((d) => { if (d) Object.assign(topicById, d.topicById); });
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-sm btn-ghost" id="back">← 返回</button>
      </div>
      <h1 style="font-size:22px;margin-bottom:4px">错题本</h1>
      <p class="hint" style="margin-bottom:14px">连续答对 2 次自动移出；明天热身会优先抽它们。</p>
      <div class="card" style="padding:6px 18px">
        ${list.slice(0, 40).map((w) => `
          <div class="row">
            <div class="row-main">
              <div class="row-title">${esc(topicById[w.topicId]?.name || w.topicId)}</div>
              <div class="row-sub">${esc(topicById[w.topicId]?.chapter || '')} · 错 ${w.count} 次 · ${w.status === 'new' ? '新错' : '复习中'} · 再对 ${Math.max(1, 2 - (w.streak || 0))} 次消灭</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn btn-primary" id="review">开始回炉（最多 5 题）</button>
      </div>
    `;
    root.querySelector('#back').onclick = () => { app.wrongView = null; renderMe(app, root); };
    root.querySelector('#review').onclick = () => { app.wrongView = null; app.startWrongReview(); };
  });
}
