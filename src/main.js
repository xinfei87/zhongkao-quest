import { loadIndex, loadSubject } from './data.js';
import { loadState, saveState } from './store/local.js';
import { buildSession, rotateSubject } from './engine/scheduler.js';
import { dayKey, toast } from './util.js';
import { renderHome } from './views/home.js';
import { renderChapters } from './views/chapters.js';
import { renderQuiz } from './views/quiz.js';
import { renderLabs } from './views/labs.js';
import { renderMe } from './views/me.js';
import { renderRewards } from './views/rewards.js';
import { renderParent } from './views/parent.js';

const app = {
  state: loadState(),
  index: null,
  route: 'home',
  session: null,
  lastSession: null,
  ready: false,

  async init() {
    const view = document.getElementById('view');
    view.innerHTML = '<p class="hint" style="padding:40px 0;text-align:center">正在准备今天的关卡…</p>';
    try {
      this.index = await loadIndex();
    } catch (e) {
      view.innerHTML = `<div class="card"><h2>题库没加载出来</h2><p class="hint">${e.message}<br>请检查网络后刷新，或确认 data/ 目录已随站点一起发布。</p></div>`;
      return;
    }
    this.ready = true;
    window.addEventListener('hashchange', () => this.routeFromHash());
    this.bindShell();
    this.routeFromHash();
    this.registerSW();
  },

  bindShell() {
    const logo = document.querySelector('.brand');
    let timer;
    const start = () => { timer = setTimeout(() => { this.go('parent'); }, 700); };
    const stop = () => clearTimeout(timer);
    if (logo) {
      logo.addEventListener('pointerdown', start);
      logo.addEventListener('pointerup', stop);
      logo.addEventListener('pointerleave', stop);
    }
  },

  go(route) {
    location.hash = `#/${route}`;
  },

  routeFromHash() {
    const hash = location.hash.replace(/^#\/?/, '') || 'home';
    const [route] = hash.split('?');
    this.route = route;
    this.render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  },

  render() {
    const view = document.getElementById('view');
    const tab = document.getElementById('tabbar');
    const hasTab = ['home', 'labs', 'me'].includes(this.route);
    tab.hidden = !hasTab;
    tab.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === this.route));
    this.renderTopbar();

    switch (this.route) {
      case 'chapters': renderChapters(this, view); break;
      case 'quiz': renderQuiz(this, view); break;
      case 'labs': renderLabs(this, view); break;
      case 'me': renderMe(this, view); break;
      case 'rewards': renderRewards(this, view); break;
      case 'parent': renderParent(this, view); break;
      default: renderHome(this, view);
    }
  },

  registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  },

  renderTopbar() {    const bar = document.getElementById('topbar');
    const s = this.state;
    const todayDone = s.today?.date === dayKey() && s.today.done;
    bar.innerHTML = `
      <div class="brand"><span class="brand-logo">关</span><span>每日一关</span></div>
      <div class="topbar-stats">
        <span class="chip">🔥 ${s.streak.days || 0} 天</span>
        <span class="chip">⭐ ${s.points || 0}</span>
        ${todayDone ? '<span class="chip" style="color:#059669">今日已打卡</span>' : ''}
      </div>`;
  },

  /** 开始今日一关 / 指定章节 */
  async startSession({ subjectId, chapter = null, size = null } = {}) {
    const subject = subjectId
      ? this.index.subjects.find((x) => x.id === subjectId)
      : rotateSubject(this.index.subjects, this.state);
    if (!subject) return toast('还没有可练的科目');
    this.state.today = { date: dayKey(), subject: subject.id, done: false };
    saveState(this.state);
    toast('正在准备题目…');
    const d = await loadSubject(subject.id);
    const session = buildSession({
      subject: subject.id,
      topics: d.topics,
      questions: d.questions,
      state: this.state,
      chapter,
      size: size || this.state.profile.dailyQuestions || 4,
    });
    if (!session.questions.length) return toast('这一章暂时没有可用的题');
    this.session = {
      ...session,
      title: chapter || '今日一关',
      subjectName: subject.name,
      color: subject.color,
      startedAt: Date.now(),
      mini: false,
      data: d,
    };
    saveState(this.state);
    this.go('quiz');
  },

  /** 换一关 */
  switchSubject() {
    const next = rotateSubject(this.index.subjects, this.state);
    if (!next) return;
    saveState(this.state);
    toast(`换成${next.name}`);
    this.render();
  },

  /** 错题回炉 */
  async startWrongReview() {
    const pending = (this.state.wrongBook || []).filter((w) => w.status !== 'cleared');
    if (!pending.length) return toast('错题本已经清空了');
    const count = new Map();
    pending.forEach((w) => count.set(w.subject, (count.get(w.subject) || 0) + 1));
    const subjectId = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const d = await loadSubject(subjectId);
    const ids = pending.filter((w) => w.subject === subjectId).slice(0, 5).map((w) => w.questionId);
    const questions = ids.map((id) => d.questionsById.get(id)).filter(Boolean);
    if (!questions.length) return toast('错题对应的题目没找到');
    const subject = this.index.subjects.find((s) => s.id === subjectId);
    this.session = {
      subject: subjectId,
      subjectName: subject.name,
      color: subject.color,
      title: '错题回炉',
      chapter: '',
      questions,
      flashcards: [],
      estimatedMinutes: questions.length * 2,
      startedAt: Date.now(),
      mini: false,
      data: d,
    };
    this.go('quiz');
  },

  /** 小测：实验室「看懂后测一题」、回溯补题 */
  startMiniQuiz({ questions, title, data = null, onDone }) {
    this.session = {
      questions,
      flashcards: [],
      title,
      mini: true,
      data,
      startedAt: Date.now(),
      onDone,
    };
    this.go('quiz');
  },
};

window.app = app;
app.init();
