import { esc, toast, openSheet, closeSheet, vibrate, dayKey } from '../util.js';
import { judge, inputCount } from '../engine/judge.js';
import { groupByTopic, recordAnswer, recordFlashcard, markShaky, completeSession } from '../engine/scheduler.js';
import { pickConfirmQuestion, pickVariantQuestion, diagnose } from '../engine/backtrack.js';
import { buildHintLevels, HINT_LEVELS } from '../engine/hints.js';
import { askTeacher, hasTeacherKey, readTeacherCache, TEACHER_KEY_URL } from '../engine/teacher.js';
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
  const wrongByTopic = new Map();
  const answeredIds = new Set();
  // V2：提示改成三级逐级展开。hintShown 记每道题看过几级提示（影响首答得分判定），
  // 绝不允许像旧版那样点一次按钮就消失、且不留任何文字。
  const hintShown = new Map();
  let cursor = 0;
  let answered = 0;
  let correct = 0;
  let insertedCount = 0;
  let backtrackCount = 0;
  let backtrackBonus = false;
  let finished = false;
  // V2：计时。目标分钟默认 30（孩子档案/家长入口可改）；到点提示收尾，不强制踢出。
  let timerId = null;
  let timeUpNotified = false;
  const goalMinutes = state.profile.dailyGoalMinutes || 30;

  function paint() {
    if (cursor >= steps.length) return finish();
    const step = steps[cursor];
    if (step.kind === 'flash') return paintFlash(step.card);
    if (step.kind === 'backtrack') return paintBacktrack(step);
    return paintQuestion(step);
  }

  // V2：进度按实际做过的题数算。总题数是动态的——答错后插入的补救题/回溯题
  // 都会让总数变大，旧版一直显示初始的 4/4，学生不知道还要做几道。
  function progressHtml() {
    const total = Math.max(1, steps.filter((s) => s.kind === 'q').length);
    const done = Math.min(answered, total);
    const pct = Math.round((done / total) * 100);
    return `
      <div class="progress">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="progress-label" id="quiz-timer" title="本关用时">00:00</span>
        <span class="progress-label">${done}/${total}</span>
      </div>
      <div id="timeup-banner" class="timeup-banner" style="display:none">
        今天已练满 ${goalMinutes} 分钟，可以收尾了。做完这道题就可以结束，不用硬撑。
        <button class="btn btn-sm btn-primary" id="finish-early">提前结束本关</button>
      </div>`;
  }

  /** V2：计时器。只在做题页跑，退出/结束时停掉。 */
  function startTimer() {
    if (timerId) return;
    const startedAt = session.startedAt || Date.now();
    const fmt = (ms) => {
      const s = Math.floor(ms / 1000);
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    timerId = setInterval(() => {
      const el = document.querySelector('#quiz-timer');
      if (el) el.textContent = fmt(Date.now() - startedAt);
      // 目标分钟档：到点只提示一次，不强制踢出，让学生做完当前题再结束
      if (!session.mini && !timeUpNotified && Date.now() - startedAt >= goalMinutes * 60 * 1000) {
        timeUpNotified = true;
        toast(`今天已练满 ${goalMinutes} 分钟，可以收尾了`);
        const banner = document.querySelector('#timeup-banner');
        if (banner) {
          banner.style.display = 'block';
          banner.querySelector('#finish-early').onclick = () => {
            cursor = steps.length;
            paint();
          };
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
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
            <button class="btn btn-sm btn-ghost" id="hint">💡 提示（0/${HINT_LEVELS}）</button>
            <ol id="hint-list" class="hint-steps" style="display:none"></ol>
          </div>
        </section>
        ${draftHtml()}
      </div>
    `;
    root.querySelector('#quit').onclick = quit;
    mountDraft(root, q.id);
    startTimer();

    const area = root.querySelector('#answer-area');

    // V2 三级提示：hint1 考什么、hint2 第一步、hint3 半成品。点一次展开一级，
    // 按钮上的 0/3→1/3→2/3→3/3 真实推进；已展开的提示一直留在页面上，
    // 三级看完按钮才变灰。buildHintLevels 保证三级永远有文字，点后绝不空白。
    const hintList = root.querySelector('#hint-list');
    const hintBtn = root.querySelector('#hint');
    const levels = buildHintLevels(q, topic);
    hintBtn.onclick = () => {
      const shown = hintShown.get(q.id) || 0;
      if (shown >= HINT_LEVELS) return;
      hintShown.set(q.id, shown + 1);
      // V2：记一笔提示使用（只记日期和级数），供家长看板看“提示用到第几级”
      state.hintLog = [...(state.hintLog || []), { d: dayKey(), level: shown + 1 }].slice(-200);
      saveState(state);
      hintList.style.display = 'block';
      const li = document.createElement('li');
      li.textContent = levels[shown];
      hintList.appendChild(li);
      const next = shown + 1;
      hintBtn.textContent = next >= HINT_LEVELS ? '💡 提示（3/3，看完了）' : `💡 提示（${next}/${HINT_LEVELS}）`;
      if (next >= HINT_LEVELS) hintBtn.disabled = true;
    };

    // V2：记下学生这道题选了/填了什么，讲解区要原样展示“我的答案”
    let myAnswer = '';

    const handle = (value) => {
      myAnswer = Array.isArray(value) ? value.join('，') : String(value ?? '');
      const result = judge(q, value);
      if (result === null) return paintSelfCheck(step, q, topic, myAnswer);
      return showResult(step, q, topic, result, myAnswer);
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
  function paintSelfCheck(step, q, topic, myAnswer) {
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
    fb.querySelector('#self-yes').onclick = () => showResult(step, q, topic, true, myAnswer);
    fb.querySelector('#self-no').onclick = () => showResult(step, q, topic, false, myAnswer);
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** ---------- V2 五段式讲解 ---------- */
  function explanationHtml(q, topic, myAnswer, isCorrect) {
    const parts = [];
    const conclusion = (q.explanation || '').trim();
    parts.push(`<p><b>① 一句话结论：</b>${conclusion ? esc(conclusion) : '先记住答案，再看下面的步骤。'}</p>`);
    const steps = Array.isArray(q.steps) ? q.steps.filter(Boolean) : [];
    if (steps.length) {
      parts.push(`<p style="margin-top:8px"><b>② 分步推导：</b></p><ol class="explain-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`);
    } else {
      // 没写分步讲解的题不编造，明确告诉学生正在补
      parts.push('<p class="hint" style="margin-top:8px">② 分步讲解：这道题的详细分步讲解正在补，先看第①段的一句话结论。</p>');
    }
    if (!isCorrect) {
      if (q.type === 'choice' && myAnswer) {
        const myChoice = (q.choices || []).find((c) => c.key === myAnswer);
        const rightChoice = (q.choices || []).find((c) => c.key === q.answer);
        parts.push(`<p style="margin-top:8px"><b>③ 你错在哪：</b>你选了 ${esc(myAnswer)}${myChoice ? `「${esc(myChoice.text)}」` : ''}，正确答案是 ${esc(q.answer)}${rightChoice ? `「${esc(rightChoice.text)}」` : ''}。对照下面第④段，看看 ${esc(myAnswer)} 为什么不对。</p>`);
      } else if (myAnswer) {
        parts.push(`<p style="margin-top:8px"><b>③ 你错在哪：</b>你填的是 ${esc(myAnswer)}，正确答案是 ${esc(q.answer)}。第②段的第一步就是最容易算错的地方，对着算一遍。</p>`);
      }
    }
    if (q.type === 'choice' && Array.isArray(q.choices)) {
      const why = q.whyWrong || {};
      const items = (q.choices || [])
        .filter((c) => c.key !== q.answer)
        .map((c) => `<li><b>${esc(c.key)}「${esc(c.text)}」</b>：${why[c.key] ? esc(why[c.key]) : '为什么不对，这道题的辨析正在补——先记住它不是答案。'}</li>`)
        .join('');
      parts.push(`<p style="margin-top:8px"><b>④ 干扰项为什么不对：</b></p><ul class="explain-steps">${items}</ul>`);
    }
    parts.push('<p style="margin-top:8px"><b>⑤ 换个问法再测一题：</b>同一考点的变式题会出现在下一关或错题回炉里，换个问法做对了才算真懂。</p>');
    return parts.join('');
  }

  /** 错题还差几次消灭：连续答对 2 次移出，返回剩余次数 */
  function remainingToClear(questionId) {
    const w = (state.wrongBook || []).find((x) => x.questionId === questionId);
    if (!w) return 0;
    return Math.max(0, 2 - (w.streak || 0));
  }

  /** ---------- V2 问老师 ---------- */
  function wireTeacher(btn, box, q, topic, myAnswer) {
    if (!btn || !box) return;
    btn.onclick = async () => {
      const shown = hintShown.get(q.id) || 0;
      const cached = readTeacherCache(localStorage, q.id);
      if (!hasTeacherKey(localStorage) && !cached) {
        box.style.display = 'block';
        box.innerHTML = `<p><b>问老师要先请家长设置一下：</b>家长在“我的 → 家长入口 → AI 老师设置”里粘贴 Gemini Key（只存在这台设备上，不会上传）。没有 Key 也能先看上面的静态解析。</p><p style="margin-top:6px">取 Key 的官方页面：<a href="${TEACHER_KEY_URL}" target="_blank" rel="noopener noreferrer">${TEACHER_KEY_URL}</a></p>`;
        return;
      }
      btn.disabled = true;
      btn.textContent = '老师正在想…';
      box.style.display = 'block';
      box.innerHTML = '<p class="hint">老师正在想…（最多等 20 秒）</p>';
      try {
        const { text, cached: wasCached } = await askTeacher({
          question: q, topicName: topic.name, myAnswer, hintsShown: shown, storage: localStorage,
        });
        // V2：记一笔“问老师”使用次数，供家长看板统计（只记日期，不记内容）
        state.teacherAsks = [...(state.teacherAsks || []), dayKey()].slice(-200);
        saveState(state);
        box.innerHTML = `<p><b>老师讲：</b></p><p style="white-space:pre-wrap">${esc(text)}</p>${wasCached ? '<p class="hint" style="margin-top:6px">这段讲解是上次问过的缓存，没再花钱。</p>' : ''}`;
      } catch (e) {
        box.innerHTML = `<p>老师现在没空（${e?.message === 'RATE_LIMIT' ? '调用太频繁，等一会儿再试' : '网络或额度问题'}），先看上面的静态解析，晚点再点一次。</p>`;
        btn.disabled = false;
        btn.textContent = '问老师，还是不懂';
      }
    };
  }

  function showResult(step, q, topic, isCorrect, myAnswer = '') {
    const fb = root.querySelector('#feedback');
    const area = root.querySelector('#answer-area');
    // 锁住作答区：正确答案标绿打✓，自己选错的标红打✕
    // （旧版只标绿，学生回头看不出自己错在哪；.choice.wrong 样式早已存在，只是一直没用上）
    area.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
      const keyEl = b.querySelector('.key');
      if (b.dataset.key && b.dataset.key === q.answer) {
        b.classList.add('correct');
        if (keyEl) keyEl.textContent = '✓';
      } else if (!isCorrect && b.dataset.key && b.dataset.key === myAnswer) {
        b.classList.add('wrong');
        if (keyEl) keyEl.textContent = '✕';
      }
    });
    area.querySelectorAll('.answer-input').forEach((i) => { i.disabled = true; });

    if (!answeredIds.has(q.id)) {
      answeredIds.add(q.id);
      answered += 1;
      if (isCorrect) correct += 1;
      // V2：看过提示就不是首答；变式题（variantOf）答对了要算到原错题头上
      const firstTry = (hintShown.get(q.id) || 0) === 0 && !step.confirm && step.origin !== 'backtrack';
      const recordQ = q.variantOf ? { ...q, id: q.variantOf } : q;
      recordAnswer(state, { subject: session.subject, question: recordQ, correct: isCorrect, firstTry, myAnswer });
      saveState(state);
      // V2：顶栏积分/天数和总结页必须同一来源，答完一题就刷新顶栏
      app.renderTopbar();
    }

    if (isCorrect) {
      if (step.confirm) {
        markShaky(state, q.topicId);
        saveState(state);
      }
      fb.innerHTML = `
        <div class="feedback">
          <h3>${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</h3>
          ${explanationHtml(q, topic, myAnswer, true)}
          <div class="teacher-box" id="teacher-box" style="display:none"></div>
          <div class="btn-row">
            <button class="btn btn-primary" id="next">下一题</button>
            <button class="btn btn-sm btn-ghost" id="ask-teacher">问老师，还是不懂</button>
          </div>
        </div>`;
      fb.querySelector('#next').onclick = () => { if (step.origin === 'backtrack') backtrackCount += 1; cursor += 1; paint(); };
      wireTeacher(fb.querySelector('#ask-teacher'), fb.querySelector('#teacher-box'), q, topic, myAnswer);
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

    // V2：同考点变式题按钮（答错当场就能换个问法再试一次）；实验室只在
    // labForTopic 有把握时才出现，没有合适演示就干脆不显示（不要推错实验）
    const variant = pickVariantQuestion({
      topicId: q.topicId,
      questionsByTopic,
      excludeIds: [q.id, ...answeredIds, ...steps.filter((s) => s.q).map((s) => s.q.id)],
    });
    const remain = remainingToClear(q.variantOf || q.id);
    const lab = labForTopic(topic, session.subject);
    fb.innerHTML = `
      <div class="feedback warn">
        <h3>这题先记下来，不算亏</h3>
        <p>${esc(tip)}</p>
        ${remain > 0 ? `<p style="margin-top:8px">这道错题还要连续答对 <b>${remain} 次</b>才能从错题本消灭（变式题做对了也算）。</p>` : ''}
        <div style="margin-top:8px">${explanationHtml(q, topic, myAnswer, false)}</div>
        <div class="teacher-box" id="teacher-box" style="display:none"></div>
        <div class="btn-row">
          <button class="btn btn-warm" id="next">我记住了，下一题</button>
          ${variant ? `<button class="btn" id="variant">来一道变式题</button>` : ''}
          <button class="btn btn-sm btn-ghost" id="ask-teacher">问老师，还是不懂</button>
          ${lab ? `<button class="btn" id="lab">动手看演示</button>` : ''}
        </div>
      </div>`;
    fb.querySelector('#next').onclick = () => { cursor += 1; paint(); };
    if (variant) {
      fb.querySelector('#variant').onclick = () => {
        steps.splice(cursor + 1, 0, { kind: 'q', q: { ...variant, variantOf: q.variantOf || q.id } });
        cursor += 1;
        paint();
      };
    }
    wireTeacher(fb.querySelector('#ask-teacher'), fb.querySelector('#teacher-box'), q, topic, myAnswer);
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
    stopTimer();
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
      // V2：总结页和顶栏同一来源；lastSession 带科目名，首页不再张冠李戴
      app.renderTopbar();
      app.lastSession = { subject: session.subject, subjectName: session.subjectName || '', correct, total: answered, minutes, bonus };
      app.session = null;
    } else {
      const cb = session.onDone;
      app.session = null;
      toast(`完成 1 题 · +${Math.max(1, correct)} 分`);
      // V2：实验室的测题做完回实验室页，不是首页
      if (cb) cb();
      else if (session.returnTo) app.go(session.returnTo);
      else app.go('home');
      return;
    }

    const rate = answered ? Math.round((correct / answered) * 100) : 0;
    root.innerHTML = `
      <section class="card hero">
        <span class="hero-subject">${esc(session.subjectName || '今日一关')} · 今日一关完成</span>
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
    stopTimer();
    app.session = null;
    app.go('home');
  }

  function vib(ms) {
    if (state.settings?.sound === false) return;
    vibrate(ms);
  }

  paint();
}

/* ---------- 草稿纸（V2：手机上也有） ----------
 * 旧版草稿纸只在 ≥768px 显示，手机上整个消失；只有“清空”，换题就丢。
 * V2：窄屏默认折叠、点开能画；加撤销、橡皮擦；按题保存到 localStorage，
 * 换题回来还能看到这道题的草稿；清空要二次确认。 */
function draftHtml() {
  return `
    <aside class="draft" id="draft-box">
      <div class="draft-head">
        <button class="btn btn-sm btn-ghost" id="draft-toggle">📝 草稿纸 ▸</button>
        <span class="draft-tools" id="draft-tools" style="display:none">
          <button class="btn btn-sm btn-ghost" id="draft-undo">撤销</button>
          <button class="btn btn-sm btn-ghost" id="draft-eraser">橡皮擦</button>
          <button class="btn btn-sm btn-ghost" id="clear-draft">清空</button>
        </span>
      </div>
      <canvas id="draft-canvas"></canvas>
    </aside>`;
}

function mountDraft(root, questionId) {
  const box = root.querySelector('#draft-box');
  const canvas = root.querySelector('#draft-canvas');
  if (!box || !canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const storeKey = `zkq_draft_${questionId}`;
  let sized = false;
  let drawing = false;
  let last = null;
  let erasing = false;
  // 撤销栈：每次下笔前存一张快照，最多 20 张
  const undoStack = [];

  const snapshot = () => {
    try {
      undoStack.push(canvas.toDataURL());
      if (undoStack.length > 20) undoStack.shift();
    } catch { /* 画布存不下也不影响做题 */ }
  };
  const save = () => {
    try {
      localStorage.setItem(storeKey, canvas.toDataURL());
    } catch { /* 存不下也不影响做题 */ }
  };
  const restore = () => {
    let data = null;
    try {
      data = localStorage.getItem(storeKey);
    } catch { /* 读不到就当空白 */ }
    if (!data) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
    img.src = data;
  };
  // 只有画布可见时才能量尺寸；窄屏折叠时先不定尺寸，等点开再量
  const sizeCanvas = () => {
    if (sized) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    sized = true;
    restore();
  };
  const applyPen = () => {
    ctx.lineWidth = erasing ? 14 : 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = erasing ? '#FFFFFF' : '#334155';
  };
  applyPen();

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.onpointerdown = (e) => {
    sizeCanvas();
    snapshot();
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
  const endStroke = () => {
    if (!drawing) return;
    drawing = false;
    last = null;
    save();
  };
  canvas.onpointerup = endStroke;
  canvas.onpointercancel = endStroke;

  const toggle = root.querySelector('#draft-toggle');
  const tools = root.querySelector('#draft-tools');
  const syncToggle = () => {
    const open = box.classList.contains('open');
    toggle.textContent = open ? '📝 草稿纸 ▾' : '📝 草稿纸 ▸';
    tools.style.display = open ? '' : 'none';
    if (open) sizeCanvas();
  };
  toggle.onclick = () => {
    box.classList.toggle('open');
    syncToggle();
  };
  // 宽屏默认展开（CSS 也会强制显示画布），窄屏默认折叠
  if (window.matchMedia('(min-width: 768px)').matches) {
    box.classList.add('open');
  }
  syncToggle();

  const undoBtn = root.querySelector('#draft-undo');
  if (undoBtn) {
    undoBtn.onclick = () => {
      const prev = undoStack.pop();
      if (prev === undefined) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        save();
      };
      img.src = prev;
    };
  }
  const eraserBtn = root.querySelector('#draft-eraser');
  if (eraserBtn) {
    eraserBtn.onclick = () => {
      erasing = !erasing;
      applyPen();
      eraserBtn.textContent = erasing ? '橡皮擦（开）' : '橡皮擦';
    };
  }
  const clear = root.querySelector('#clear-draft');
  if (clear) {
    clear.onclick = () => {
      if (!confirm('确定清空这道题的草稿吗？清空后找不回来。')) return;
      snapshot();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        localStorage.removeItem(storeKey);
      } catch { /* 删不掉也不影响 */ }
    };
  }
}
