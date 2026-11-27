import { esc, toast, dayKey, uid } from '../util.js';
import { weekStats } from '../engine/scheduler.js';
import { saveState, resetProgress, exportState, replaceState } from '../store/local.js';
import { encodeState, decodeState } from '../store/sync.js';
import { createTeacherShare, stripStateForShare, TEACHER_SHARE_DAYS } from '../store/teacherShare.js';
import { hasTeacherKey, getTeacherKeySuffix, saveTeacherKey, saveTeacherModel, getTeacherModel, TEACHER_DEFAULT_MODEL, TEACHER_KEY_LS } from '../engine/teacher.js';
import { encryptSharedKey } from '../engine/siteauth.js';
import { loadSubject } from '../data.js';
import {
  computeToday, todayCardHTML,
  computeMastery, masteryHTML,
  computeWeakTop, weakTopHTML,
  computeTrend, trendHTML,
  computeTeacherUse, teacherUseHTML,
} from './dashboard.js';

export function renderParent(app, root) {
  const s = app.state;

  if (!app.parentAuthed) {
    root.innerHTML = `
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-sm btn-ghost" id="back">← 返回</button>
      </div>
      <section class="card" style="max-width:420px;margin:40px auto;text-align:center">
        <h1 style="font-size:20px;margin-bottom:6px">家长入口</h1>
        <p class="hint">输入 PIN 码进入（默认 1234，可在里面修改）。</p>
        <input class="answer-input" id="pin" inputmode="numeric" maxlength="8" placeholder="PIN" style="margin-top:16px;text-align:center" />
        <button class="btn btn-primary" id="ok" style="margin-top:12px">进入</button>
      </section>`;
    const pin = root.querySelector('#pin');
    const ok = () => {
      if (pin.value === s.profile.pin) {
        app.parentAuthed = true;
        renderParent(app, root);
      } else {
        pin.value = '';
        toast('PIN 不对');
      }
    };
    root.querySelector('#ok').onclick = ok;
    pin.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    pin.focus();
    root.querySelector('#back').onclick = () => app.go('home');
    return;
  }

  const week = weekStats(s, 7);
  const sessions = (s.sessions || []).slice(-7).reverse();
  const today = computeToday(s, app.index.subjects);
  const trend = computeTrend(s, 7);
  const teacherUse = computeTeacherUse(s);
  const lastSyncText = s.lastSyncAt
    ? `最近一次同步：${new Date(s.lastSyncAt).toLocaleString('zh-CN')}`
    : '还没同步过（本机数据就是实时的）';

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn btn-sm btn-ghost" id="back">← 返回</button>
      <button class="btn btn-sm btn-ghost" id="logout">退出家长模式</button>
    </div>
    <h1 style="font-size:22px;margin-bottom:4px">家长看板</h1>
    <p class="hint" style="margin-bottom:14px">只看趋势，不做实时监控。孩子端看不到这些数字。</p>

    ${s.profile.pin === '1234' ? `
    <div class="warn-banner">
      ⚠️ 你还在用默认 PIN 1234，知道 PIN 的人都能进家长入口。请马上到下面“设置”里改掉。
    </div>` : ''}

    <h2 class="sec-title">今日完成情况</h2>
    <div class="card" style="padding:14px 18px">
      ${todayCardHTML(today)}
      <p class="hint" style="margin-top:10px">目标：每天 ${today.goal} 分钟。今日数据是本机实时的。</p>
    </div>

    <h2 class="sec-title">本周</h2>
    <div class="grid-2">
      <div class="stat"><b>${week.days}</b><span>练习天数</span></div>
      <div class="stat"><b>${week.minutes}</b><span>分钟</span></div>
      <div class="stat"><b>${week.total}</b><span>做题数</span></div>
      <div class="stat"><b>${week.rate}%</b><span>正确率</span></div>
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
      <p class="hint" style="margin-top:10px">提示看到第 3 级次数多，说明这周的题对他偏难；问老师次数多，说明他在主动求助，是好事。</p>
    </div>

    <h2 class="sec-title">最近的关</h2>
    <div class="card" style="padding:6px 18px">
      ${sessions.map((x) => `
        <div class="row">
          <div class="row-main">
            <div class="row-title">${esc(x.date)}</div>
            <div class="row-sub">${x.correct}/${x.total} 题 · ${x.minutes} 分钟</div>
          </div>
          <span class="chip">+${x.points}</span>
        </div>`).join('') || '<p class="hint" style="padding:14px 0">还没有记录。</p>'}
    </div>

    <h2 class="sec-title">AI 老师设置</h2>
    <div class="card">
      <p class="hint">“问老师”用 Gemini 免费版 API（BYOK：家长自己填 Key）。Key 只存在这台设备的浏览器里，不会上传、不会同步、不会进仓库。没填 Key 时，“问老师”按钮会提示先来这里设置。</p>
      <div class="btn-row" style="margin-top:10px">
        <input class="answer-input" id="ai-key" type="password" placeholder="粘贴 Gemini API Key" style="flex:2" autocomplete="off" />
        <button class="btn btn-sm btn-primary" id="ai-save">保存 Key</button>
      </div>
      <p class="hint" style="margin-top:8px" id="ai-status">${hasTeacherKey(localStorage) ? `已填写：${esc(getTeacherKeySuffix(localStorage))}` : '未填写'}</p>
      <div class="btn-row" style="margin-top:10px">
        <input class="answer-input" id="ai-model" placeholder="模型（默认 gemini-3.5-flash-lite）" style="flex:2" value="${esc(getTeacherModel(localStorage))}" />
        <button class="btn btn-sm" id="ai-model-save">保存模型</button>
      </div>
      <p class="hint" style="margin-top:8px">取 Key 的官方页面：<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a>（免费版就行，不用 Pro）。默认模型 ${esc(TEACHER_DEFAULT_MODEL)}，404 时自动改调 gemini-flash-lite-latest。</p>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-sm btn-ghost" id="ai-clear">清除 Key</button>
      </div>
    </div>

    <h2 class="sec-title">共享 Key</h2>
    ${hasTeacherKey(localStorage) ? `
    <div class="card">
      <p class="hint">给老师开一个账号：设一个网站密码，站会把本机的 Key 和孩子现在的进度（做题记录、错题本、积分）一起加密成一串密文。老师打开网站、输账号 test 和这个密码就能进，看到的和孩子这台设备上的一模一样；你自己在手机/电脑上登录后，用家长 PIN 也能进家长入口；不知道密码的人拿到密文也没用。换密码、或想让老师看到孩子最新的进度，重新生成一次包发给管理员就行。</p>
      <div class="btn-row" style="margin-top:10px">
        <input class="answer-input" id="share-pw1" type="password" placeholder="网站密码（至少 6 位）" style="flex:1" autocomplete="new-password" />
        <input class="answer-input" id="share-pw2" type="password" placeholder="再输一次" style="flex:1" autocomplete="new-password" />
      </div>
      <button class="btn btn-sm btn-primary" id="share-pack-gen" style="margin-top:10px">生成共享包</button>
      <textarea class="answer-input" id="share-pack" rows="4" style="margin-top:10px;font-family:monospace;font-size:13px" readonly placeholder="生成的密文会出现在这里"></textarea>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-sm" id="share-copy">复制密文</button>
      </div>
      <p class="hint" style="margin-top:8px" id="share-status">把这串密文发给管理员，他放进仓库 data/shared-key.json 后老师就能登录用了。密码只用来生成这一次，不存在这台设备上。</p>
    </div>` : `
    <div class="card">
      <p class="hint">本机还没填 Key，先在上面填好 Key 再生成共享包。</p>
    </div>`}

    <h2 class="sec-title">分享给老师（只读）</h2>
    <div class="card">
      <p class="hint">点“生成老师分享码”，把码发给老师。老师在本站首页点“我是老师”粘贴码，就能看到和上面一样的看板（今日完成、掌握度、薄弱点、错题），但只能看：不能改设置、不能兑换积分、不能清空进度，也看不到 PIN 和 Key。分享码 ${TEACHER_SHARE_DAYS} 天内有效，过期请重新生成。</p>
      <p class="hint" style="margin-top:6px">步骤：1. 家长点下面生成分享码 → 2. 把码发给老师 → 3. 老师打开本站首页“我是老师”粘贴 → 4. 只能看，不能改；7 天后失效。</p>
      <button class="btn btn-sm btn-primary" id="share-gen" style="margin-top:10px">生成老师分享码</button>
      <textarea class="answer-input" id="share-code" rows="3" style="margin-top:10px;font-family:monospace;font-size:13px" readonly placeholder="分享码会出现在这里"></textarea>
      <p class="hint" style="margin-top:8px">老师看到的是生成那一刻的快照，不是实时数据；想让老师看到最新进度，重新生成一个发过去就行。</p>
    </div>

    <h2 class="sec-title">奖励清单</h2>
    <div class="card">
      <div id="reward-list" style="padding-bottom:6px">
        ${(s.rewards || []).map((r) => `
          <div class="row">
            <div class="row-main"><div class="row-title">${esc(r.title)}</div><div class="row-sub">${r.cost} 积分</div></div>
            <button class="btn btn-sm btn-ghost" data-del="${r.id}">删除</button>
          </div>`).join('')}
      </div>
      <div class="btn-row" style="margin-top:10px">
        <input class="answer-input" id="rw-title" placeholder="新奖励，如：周末骑车 1 小时" style="flex:2" />
        <input class="answer-input" id="rw-cost" inputmode="numeric" placeholder="积分" style="flex:1" />
      </div>
      <button class="btn btn-sm" id="rw-add" style="margin-top:10px">添加奖励</button>
    </div>

    <h2 class="sec-title">跨端同步</h2>
    <div class="card">
      <p class="hint">孩子进度存在孩子那台设备上。家长/老师在自己手机上看，要先在孩子设备上点“生成同步口令码”，再到自己手机上导入。V2 不是实时同步：你看到的都是最近一次同步的快照，时间以 ${esc(lastSyncText)} 为准。</p>
      <button class="btn btn-sm" id="gen" style="margin-top:10px">生成同步口令码</button>
      <textarea class="answer-input" id="code" rows="3" style="margin-top:10px;font-family:monospace;font-size:13px" placeholder="口令码会出现在这里，也可以粘贴别人的口令码后点导入"></textarea>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-sm btn-primary" id="import">导入这份口令码</button>
        <button class="btn btn-sm" id="download">下载存档 JSON</button>
      </div>
    </div>

    <h2 class="sec-title">设置</h2>
    <div class="card">
      <div class="btn-row">
        <input class="answer-input" id="new-pin" inputmode="numeric" maxlength="8" placeholder="新的家长 PIN" style="flex:1" />
        <button class="btn btn-sm" id="save-pin">保存 PIN</button>
      </div>
      <p class="hint" style="margin-top:8px">PIN 只存本机，绝不写进仓库。改掉默认 1234 后，记得告诉家里人新 PIN。</p>
      <h3 style="font-size:15px;margin:16px 0 8px">每天目标</h3>
      <div class="btn-row">
        ${[15, 30, 45].map((m) => `<button class="btn btn-sm ${(s.profile.dailyGoalMinutes || 30) === m ? 'btn-primary' : ''}" data-goal="${m}">${m} 分钟</button>`).join('')}
      </div>
      <h3 style="font-size:15px;margin:16px 0 8px">每日题量</h3>
      <div class="btn-row">
        ${[3, 4, 5, 12].map((n) => `<button class="btn btn-sm ${s.profile.dailyQuestions === n ? 'btn-primary' : ''}" data-size="${n}">${n === 12 ? '12 题 · 约 30 分钟' : `${n} 题`}</button>`).join('')}
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-sm btn-warm" id="reset">清空全部进度</button>
      </div>
      <p class="hint" style="margin-top:10px">清空会删掉连击、错题本和积分，但保留 PIN。请谨慎操作。</p>
    </div>
  `;

  root.querySelector('#back').onclick = () => app.go('me');
  root.querySelector('#logout').onclick = () => { app.parentAuthed = false; app.go('home'); };

  // 掌握度 + 薄弱 Top 5：需要各科的 topics/questions 数据，异步加载后填进去
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

  root.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      s.rewards = s.rewards.filter((r) => r.id !== b.dataset.del);
      saveState(s);
      renderParent(app, root);
    };
  });

  root.querySelector('#rw-add').onclick = () => {
    const title = root.querySelector('#rw-title').value.trim();
    const cost = Number(root.querySelector('#rw-cost').value);
    if (!title || !cost || cost <= 0) return toast('填一下奖励名称和积分');
    s.rewards.push({ id: 'r' + uid(), title, cost });
    saveState(s);
    toast('已添加');
    renderParent(app, root);
  };

  root.querySelector('#gen').onclick = async () => {
    const code = await encodeState(s);
    root.querySelector('#code').value = code;
    s.lastSyncAt = Date.now();
    saveState(s);
    toast('已生成，复制发给另一台设备');
  };

  root.querySelector('#import').onclick = async () => {
    const code = root.querySelector('#code').value;
    try {
      const next = await decodeState(code);
      if (!confirm('导入会覆盖当前设备的进度，确定吗？')) return;
      replaceState(next);
      app.state = next;
      toast('进度已导入');
      renderParent(app, root);
    } catch (e) {
      toast(e.message || '口令码解析失败');
    }
  };

  root.querySelector('#download').onclick = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zhongkao-progress-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // V2：AI 老师设置（Key 只存本机 localStorage，不进 state、不进同步、不进仓库）
  root.querySelector('#ai-save').onclick = () => {
    const key = root.querySelector('#ai-key').value.trim();
    if (!key) return toast('先粘贴 Key');
    saveTeacherKey(localStorage, key);
    root.querySelector('#ai-key').value = '';
    root.querySelector('#ai-status').textContent = `已填写：${getTeacherKeySuffix(localStorage)}`;
    toast('Key 已保存到这台设备');
  };
  root.querySelector('#ai-model-save').onclick = () => {
    const model = root.querySelector('#ai-model').value.trim() || TEACHER_DEFAULT_MODEL;
    saveTeacherModel(localStorage, model);
    toast('模型已保存：' + model);
  };
  root.querySelector('#ai-clear').onclick = () => {
    if (!confirm('确定清除这台设备上存的 Gemini Key 吗？清除后“问老师”就用不了了。')) return;
    saveTeacherKey(localStorage, '');
    root.querySelector('#ai-status').textContent = '未填写';
    toast('Key 已清除');
  };

  // V2.5：共享 Key——把本机 Key + 孩子进度快照加密成包。密码只存在这次操作的内存里，生成完清空两个密码框，不写 localStorage。
  // 注意：下面“分享给老师”区也有一个 id="share-gen" 的按钮（V2 原有的），两个按钮 id 不能重名，这里用 share-pack-gen。
  const shareGen = root.querySelector('#share-pack-gen');
  if (shareGen) {
    shareGen.onclick = async () => {
      const pw1 = root.querySelector('#share-pw1').value;
      const pw2 = root.querySelector('#share-pw2').value;
      if (!pw1 || pw1.length < 6) return toast('网站密码至少 6 位');
      if (pw1 !== pw2) return toast('两次密码不一致');
      const key = localStorage.getItem(TEACHER_KEY_LS)?.trim();
      if (!key) return toast('本机还没填 Key');
      try {
        const pack = await encryptSharedKey(key, pw1, stripStateForShare(s, { keepPin: true }));
        root.querySelector('#share-pack').value = JSON.stringify(pack);
        root.querySelector('#share-pw1').value = '';
        root.querySelector('#share-pw2').value = '';
        root.querySelector('#share-status').textContent = '共享包已生成，里面带了孩子现在的进度快照。复制下面这串密文发给管理员，他放进仓库 data/shared-key.json 后老师就能登录用了，登录后看到的和孩子这台设备上的一样。换密码、或孩子进度变多了，重新生成一次包。';
        toast('共享包已生成');
      } catch (e) {
        toast(e.message || '生成失败');
      }
    };
    root.querySelector('#share-copy').onclick = async () => {
      const v = root.querySelector('#share-pack').value;
      if (!v) return toast('先点“生成共享包”');
      try {
        await navigator.clipboard.writeText(v);
        toast('已复制');
      } catch {
        root.querySelector('#share-pack').select();
        document.execCommand('copy');
        toast('已复制');
      }
    };
  }

  // V2：分享给老师（只读快照，7 天有效，快照里没有 PIN 和 Key）
  root.querySelector('#share-gen').onclick = async () => {
    try {
      const code = await createTeacherShare(s);
      root.querySelector('#share-code').value = code;
      toast('分享码已生成，7 天内有效');
    } catch (e) {
      toast(e.message || '生成失败');
    }
  };

  root.querySelector('#save-pin').onclick = () => {
    const pin = root.querySelector('#new-pin').value.trim();
    if (pin.length < 4) return toast('PIN 至少 4 位');
    s.profile.pin = pin;
    saveState(s);
    toast('PIN 已更新');
    renderParent(app, root);
  };

  root.querySelectorAll('[data-goal]').forEach((b) => {
    b.onclick = () => {
      s.profile.dailyGoalMinutes = Number(b.dataset.goal);
      saveState(s);
      toast('每天目标已设为 ' + b.dataset.goal + ' 分钟');
      renderParent(app, root);
    };
  });
  root.querySelectorAll('[data-size]').forEach((b) => {
    b.onclick = () => {
      s.profile.dailyQuestions = Number(b.dataset.size);
      saveState(s);
      toast('已设为每天 ' + b.dataset.size + ' 题');
      renderParent(app, root);
    };
  });

  root.querySelector('#reset').onclick = () => {
    if (!confirm('确定清空全部进度？这个操作不能撤销。')) return;
    app.state = resetProgress();
    toast('已清空');
    app.go('home');
  };
}
