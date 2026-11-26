/**
 * 家长看板 / 老师只读查看共用的看板模块（V2）。
 * 家长端和老师端渲染的是同一套内容、同一套算法，不会算出两套数字。
 * 这里只算数、不改数、不写 localStorage；所有数字都从现有 state
 *（topicStats / wrongBook / sessions / daily / teacherAsks / hintLog）里算，不编造。
 */
import { esc, dayKey, addDays } from '../util.js';
import { topWeakTopics } from '../engine/scheduler.js';

/** 今日完成情况：是否打卡、练了哪科、几题、几分钟（对照目标）、正确率
 * V2.2：题数/正确率/分钟以 daily 为准——每次真实作答都累计，中途退出也计入今日；
 * 做完一整关的题已经在 daily 里了，不再另加 sessions。
 * “打卡”仍以 completeSession 为准：做完一整关才打卡，中途退出只计题数、不算打卡。 */
export function computeToday(state, subjects = []) {
  const today = dayKey();
  const d = state.daily;
  let total, correct, minutes, subjectId;
  if (d && d.date === today) {
    total = d.total || 0;
    correct = d.correct || 0;
    minutes = d.minutes || 0;
    subjectId = d.subject || '';
  } else {
    // 旧数据回落：没有 daily 字段时按 sessions 算（现状行为）
    const list = (state.sessions || []).filter((x) => x.date === today);
    total = list.reduce((a, x) => a + (x.total || 0), 0);
    correct = list.reduce((a, x) => a + (x.correct || 0), 0);
    minutes = list.reduce((a, x) => a + (x.minutes || 0), 0);
    subjectId = state.today?.date === today ? state.today.subject : (list[0]?.subject || '');
  }
  const subjectName = (subjects.find((x) => x.id === subjectId) || {}).name || (subjectId || '还没练');
  return {
    done: Boolean(state.today?.date === today && state.today.done),
    subjectName,
    total,
    correct,
    minutes,
    goal: state.profile?.dailyGoalMinutes || 30,
    rate: total ? Math.round((correct / total) * 100) : null,
  };
}

export function todayCardHTML(t) {
  return `
    <div class="grid-2">
      <div class="stat"><b>${t.done ? '已打卡 ✓' : '未打卡'}</b><span>今日打卡</span></div>
      <div class="stat"><b>${esc(t.subjectName)}</b><span>今日科目</span></div>
      <div class="stat"><b>${t.total} 题</b><span>做了几题</span></div>
      <div class="stat"><b>${t.minutes} / ${t.goal} 分钟</b><span>用时 / 目标</span></div>
      <div class="stat"><b>${t.rate === null ? '—' : `${t.rate}%`}</b><span>今日正确率</span></div>
      <div class="stat"><b>${t.correct} / ${t.total}</b><span>做对 / 总数</span></div>
    </div>`;
}

/**
 * 按科目掌握度：已掌握考点 / 总考点、正确率。
 * @param {Array} subjectData [{subject:{id,name}, topics:[...]}]（调用方先 loadSubject）
 */
export function computeMastery(state, subjectData = []) {
  return subjectData.map(({ subject, topics }) => {
    const stats = state.topicStats || {};
    let mastered = 0;
    let seen = 0;
    let correct = 0;
    for (const t of topics || []) {
      const st = stats[t.id];
      if (st?.mastered) mastered += 1;
      if (st) {
        seen += st.seen || 0;
        correct += st.correct || 0;
      }
    }
    return {
      name: subject.name,
      mastered,
      total: (topics || []).length,
      rate: seen ? Math.round((correct / seen) * 100) : null,
    };
  });
}

export function masteryHTML(rows) {
  if (!rows.length) return '<p class="hint" style="padding:14px 0">还没有分科数据。</p>';
  return rows.map((r) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(r.name)}</div>
        <div class="row-sub">已掌握 ${r.mastered} / ${r.total} 个考点</div>
        <div class="row-sub">掌握口径：一个考点做满 3 道题、且对 80% 以上，才算掌握这个考点。刚开始练，掌握数是 0 很正常。</div>
      </div>
      <span class="chip">${r.rate === null ? '还没练' : `${r.rate}% 正确`}</span>
    </div>`).join('');
}

/**
 * 薄弱 Top 5：每个带 1 道代表错题（错得最多的那道）和他当时选的答案，不只给考点名。
 * @param {object} topicById 考点 id → 考点；@param {Map} questionsById 题目 id → 题目
 */
export function computeWeakTop(state, topicById = {}, questionsById = new Map(), n = 5) {
  const tops = topWeakTopics(state, topicById, n);
  return tops.map((t) => {
    const entries = (state.wrongBook || [])
      .filter((w) => w.topicId === t.topicId && w.status !== 'cleared')
      .sort((a, b) => (b.count || 0) - (a.count || 0));
    const w = entries[0];
    const q = w ? questionsById.get(w.questionId) : null;
    let myAnswerText = '';
    // V2.1：浏览器里可能还留着 V1 的旧错题记录，V2 改过题目答案后会
    // 对不上——如果记录里的答案就是这道题现在的正确答案，说明这条
    // 记录已经失效，只显示代表错题和累计次数，不显示“他当时选了”那行。
    // 数据本身不动，只是不展示自相矛盾的那一行。
    if (q && w?.myAnswer && w.myAnswer !== q.answer) {
      const choice = (q.choices || []).find((c) => c.key === w.myAnswer);
      myAnswerText = choice ? `${w.myAnswer}「${choice.text}」` : String(w.myAnswer);
    }
    return {
      name: t.name,
      count: t.count,
      prompt: q ? q.prompt : '',
      answer: q ? q.answer : '',
      myAnswer: myAnswerText,
    };
  });
}

export function weakTopHTML(items) {
  if (!items.length) return '<p class="hint" style="padding:14px 0">没有未消灭的错题，很好。</p>';
  return items.map((it) => `
    <div class="row" style="align-items:flex-start">
      <div class="row-main">
        <div class="row-title">${esc(it.name)} · 累计错 ${it.count} 次</div>
        ${it.prompt ? `<div class="row-sub">代表错题：${esc(it.prompt)}</div>` : ''}
        ${it.myAnswer ? `<div class="row-sub">他当时选了：${esc(it.myAnswer)}；正确答案是 ${esc(it.answer)}</div>` : ''}
      </div>
    </div>`).join('');
}

/** 最近 7 天正确率趋势
 * V2.2：今天用 daily（含中途退出的题），不再加今天的 sessions，防双倍；
 * 往日只有整关记录，用 sessions。 */
export function computeTrend(state, days = 7) {
  const out = [];
  const today = dayKey();
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    let total, correct;
    if (d === today && state.daily && state.daily.date === today) {
      total = state.daily.total || 0;
      correct = state.daily.correct || 0;
    } else {
      const list = (state.sessions || []).filter((x) => x.date === d);
      total = list.reduce((a, x) => a + (x.total || 0), 0);
      correct = list.reduce((a, x) => a + (x.correct || 0), 0);
    }
    out.push({ date: d.slice(5), total, rate: total ? Math.round((correct / total) * 100) : null });
  }
  return out;
}

export function trendHTML(days) {
  return days.map((d) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title" style="font-weight:500">${esc(d.date)}</div>
        <div class="trend-bar"><div class="trend-fill" style="width:${d.rate ?? 0}%"></div></div>
      </div>
      <span class="chip">${d.rate === null ? '没练' : `${d.rate}%（${d.total} 题）`}</span>
    </div>`).join('');
}

/** 本周“问老师”用了几次、提示用到第几级（都只按日期统计，不看内容） */
export function computeTeacherUse(state) {
  const from = addDays(dayKey(), -6);
  const asks = (state.teacherAsks || []).filter((d) => d >= from).length;
  const hints = (state.hintLog || []).filter((h) => h.d >= from);
  const l3 = hints.filter((h) => h.level >= 3).length;
  const maxLevel = hints.reduce((m, h) => Math.max(m, h.level || 0), 0);
  return { asks, hints: hints.length, l3, maxLevel };
}

export function teacherUseHTML(u) {
  return `
    <div class="grid-2">
      <div class="stat"><b>${u.asks} 次</b><span>本周问老师</span></div>
      <div class="stat"><b>${u.hints} 次</b><span>本周看提示</span></div>
      <div class="stat"><b>${u.l3} 次</b><span>提示看到第 3 级</span></div>
      <div class="stat"><b>${u.maxLevel === 0 ? '没用过' : `第 ${u.maxLevel} 级`}</b><span>本周提示最高用到</span></div>
    </div>`;
}
