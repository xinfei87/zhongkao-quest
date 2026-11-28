/**
 * 存档：LocalStorage 读写 + 结构迁移。
 * 所有学习进度都在这里，约几十 KB，天然可导出。
 */
import { dayKey } from '../util.js';

const KEY = 'zkq_state_v1';

export function defaultState() {
  return {
    version: 1,
    createdAt: dayKey(),
    profile: { name: '', pin: '1234', dailyQuestions: 21, dailyGoalMinutes: 50, onboarded: false },
    streak: { days: 0, lastDate: '', best: 0 },
    points: 0,
    sessions: [],           // {date, subject, minutes, correct, total, points}
    daily: null,            // V2.2 当天累计 {date, total, correct, minutes, subject}（中途退出也计）
    today: null,            // {date, subject, done:boolean}
    subjectCursor: 0,       // 「换一关」轮换位置
    focus: {},              // {subject, grade, topic} 本关主攻（首页显示用）
    teacherAsks: [],        // V2：“问老师”使用日期列表（只记日期，不记内容），供家长看板统计
    hintLog: [],            // V2：提示使用记录 [{d: 日期, level: 看到第几级}]，最多 200 条
    lastSyncAt: null,       // V2：最近一次生成/导入同步口令码的时间（跨设备说明用）
    topicStats: {},         // topicId -> {seen, correct, wrongStreak, shaky, mastered, lastSeen}
    wrongBook: [],          // {questionId, topicId, subject, count, lastWrong, status, myAnswer}
    flashcards: {},         // topicId -> {box, due}
    rewards: [
      { id: 'r1', title: '周末多玩 30 分钟游戏', cost: 120 },
      { id: 'r2', title: '选一部电影全家一起看', cost: 200 },
      { id: 'r3', title: '买一本想要的书', cost: 300 },
    ],
    redemptions: [],        // {id, rewardId, title, cost, date}
    labBonus: {},           // labId -> date（每天只能拿一次）
    settings: { sound: false, showTimer: true },
  };
}

/**
 * 2026-11-29：每日题量档从 12 题/30 分钟改成 21 题/约 50 分钟
 * （2026-11-29 到 2027-06-20 还有 203 天，4144 道题每天最少 21 道才刷得完）。
 * 旧设备上存的 12 自动升到 21；当时配套选的 30 分钟也一起升到 50，其他自选值不动。
 */
export function migrateProfile(profile) {
  const out = { ...profile };
  if (out.dailyQuestions === 12) {
    out.dailyQuestions = 21;
    if (out.dailyGoalMinutes === 30) out.dailyGoalMinutes = 50;
  }
  return out;
}

function merge(base, saved) {
  const out = { ...base, ...saved };
  out.profile = migrateProfile({ ...base.profile, ...(saved.profile || {}) });
  out.streak = { ...base.streak, ...(saved.streak || {}) };
  out.settings = { ...base.settings, ...(saved.settings || {}) };
  if (!Array.isArray(out.wrongBook)) out.wrongBook = [];
  if (!Array.isArray(out.sessions)) out.sessions = [];
  if (!Array.isArray(out.rewards)) out.rewards = base.rewards;
  if (!Array.isArray(out.redemptions)) out.redemptions = [];
  if (!Array.isArray(out.teacherAsks)) out.teacherAsks = [];
  if (!Array.isArray(out.hintLog)) out.hintLog = [];
  if (typeof out.points !== 'number') out.points = 0;
  return out;
}

let cache = null;

export function loadState() {
  if (cache) return cache;
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? merge(base, JSON.parse(raw)) : base;
  } catch {
    cache = base;
  }
  return cache;
}

export function saveState(state = cache) {
  cache = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('存档失败（可能空间已满）', e);
  }
}

export function replaceState(next) {
  cache = merge(defaultState(), next);
  saveState(cache);
  return cache;
}

export function exportState() {
  return JSON.stringify(loadState());
}

/** 清空进度，保留家长设置里的 PIN */
export function resetProgress() {
  const pin = loadState().profile.pin;
  cache = defaultState();
  cache.profile.pin = pin;
  saveState(cache);
  return cache;
}
