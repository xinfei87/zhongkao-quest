import { loadIndex, loadSubject } from './data.js';
import { loadState, saveState } from './store/local.js';
import { buildSession, pickSubject, groupByTopic, rotateSubject } from './engine/scheduler.js';
import { pickVariantQuestion } from './engine/backtrack.js';
import { dayKey, toast } from './util.js';
import { renderHome } from './views/home.js';
import { renderChapters } from './views/chapters.js';
import { renderQuiz } from './views/quiz.js';
import { renderLabs } from './views/labs.js';
import { renderMe } from './views/me.js';
import { renderRewards } from './views/rewards.js';
import { renderParent } from './views/parent.js';
import { renderTeacher } from './views/teacher.js';
import { isSiteAuthed, markSiteAuthed, isSiteAccount, decryptSharedKey, loadSharedPack } from './engine/siteauth.js';
import { hasTeacherKey, saveTeacherKey } from './engine/teacher.js';

const app = {
  state: loadState(),
  index: null,
  route: 'home',
  session: null,
  lastSession: null,
  ready: false,

  async init() {
    const view = document.getElementById('view');
    // V2.5 全站口令门：没登录过、且本机没贴过 Key 时，先登录再进站。
    // 已登录过（zkq_auth）或本机已贴 Key（iPad）直接进站，不拦孩子做题。
    if (!isSiteAuthed(localStorage) && !hasTeacherKey(localStorage)) {
      this.renderLoginGate(view);
      return;
    }
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

  /** V2.5 全站口令门：账号 ceshi + 网站密码，解开仓库里的共享 Key 包才能进站。
   * 解开的 Key 存进 zkq_teacher_key（和问老师共用这个键名），登录成功后重新 init 走正常流程。 */
  renderLoginGate(view) {
    view.innerHTML = `
      <section class="card" style="max-width:420px;margin:40px auto;text-align:center">
        <h1 style="font-size:20px;margin-bottom:6px">每日一关 · 初三基础闯关</h1>
        <p class="hint">请输入账号和密码进入。账号和密码由家长发给老师。</p>
        <input class="answer-input" id="site-account" placeholder="账号" autocomplete="username" style="margin-top:16px;text-align:center" />
        <input class="answer-input" id="site-password" type="password" placeholder="密码" autocomplete="current-password" style="margin-top:10px;text-align:center" />
        <button class="btn btn-primary" id="site-login" style="margin-top:12px">进入</button>
        <p class="hint" id="site-login-msg" style="margin-top:10px;min-height:18px"></p>
        <p class="hint" id="site-pack-hint" style="display:none">共享 Key 包还没生成：请先在 iPad 的家长入口 → 共享 Key 里生成，生成后把密文发给管理员放进仓库。</p>
      </section>`;
    const accountEl = view.querySelector('#site-account');
    const pwEl = view.querySelector('#site-password');
    const btn = view.querySelector('#site-login');
    const msg = view.querySelector('#site-login-msg');
    const packHint = view.querySelector('#site-pack-hint');
    const login = async () => {
      if (!isSiteAccount(accountEl.value)) {
        msg.textContent = '账号不对';
        return;
      }
      btn.disabled = true;
      btn.textContent = '正在验证…';
      msg.textContent = '';
      packHint.style.display = 'none';
      try {
        const pack = await loadSharedPack();
        const key = await decryptSharedKey(pack, pwEl.value);
        saveTeacherKey(localStorage, key);
        markSiteAuthed(localStorage, dayKey());
        this.init();
      } catch (e) {
        const m = e?.message || '验证失败';
        if (m === '共享 Key 包还没生成') packHint.style.display = 'block';
        msg.textContent = m === '口令不对或包已损坏' ? '密码不对或共享包有问题' : m;
        btn.disabled = false;
        btn.textContent = '进入';
      }
    };
    btn.onclick = login;
    accountEl.onkeydown = (e) => { if (e.key === 'Enter') pwEl.focus(); };
    pwEl.onkeydown = (e) => { if (e.key === 'Enter') login(); };
    accountEl.focus();
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
      // V2：老师只读查看（粘贴家长分享码，只能看不能改）
      case 'teacher': renderTeacher(this, view); break;
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
    // V2：首页显示的科目和实际开的科目必须是同一个。旧版首页用 pickSubject 取
    // “今天这科”，开局却用 rotateSubject 先轮换到下一科——语文做完首页却显示
    // “数学 · 今天已完成”，就是这么错标的。现在开局也用 pickSubject，只在
    // 用户点“换一关”时才轮换。
    const subject = subjectId
      ? this.index.subjects.find((x) => x.id === subjectId)
      : pickSubject(this.index.subjects, this.state);
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
    // V2：记下本关主攻年级和考点，首页显示“主攻七年级 · 某某考点”
    this.state.focus = { subject: subject.id, grade: session.focusGrade ?? null, topic: session.focusTopicName || '' };
    saveState(this.state);
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
    const byTopic = groupByTopic(d.questions);
    // V2：回炉优先出同考点变式题（背住原题答案是过不了关的），变式题带 variantOf
    // 指向原错题，答对了算到原错题头上；没有变式题时才回落到原题。
    const questions = pending
      .filter((w) => w.subject === subjectId)
      .slice(0, 5)
      .map((w) => {
        const orig = d.questionsById.get(w.questionId);
        if (!orig) return null;
        const variant = pickVariantQuestion({
          topicId: w.topicId,
          questionsByTopic: byTopic,
          excludeIds: [w.questionId],
        });
        return variant ? { ...variant, variantOf: w.questionId } : orig;
      })
      .filter(Boolean);
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

  /** 小测：实验室「看完测一题」、回溯补题 */
  startMiniQuiz({ questions, title, data = null, onDone, returnTo = null }) {
    this.session = {
      questions,
      flashcards: [],
      title,
      mini: true,
      data,
      startedAt: Date.now(),
      onDone,
      // V2：测完回哪里（实验室的测题回 #/labs，不填默认回首页）
      returnTo,
    };
    this.go('quiz');
  },
};

window.app = app;
app.init();
