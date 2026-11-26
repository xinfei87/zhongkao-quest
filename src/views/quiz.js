import { esc, toast, openSheet, closeSheet, vibrate, dayKey } from '../util.js';
import { judge, inputCount } from '../engine/judge.js';
import { groupByTopic, recordAnswer, recordFlashcard, markShaky, completeSession } from '../engine/scheduler.js';
import { pickConfirmQuestion, diagnose } from '../engine/backtrack.js';
import { labForTopic } from '../labs.js';
import { saveState } from '../store/local.js';

const PRAISE = ['稳，这一分拿到了', '对了，继续保持', '漂亮，基础分抓住了', '这题你拿下了'];

export function renderQuiz(app, root) {
  const session = app.session;
  if (!session || !session.questions?.length) {
    app.go('home');
    return;
  }
  const state = app.state;
  const data = session.data;
  const questionsByTopic = data ? groupByTopic(data.questions) : new Map();
  const topicOf = (q) => (data?.topicById?.[q.topicId]) || { name: '', chapter: '', description: '', mastery: [] };

  const steps = [
    ...session.flashcards.map((c) => ({ kind: 'flash', card: c })),
    ...session.questions.map((q) => ({ kind: 'q', q })),
  ];
  const planTotal = session.questions.length;
  const wrongByTopic = new Map();
  const answeredIds = new Set();
  const hinted = new Set();
  let cursor = 0;
  let answered = 0;
  let correct = 0;
  let insertedCount = 0;
  let backtrackCount = 0;
  let backtrackBonus = false;
  let finished = false;

  function paint() {
    if (cursor >= steps.length) return finish();
    const step = steps[cursor];
    if (step.kind === 'flash') return paintFlash(step.card);
    if (step.kind === 'backtrack') return paintBacktrack(step);
    return paintQuestion(step);
  }

  function progressHtml() {
    const done = Math.min(answered, planTotal);
    const pct = planTotal ? Math.round((done / planTotal) * 100) : 0;
    return `
      <div class="progress">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="progress-label">${done}/${planTotal}</span>
      </div>`;
  }

  function headerHtml(title) {
    return `
      <div class="progress" style="margin-bottom:6px">
        <button class="btn btn-sm btn-ghost" id="quit" style="min-height:36px;padding:0 8px">退出</button>
        <span class="progress-label" style="flex:1;text-align:center">${esc(title)}</span>
        <span style="width:44px"></span>
      </div>`;
  }

  /** ---------- 闪卡 ---------- */
  function paintFlash(card) {
    root.innerHTML = `
      ${headerHtml('闪卡热身 · 激活记忆')}
      <button class="flash" id="flash">
        <div class="flash-inner">
          <div class="flash-face">
            <span class="tag">先想一想，再翻面</span>
            <div class="q">${esc(card.front)}</div>
            <span class="hint">点一下卡片看答案</span>
          </div>
          <div class="flash-face back">
            <span class="tag">答案 / 要点</span>
            <div class="a">${esc(card.back)}</div>
          </div>
        </div>
      </button>
      <div class="btn-row" id="flash-actions" style="margin-top:16px;visibility:hidden">
        <button class="btn btn-ok" id="known">秒懂（3 天后见）</button>
        <button class="btn" id="fuzzy">有点糊（明天见）</button>
      </div>
    `;
    root.querySelector('#quit').onclick = quit;
    const flash = root.querySelector('#flash');
    flash.onclick = () => {
      flash.classList.add('flipped');
      root.querySelector('#flash-actions').style.visibility = 'visible';
    };
    root.querySelector('#known').onclick = () => {
      recordFlashcard(state, card.topicId, true);
      saveState(state);
      cursor += 1;
      paint();
    };
    root.querySelector('#fuzzy').onclick = () => {
      recordFlashcard(state, card.topicId, false);
      saveState(state);
      cursor += 1;
      paint();
    };
  }

  /** ---------- 题目 ---------- */
  function paintQuestion(step) {
    const q = step.q;
    const topic = topicOf(q);
    const n = q.type === 'numeric' ? inputCount(q) : 1;
    const multi = n > 1;

    root.innerHTML = `
      ${headerHtml(session.title || '今日一关')}
      ${progressHtml()}
      <div class="quiz-layout">
        <section class="card">
          <div class="q-topic">${esc(topic.chapter || '')}${topic.name ? ' · ' + esc(topic.name) : ''}${step.confirm ? ' · 基础确认' : ''}${step.origin === 'backtrack' ? ' · 前置补学' : ''}</div>
          <div class="q-prompt">${esc(q.prompt)}</div>
          <div id="answer-area"></div>
          <div id="feedback"></div>
          <div style="margin-top:14px">
            <button class="btn btn-sm btn-ghost" id="hint">想不出来？给我一点提示</button>
            <div id="hint-box" class="hint" style="display:none;margin-top:8px"></div>
          </div>
        </section>
        ${draftHtml()}
      </div>
    `;
    root.querySelector('#quit').onclick = quit;
    mountDraft(root);

    const area = root.querySelector('#answer-area');

    const hintBox = root.querySelector('#hint-box');
    const hintBtn = root.querySelector('#hint');
    const hintText = topic.description || (topic.mastery || []).join('；') || '回到课本这一节的开头，先看例题的第一小问。';
    hintBtn.onclick = () => {
      hinted.add(q.id);
      hintBox.style.display = 'block';
      hintBox.textContent = hintText;
      hintBtn.style.display = 'none';
    };

    const handle = (value) => {
      const result = judge(q, value);
      if (result === null) return paintSelfCheck(step, q, topic);
      return showResult(step, q, topic, result);
    };

    if (q.type === 'choice') {
      area.innerHTML = `<div class="choices">${(q.choices || []).map((c) => `
        <button class="choice" data-key="${esc(c.key)}"><span class="key">${esc(c.key)}</span><span>${esc(c.text)}</span></button>`).join('')}
      </div>`;
      area.querySelectorAll('.choice').forEach((b) => {
        b.onclick = () => handle(b.dataset.key);
      });
      return;
    }

    area.innerHTML = `
      ${multi ? `<p class="hint" style="margin-bottom:8px">这题有 ${n} 个结果，分别填进下面 ${n} 个格子（顺序不限）。</p>` : ''}
      <div class="choices" style="gap:8px">
        ${Array.from({ length: n }, (_, i) => `<input class="answer-input" data-i="${i}" inputmode="${q.type === 'numeric' ? 'decimal' : 'text'}" placeholder="${multi ? `第 ${i + 1} 个结果` : '在这里写答案'}" autocomplete="off" />`).join('')}
      </div>
      <button class="btn btn-primary" id="submit" style="margin-top:14px">提交</button>
      <p class="hint" style="margin-top:10px">${q.type === 'numeric' ? '可以写分数（如 3/4）、小数或百分数。' : '写不出来也没关系，也可以直接看解析。'}</p>
    `;
    const inputs = [...area.querySelectorAll('.answer-input')];
    const doSubmit = () => handle(inputs.map((i) => i.value));
    root.querySelector('#submit').onclick = doSubmit;
    inputs.forEach((inp, i) => {
      inp.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        if (i < inputs.length - 1) inputs[i + 1].focus();
        else doSubmit();
      };
    });
  }

  /** 简答判不出来时，交给孩子自评 */
  function paintSelfCheck(step, q, topic) {
    const fb = root.querySelector('#feedback');
    fb.innerHTML = `
      <div class="feedback" style="background:#F8FAFC;border-color:#E2E8F0">
        <h3>这一步系统判不出来，你自己当老师</h3>
        <p>参考答案：<b>${esc(q.answer)}</b></p>
        <div class="btn-row">
          <button class="btn btn-sm btn-ok" id="self-yes">我写对了</button>
          <button class="btn btn-sm" id="self-no">和我不一样，算错</button>
        </div>
      </div>`;
    fb.querySelector('#self-yes').onclick = () => showResult(step, q, topic, true);
    fb.querySelector('#self-no').onclick = () => showResult(step, q, topic, false);
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showResult(step, q, topic, isCorrect) {
    const fb = root.querySelector('#feedback');
    const area = root.querySelector('#answer-area');
    // 锁住作答区
    area.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key && b.dataset.key === q.answer) b.classList.add('correct');
    });
    area.querySelectorAll('.answer-input').forEach((i) => { i.disabled = true; });

    if (!answeredIds.has(q.id)) {
      answeredIds.add(q.id);
      answered += 1;
      if (isCorrect) correct += 1;
      const firstTry = !hinted.has(q.id) && !step.confirm && step.origin !== 'backtrack';
      recordAnswer(state, { subject: session.subject, question: q, correct: isCorrect, firstTry });
      saveState(state);
    }

    if (isCorrect) {
      if (step.confirm) {
        markShaky(state, q.topicId);
        saveState(state);
      }
      const lab = labForTopic(topic);
      fb.innerHTML = `
        <div class="feedback">
          <h3>${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</h3>
          ${q.explanation ? `<p>${esc(q.explanation)}</p>` : ''}
          <div class="btn-row">
            <button class="btn btn-primary" id="next">下一题</button>
          </div>
        </div>`;
      fb.querySelector('#next').onclick = () => { if (step.origin === 'backtrack') backtrackCount += 1; cursor += 1; paint(); };
      vib(8);
      return;
    }

    // 答错：温和、不刺激，先记录再决定下一步
    const count = (wrongByTopic.get(q.topicId) || 0) + 1;
    wrongByTopic.set(q.topicId, count);
    let insert = null;
    let tip = '先把它记下来，等会儿再看一遍。';
    if (count === 1) {
      const confirm = pickConfirmQuestion({
        topicId: q.topicId,
        questionsByTopic,
        excludeIds: [...answeredIds, q.id, ...steps.filter((s) => s.q).map((s) => s.q.id)],
      });
      if (confirm) {
        insert = { kind: 'q', q: confirm, confirm: true };
        tip = '我们换一道同一考点的基础题，确认一下是"手滑"还是"真没懂"。';
      }
    }
    if (count >= 2 && count % 2 === 0 && data) {
      const diag = diagnose({
        topicId: q.topicId,
        deps: data.deps,
        questionsByTopic,
        topicById: data.topicById,
      });
      if (diag) {
        insert = { kind: 'backtrack', payload: diag };
        tip = '发现前置小卡点。退一步，先把下面这块补掉，再回来秒杀它。';
      }
    }
    if (insert) steps.splice(cursor + 1, 0, insert);

    const lab = labForTopic(topic);
    fb.innerHTML = `
      <div class="feedback warn">
        <h3>这题先记下来，不算亏</h3>
        <p>${esc(tip)}</p>
        ${q.explanation ? `<p style="margin-top:8px"><b>解析：</b>${esc(q.explanation)}</p>` : ''}
        <div class="btn-row">
          <button class="btn btn-warm" id="next">我记住了，下一题</button>
          ${lab ? `<button class="btn" id="lab">动手看演示</button>` : ''}
        </div>
      </div>`;
    fb.querySelector('#next').onclick = () => { cursor += 1; paint(); };
    if (lab) fb.querySelector('#lab').onclick = () => openLab(lab, topic);
    vib([10, 40, 10]);
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** ---------- 回溯面板 ---------- */
  function paintBacktrack(step) {
    const { payload } = step;
    const names = payload.path.map((id) => topicOf({ topicId: id }).name || id);
    root.innerHTML = `
      ${headerHtml('诊断回溯 · 找到真正卡住的地方')}
      <section class="card">
        <h2 style="font-size:19px;margin-bottom:6px">不是这题太难，是下面这块松了</h2>
        <p class="hint">往下走的顺序：</p>
        <div class="chain">
          ${names.map((n, i) => `${i ? '<span class="chain-arrow">←</span>' : ''}<span class="chain-node ${i === names.length - 1 ? 'root' : ''}">${esc(n)}</span>`).join('')}
        </div>
        ${payload.flashcard ? `
          <div class="card" style="box-shadow:none;background:#F8FAFC">
            <div class="q-topic">补学第 1 步 · 概念闪卡</div>
            <p style="font-weight:600;margin:6px 0">${esc(payload.flashcard.front)}</p>
            <p class="hint">${esc(payload.flashcard.back)}</p>
          </div>` : ''}
        <p style="margin-top:14px">第 2 步：做 ${payload.questions.length} 道最基础的变式题。第 3 步：回到刚才那关重测。</p>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-primary" id="go">开始补 ${payload.questions.length} 题（约 3 分钟）</button>
        </div>
      </section>`;
    root.querySelector('#quit').onclick = quit;
    root.querySelector('#go').onclick = () => {
      const qs = payload.questions.map((q) => ({ ...q }));
      steps.splice(cursor + 1, 0, ...qs.map((q) => ({ kind: 'q', q, origin: 'backtrack' })));
      steps.splice(cursor, 1);
      paint();
    };
  }

  /** ---------- 实验室跳出 ---------- */
  function openLab(lab, topic) {
    const dlg = openSheet(`
      <h2>${esc(lab.title)}</h2>
      <div class="lab-task">观察任务：${esc(lab.task)}</div>
      <p class="hint" style="margin-top:12px">实验会在新标签页打开，回来看完点下面的按钮就行。</p>
      <div class="btn-row" style="margin-top:16px">
        <a class="btn btn-primary" href="${lab.url}" target="_blank" rel="noopener noreferrer" id="open-lab">打开实验</a>
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn" id="confirm-lab">我看懂了，测 1 题</button>
      </div>
    `);
    dlg.querySelector('#open-lab').onclick = () => {
      const today = dayKey();
      state.labBonus ||= {};
      if (state.labBonus[lab.id] !== today) {
        state.labBonus[lab.id] = today;
        state.points += 5;
        saveState(state);
        toast('+5 分，看完回来测一题');
      }
    };
    dlg.querySelector('#confirm-lab').onclick = () => {
      closeSheet();
      const pool = (questionsByTopic.get(topic.id) || []).filter((q) => q.difficulty === 'basic');
      const q = pool.find((x) => !answeredIds.has(x.id)) || pool[0];
      if (!q) return toast('这一节暂时没有基础题');
      steps.splice(cursor + 1, 0, { kind: 'q', q, origin: 'backtrack' });
      toast('先把这一题做完，再继续');
    };
  }

  /** ---------- 结束 ---------- */
  function finish() {
    if (finished) return;
    finished = true;
    const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
    let bonus = 0;
    if (!session.mini) {
      bonus = completeSession(state, {
        subject: session.subject,
        minutes,
        correct,
        total: answered,
        points: 10 + (backtrackCount ? 5 : 0),
      });
      saveState(state);
      app.lastSession = { subject: session.subject, correct, total: answered, minutes, bonus };
      app.session = null;
    } else {
      const cb = session.onDone;
      app.session = null;
      toast(`完成 1 题 · +${Math.max(1, correct)} 分`);
      if (cb) cb();
      else app.go('home');
      return;
    }

    const rate = answered ? Math.round((correct / answered) * 100) : 0;
    root.innerHTML = `
      <section class="card hero">
        <span class="hero-subject">今日一关完成</span>
        <h1>${correct} / ${answered} 题</h1>
        <p class="meta">正确率 ${rate}% · 用时约 ${minutes} 分钟 · 积分 +${bonus}</p>
        <div class="grid-3" style="margin-top:22px">
          <div class="stat"><b>${state.streak.days}</b><span>连续天数</span></div>
          <div class="stat"><b>${state.points}</b><span>总积分</span></div>
          <div class="stat"><b>${(state.wrongBook || []).filter((w) => w.status !== 'cleared').length}</b><span>待消灭错题</span></div>
        </div>
        <button class="btn btn-primary" id="done" style="margin-top:20px">收下今天的打卡</button>
        <button class="btn btn-ghost" id="again" style="margin-top:8px;width:100%">再来一关</button>
      </section>
      <p class="hint" style="text-align:center;margin-top:16px">答错的题已经进错题本，明天热身会先抽它们。</p>
    `;
    root.querySelector('#done').onclick = () => app.go('home');
    root.querySelector('#again').onclick = () => app.startSession({});
  }

  function quit() {
    if (answered > 0 && !confirm('现在退出，这一关的答题记录会保留，但不算打卡。确定吗？')) return;
    app.session = null;
    app.go('home');
  }

  function vib(ms) {
    if (state.settings?.sound === false) return;
    vibrate(ms);
  }

  paint();
}

/* ---------- 平板草稿板 ---------- */
function draftHtml() {
  return `
    <aside class="draft">
      <div class="draft-head">
        <span class="hint">草稿纸</span>
        <button class="btn btn-sm btn-ghost" id="clear-draft">清空</button>
      </div>
      <canvas id="draft-canvas"></canvas>
    </aside>`;
}

function mountDraft(root) {
  const canvas = root.querySelector('#draft-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#334155';
  let drawing = false;
  let last = null;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.onpointerdown = (e) => {
    drawing = true;
    last = pos(e);
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  };
  canvas.onpointerup = () => { drawing = false; last = null; };
  canvas.onpointercancel = () => { drawing = false; last = null; };

  const clear = root.querySelector('#clear-draft');
  if (clear) clear.onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
}
