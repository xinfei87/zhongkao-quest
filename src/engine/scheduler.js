/**
 * 每日调度：选科目、组一关、记结果、算积分与连击。
 * 纯逻辑，不改 DOM。
 */
import { addDays, dayKey, shuffle } from '../util.js';
import { pickVariantQuestion } from './backtrack.js';

export function groupByTopic(questions = []) {
  const map = new Map();
  for (const q of questions) {
    if (!map.has(q.topicId)) map.set(q.topicId, []);
    map.get(q.topicId).push(q);
  }
  return map;
}

/** 今天该练哪科：没做完就延续；换一关则轮换 */
export function pickSubject(subjects, state, exclude = []) {
  const pool = subjects.filter((s) => s.questionCount > 0 && !exclude.includes(s.id));
  if (!pool.length) return subjects[0] || null;
  const today = dayKey();
  if (state.today && state.today.date === today && !state.today.done) {
    const cur = pool.find((s) => s.id === state.today.subject);
    if (cur) return cur;
  }
  const cursor = Number.isInteger(state.subjectCursor) ? state.subjectCursor : 0;
  return pool[cursor % pool.length];
}

export function rotateSubject(subjects, state) {
  const pool = subjects.filter((s) => s.questionCount > 0);
  if (!pool.length) return null;
  const cursor = ((Number.isInteger(state.subjectCursor) ? state.subjectCursor : 0) + 1) % pool.length;
  state.subjectCursor = cursor;
  state.today = { date: dayKey(), subject: pool[cursor].id, done: false };
  return pool[cursor];
}

const isBasic = (q) => q.difficulty === 'basic';

/** 选关内的主攻考点：优先「错得最多且未掌握」，其次按七年级→八年级→九年级补地基。
 * V2 改动：旧逻辑优先九年级（(grade-7)*40），对基础差的学生是反的——
 * 地基没补牢就直接上九年级，越练越挫。改为年级越低分越高。 */
export function pickFocusTopic({ topics, questionsByTopic, state, chapter }) {
  const usable = topics.filter((t) => (questionsByTopic.get(t.id) || []).length);
  if (!usable.length) return null;
  const scoped = chapter ? usable.filter((t) => t.chapter === chapter) : usable;
  const list = scoped.length ? scoped : usable;

  const score = (t) => {
    const st = state.topicStats[t.id];
    if (st?.mastered) return -1000;
    // 先看错得多不多（连错、不稳都加分），再看年级：七年级地基优先。
    // 连错权重（15/次）大于一个年级差（30 分）：连错 2 次以上就压过年级分，
    // 保证“错得最多优先”，年级只在错得差不多时才起作用。
    let s = (9 - Number(t.grade || 9)) * 30;
    if (!st) return s + 20;
    s += (st.wrongStreak || 0) * 15;
    s += st.shaky ? 6 : 0;
    s -= st.correct || 0;
    return s;
  };
  return list.slice().sort((a, b) => score(b) - score(a))[0];
}

function dueWrong(state, subject, today) {
  return (state.wrongBook || [])
    .filter((w) => w.subject === subject && w.status !== 'cleared' && w.lastWrong < today)
    .sort((a, b) => b.count - a.count);
}

/** 组一关：1 道送分题开场 + 错题回炉 + 同章基础/常规题 */
export function buildSession({ subject, topics, questions, state, chapter = null, size = 4 }) {
  const today = dayKey();
  const questionsByTopic = groupByTopic(questions);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const recent = new Set(state.recent || []);
  const chosen = [];
  const take = (q) => {
    if (!q || chosen.some((c) => c.id === q.id)) return false;
    chosen.push(q);
    return true;
  };

  const focus = pickFocusTopic({ topics, questionsByTopic, state, chapter });
  const focusPool = focus ? questionsByTopic.get(focus.id) || [] : [];
  const opener = focusPool.find(isBasic) || focusPool[0];
  take(opener);

  // 错题回炉最多 1 道，且不能是开场题
  // V2：回炉优先出同考点变式题（背住原题答案是过不了关的），变式题带 variantOf
  // 指向原错题，答对了算到原错题头上；没有变式题时才回落到原题。
  const wrongOrig = dueWrong(state, subject, today)
    .map((w) => byId.get(w.questionId))
    .find((q) => q && !chosen.some((c) => c.id === q.id));
  if (wrongOrig) {
    const variant = pickVariantQuestion({
      topicId: wrongOrig.topicId,
      questionsByTopic,
      excludeIds: [wrongOrig.id, ...chosen.map((c) => c.id)],
    });
    take(variant ? { ...variant, variantOf: wrongOrig.id } : wrongOrig);
  }

  // 同章优先，其次同科，避开最近做过的题
  const scopedTopicIds = new Set(
    (chapter ? topics.filter((t) => t.chapter === chapter) : topics).map((t) => t.id),
  );
  const pool = questions.filter((q) => scopedTopicIds.has(q.topicId) && !recent.has(q.id));
  const fallback = questions.filter((q) => !recent.has(q.id));
  const ladder = [pool.filter(isBasic), pool.filter((q) => q.difficulty === 'standard'), pool];
  for (const layer of ladder) {
    for (const q of shuffle(layer)) {
      if (chosen.length >= size) break;
      take(q);
    }
    if (chosen.length >= size) break;
  }
  if (chosen.length < size) {
    for (const q of shuffle(fallback.length ? fallback : questions)) {
      if (chosen.length >= size) break;
      take(q);
    }
  }

  return {
    subject,
    chapter: chapter || focus?.chapter || '',
    focusTopicId: focus?.id || null,
    focusTopicName: focus?.name || '',
    // V2：首页要显示“当前主攻几年级”，把主攻考点的年级带出去
    focusGrade: focus?.grade ?? null,
    questions: chosen,
    flashcards: buildFlashcards({ subject, topics, questionsByTopic, state, focus }),
    estimatedMinutes: Math.max(5, Math.round(chosen.length * 2.5 + 2)),
  };
}

/** 今日闪卡：先到期复习，再补本关考点 */
export function buildFlashcards({ subject, topics, questionsByTopic, state, focus, limit = 3 }) {
  const today = dayKey();
  const due = Object.entries(state.flashcards || {})
    .filter(([, v]) => v.due <= today)
    .map(([id]) => topics.find((t) => t.id === id))
    .filter((t) => t && (t.description || (t.mastery || []).length));
  const cards = due.slice(0, limit).map(toCard);
  if (cards.length < 2 && focus && (focus.description || (focus.mastery || []).length)) {
    if (!cards.some((c) => c.topicId === focus.id)) cards.push(toCard(focus));
  }
  return cards;
}

function toCard(t) {
  return {
    topicId: t.id,
    front: `「${t.name}」的核心是什么？`,
    back: t.description || (t.mastery || []).join('；'),
  };
}

/** 记一道题的结果，返回本次获得的积分 */
export function recordAnswer(state, { subject, question, correct, firstTry = true, myAnswer = '', date = dayKey() }) {
  const st = (state.topicStats[question.topicId] ||= {
    seen: 0, correct: 0, wrongStreak: 0, shaky: false, mastered: false, lastSeen: '',
  });
  st.seen += 1;
  st.lastSeen = date;
  if (correct) {
    st.correct += 1;
    st.wrongStreak = 0;
    if (st.seen >= 3 && st.correct / st.seen >= 0.8 && !st.shaky) st.mastered = true;
  } else {
    st.wrongStreak = (st.wrongStreak || 0) + 1;
    st.mastered = false;
  }

  const existing = (state.wrongBook || []).find((w) => w.questionId === question.id);
  if (!correct) {
    if (existing) {
      existing.count += 1;
      existing.lastWrong = date;
      existing.status = 'reviewing';
      existing.streak = 0;
      // V2：记下他当时选的答案，家长看板薄弱 Top 5 要展示“代表错题 + 他选了什么”
      if (myAnswer !== '') existing.myAnswer = myAnswer;
    } else {
      state.wrongBook.push({
        questionId: question.id,
        topicId: question.topicId,
        subject,
        count: 1,
        streak: 0,
        lastWrong: date,
        status: 'new',
        // V2：同上
        myAnswer: myAnswer || '',
      });
    }
  } else if (existing) {
    existing.streak = (existing.streak || 0) + 1;
    if (existing.streak >= 2) {
      existing.status = 'cleared';
      existing.clearedAt = date;
    } else {
      existing.status = 'reviewing';
    }
  }

  state.recent = [question.id, ...(state.recent || [])].slice(0, 80);
  const gain = correct ? (firstTry ? 2 : 1) : 0;
  state.points += gain;
  return gain;
}

/** 连错确认题答对：标记 shaky（不稳），明日闪卡复习，不在当次深挖 */
export function markShaky(state, topicId, date = dayKey()) {
  const st = (state.topicStats[topicId] ||= {
    seen: 0, correct: 0, wrongStreak: 0, shaky: false, mastered: false, lastSeen: '',
  });
  st.shaky = true;
  state.flashcards[topicId] = { box: 0, due: addDays(date, 1) };
}

export function recordFlashcard(state, topicId, known, date = dayKey()) {
  const cur = state.flashcards[topicId] || { box: 0, due: date };
  const box = known ? Math.min(3, cur.box + 1) : 0;
  const gap = known ? [1, 3, 7, 14][box] : 1;
  state.flashcards[topicId] = { box, due: addDays(date, gap) };
  state.points += known ? 1 : 0;
}

/** 收关：打卡、连击、积分、会话记录 */
export function completeSession(state, { subject, minutes, correct, total, points = 10, date = dayKey() }) {
  const bonus = total > 0 ? points : 0;
  state.points += bonus;
  if (state.streak.lastDate !== date) {
    const yesterday = addDays(date, -1);
    state.streak.days = state.streak.lastDate === yesterday ? state.streak.days + 1 : 1;
    state.streak.lastDate = date;
    state.streak.best = Math.max(state.streak.best || 0, state.streak.days);
  }
  state.sessions = [
    ...(state.sessions || []),
    { date, subject, minutes, correct, total, points: bonus },
  ].slice(-120);
  state.today = { date, subject, done: true };
  return bonus;
}

/** 最近 n 天统计（家长端） */
export function weekStats(state, days = 7) {
  const from = addDays(dayKey(), -(days - 1));
  const list = (state.sessions || []).filter((s) => s.date >= from);
  const minutes = list.reduce((a, s) => a + (s.minutes || 0), 0);
  const total = list.reduce((a, s) => a + (s.total || 0), 0);
  const correct = list.reduce((a, s) => a + (s.correct || 0), 0);
  return { days: list.length, minutes, total, correct, rate: total ? Math.round((correct / total) * 100) : 0 };
}

/** 根因 Top N：按错题所属考点聚合 */
export function topWeakTopics(state, topicsById, n = 3) {
  const agg = new Map();
  for (const w of state.wrongBook || []) {
    if (w.status === 'cleared') continue;
    const cur = agg.get(w.topicId) || { topicId: w.topicId, count: 0 };
    cur.count += w.count;
    agg.set(w.topicId, cur);
  }
  return [...agg.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((x) => ({ ...x, name: topicsById?.[x.topicId]?.name || x.topicId }));
}
