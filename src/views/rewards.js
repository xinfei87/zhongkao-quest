import { esc, toast, openSheet, closeSheet, dayKey } from '../util.js';
import { saveState } from '../store/local.js';

export function renderRewards(app, root) {
  const s = app.state;
  const points = s.points || 0;

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn btn-sm btn-ghost" id="back">← 返回</button>
    </div>
    <h1 style="font-size:22px;margin-bottom:4px">积分兑换</h1>
    <p class="hint" style="margin-bottom:14px">当前 ${points} 积分。兑换需要家长 PIN 确认。</p>

    <div class="card" style="padding:6px 18px">
      ${(s.rewards || []).map((r) => {
        const pct = Math.min(100, Math.round((points / r.cost) * 100));
        return `
          <div class="row" style="align-items:flex-start;padding:14px 0">
            <div class="row-main" style="flex:1">
              <div class="row-title">${esc(r.title)}</div>
              <div class="reward-bar"><i style="width:${pct}%"></i></div>
              <div class="row-sub">${points} / ${r.cost} 积分</div>
            </div>
            <button class="btn btn-sm ${points >= r.cost ? 'btn-primary' : ''}" data-redeem="${r.id}" ${points >= r.cost ? '' : 'disabled'} style="margin-left:12px">
              ${points >= r.cost ? '兑换' : '还差 ' + (r.cost - points)}
            </button>
          </div>`;
      }).join('') || '<p class="hint" style="padding:16px 0">还没有愿望，去家长入口加一个吧。</p>'}
    </div>

    <h2 class="sec-title">兑换记录</h2>
    <div class="card" style="padding:6px 18px">
      ${(s.redemptions || []).slice(-10).reverse().map((r) => `
        <div class="row">
          <div class="row-main"><div class="row-title">${esc(r.title)}</div><div class="row-sub">${esc(r.date)}</div></div>
          <span class="chip">-${r.cost}</span>
        </div>`).join('') || '<p class="hint" style="padding:16px 0">还没有兑换过。</p>'}
    </div>
  `;

  root.querySelector('#back').onclick = () => app.go('me');
  root.querySelectorAll('[data-redeem]').forEach((b) => {
    b.onclick = () => askPin(s, () => {
      const r = s.rewards.find((x) => x.id === b.dataset.redeem);
      if (!r || s.points < r.cost) return toast('积分不够');
      s.points -= r.cost;
      s.redemptions.push({ id: r.id, title: r.title, cost: r.cost, date: dayKey() });
      saveState(s);
      toast('兑换成功，去找家长兑现吧');
      renderRewards(app, root);
      app.renderTopbar();
    });
  });
}

export function askPin(s, onOk) {
  const dlg = openSheet(`
    <h2>家长确认</h2>
    <p class="hint">输入家长 PIN 码（默认 1234）。</p>
    <input class="answer-input" id="pin" inputmode="numeric" maxlength="8" style="margin-top:12px" placeholder="PIN" />
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" id="ok">确认</button>
      <button class="btn" id="cancel">取消</button>
    </div>
  `);
  const pin = dlg.querySelector('#pin');
  pin.focus();
  const submit = () => {
    if (pin.value === s.profile.pin) {
      closeSheet();
      onOk();
    } else {
      pin.value = '';
      toast('PIN 不对');
    }
  };
  dlg.querySelector('#ok').onclick = submit;
  dlg.querySelector('#cancel').onclick = closeSheet;
  pin.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
}
