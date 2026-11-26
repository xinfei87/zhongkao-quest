/**
 * WeduLab 交互实验映射（外部链接，新标签打开，不用 iframe）。
 * 所有 slug 已于 2026-11-26 对 wedulab.com 首页清单核实。
 *
 * V2 匹配规则（修 2026-11-26 飞哥报的错配：直接开平方法被推到勾股定理）：
 * - 每个实验分 primary（主关键词，必须命中才算匹配）和 keys（次要词，只加分）。
 * - 主关键词必须是这个实验独有的、够具体的词；单字泛词（电/力/光/热/圆/字）
 *   和跨考点共用词（平方根/无理数/图像/统计）一律只能当次要词，绝不能单独触发。
 * - 没有任何主关键词命中时返回 null，页面就不显示“动手看演示”按钮，
 *   宁可不推，也不要推错实验。
 * - labForTopic(topic, subjectId)：subjectId 优先，其次用 topic.subject
 *   （loadSubject 会给每个 topic 注入 subject），跨科绝不串台。
 * - V2 第二轮（全量审计后）：匹配文本只用 topic.name + description，
 *   domain（“统计与概率”“图形与几何”）和 chapter（“第二十四章 数据的分析”）
 *   都是大类标签，放进去就是误触发的源头，一律不用。
 *   主关键词再收紧到“实验本身直接讲的东西”（见各条注释）；个别关键词实在
 *   分不清的考点，用 LAB_TOPIC_OVERRIDES 写死（topicId → labId，null = 强制不推）。
 */
export const LABS = [
  { id: 'func', title: '函数图像 · FuncLab', subject: 'math', url: 'https://wedulab.com/labs/func',
    task: '拖动参数，观察图像的开口、平移和交点怎么变——先说出"谁变了、为什么变"再关掉。',
    // V2 第二轮：单独的“函数”二字不触发（“锐角三角函数的定义”不是函数图像课）；
    // “平移”只对函数图象平移有效，图形平移（cnm_072/073/086）见 LAB_TOPIC_OVERRIDES 强制排除。
    primary: ['一次函数', '二次函数', '反比例函数', '函数图像', '函数图象', '平移'],
    keys: ['图像', '函数'] },
  { id: 'pythagoras', title: '勾股定理 · PythagoLab', subject: 'math', url: 'https://wedulab.com/labs/pythagoras',
    task: '拖动直角边，盯住三个正方形的面积关系，确认 a²+b² 始终等于 c²。',
    // V2：主关键词只剩“勾股”，“平方根”“无理数”已移出——
    // 直接开平方法、二次根式的考点描述里都有“平方根”，以前凭这 1 分就误触发。
    // V2 第二轮：“直角三角形”单独不触发（“直角三角形的两个锐角互余”“含 30° 角的
    // 直角三角形”都不是勾股定理课），只剩“勾股”二字。
    primary: ['勾股'],
    keys: ['直角三角形', '平方根', '无理数'] },
  { id: 'geo', title: '立体几何 · GeoSpace', subject: 'math', url: 'https://wedulab.com/labs/geo',
    task: '旋转这个几何体，找出它的面、棱、顶点各有多少，再想想展开图长什么样。',
    // V2：去掉“三角形”“四边形”“圆”“对称”“相似”——这些是平面几何通用词，
    // 以前随便一个三角形考点都会被拉到立体几何。主关键词只留立体几何专属词。
    primary: ['立体几何', '棱柱', '圆锥', '展开图', '几何体', '三视图'],
    keys: ['三角形', '四边形', '表面积', '体积', '视图', '对称', '相似'] },
  { id: 'construct', title: '尺规作图 · ConstructLab', subject: 'math', url: 'https://wedulab.com/labs/construct',
    task: '只用圆规和直尺完成一关作图，注意交点是怎么唯一确定下来的。',
    // V2：去掉“圆”——圆的考点极多，和尺规作图无关。
    // V2 第二轮：“角平分线/垂直平分线”单独不触发（那是性质题，不是作图题），
    // 只有“尺规/作图”本身才能触发；“平移作图”见 LAB_TOPIC_OVERRIDES 强制排除。
    primary: ['尺规', '作图'],
    keys: ['垂直平分线', '角平分线', '圆'] },
  { id: 'chance', title: '运气里的规律 · ChanceLab', subject: 'math', url: 'https://wedulab.com/labs/chance',
    task: '掷 50 次，比较"预测的概率"和"实际的频率"，看它们怎样慢慢靠近。',
    // V2 第二轮：主关键词只留概率专属词。“统计与概率”是 domain 大类标签，
    // 以前 domain 里有“概率”两个字，28 个统计考点（平均数、中位数、扇形图……）
    // 全被拉到概率实验；现在匹配文本不用 domain，统计类词也一律不能触发。
    primary: ['概率', '随机事件', '频率估计'],
    keys: ['随机', '统计', '数据分析', '抽样'] },
  { id: 'wonder', title: '趣味数学 · WonderLab', subject: 'math', url: 'https://wedulab.com/labs/wonder',
    task: '随便玩一个模型，找到里面藏着的数学规律，用一句话说清楚。',
    // V2：“规律”“探究”“综合与实践”几乎每章都有，以前是万能误触发源，
    // 现在只能当次要词；主关键词“趣味数学”在题库里基本不出现，
    // 这个实验只在实验室页手动进，不再自动推荐。
    primary: ['趣味数学'],
    keys: ['规律', '探究', '综合与实践'] },

  { id: 'volt', title: '电学实验台 · VoltLab', subject: 'physics', url: 'https://wedulab.com/labs/volt',
    task: '拖动滑动变阻器，观察电流表与电压表如何同时变化，验证欧姆定律。',
    // V2：去掉单字“电”——“电”出现在一切电学考点描述里，等于没过滤。
    primary: ['欧姆', '电流', '电压', '电阻', '电功率', '串并联', '电路'],
    keys: ['电'] },
  { id: 'machine', title: '简单机械 · MachineLab', subject: 'physics', url: 'https://wedulab.com/labs/machine',
    task: '挪动支点、换用滑轮组，观察"省力"和"费距离"是不是同时发生。',
    // V2 第二轮：“斜面”降为次要词——“速度的测量”描述里提了一句斜面测平均速度，
    // 以前就被拉到简单机械；斜面本身是简单机械没错，但一句话带过不等于这节课。
    primary: ['杠杆', '滑轮', '机械效率'],
    keys: ['斜面', '机械', '功'] },
  { id: 'motion', title: '运动与力 · MotionLab', subject: 'physics', url: 'https://wedulab.com/labs/motion',
    task: '改变拉力与摩擦，观察小车速度曲线，找出"合力为零"时它怎么运动。',
    // V2：去掉“运动”“速度”“力”“平衡”——这些词在速度、质量、密度等
    // 毫不相关的考点里都会出现。
    primary: ['牛顿', '惯性', '摩擦', '平衡力'],
    keys: ['运动', '速度', '力', '平衡', '质量', '密度'] },
  { id: 'sound', title: '声现象 · SoundLab', subject: 'physics', url: 'https://wedulab.com/labs/sound',
    task: '调音调、调响度，看清楚是频率在变还是振幅在变。',
    primary: ['音调', '响度', '音色', '声现象'],
    keys: ['声', '振动', '噪声'] },
  { id: 'optics', title: '光学实验台 · OpticsLab', subject: 'physics', url: 'https://wedulab.com/labs/optics',
    task: '移动蜡烛和光屏，找到清晰实像的位置，记录物距与像距的关系。',
    // V2：去掉单字“光”；“反射”“折射”降为次要词（它们也出现在声、波里）。
    // V2 第二轮：去掉“成像”——“光的直线传播”描述里提了一句小孔成像就被拉过来，
    // 成像本身不是这个实验的专属词；凸透镜/平面镜已经够用了。
    primary: ['凸透镜', '平面镜', '光的反射', '光的折射', '透镜'],
    keys: ['光', '反射', '折射', '成像'] },
  { id: 'float', title: '压强与浮力 · FloatLab', subject: 'physics', url: 'https://wedulab.com/labs/float',
    task: '改变液体密度和物体体积，看浮力怎么变，验证阿基米德原理。',
    primary: ['浮力', '阿基米德', '压强', '大气压'],
    keys: ['液体'] },
  { id: 'heat', title: '传热与物态变化 · HeatLab', subject: 'physics', url: 'https://wedulab.com/labs/heat',
    task: '加热冰块，盯住温度曲线的两个平台，说出它们对应哪两个物态变化。',
    // V2：去掉单字“热”；“温度”“内能”降为次要词。
    primary: ['熔化', '凝固', '汽化', '液化', '比热容', '物态变化'],
    keys: ['热', '温度', '内能', '物态'] },
  { id: 'waves', title: '振动与波 · WaveLab', subject: 'physics', url: 'https://wedulab.com/labs/waves',
    task: '改变频率与振幅，观察波形的疏密和高低分别由谁决定。',
    primary: ['波长', '电磁波'],
    keys: ['波', '振动', '频率'] },
  { id: 'fields', title: '电场与磁场 · FieldLab', subject: 'physics', url: 'https://wedulab.com/labs/fields',
    task: '移动电荷，观察电场线的疏密，说出"疏密"代表什么。',
    primary: ['磁场', '电磁感应', '磁感线'],
    keys: ['电荷'] },
  { id: 'atom', title: '原子结构与光谱 · AtomLab', subject: 'physics', url: 'https://wedulab.com/labs/atom',
    task: '切换元素，观察光谱线，找出"每种元素光谱不同"的证据。',
    primary: ['原子结构', '光谱'],
    keys: ['原子', '核', '微观'] },

  { id: 'periodic', title: '元素周期表 · PeriodicLab', subject: 'chemistry', url: 'https://wedulab.com/labs/periodic',
    task: '沿一个周期横向看、沿一个族纵向看，各说出一个递变规律。',
    primary: ['元素周期表', '元素周期', '相对原子质量'],
    keys: ['元素', '周期', '原子', '化学式'] },
  { id: 'reaction', title: '化学反应 · 微观世界', subject: 'chemistry', url: 'https://wedulab.com/labs/reaction',
    task: '观察反应前后分子怎么拆、怎么重组，数一数原子总数变没变。',
    primary: ['化学方程式', '质量守恒', '化学反应', '配平'],
    keys: ['反应', '化合', '分解', '置换', '复分解'] },
  { id: 'gas', title: '实验室制取气体 · GasLab', subject: 'chemistry', url: 'https://wedulab.com/labs/gas',
    task: '选对发生装置和收集装置，说明你为什么这样选（看反应物状态和气体性质）。',
    // V2 第二轮：“氧气/二氧化碳”单独不触发——“金属与氧气、酸的反应”讲的是金属
    // 性质，不是制取气体；只有“制取”本身才能触发。
    primary: ['实验室制取', '制取氧气', '制取二氧化碳', '气体制备'],
    keys: ['氧气', '二氧化碳', '制取', '收集', '装置'] },
  { id: 'analysis', title: '化学分析实验台 · AnalytLab', subject: 'chemistry', url: 'https://wedulab.com/labs/analysis',
    task: '滴加试剂，观察颜色与沉淀变化，把现象和离子对应起来。',
    primary: ['酸碱', '中和反应', '滴定', 'pH'],
    keys: ['盐', '离子', '检验', '中和'] },
  { id: 'catalyst', title: '催化剂实验室 · CatalystLab', subject: 'chemistry', url: 'https://wedulab.com/labs/catalyst',
    task: '对比加与不加催化剂，注意反应速率变了但最终产量有没有变。',
    primary: ['催化剂', '过氧化氢'],
    keys: ['速率'] },
  { id: 'sulfur', title: '二氧化硫的性质 · SulfurLab', subject: 'chemistry', url: 'https://wedulab.com/labs/sulfur',
    task: '观察二氧化硫通入不同溶液的现象，归纳它的两条化学性质。',
    primary: ['二氧化硫', '酸雨'],
    keys: ['硫', '空气污染'] },
  { id: 'mechanism', title: '反应机理 · 分子动画', subject: 'chemistry', url: 'https://wedulab.com/labs/mechanism',
    task: '慢放一遍，找出旧键断裂和新键生成分别发生在哪一步。',
    primary: ['反应机理'],
    keys: ['机理', '燃烧', '氧化', '还原', '分子'] },

  { id: 'oracle', title: '甲骨文 · OracleLab', subject: 'chinese', url: 'https://wedulab.com/labs/oracle',
    task: '认 3 个甲骨文字形，说出它们"画的是什么、后来怎么变形"的。',
    // V2：去掉单字“字”——一切语文考点描述里都有“字”。
    primary: ['甲骨文', '汉字', '造字'],
    keys: ['字', '字形', '文言', '古诗', '词语'] },
  { id: 'verb', title: '一个动词，五个开关 · VerbLab', subject: 'english', url: 'https://wedulab.com/labs/verb',
    task: '拨动时态、人称、否定等开关，看句子怎么变，总结出规律。',
    // V2 第二轮：单独的“动词/语法”不触发——以前 28 个语法考点几乎全被拉过来。
    // 只有具体时态名才能触发（一般现在时、一般过去时、现在完成时、被动语态等）。
    primary: ['一般现在时', '一般过去时', '现在完成时', '一般将来时', '现在进行时', '过去进行时', '过去完成时', '被动语态'],
    keys: ['时态', '动词', '语法', '句子', 'be'] },
];

export const LABS_BY_SUBJECT = LABS.reduce((acc, l) => {
  (acc[l.subject] ||= []).push(l);
  return acc;
}, {});

/**
 * V2：实验室分级与对口题（2026-11-26 实测结论）。
 * 25 个演示全部外跳 wedulab.com 新标签、1-3 秒加载、全中文、无需登录，没有站内 3D。
 * - recommended：实测最有用、中考直接对口的两个，实验室页置顶并标“中考重点推荐”。
 * - guide：界面难找的实验，给一步指引，别让学生自己摸索。
 * - scopeNote：演示里混了高中章节/超纲内容，写明“只看哪部分、高中部分跳过”。
 * - quizTopics：写死的对口考点 topicId（1-2 个，均已核对题库里有基础题）。
 *   “看完测 1 题”只从这几个考点里出基础题；空数组 = 没有对口题，
 *   按钮文案改成“回站内练相关章节”，不要假装是针对演示的题。
 */
export const LAB_META = {
  // 中考重点推荐：光学第 6 课凸透镜成像（u/v/放大率直接对中考考点）
  optics: { recommended: true, scopeNote: '里面有干涉、衍射、偏振等高中章节，中考只看凸透镜成像部分，跳过干涉/衍射/偏振。', quizTopics: ['cnp_022', 'cnp_020'] },
  // 中考重点推荐：拖滑块看“左加右减”，直接对函数图象平移
  func: { recommended: true, scopeNote: '里面有导数、定积分等高中章节，中考只看函数图像与平移部分，跳过导数和定积分。', quizTopics: ['cnm_204', 'cnm_231'] },
  // 电学贴中考（欧姆定律），但界面太密、开关难找
  volt: { guide: '先切到电路图再合开关 S1，再拖滑片读表——别在实物图里找开关。', quizTopics: ['cnp_071', 'cnp_070'] },
  // 7 章里 6 章是高中内容（活化能、化学平衡），初三只用第 1 章这一点，不推荐深看
  reaction: { scopeNote: '只看第 1 章“有效碰撞”：分子拆开、原子重组、原子个数不变。别碰平衡移动等高中章节。', quizTopics: ['cnk_j009', 'cnk_j017'] },
  pythagoras: { quizTopics: ['cnm_174', 'cnm_176'] },
  geo: { quizTopics: ['cnm_051', 'cnm_283'] },
  construct: { quizTopics: ['cnm_127'] },
  chance: { quizTopics: ['cnm_285', 'cnm_288'] },
  wonder: { quizTopics: [] },
  machine: { quizTopics: ['cnp_049', 'cnp_051'] },
  motion: { quizTopics: ['cnp_032'] },
  sound: { quizTopics: ['cnp_006', 'cnp_005'] },
  float: { quizTopics: ['cnp_041', 'cnp_042'] },
  heat: { quizTopics: ['cnp_011', 'cnp_012'] },
  waves: { quizTopics: ['cnp_087'] },
  fields: { quizTopics: ['cnp_081', 'cnp_082'] },
  atom: { quizTopics: [] },
  periodic: { quizTopics: ['cnk_j011'] },
  gas: { quizTopics: ['cnk_j007', 'cnk_j023'] },
  analysis: { quizTopics: ['cnk_j038', 'cnk_j041'] },
  catalyst: { quizTopics: [] },
  sulfur: { quizTopics: [] },
  mechanism: { quizTopics: [] },
  oracle: { quizTopics: [] },
  verb: { quizTopics: ['cne_j237', 'cne_j174'] },
};

/** 取一个实验的分级与对口题信息（没有就返回空对象） */
export function labMeta(id) {
  return LAB_META[id] || {};
}

/**
 * 显式映射表（V2 全量审计后）：关键词实在分不清的考点，在这里写死。
 * 值是 labId；null = 强制不推任何实验（宁可不推，不要推错）。
 * - cnm_072/073/086 是图形平移（不是函数图象平移），“平移”这个主关键词会误伤它们。
 * - cnm_073 平移作图也不是尺规作图，“作图”这个主关键词会误伤它。
 */
export const LAB_TOPIC_OVERRIDES = {
  cnm_072: null, // 平移的概念与性质（图形平移，不是函数图象平移）
  cnm_073: null, // 平移作图（图形平移作图，不是尺规作图）
  cnm_086: null, // 用坐标表示平移（图形平移，不是函数图象平移）
  // ---- V2 全量审计（2026-11-26）人工过表后加的强制排除 ----
  cnm_192: null, // 四边形中的折叠与动点问题（用勾股定理当工具，不是勾股定理课）
  cnm_251: null, // 垂径定理（证明中用勾股定理，但课本身不是勾股定理）
  cnm_246: null, // 旋转作图（不是尺规作图）
  cnm_291: null, // 综合与实践：建筑中的数学（综合实践，不是立体几何课）
  cnp_029: null, // 力（描述里写“力的单位是牛顿”，不是牛顿定律课）
  cnp_060: null, // 两种电荷（描述里提“摩擦起电”，不是运动与力）
  // VoltLab 只留核心电路/欧姆/电功率课：磁、电热、安全用电、家庭电路、跨学科制作类一律不推
  cnp_069: null, // 制作简易调光台灯
  cnp_076: null, // 为家庭节约用电提建议
  cnp_077: null, // 焦耳定律（电热，不是欧姆定律验证）
  cnp_078: null, // 安全用电
  cnp_079: null, // 家庭电路的基本组成
  cnp_080: null, // 为家庭电路做设计
  cnp_082: null, // 电生磁（磁学，不是电学实验台）
  cnp_083: null, // 电磁铁 电磁继电器
  cnp_084: null, // 电动机
  cnp_086: null, // 磁生电
  cnp_092: null, // 为节约能源设计方案
  cne_j139: null, // if 条件状语从句（从句课，不是时态课）
  cne_j164: null, // unless 表示除非（从句课，不是时态课）
  cnk_j029: null, // 金属与氧气、酸的反应（金属性质，不是分子动画课）
  cnk_j015: null, // 根据化学式的计算（计算题，不是元素周期表课）
};

/**
 * 根据考点文字找最相关的实验。
 * V2：只有命中主关键词（primary）的实验才有资格；次要词只加分、不触发。
 * 一个主关键词都没命中的，返回 null——调用方就不显示“动手看演示”。
 * V2 第二轮：匹配文本只用 name + description，不用 domain 和 chapter（大类标签是误触发源头）。
 * @param {object} topic 考点（含 name/description，可选 subject）
 * @param {string} [subjectId] 科目 id（优先于 topic.subject）
 */
export function labForTopic(topic, subjectId) {
  const m = explainLabMatch(topic, subjectId);
  return m ? m.lab : null;
}

/** 审计用：返回匹配详情 {lab, labId, primaryHits, secondaryHits}，没匹配返回 null */
export function explainLabMatch(topic, subjectId) {
  if (!topic) return null;
  if (Object.prototype.hasOwnProperty.call(LAB_TOPIC_OVERRIDES, topic.id)) {
    const forced = LAB_TOPIC_OVERRIDES[topic.id];
    if (!forced) return null;
    const lab = LABS.find((l) => l.id === forced);
    return lab ? { lab, labId: lab.id, primaryHits: ['显式映射'], secondaryHits: [] } : null;
  }
  const subj = subjectId || topic.subject || '';
  // V2 第二轮：只用考点名 + 描述；domain 和 chapter 是大类标签，不再参与匹配
  const text = `${topic.name || ''} ${topic.description || ''}`;
  let best = null;
  let bestScore = -1;
  let bestPrimary = [];
  let bestSecondary = [];
  for (const lab of LABS) {
    // 科目过滤：科目已知时，跨科实验绝不参与
    if (subj && lab.subject !== subj) continue;
    // 主关键词是门票：一个都没命中，这个实验直接出局
    const primaryHits = (lab.primary || []).filter((k) => text.includes(k));
    if (!primaryHits.length) continue;
    const secondaryHits = (lab.keys || []).filter((k) => text.includes(k));
    const score = primaryHits.length * 2 + secondaryHits.length;
    if (score > bestScore) {
      best = lab;
      bestScore = score;
      bestPrimary = primaryHits;
      bestSecondary = secondaryHits;
    }
  }
  return best
    ? { lab: best, labId: best.id, primaryHits: bestPrimary, secondaryHits: bestSecondary }
    : null;
}
