# 实验室匹配审计表（V2）

生成时间：2026-11-26；考点总数 958 个。

## 对照数字

- 旧版匹配（domain+chapter 也参与、单字泛词能触发）：配到实验 646 个考点。
- 新版匹配（只用 name+description、主关键词收紧、显式映射表）：配到实验 114 个考点。
- 删掉的误配：533 个（旧版配到、新版返回 null）。
- 换实验的：9 个（旧版配 A、新版配 B）。
- 保持不变的：104 个。新增配到的：1 个。

## 新版各实验配到的考点数

- func（函数图像 · FuncLab）：22 个
- pythagoras（勾股定理 · PythagoLab）：6 个
- geo（立体几何 · GeoSpace）：4 个
- construct（尺规作图 · ConstructLab）：2 个
- chance（运气里的规律 · ChanceLab）：14 个
- volt（电学实验台 · VoltLab）：13 个
- machine（简单机械 · MachineLab）：4 个
- motion（运动与力 · MotionLab）：3 个
- sound（声现象 · SoundLab）：1 个
- optics（光学实验台 · OpticsLab）：8 个
- float（压强与浮力 · FloatLab）：8 个
- heat（传热与物态变化 · HeatLab）：5 个
- waves（振动与波 · WaveLab）：2 个
- fields（电场与磁场 · FieldLab）：1 个
- periodic（元素周期表 · PeriodicLab）：1 个
- reaction（化学反应 · 微观世界）：3 个
- gas（实验室制取气体 · GasLab）：4 个
- analysis（化学分析实验台 · AnalytLab）：2 个
- verb（一个动词，五个开关 · VerbLab）：11 个

## 全量表（只列配到实验的考点；没配到的返回 null，不占表）

| topicId | 科目 | 考点 | 实验 | 命中的主关键词 | 旧版配到 |
|---|---|---|---|---|---|
| cnk_j007 | chemistry | 制取氧气 | gas | 制取氧气 | gas |
| cnk_j008 | chemistry | 氧气的实验室制取与性质 | gas | 实验室制取、制取氧气 | gas |
| cnk_j011 | chemistry | 元素 | periodic | 元素周期表、元素周期、相对原子质量 | periodic |
| cnk_j017 | chemistry | 质量守恒定律 | reaction | 质量守恒、化学反应 | reaction |
| cnk_j018 | chemistry | 化学方程式的书写 | reaction | 化学方程式、配平 | reaction |
| cnk_j019 | chemistry | 利用化学方程式的简单计算 | reaction | 化学方程式、配平 | reaction |
| cnk_j023 | chemistry | 二氧化碳的实验室制取 | gas | 实验室制取、制取二氧化碳 | gas |
| cnk_j024 | chemistry | 二氧化碳的实验室制取与性质 | gas | 实验室制取、制取二氧化碳 | gas |
| cnk_j038 | chemistry | 溶液的酸碱性 | analysis | 酸碱、pH | analysis |
| cnk_j041 | chemistry | 酸和碱的中和反应 | analysis | 中和反应 | reaction |
| cne_j024 | english | do 与 does | verb | 一般现在时 | verb |
| cne_j068 | english | 现在进行时的构成 | verb | 现在进行时 | verb |
| cne_j070 | english | 读正在发生的事 | verb | 现在进行时 | - |
| cne_j100 | english | 一般过去时叙述假期 | verb | 一般过去时 | verb |
| cne_j159 | english | 过去进行时 | verb | 过去进行时 | verb |
| cne_j174 | english | 现在完成时 | verb | 现在完成时 | verb |
| cne_j252 | english | 一般过去时与现在完成时 | verb | 一般过去时、现在完成时 | verb |
| cne_j205 | english | 一般现在时被动语态 | verb | 一般现在时、被动语态 | verb |
| cne_j209 | english | 一般过去时被动语态 | verb | 一般过去时、被动语态 | verb |
| cne_j254 | english | 一般将来时的被动语态 | verb | 一般将来时、被动语态 | verb |
| cne_j233 | english | 过去完成时 | verb | 过去完成时 | atom |
| cnm_050 | math | 立体图形与平面图形 | geo | 棱柱、圆锥 | geo |
| cnm_051 | math | 从不同方向看与立体图形的展开图 | geo | 展开图 | geo |
| cnm_127 | math | 基本尺规作图：作等角与角平分线 | construct | 尺规、作图 | construct |
| cnm_134 | math | 作线段的垂直平分线 | construct | 尺规 | geo |
| cnm_174 | math | 勾股定理 | pythagoras | 勾股 | pythagoras |
| cnm_175 | math | 勾股定理的证明 | pythagoras | 勾股 | pythagoras |
| cnm_176 | math | 勾股定理的应用 | pythagoras | 勾股 | pythagoras |
| cnm_179 | math | 用勾股定理在数轴上表示无理数 | pythagoras | 勾股 | pythagoras |
| cnm_177 | math | 勾股定理的逆定理 | pythagoras | 勾股 | pythagoras |
| cnm_178 | math | 勾股定理逆定理的应用 | pythagoras | 勾股 | pythagoras |
| cnm_197 | math | 函数的图象 | func | 函数图象 | func |
| cnm_201 | math | 一次函数的概念 | func | 一次函数 | func |
| cnm_202 | math | 一次函数的图象与画法 | func | 一次函数、函数图象 | func |
| cnm_203 | math | 一次函数的性质 | func | 一次函数 | func |
| cnm_204 | math | 一次函数图象的平移 | func | 一次函数、函数图象、平移 | func |
| cnm_205 | math | 待定系数法求一次函数解析式 | func | 一次函数 | func |
| cnm_206 | math | 一次函数与一元一次方程 | func | 一次函数 | func |
| cnm_207 | math | 一次函数与一元一次不等式 | func | 一次函数 | func |
| cnm_208 | math | 一次函数与二元一次方程组 | func | 一次函数、函数图象 | func |
| cnm_209 | math | 实际问题与一次函数 | func | 一次函数 | func |
| cnm_229 | math | 二次函数的概念 | func | 二次函数 | func |
| cnm_231 | math | y=a(x-h)²+k 的图象与平移 | func | 平移 | func |
| cnm_233 | math | 待定系数法求二次函数解析式 | func | 二次函数 | func |
| cnm_234 | math | 二次函数与一元二次方程 | func | 二次函数 | func |
| cnm_235 | math | 二次函数的最值 | func | 二次函数 | func |
| cnm_236 | math | 实际问题与二次函数 | func | 二次函数 | func |
| cnm_237 | math | 反比例函数的概念 | func | 反比例函数 | func |
| cnm_238 | math | 反比例函数的图象与性质 | func | 反比例函数 | func |
| cnm_239 | math | 反比例函数中 k 的几何意义 | func | 反比例函数 | func |
| cnm_240 | math | 待定系数法求反比例函数解析式 | func | 反比例函数 | func |
| cnm_241 | math | 反比例函数与一次函数的综合 | func | 一次函数、反比例函数、函数图象 | func |
| cnm_242 | math | 实际问题与反比例函数 | func | 反比例函数 | func |
| cnm_258 | math | 圆锥的侧面积与全面积 | geo | 圆锥 | geo |
| cnm_283 | math | 三视图及由三视图想象立体图形 | geo | 三视图 | geo |
| cnm_284 | math | 随机事件、必然事件与不可能事件 | chance | 随机事件 | chance |
| cnm_307 | math | 事件发生可能性大小的比较与排序 | chance | 随机事件 | chance |
| cnm_285 | math | 概率的意义与等可能事件的概率 | chance | 概率、随机事件 | chance |
| cnm_308 | math | 概率的取值范围与概率的性质 | chance | 概率、随机事件 | chance |
| cnm_309 | math | 等可能性与古典概型的判断 | chance | 概率 | chance |
| cnm_286 | math | 用列举法求概率 | chance | 概率 | chance |
| cnm_287 | math | 用列表法与树状图求概率 | chance | 概率 | chance |
| cnm_289 | math | 概率的应用与游戏的公平性 | chance | 概率 | chance |
| cnm_311 | math | 三步及以上试验用树状图求概率 | chance | 概率 | chance |
| cnm_313 | math | 概率与统计图表综合问题 | chance | 概率 | chance |
| cnm_288 | math | 用频率估计概率 | chance | 概率、频率估计 | chance |
| cnm_312 | math | 用频率估计合格率、发芽率等实际概率 | chance | 概率、频率估计 | chance |
| cnm_314 | math | 对概率意义的常见误解辨析 | chance | 概率 | chance |
| cnm_315 | math | 综合与实践：用随机试验检验游戏的公平性（补充课题） | chance | 概率 | chance |
| cnp_006 | physics | 声音的特性 | sound | 音调、响度、音色 | sound |
| cnp_011 | physics | 熔化和凝固 | heat | 熔化、凝固 | heat |
| cnp_012 | physics | 汽化和液化 | heat | 汽化、液化 | heat |
| cnp_013 | physics | 升华和凝华 | heat | 物态变化 | heat |
| cnp_014 | physics | 跨学科实践：探索厨房中的物态变化问题 | heat | 物态变化 | heat |
| cnp_016 | physics | 光的反射 | optics | 光的反射 | optics |
| cnp_017 | physics | 平面镜成像 | optics | 平面镜 | optics |
| cnp_018 | physics | 光的折射 | optics | 光的折射 | optics |
| cnp_020 | physics | 透镜 | optics | 凸透镜、透镜 | optics |
| cnp_021 | physics | 生活中的透镜 | optics | 透镜 | optics |
| cnp_022 | physics | 凸透镜成像的规律 | optics | 凸透镜、透镜 | optics |
| cnp_023 | physics | 眼睛和眼镜 | optics | 凸透镜、透镜 | optics |
| cnp_024 | physics | 跨学科实践：制作望远镜 | optics | 凸透镜、透镜 | optics |
| cnp_032 | physics | 牛顿第一定律 | motion | 牛顿、惯性 | motion |
| cnp_033 | physics | 二力平衡 | motion | 平衡力 | motion |
| cnp_034 | physics | 摩擦力 | motion | 摩擦 | motion |
| cnp_036 | physics | 压强 | float | 压强 | motion |
| cnp_037 | physics | 液体的压强 | float | 压强 | motion |
| cnp_038 | physics | 大气压强 | float | 压强、大气压 | float |
| cnp_039 | physics | 跨学科实践：制作简易活塞式抽水机 | float | 大气压 | float |
| cnp_040 | physics | 流体压强与流速的关系 | float | 压强 | motion |
| cnp_041 | physics | 浮力 | float | 浮力 | motion |
| cnp_042 | physics | 阿基米德原理 | float | 浮力、阿基米德 | float |
| cnp_044 | physics | 跨学科实践：制作微型密度计 | float | 浮力 | motion |
| cnp_049 | physics | 杠杆 | machine | 杠杆 | motion |
| cnp_050 | physics | 跨学科实践：制作简易杆秤 | machine | 杠杆 | machine |
| cnp_051 | physics | 滑轮 | machine | 滑轮 | machine |
| cnp_052 | physics | 机械效率 | machine | 机械效率 | machine |
| cnp_053 | physics | 热量 比热容 | heat | 比热容 | heat |
| cnp_061 | physics | 电流和电路 | volt | 电流、电路 | volt |
| cnp_062 | physics | 串联电路和并联电路 | volt | 电路 | volt |
| cnp_063 | physics | 电流的测量 | volt | 电流、电路 | volt |
| cnp_064 | physics | 串、并联电路中电流的规律 | volt | 电流、电路 | volt |
| cnp_065 | physics | 电压 | volt | 电流、电压、电路 | volt |
| cnp_066 | physics | 串、并联电路中电压的规律 | volt | 电压、电路 | volt |
| cnp_067 | physics | 电阻 | volt | 欧姆、电流、电压、电阻 | volt |
| cnp_068 | physics | 变阻器 | volt | 电阻、电路 | volt |
| cnp_070 | physics | 电流与电压、电阻的关系 | volt | 电流、电压、电阻 | volt |
| cnp_071 | physics | 欧姆定律 | volt | 欧姆、电流、电压、电阻 | volt |
| cnp_072 | physics | 电阻的测量 | volt | 电流、电压、电阻、电路 | volt |
| cnp_073 | physics | 欧姆定律在串、并联电路中的应用 | volt | 欧姆、电流、电压、电阻、电路 | volt |
| cnp_075 | physics | 电功率 | volt | 电流、电压、电功率 | volt |
| cnp_081 | physics | 磁现象 磁场 | fields | 磁场、磁感线 | fields |
| cnp_087 | physics | 电磁波的海洋 | waves | 波长、电磁波 | waves |
| cnp_088 | physics | 广播、电视和移动通信 | waves | 电磁波 | waves |

## 删掉的误配（旧版配到、新版 null，共 533 个）

- cnb_001 细胞是生命活动的基本单位（biology）：旧版 → machine
- cnb_003 动植物细胞的结构与功能（biology）：旧版 → machine
- cnb_005 细胞的分裂与生长（biology）：旧版 → geo
- cnb_008 植物对水和无机盐的吸收（biology）：旧版 → analysis
- cnb_009 光合作用（biology）：旧版 → optics
- cnb_010 呼吸作用（biology）：旧版 → reaction
- cnb_016 人体的呼吸（biology）：旧版 → motion
- cnb_017 血液的组成与功能（biology）：旧版 → machine
- cnb_020 神经调节（biology）：旧版 → optics
- cnb_024 人的性别决定与遗传规律（biology）：旧版 → wonder
- cnb_028 生态系统（biology）：旧版 → motion
- cnk_j001 化学使世界变得更加绚丽多彩（chemistry）：旧版 → wonder
- cnk_j003 科学探究（chemistry）：旧版 → wonder
- cnk_j004 化学实验基本操作（chemistry）：旧版 → wonder
- cnk_j005 我们周围的空气（chemistry）：旧版 → geo
- cnk_j006 氧气（chemistry）：旧版 → mechanism
- cnk_j009 分子和原子（chemistry）：旧版 → motion
- cnk_j010 原子结构（chemistry）：旧版 → atom
- cnk_j013 水的组成（chemistry）：旧版 → geo
- cnk_j014 化学式与化合价（chemistry）：旧版 → periodic
- cnk_j015 根据化学式的计算（chemistry）：旧版 → periodic
- cnk_j016 水的组成及变化的探究（chemistry）：旧版 → geo
- cnk_j020 碳单质的多样性（chemistry）：旧版 → periodic
- cnk_j021 二氧化碳的性质（chemistry）：旧版 → mechanism
- cnk_j022 一氧化碳（chemistry）：旧版 → mechanism
- cnk_j025 燃料的燃烧（chemistry）：旧版 → heat
- cnk_j026 化石能源的合理利用（chemistry）：旧版 → mechanism
- cnk_j027 燃烧条件的探究（chemistry）：旧版 → wonder
- cnk_j028 金属材料（chemistry）：旧版 → volt
- cnk_j029 金属与氧气、酸的反应（chemistry）：旧版 → reaction
- cnk_j030 金属活动性顺序（chemistry）：旧版 → reaction
- cnk_j031 金属资源的利用和保护（chemistry）：旧版 → reaction
- cnk_j032 常见金属的物理性质和化学性质（chemistry）：旧版 → wonder
- cnk_j034 溶解度（chemistry）：旧版 → motion
- cnk_j035 溶质的质量分数（chemistry）：旧版 → motion
- cnk_j036 一定溶质质量分数的氯化钠溶液的配制（chemistry）：旧版 → wonder
- cnk_j037 粗盐中难溶性杂质的去除（chemistry）：旧版 → wonder
- cnk_j039 常见的酸（chemistry）：旧版 → reaction
- cnk_j040 常见的碱（chemistry）：旧版 → reaction
- cnk_j042 常见的盐（chemistry）：旧版 → analysis
- cnk_j043 常见酸、碱的化学性质（chemistry）：旧版 → wonder
- cnk_j044 化学与人体健康（chemistry）：旧版 → periodic
- cnc_j004 古代诗歌四首（chinese）：旧版 → oracle
- cnc_j005 写作：学会观察（chinese）：旧版 → heat
- cnc_j008 《世说新语》二则（chinese）：旧版 → oracle
- cnc_j013 《论语》十二章（chinese）：旧版 → oracle
- cnc_j016 课外古诗词四首（上）（chinese）：旧版 → oracle
- cnc_j019 《梅岭三章》（chinese）：旧版 → oracle
- cnc_j020 文言文《诫子书》（chinese）：旧版 → oracle
- cnc_j023 人与动物三篇（chinese）：旧版 → waves
- cnc_j024 文言文《狼》（chinese）：旧版 → oracle
- cnc_j029 课外古诗词四首（下）（chinese）：旧版 → oracle
- cnc_j032 阅读《列夫·托尔斯泰》（chinese）：旧版 → optics
- cnc_j033 文言文《孙权劝学》（chinese）：旧版 → optics
- cnc_j035 黄河颂与土地的誓言（chinese）：旧版 → optics
- cnc_j037 古诗《木兰诗》（chinese）：旧版 → oracle
- cnc_j039 专题：我的语文生活（chinese）：旧版 → oracle
- cnc_j042 文言文《卖油翁》（chinese）：旧版 → oracle
- cnc_j045 课外古诗词四首（上）（chinese）：旧版 → oracle
- cnc_j046 驿路梨花与青春之光（chinese）：旧版 → optics
- cnc_j048 陋室铭与爱莲说（chinese）：旧版 → oracle
- cnc_j053 古代诗歌五首（chinese）：旧版 → oracle
- cnc_j054 句子：语言要简明（chinese）：旧版 → verb
- cnc_j058 文言文《活板》（chinese）：旧版 → oracle
- cnc_j059 课外古诗词四首（下）（chinese）：旧版 → oracle
- cnc_j060 消息二则（chinese）：旧版 → wonder
- cnc_j061 新闻阅读五则（chinese）：旧版 → wonder
- cnc_j062 新闻采访（chinese）：旧版 → wonder
- cnc_j063 新闻写作（chinese）：旧版 → wonder
- cnc_j064 阅读《藤野先生》（chinese）：旧版 → volt
- cnc_j069 文言文《三峡》（chinese）：旧版 → oracle
- cnc_j070 短文二篇（chinese）：旧版 → oracle
- cnc_j071 文言文《与朱元思书》（chinese）：旧版 → oracle
- cnc_j072 唐诗五首（chinese）：旧版 → oracle
- cnc_j074 专题：人无信不立（chinese）：旧版 → atom
- cnc_j075 课外古诗词四首（上）（chinese）：旧版 → oracle
- cnc_j080 写作：语言要连贯（chinese）：旧版 → verb
- cnc_j085 写作：说明事物要抓住特征（chinese）：旧版 → oracle
- cnc_j087 文言文《孟子》三章（chinese）：旧版 → oracle
- cnc_j088 文言文《愚公移山》（chinese）：旧版 → oracle
- cnc_j089 文言文《周亚夫军细柳》（chinese）：旧版 → oracle
- cnc_j090 诗词五首（chinese）：旧版 → oracle
- cnc_j091 写作：表达要得体（chinese）：旧版 → verb
- cnc_j092 课外古诗词四首（下）（chinese）：旧版 → oracle
- cnc_j095 阅读《安塞腰鼓》（chinese）：旧版 → motion
- cnc_j098 阅读《大自然的语言》（chinese）：旧版 → optics
- cnc_j099 阿西莫夫短文两篇（chinese）：旧版 → motion
- cnc_j100 阅读《月亮是从哪里来的》（chinese）：旧版 → optics
- cnc_j101 阅读《时间的脚印》（chinese）：旧版 → optics
- cnc_j102 写作：说明的顺序（chinese）：旧版 → optics
- cnc_j103 专题：绿水青山，低碳生活（chinese）：旧版 → optics
- cnc_j104 文言文《桃花源记》（chinese）：旧版 → oracle
- cnc_j105 文言文《小石潭记》（chinese）：旧版 → oracle
- cnc_j106 文言文《核舟记》（chinese）：旧版 → atom
- cnc_j107 古诗《诗经》二首（chinese）：旧版 → oracle
- cnc_j110 课外古诗词四首（上）（chinese）：旧版 → oracle
- cnc_j111 阅读《最后一次讲演》（chinese）：旧版 → wonder
- cnc_j112 阅读《敬业与乐业》（chinese）：旧版 → wonder
- cnc_j113 格物致知与重要抉择（chinese）：旧版 → wonder
- cnc_j114 演讲稿与演讲比赛（chinese）：旧版 → wonder
- cnc_j120 文言文《庄子》二则（chinese）：旧版 → oracle
- cnc_j121 文言文《礼记》二则（chinese）：旧版 → oracle
- cnc_j122 文言文《马说》（chinese）：旧版 → oracle
- cnc_j123 唐诗三首（chinese）：旧版 → oracle
- cnc_j124 写作：负责任地表达（chinese）：旧版 → atom
- cnc_j126 课外古诗词四首（下）（chinese）：旧版 → oracle
- cnc_j127 词《沁园春·雪》（chinese）：旧版 → wonder
- cnc_j128 现代诗五首（chinese）：旧版 → wonder
- cnc_j129 诗歌朗诵（chinese）：旧版 → wonder
- cnc_j130 写作：尝试创作（chinese）：旧版 → wonder
- cnc_j133 阅读雨果的信（chinese）：旧版 → geo
- cnc_j136 专题：我们的数字时代（chinese）：旧版 → atom
- cnc_j137 文言文《岳阳楼记》（chinese）：旧版 → oracle
- cnc_j138 文言文《醉翁亭记》（chinese）：旧版 → oracle
- cnc_j139 文言文《湖心亭看雪》（chinese）：旧版 → oracle
- cnc_j140 诗词三首（chinese）：旧版 → oracle
- cnc_j142 课外古诗词四首（上）（chinese）：旧版 → oracle
- cnc_j144 阅读《我的叔叔于勒》（chinese）：旧版 → sound
- cnc_j146 写作：学写小小说（chinese）：旧版 → waves
- cnc_j148 讲话：培养建设者和接班人（chinese）：旧版 → machine
- cnc_j149 驳论《中国人失掉自信力了吗》（chinese）：旧版 → motion
- cnc_j150 议论两篇：骨气与创造（chinese）：旧版 → motion
- cnc_j151 词语的褒贬（chinese）：旧版 → motion
- cnc_j152 写作：论证要合理（chinese）：旧版 → motion
- cnc_j153 专题：君子自强不息（chinese）：旧版 → motion
- cnc_j154 文言文《曹刿论战》（chinese）：旧版 → oracle
- cnc_j155 文言文《邹忌讽齐王纳谏》（chinese）：旧版 → oracle
- cnc_j156 文言文《陈涉世家》（chinese）：旧版 → oracle
- cnc_j157 文言文《出师表》（chinese）：旧版 → oracle
- cnc_j158 诗词曲五首（chinese）：旧版 → oracle
- cnc_j159 写作：学会深入思考（chinese）：旧版 → atom
- cnc_j161 课外古诗词四首（下）（chinese）：旧版 → oracle
- cnc_j170 专题：岁月如歌（chinese）：旧版 → optics
- cnc_j171 文言文《鱼我所欲也》（chinese）：旧版 → oracle
- cnc_j172 文言文《唐雎不辱使命》（chinese）：旧版 → oracle
- cnc_j173 文言文《送东阳马生序》（chinese）：旧版 → oracle
- cnc_j174 通假字与易错字（chinese）：旧版 → oracle
- cnc_j175 词四首（chinese）：旧版 → oracle
- cnc_j178 课外古诗词四首（上）（chinese）：旧版 → waves
- cnc_j179 短文两篇：谈读书（chinese）：旧版 → oracle
- cnc_j180 阅读《山水画的意境》（chinese）：旧版 → motion
- cnc_j181 鉴赏两篇：无言与想象（chinese）：旧版 → optics
- cnc_j182 写作：修改润色（chinese）：旧版 → oracle
- cnc_j184 话剧《屈原》（节选）（chinese）：旧版 → volt
- cnc_j188 写作：有创意地表达（chinese）：旧版 → atom
- cnc_j189 课外古诗词四首（下）（chinese）：旧版 → oracle
- cne_j001 单词重音（english）：旧版 → atom
- cne_j002 句末升降调（english）：旧版 → atom
- cne_j005 问候与自我介绍（english）：旧版 → oracle
- cne_j018 房间与家具（english）：旧版 → verb
- cne_j008 指示代词 this、that、these、those（english）：旧版 → verb
- cne_j009 名词复数（english）：旧版 → verb
- cne_j010 词尾 s 的读音（english）：旧版 → verb
- cne_j004 be 动词 am、is、are（english）：旧版 → verb
- cne_j014 形容词性物主代词（english）：旧版 → verb
- cne_j015 be 动词一般疑问句（english）：旧版 → verb
- cne_j246 名词所有格 's（english）：旧版 → verb
- cne_j080 描述外貌（english）：旧版 → verb
- cne_j076 There be 句型（english）：旧版 → verb
- cne_j019 方位介词（english）：旧版 → verb
- cne_j098 辅音与元音连读（english）：旧版 → atom
- cne_j029 like 的句型（english）：旧版 → verb
- cne_j041 because 说明原因（english）：旧版 → verb
- cne_j107 不完全爆破（english）：旧版 → atom
- cne_j045 情态动词 can（english）：旧版 → verb
- cne_j022 球类运动（english）：旧版 → motion
- cne_j023 have 与 has（english）：旧版 → verb
- cne_j025 谈论社团运动（english）：旧版 → motion
- cne_j049 时刻表达（english）：旧版 → oracle
- cne_j053 交通方式（english）：旧版 → atom
- cne_j054 How 问交通（english）：旧版 → atom
- cne_j055 谈论怎么上学（english）：旧版 → atom
- cne_j056 读上学方式（english）：旧版 → atom
- cne_j037 When 问日期（english）：旧版 → verb
- cne_j033 How much 问价格（english）：旧版 → verb
- cne_j063 Why 与 because（english）：旧版 → verb
- cne_j064 描述性形容词（english）：旧版 → verb
- cne_j058 祈使句（english）：旧版 → verb
- cne_j059 must 与 have to（english）：旧版 → verb
- cne_j103 运动习惯（english）：旧版 → motion
- cne_j247 名词性物主代词（english）：旧版 → verb
- cne_j050 频度副词（english）：旧版 → chance
- cne_j104 How often 问频率（english）：旧版 → chance
- cne_j105 谈论锻炼频率（english）：旧版 → chance
- cne_j106 读锻炼调查（english）：旧版 → motion
- cne_j028 可数与不可数名词（english）：旧版 → verb
- cne_j248 选择疑问句（english）：旧版 → verb
- cne_j084 would like（english）：旧版 → verb
- cne_j069 询问正在做什么（english）：旧版 → volt
- cne_j087 旅行活动（english）：旧版 → verb
- cne_j088 was 与 were（english）：旧版 → verb
- cne_j089 规则动词过去式（english）：旧版 → verb
- cne_j090 过去式 ed 的读音（english）：旧版 → verb
- cne_j091 谈论一次旅行（english）：旧版 → verb
- cne_j092 读旅行日记（english）：旧版 → verb
- cne_j093 周末活动（english）：旧版 → atom
- cne_j094 Did 提问（english）：旧版 → verb
- cne_j095 不规则动词过去式（english）：旧版 → verb
- cne_j096 谈论上周末（english）：旧版 → atom
- cne_j097 读周末日记（english）：旧版 → atom
- cne_j099 假期地点（english）：旧版 → verb
- cne_j249 不定代词 something 与 anything（english）：旧版 → verb
- cne_j151 could 表示请求（english）：旧版 → verb
- cne_j109 形容词比较级（english）：旧版 → verb
- cne_j110 用 than 比较（english）：旧版 → verb
- cne_j250 as ... as 同级比较（english）：旧版 → verb
- cne_j113 城镇设施（english）：旧版 → atom
- cne_j114 形容词最高级（english）：旧版 → verb
- cne_j115 谈论最好的地方（english）：旧版 → atom
- cne_j116 读影院介绍（english）：旧版 → atom
- cne_j072 感叹句（english）：旧版 → verb
- cne_j130 顺序词 first、next、then（english）：旧版 → verb
- cne_j122 be going to 表示打算（english）：旧版 → verb
- cne_j118 不定式作宾语（english）：旧版 → verb
- cne_j126 will 表示将来（english）：旧版 → verb
- cne_j138 建议用词（english）：旧版 → atom
- cne_j139 if 条件状语从句（english）：旧版 → verb
- cne_j141 读聚会建议（english）：旧版 → atom
- cne_j133 聚会活动（english）：旧版 → atom
- cne_j134 用 can 发出邀请（english）：旧版 → verb
- cne_j135 接受或拒绝邀请（english）：旧版 → atom
- cne_j136 读邀请函（english）：旧版 → atom
- cne_j117 电视节目（english）：旧版 → volt
- cne_j147 不定式表示目的（english）：旧版 → verb
- cne_j119 谈论想看的节目（english）：旧版 → atom
- cne_j120 读节目选择（english）：旧版 → atom
- cne_j143 should 表示建议（english）：旧版 → verb
- cne_j251 反身代词（english）：旧版 → verb
- cne_j154 情绪与压力（english）：旧版 → motion
- cne_j155 although 引导让步（english）：旧版 → verb
- cne_j165 so that 表示目的（english）：旧版 → verb
- cne_j156 用 Why don't you 提建议（english）：旧版 → atom
- cne_j157 读建议信（english）：旧版 → atom
- cne_j169 比较级与最高级的选用（english）：旧版 → verb
- cne_j172 选词补全短文（english）：旧版 → atom
- cne_j160 when 与 while（english）：旧版 → verb
- cne_j164 unless 表示除非（english）：旧版 → verb
- cne_j225 be supposed to（english）：旧版 → verb
- cne_j175 already 与 yet（english）：旧版 → verb
- cne_j178 场馆经历（english）：旧版 → atom
- cne_j179 ever 与 never（english）：旧版 → verb
- cne_j180 been 与 gone（english）：旧版 → verb
- cne_j181 询问去过哪里（english）：旧版 → atom
- cne_j182 读场馆经历（english）：旧版 → atom
- cne_j183 旧物与回忆（english）：旧版 → atom
- cne_j184 for 与 since（english）：旧版 → verb
- cne_j185 谈论拥有多久（english）：旧版 → atom
- cne_j186 读旧物故事（english）：旧版 → atom
- cne_j201 used to 表示过去习惯（english）：旧版 → verb
- cne_j253 It is ... (for sb) to do（english）：旧版 → verb
- cne_j188 by 加动名词（english）：旧版 → verb
- cne_j192 that 引导宾语从句（english）：旧版 → verb
- cne_j193 if 与 whether 宾语从句（english）：旧版 → verb
- cne_j196 公共场所（english）：旧版 → atom
- cne_j197 疑问词宾语从句（english）：旧版 → verb
- cne_j198 礼貌问路（english）：旧版 → atom
- cne_j199 读问路对话（english）：旧版 → atom
- cne_j204 材料（english）：旧版 → atom
- cne_j206 询问由什么制成（english）：旧版 → atom
- cne_j207 读产品介绍（english）：旧版 → atom
- cne_j221 定语从句（english）：旧版 → verb
- cne_j256 主谓一致（english）：旧版 → verb
- cne_j191 节日食物（english）：旧版 → atom
- cne_j194 谈论节日（english）：旧版 → atom
- cne_j195 读中秋短文（english）：旧版 → atom
- cne_j212 青少年规则（english）：旧版 → atom
- cne_j213 be allowed to（english）：旧版 → verb
- cne_j214 讨论是否允许（english）：旧版 → atom
- cne_j215 读规则意见（english）：旧版 → atom
- cne_j216 物品主人（english）：旧版 → atom
- cne_j217 must 表示推测（english）：旧版 → atom
- cne_j218 推测物品归属（english）：旧版 → atom
- cne_j219 读推测短文（english）：旧版 → atom
- cne_j228 情绪反应（english）：旧版 → atom
- cne_j229 make 加宾语加动词原形（english）：旧版 → verb
- cne_j230 表达电影感受（english）：旧版 → volt
- cne_j231 读观后感（english）：旧版 → volt
- cne_j232 意外事件（english）：旧版 → atom
- cne_j234 叙述意外经过（english）：旧版 → atom
- cne_j235 读意外故事（english）：旧版 → atom
- cne_j236 环境保护（english）：旧版 → atom
- cne_j237 时态选择（english）：旧版 → verb
- cne_j238 谈论环保做法（english）：旧版 → atom
- cne_j239 读环保倡议（english）：旧版 → atom
- cne_j240 完形填空（english）：旧版 → atom
- cne_j241 毕业回忆（english）：旧版 → atom
- cne_j242 动名词与不定式（english）：旧版 → verb
- cne_j243 反意疑问句（english）：旧版 → atom
- cne_j244 回忆学校生活（english）：旧版 → atom
- cne_j245 书面表达要点（english）：旧版 → verb
- cnm_007 绝对值的概念与几何意义（math）：旧版 → geo
- cnm_020 乘方的运算与符号规律（math）：旧版 → wonder
- cnm_023 近似数与有效数字（math）：旧版 → oracle
- cnm_024 进位制的认识与探究（math）：旧版 → wonder
- cnm_025 用字母表示数（math）：旧版 → oracle
- cnm_026 代数式的概念与书写规范（math）：旧版 → oracle
- cnm_027 列代数式（math）：旧版 → oracle
- cnm_030 用代数式表示规律（math）：旧版 → wonder
- cnm_029 代数式的值（math）：旧版 → oracle
- cnm_031 单项式（math）：旧版 → oracle
- cnm_033 同类项（math）：旧版 → oracle
- cnm_034 合并同类项（math）：旧版 → oracle
- cnm_037 整式化简求值（math）：旧版 → oracle
- cnm_038 整式加减的应用（math）：旧版 → geo
- cnm_045 列一元一次方程解应用题的步骤（math）：旧版 → analysis
- cnm_047 行程问题（相遇与追及）（math）：旧版 → motion
- cnm_052 点、线、面、体（math）：旧版 → geo
- cnm_053 直线、射线、线段（math）：旧版 → geo
- cnm_054 直线与线段的基本事实（math）：旧版 → geo
- cnm_055 线段的比较与运算（math）：旧版 → geo
- cnm_056 角的概念与表示（math）：旧版 → geo
- cnm_057 度、分、秒及其换算（math）：旧版 → geo
- cnm_058 角的比较与运算（含角平分线）（math）：旧版 → geo
- cnm_059 余角和补角（math）：旧版 → geo
- cnm_060 同角（等角）的余角、补角相等（math）：旧版 → geo
- cnm_061 综合与实践：设计学校田径运动会比赛场地（math）：旧版 → geo
- cnm_062 邻补角（math）：旧版 → geo
- cnm_063 对顶角及其性质（math）：旧版 → geo
- cnm_064 垂线（math）：旧版 → geo
- cnm_065 垂线段最短与点到直线的距离（math）：旧版 → geo
- cnm_066 同位角、内错角、同旁内角（math）：旧版 → geo
- cnm_067 平行线与平行公理（math）：旧版 → geo
- cnm_068 平行线的判定（math）：旧版 → geo
- cnm_069 平行线的性质（math）：旧版 → geo
- cnm_070 平行线判定与性质的综合应用（math）：旧版 → geo
- cnm_071 定义、命题与定理（math）：旧版 → geo
- cnm_072 平移的概念与性质（math）：旧版 → geo
- cnm_073 平移作图（math）：旧版 → geo
- cnm_074 平方根与算术平方根（math）：旧版 → pythagoras
- cnm_075 开平方与平方根的求法（math）：旧版 → pythagoras
- cnm_077 无理数（math）：旧版 → pythagoras
- cnm_078 实数的分类与数轴表示（math）：旧版 → pythagoras
- cnm_079 算术平方根的估值与大小比较（math）：旧版 → pythagoras
- cnm_081 有序数对（math）：旧版 → geo
- cnm_082 平面直角坐标系与点的坐标（math）：旧版 → geo
- cnm_083 象限与坐标轴上点的坐标特征（math）：旧版 → geo
- cnm_084 用坐标描述简单几何图形（math）：旧版 → geo
- cnm_085 用坐标表示地理位置（math）：旧版 → geo
- cnm_086 用坐标表示平移（math）：旧版 → geo
- cnm_091 列二元一次方程组解应用题（math）：旧版 → analysis
- cnm_101 综合与实践：低碳生活（math）：旧版 → wonder
- cnm_300 统计活动的基本过程（math）：旧版 → chance
- cnm_102 全面调查与抽样调查（math）：旧版 → chance
- cnm_292 数据收集的方法：问卷调查、实验与查阅资料（math）：旧版 → chance
- cnm_103 总体、个体、样本与样本容量（math）：旧版 → chance
- cnm_104 样本的代表性与随机抽样（math）：旧版 → chance
- cnm_298 简单随机抽样的实施（抽签法与随机数）（math）：旧版 → chance
- cnm_299 用样本百分比估计总体数量（math）：旧版 → chance
- cnm_105 扇形图、条形图与折线图（math）：旧版 → chance
- cnm_293 数据的分类整理与划记法、统计表（math）：旧版 → chance
- cnm_294 条形图与折线图的绘制（math）：旧版 → chance
- cnm_295 扇形图的绘制：百分比与圆心角的换算（math）：旧版 → chance
- cnm_296 统计图的误导与偏差辨识（math）：旧版 → chance
- cnm_106 频数分布表与数据分组（math）：旧版 → chance
- cnm_107 频数分布直方图（math）：旧版 → chance
- cnm_297 频率（相对频数）的计算与意义（math）：旧版 → chance
- cnm_301 频数分布直方图的读图与分析（math）：旧版 → chance
- cnm_108 趋势图（math）：旧版 → chance
- cnm_109 综合与实践：日昼时长规律的探究（math）：旧版 → wonder
- cnm_110 三角形的概念与分类（math）：旧版 → geo
- cnm_111 三角形三边关系（math）：旧版 → geo
- cnm_112 三角形的高（math）：旧版 → geo
- cnm_113 三角形的中线（math）：旧版 → geo
- cnm_114 三角形的角平分线（math）：旧版 → geo
- cnm_115 三角形内角和定理（math）：旧版 → geo
- cnm_116 直角三角形的两个锐角互余（math）：旧版 → geo
- cnm_117 三角形的外角及其性质（math）：旧版 → geo
- cnm_118 几何证明的基本格式（math）：旧版 → geo
- cnm_119 综合与实践：确定匀质薄板的重心位置（math）：旧版 → wonder
- cnm_120 全等图形与全等三角形（math）：旧版 → geo
- cnm_121 全等三角形的性质（math）：旧版 → geo
- cnm_122 全等判定：边边边（SSS）（math）：旧版 → geo
- cnm_123 全等判定：边角边（SAS）（math）：旧版 → geo
- cnm_124 全等判定：角边角（ASA）与角角边（AAS）（math）：旧版 → geo
- cnm_125 全等判定：斜边、直角边（HL）（math）：旧版 → geo
- cnm_126 综合运用全等判定与规范书写（math）：旧版 → geo
- cnm_128 角平分线的性质（math）：旧版 → geo
- cnm_129 角平分线的判定（math）：旧版 → geo
- cnm_130 全等三角形的常见辅助线与模型（math）：旧版 → geo
- cnm_131 轴对称图形与两个图形成轴对称（math）：旧版 → geo
- cnm_132 轴对称的性质（math）：旧版 → geo
- cnm_133 线段垂直平分线的性质与判定（math）：旧版 → geo
- cnm_135 画轴对称图形（math）：旧版 → geo
- cnm_136 坐标系中的轴对称（math）：旧版 → geo
- cnm_137 等腰三角形的性质（math）：旧版 → geo
- cnm_138 等腰三角形的判定（math）：旧版 → geo
- cnm_139 等边三角形的性质与判定（math）：旧版 → geo
- cnm_140 含 30° 角的直角三角形的性质（math）：旧版 → geo
- cnm_141 综合与实践：最短路径问题（math）：旧版 → geo
- cnm_144 单项式乘单项式（math）：旧版 → oracle
- cnm_150 因式分解的概念（math）：旧版 → reaction
- cnm_155 因式分解的应用（math）：旧版 → reaction
- cnm_151 提公因式法（math）：旧版 → reaction
- cnm_152 公式法：平方差（math）：旧版 → reaction
- cnm_153 公式法：完全平方（math）：旧版 → reaction
- cnm_154 综合运用因式分解（math）：旧版 → reaction
- cnm_156 分式的概念（math）：旧版 → oracle
- cnm_158 分式的约分与最简分式（math）：旧版 → reaction
- cnm_165 分式方程的解法与增根（math）：旧版 → analysis
- cnm_166 分式方程的应用（math）：旧版 → analysis
- cnm_180 多边形及其对角线（math）：旧版 → geo
- cnm_181 多边形的内角和（math）：旧版 → geo
- cnm_182 多边形的外角和（math）：旧版 → geo
- cnm_183 平行四边形的性质（math）：旧版 → geo
- cnm_184 平行四边形的判定（math）：旧版 → geo
- cnm_185 三角形的中位线（math）：旧版 → geo
- cnm_186 矩形的性质（math）：旧版 → geo
- cnm_187 直角三角形斜边上的中线（math）：旧版 → geo
- cnm_188 矩形的判定（math）：旧版 → geo
- cnm_189 菱形的性质（math）：旧版 → geo
- cnm_190 菱形的判定（math）：旧版 → geo
- cnm_191 正方形的性质与判定（math）：旧版 → geo
- cnm_192 四边形中的折叠与动点问题（math）：旧版 → geo
- cnm_193 变量与常量（math）：旧版 → func
- cnm_194 函数的概念（math）：旧版 → func
- cnm_195 自变量的取值范围（math）：旧版 → func
- cnm_196 函数值（math）：旧版 → func
- cnm_198 函数的三种表示方法（math）：旧版 → func
- cnm_199 用函数刻画实际变化规律（math）：旧版 → func
- cnm_200 正比例函数（math）：旧版 → func
- cnm_210 综合与实践：音乐与数学（math）：旧版 → func
- cnm_211 平均数（math）：旧版 → chance
- cnm_212 加权平均数（math）：旧版 → chance
- cnm_213 中位数与众数（math）：旧版 → chance
- cnm_214 集中趋势统计量的选择（math）：旧版 → chance
- cnm_302 用样本平均数估计总体平均数（math）：旧版 → chance
- cnm_303 极端值对平均数与中位数的影响（math）：旧版 → chance
- cnm_215 极差、方差与标准差（math）：旧版 → chance
- cnm_304 用方差比较两组数据的稳定性（math）：旧版 → chance
- cnm_306 用样本方差估计总体的稳定性（math）：旧版 → chance
- cnm_216 数据的四分位数（math）：旧版 → chance
- cnm_305 箱线图的读取与比较（math）：旧版 → chance
- cnm_217 数据的分组与由分组数据估计平均数（math）：旧版 → chance
- cnm_218 综合与实践：学生体质健康调查与分析（math）：旧版 → chance
- cnm_220 直接开平方法（math）：旧版 → pythagoras
- cnm_224 因式分解法（math）：旧版 → reaction
- cnm_225 一元二次方程解法的选择（math）：旧版 → reaction
- cnm_227 增长率与传播问题（math）：旧版 → analysis
- cnm_230 y=ax² 的图象与性质（math）：旧版 → func
- cnm_232 y=ax²+bx+c 的图象与性质（math）：旧版 → func
- cnm_243 综合与实践：高铁列车运行中的数量关系（math）：旧版 → wonder
- cnm_244 图形的旋转（math）：旧版 → geo
- cnm_245 旋转的性质（math）：旧版 → geo
- cnm_246 旋转作图（math）：旧版 → geo
- cnm_247 旋转变换在证明与计算中的应用（math）：旧版 → geo
- cnm_248 中心对称与中心对称图形（math）：旧版 → geo
- cnm_249 关于原点对称的点的坐标（math）：旧版 → geo
- cnm_250 圆的有关概念（math）：旧版 → geo
- cnm_251 垂径定理（math）：旧版 → geo
- cnm_252 弧、弦、圆心角的关系（math）：旧版 → geo
- cnm_253 圆周角定理（math）：旧版 → geo
- cnm_254 直径所对的圆周角（math）：旧版 → geo
- cnm_255 圆内接四边形（math）：旧版 → geo
- cnm_256 弧长（math）：旧版 → geo
- cnm_257 扇形面积（math）：旧版 → geo
- cnm_259 点与圆的位置关系（math）：旧版 → geo
- cnm_260 直线与圆的位置关系（math）：旧版 → geo
- cnm_261 切线的判定（math）：旧版 → geo
- cnm_262 切线的性质（math）：旧版 → geo
- cnm_263 切线长定理（math）：旧版 → geo
- cnm_264 三角形的内切圆（math）：旧版 → geo
- cnm_265 三角形的外接圆（math）：旧版 → geo
- cnm_266 正多边形与圆（math）：旧版 → geo
- cnm_267 综合与实践：生活中的优化问题（math）：旧版 → func
- cnm_268 成比例线段（math）：旧版 → geo
- cnm_269 平行线分线段成比例（math）：旧版 → geo
- cnm_270 相似多边形（math）：旧版 → geo
- cnm_271 相似三角形的判定（math）：旧版 → geo
- cnm_272 相似三角形的性质（math）：旧版 → geo
- cnm_273 相似三角形的基本模型（math）：旧版 → geo
- cnm_274 相似三角形的实际应用（math）：旧版 → geo
- cnm_275 位似（math）：旧版 → geo
- cnm_276 锐角三角函数的定义（math）：旧版 → geo
- cnm_277 特殊角的三角函数值与计算（math）：旧版 → func
- cnm_278 解直角三角形（math）：旧版 → geo
- cnm_279 仰角、俯角与方向角问题（math）：旧版 → geo
- cnm_280 坡度与坡角问题（math）：旧版 → func
- cnm_290 综合与实践：停车设计问题（math）：旧版 → pythagoras
- cnm_281 平行投影与中心投影（math）：旧版 → geo
- cnm_282 正投影（math）：旧版 → geo
- cnm_291 综合与实践：建筑中的数学（math）：旧版 → geo
- cnm_310 放回与不放回摸球问题的区分（math）：旧版 → chance
- cnp_001 长度和时间的测量（physics）：旧版 → machine
- cnp_002 运动的描述（physics）：旧版 → machine
- cnp_003 运动的快慢（physics）：旧版 → motion
- cnp_004 速度的测量（physics）：旧版 → machine
- cnp_005 声音的产生与传播（physics）：旧版 → sound
- cnp_007 声的利用（physics）：旧版 → motion
- cnp_008 噪声的危害和控制（physics）：旧版 → sound
- cnp_009 跨学科实践：制作隔音房间模型（physics）：旧版 → sound
- cnp_010 温度（physics）：旧版 → heat
- cnp_015 光的直线传播（physics）：旧版 → optics
- cnp_019 光的色散（physics）：旧版 → motion
- cnp_025 质量（physics）：旧版 → motion
- cnp_026 密度（physics）：旧版 → motion
- cnp_027 测量液体和固体的密度（physics）：旧版 → motion
- cnp_028 密度的应用（physics）：旧版 → motion
- cnp_029 力（physics）：旧版 → motion
- cnp_030 弹力（physics）：旧版 → motion
- cnp_031 重力（physics）：旧版 → motion
- cnp_035 同一直线上二力的合成（physics）：旧版 → motion
- cnp_043 物体的浮沉条件及应用（physics）：旧版 → motion
- cnp_045 功（physics）：旧版 → machine
- cnp_046 功率（physics）：旧版 → machine
- cnp_047 动能和势能（physics）：旧版 → motion
- cnp_048 机械能及其转化（physics）：旧版 → machine
- cnp_054 分子动理论的初步知识（physics）：旧版 → motion
- cnp_055 内能（physics）：旧版 → heat
- cnp_056 能量的转化与守恒（physics）：旧版 → heat
- cnp_057 热机（physics）：旧版 → machine
- cnp_058 热机的效率（physics）：旧版 → heat
- cnp_059 跨学科实践：制作简易热机模型（physics）：旧版 → heat
- cnp_060 两种电荷（physics）：旧版 → volt
- cnp_069 跨学科实践：制作简易调光台灯（physics）：旧版 → volt
- cnp_074 电能 电功（physics）：旧版 → volt
- cnp_076 跨学科实践：为家庭节约用电提建议（physics）：旧版 → volt
- cnp_077 焦耳定律（physics）：旧版 → volt
- cnp_078 安全用电（physics）：旧版 → volt
- cnp_079 家庭电路的基本组成（physics）：旧版 → volt
- cnp_080 跨学科实践：为家庭电路做设计（physics）：旧版 → volt
- cnp_082 电生磁（physics）：旧版 → volt
- cnp_083 电磁铁 电磁继电器（physics）：旧版 → volt
- cnp_084 电动机（physics）：旧版 → volt
- cnp_085 跨学科实践：制作简易直流电动机（physics）：旧版 → volt
- cnp_086 磁生电（physics）：旧版 → volt
- cnp_089 卫星通信和光纤通信（physics）：旧版 → optics
- cnp_091 新能源的发展（physics）：旧版 → volt
- cnp_092 跨学科实践：为节约能源设计方案（physics）：旧版 → volt
- cns_010 社会主义核心价值观与社会公德（society）：旧版 → atom
- cns_014 宋元时期的经济与文化（society）：旧版 → oracle
- cns_016 鸦片战争与近代中国的开端（society）：旧版 → motion
- cns_017 辛亥革命与民国初年（society）：旧版 → motion
- cns_021 地球与地图基础（society）：旧版 → motion

## 换实验的（共 9 个）

- cnk_j041 酸和碱的中和反应（chemistry）：reaction → analysis
- cne_j233 过去完成时（english）：atom → verb
- cnm_134 作线段的垂直平分线（math）：geo → construct
- cnp_036 压强（physics）：motion → float
- cnp_037 液体的压强（physics）：motion → float
- cnp_040 流体压强与流速的关系（physics）：motion → float
- cnp_041 浮力（physics）：motion → float
- cnp_044 跨学科实践：制作微型密度计（physics）：motion → float
- cnp_049 杠杆（physics）：motion → machine