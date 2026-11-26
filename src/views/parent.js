import { esc, toast, dayKey, uid } from '../util.js';
import { weekStats, topWeakTopics } from '../engine/scheduler.js';
import { saveState, resetProgress, exportState, replaceState } from '../store/local.js';
import { encodeState, decodeState } from '../store/sync.js';
import { loadSubject } from '../data.js';

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

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn btn-sm btn-ghost" id="back">← 返回</button>
      <button class="btn btn-sm btn-ghost" id="logout">退出家长模式</button>
    </div>
    <h1 style="font-size:22px;margin-bottom:4px">家长看板</h1>
    <p class="hint" style="margin-bottom:14px">只看趋势，不做实时监控。孩子端看不到这些数字。</p>

    <h2 class="sec-title">本周</h2>
    <div class="grid-2">
      <div class="stat"><b>${week.days}</b><span>练习天数</span></div>
      <div class="stat"><b>${week.minutes}</b><span>分钟</span></div>
      <div class="stat"><b>${week.total}</b><span>做题数</span></div>
      <div class="stat"><b>${week.rate}%</b><span>正确率</span></div>
    </div>

    <h2 class="sec-title">根因 Top 3</h2>
    <div class="card" style="padding:6px 18px" id="weak-box">
      <p class="hint" style="padding:14px 0">统计中…</p>
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
      <p class="hint">在一台设备生成口令码，粘贴到另一台设备导入，进度就搬过去了。</p>
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
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-sm btn-warm" id="reset">清空全部进度</button>
      </div>
      <p class="hint" style="margin-top:10px">清空会删掉连击、错题本和积分，但保留 PIN。请谨慎操作。</p>
    </div>
  `;

  root.querySelector('#back').onclick = () => app.go('me');
  root.querySelector('#logout').onclick = () => { app.parentAuthed = false; app.go('home'); };

  // 根因：需要科目数据补名字
  const ids = [...new Set((s.wrongBook || []).map((w) => w.subject))];
  Promise.all(ids.map((id) => loadSubject(id).catch(() => null))).then((sets) => {
    const topicById = {};
    sets.forEach((d) => { if (d) Object.assign(topicById, d.topicById); });
    const top = topWeakTopics(s, topicById, 3);
    root.querySelector('#weak-box').innerHTML = top.length
      ? top.map((t) => `
          <div class="row">
            <div class="row-main"><div class="row-title">${esc(t.name)}</div><div class="row-sub">累计错 ${t.count} 次</div></div>
          </div>`).join('')
      : '<p class="hint" style="padding:14px 0">没有未消灭的错题，很好。</p>';
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

  root.querySelector('#save-pin').onclick = () => {
    const pin = root.querySelector('#new-pin').value.trim();
    if (pin.length < 4) return toast('PIN 至少 4 位');
    s.profile.pin = pin;
    saveState(s);
    toast('PIN 已更新');
  };

  root.querySelector('#reset').onclick = () => {
    if (!confirm('确定清空全部进度？这个操作不能撤销。')) return;
    app.state = resetProgress();
    toast('已清空');
    app.go('home');
  };
}
