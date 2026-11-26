/**
 * WeduLab 交互实验映射（外部链接，新标签打开，不用 iframe）。
 * 所有 slug 已于 2026-11-26 对 wedulab.com 首页清单核实。
 */
export const LABS = [
  { id: 'func', title: '函数图像 · FuncLab', subject: 'math', url: 'https://wedulab.com/labs/func',
    task: '拖动参数，观察图像的开口、平移和交点怎么变——先说出"谁变了、为什么变"再关掉。',
    keys: ['函数', '一次函数', '二次函数', '反比例', '图像', '正比例'] },
  { id: 'pythagoras', title: '勾股定理 · PythagoLab', subject: 'math', url: 'https://wedulab.com/labs/pythagoras',
    task: '拖动直角边，盯住三个正方形的面积关系，确认 a²+b² 始终等于 c²。',
    keys: ['勾股', '直角三角形', '平方根', '无理数'] },
  { id: 'geo', title: '立体几何 · GeoSpace', subject: 'math', url: 'https://wedulab.com/labs/geo',
    task: '旋转这个几何体，找出它的面、棱、顶点各有多少，再想想展开图长什么样。',
    keys: ['几何', '三角形', '四边形', '圆', '棱柱', '圆锥', '表面积', '体积', '视图', '对称', '相似'] },
  { id: 'construct', title: '尺规作图 · ConstructLab', subject: 'math', url: 'https://wedulab.com/labs/construct',
    task: '只用圆规和直尺完成一关作图，注意交点是怎么唯一确定下来的。',
    keys: ['尺规', '作图', '垂直平分线', '角平分线', '圆'] },
  { id: 'chance', title: '运气里的规律 · ChanceLab', subject: 'math', url: 'https://wedulab.com/labs/chance',
    task: '掷 50 次，比较"预测的概率"和"实际的频率"，看它们怎样慢慢靠近。',
    keys: ['概率', '随机', '统计', '频率', '数据分析', '抽样'] },
  { id: 'wonder', title: '趣味数学 · WonderLab', subject: 'math', url: 'https://wedulab.com/labs/wonder',
    task: '随便玩一个模型，找到里面藏着的数学规律，用一句话说清楚。',
    keys: ['规律', '探究', '综合与实践'] },

  { id: 'volt', title: '电学实验台 · VoltLab', subject: 'physics', url: 'https://wedulab.com/labs/volt',
    task: '拖动滑动变阻器，观察电流表与电压表如何同时变化，验证欧姆定律。',
    keys: ['电', '电流', '电压', '电阻', '欧姆', '电功率', '电路', '串并联'] },
  { id: 'machine', title: '简单机械 · MachineLab', subject: 'physics', url: 'https://wedulab.com/labs/machine',
    task: '挪动支点、换用滑轮组，观察"省力"和"费距离"是不是同时发生。',
    keys: ['杠杆', '滑轮', '斜面', '机械', '功', '机械效率'] },
  { id: 'motion', title: '运动与力 · MotionLab', subject: 'physics', url: 'https://wedulab.com/labs/motion',
    task: '改变拉力与摩擦，观察小车速度曲线，找出"合力为零"时它怎么运动。',
    keys: ['运动', '速度', '牛顿', '惯性', '力', '平衡', '摩擦', '质量', '密度'] },
  { id: 'sound', title: '声现象 · SoundLab', subject: 'physics', url: 'https://wedulab.com/labs/sound',
    task: '调音调、调响度，看清楚是频率在变还是振幅在变。',
    keys: ['声', '音调', '响度', '音色', '振动', '噪声'] },
  { id: 'optics', title: '光学实验台 · OpticsLab', subject: 'physics', url: 'https://wedulab.com/labs/optics',
    task: '移动蜡烛和光屏，找到清晰实像的位置，记录物距与像距的关系。',
    keys: ['光', '反射', '折射', '透镜', '成像', '平面镜', '凸透镜'] },
  { id: 'float', title: '压强与浮力 · FloatLab', subject: 'physics', url: 'https://wedulab.com/labs/float',
    task: '改变液体密度和物体体积，看浮力怎么变，验证阿基米德原理。',
    keys: ['压强', '浮力', '液体', '阿基米德', '大气压'] },
  { id: 'heat', title: '传热与物态变化 · HeatLab', subject: 'physics', url: 'https://wedulab.com/labs/heat',
    task: '加热冰块，盯住温度曲线的两个平台，说出它们对应哪两个物态变化。',
    keys: ['热', '温度', '内能', '熔化', '凝固', '汽化', '液化', '比热容', '物态'] },
  { id: 'waves', title: '振动与波 · WaveLab', subject: 'physics', url: 'https://wedulab.com/labs/waves',
    task: '改变频率与振幅，观察波形的疏密和高低分别由谁决定。',
    keys: ['波', '振动', '频率', '波长', '电磁波'] },
  { id: 'fields', title: '电场与磁场 · FieldLab', subject: 'physics', url: 'https://wedulab.com/labs/fields',
    task: '移动电荷，观察电场线的疏密，说出"疏密"代表什么。',
    keys: ['磁场', '电磁感应', '电荷', '磁感线'] },
  { id: 'atom', title: '原子结构与光谱 · AtomLab', subject: 'physics', url: 'https://wedulab.com/labs/atom',
    task: '切换元素，观察光谱线，找出"每种元素光谱不同"的证据。',
    keys: ['原子', '核', '光谱', '微观'] },

  { id: 'periodic', title: '元素周期表 · PeriodicLab', subject: 'chemistry', url: 'https://wedulab.com/labs/periodic',
    task: '沿一个周期横向看、沿一个族纵向看，各说出一个递变规律。',
    keys: ['元素', '周期', '原子', '相对原子质量', '化学式'] },
  { id: 'reaction', title: '化学反应 · 微观世界', subject: 'chemistry', url: 'https://wedulab.com/labs/reaction',
    task: '观察反应前后分子怎么拆、怎么重组，数一数原子总数变没变。',
    keys: ['化学方程式', '反应', '质量守恒', '配平', '化合', '分解', '置换', '复分解'] },
  { id: 'gas', title: '实验室制取气体 · GasLab', subject: 'chemistry', url: 'https://wedulab.com/labs/gas',
    task: '选对发生装置和收集装置，说明你为什么这样选（看反应物状态和气体性质）。',
    keys: ['氧气', '二氧化碳', '制取', '收集', '装置', '气体制备'] },
  { id: 'analysis', title: '化学分析实验台 · AnalytLab', subject: 'chemistry', url: 'https://wedulab.com/labs/analysis',
    task: '滴加试剂，观察颜色与沉淀变化，把现象和离子对应起来。',
    keys: ['酸碱', '盐', '离子', '检验', '滴定', 'pH', '中和'] },
  { id: 'catalyst', title: '催化剂实验室 · CatalystLab', subject: 'chemistry', url: 'https://wedulab.com/labs/catalyst',
    task: '对比加与不加催化剂，注意反应速率变了但最终产量有没有变。',
    keys: ['催化剂', '速率', '过氧化氢'] },
  { id: 'sulfur', title: '二氧化硫的性质 · SulfurLab', subject: 'chemistry', url: 'https://wedulab.com/labs/sulfur',
    task: '观察二氧化硫通入不同溶液的现象，归纳它的两条化学性质。',
    keys: ['硫', '二氧化硫', '空气污染', '酸雨'] },
  { id: 'mechanism', title: '反应机理 · 分子动画', subject: 'chemistry', url: 'https://wedulab.com/labs/mechanism',
    task: '慢放一遍，找出旧键断裂和新键生成分别发生在哪一步。',
    keys: ['机理', '燃烧', '氧化', '还原'] },

  { id: 'oracle', title: '甲骨文 · OracleLab', subject: 'chinese', url: 'https://wedulab.com/labs/oracle',
    task: '认 3 个甲骨文字形，说出它们"画的是什么、后来怎么变形"的。',
    keys: ['字', '汉字', '字形', '造字', '文言', '古诗', '词语'] },
  { id: 'verb', title: '一个动词，五个开关 · VerbLab', subject: 'english', url: 'https://wedulab.com/labs/verb',
    task: '拨动时态、人称、否定等开关，看句子怎么变，总结出规律。',
    keys: ['时态', '动词', '语法', '句子', 'be', '一般现在', '一般过去', '现在完成'] },
];

export const LABS_BY_SUBJECT = LABS.reduce((acc, l) => {
  (acc[l.subject] ||= []).push(l);
  return acc;
}, {});

/** 根据考点文字猜最相关的实验 */
export function labForTopic(topic) {
  if (!topic) return null;
  const text = `${topic.name} ${topic.chapter || ''} ${topic.domain || ''} ${topic.description || ''}`;
  let best = null;
  let bestScore = 0;
  for (const lab of LABS) {
    if (lab.subject !== topic.subject && topic.subject) continue;
    const score = lab.keys.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      best = lab;
      bestScore = score;
    }
  }
  return best;
}
