import type { ChapterNode, KnowledgeNode, MasteryState, QuestionEntry, SubjectWiki, TypeDifficulty, TypeGroup } from "@/types/study-wall";

type RawQuestion = {
  id: string;
  num: string;
  page: number;
  title: string;
  prompt: string;
  knowledgePoint: string;
  mastery?: MasteryState;
};

function buildQuestion(question: RawQuestion): QuestionEntry {
  const figureHint = question.prompt.includes("图见教材");

  return {
    id: question.id,
    title: question.title,
    year: question.num,
    source: `郑君里做题本·PDF第${question.page}页`,
    knowledgePoint: question.knowledgePoint,
    prompt: question.prompt,
    note: figureHint
      ? "本题涉及配图，图形与细部标注请以原 PDF / 教材对应页为准。"
      : "若需核对完整公式与排版，请以原 PDF / 教材对应页为准。",
    strategy: figureHint
      ? [
          "先按题干定位教材配图，再判断关键坐标、区间和折点。",
          "若题目涉及图解或波形草图，先写支撑区间，再回到图形细节。",
          "本页内容以题意索引为主，正式作答时请对照原 PDF 图形。",
        ]
      : [
          "先明确题目考查的章节方法，再处理公式、运算次序和边界条件。",
          "若需核对完整公式排版，请回到原 PDF 对照关键符号。",
          "建议先做结构化判断，再落具体计算。",
        ],
    mastery: question.mastery ?? "unknown",
  };
}

function buildTypeGroup(
  meta: {
    id: string;
    name: string;
    description: string;
    difficulty: TypeDifficulty;
    years: string;
    knowledgePoints: string[];
  },
  questions: RawQuestion[],
): TypeGroup {
  return {
    ...meta,
    questionCount: questions.length,
    questions: questions.map(buildQuestion),
  };
}

const chapter1KnowledgeNodes: KnowledgeNode[] = [
  { id: "ss-ch1-signal-classification", name: "信号分类与基本概念", summary: "连续/离散/数字信号判别，周期、基本概念与时域描述。" },
  { id: "ss-ch1-time-transform", name: "时域变换与运算次序", summary: "时移、时缩、反折与复合自变量的操作次序。" },
  { id: "ss-ch1-basic-waveform", name: "波形绘制与典型信号", summary: "由函数式、阶跃式或题图反推并绘制信号波形。" },
  { id: "ss-ch1-step-impulse", name: "阶跃、冲激与奇偶分解", summary: "阶跃/冲激运算、直流分量、奇偶分量与图解。" },
  { id: "ss-ch1-system-property", name: "系统性质与框图", summary: "系统线性、时不变、可逆、LTI 响应与仿真框图。" },
];

const chapter2KnowledgeNodes: KnowledgeNode[] = [
  { id: "ss-ch2-diff-model", name: "微分方程建模", summary: "电路、机械系统与等效模型的微分方程表示。" },
  { id: "ss-ch2-response-decompose", name: "零输入零状态与完全响应", summary: "齐次解、强迫解、跳变判定与完全响应分解。" },
  { id: "ss-ch2-impulse-step-response", name: "冲激响应与阶跃响应", summary: "由微分方程、已知响应或输入输出关系反求 h(t)、g(t)。" },
  { id: "ss-ch2-convolution", name: "卷积运算与图解", summary: "连续时间卷积的解析、图解、性质与工程应用。" },
  { id: "ss-ch2-system-representation", name: "杜阿美积分与系统表示", summary: "LTI 系统时域表示、算子表示与模块级近似模拟。" },
];

const chapter3KnowledgeNodes: KnowledgeNode[] = [
  { id: "ss-ch3-fourier-series", name: "周期信号傅里叶级数", summary: "矩形波、三角波、锯齿波等周期信号的三角形式与指数形式展开。" },
  { id: "ss-ch3-spectrum-analysis", name: "频谱与谐波分析", summary: "谱线间隔、带宽、基波与高次谐波幅度的定量或定性分析。" },
  { id: "ss-ch3-filter-select", name: "频率选择与滤波应用", summary: "结合 RC、LC、RLC 电路讨论周期信号频率分量的提取与响应。" },
  { id: "ss-ch3-fourier-transform", name: "非周期信号傅里叶变换", summary: "脉冲、调幅波与典型非周期信号的傅里叶变换及带宽判断。" },
  { id: "ss-ch3-transform-property", name: "变换性质与逆变换", summary: "时移、对称性、分解性质以及逆变换求解。" },
];

const chapter4KnowledgeNodes: KnowledgeNode[] = [
  { id: "ss-ch4-basic-laplace", name: "拉普拉斯变换与反变换", summary: "典型函数、部分分式、初值终值以及周期信号的拉氏变换与逆变换。" },
  { id: "ss-ch4-circuit-response", name: "开关电路与暂态响应", summary: "RC、RL、RLC 与互感电路在开关闭合或断开后的零输入、零状态与完全响应。" },
  { id: "ss-ch4-system-function", name: "系统函数与冲激响应", summary: "从电路结构出发求系统函数、冲激响应及其输入输出关系。" },
  { id: "ss-ch4-dependent-source", name: "受控源与复杂网络分析", summary: "受控源网络、多端口与耦合电路的 s 域建模与系统函数求解。" },
  { id: "ss-ch4-periodic-splane", name: "周期信号与 s 平面理解", summary: "周期信号拉氏变换、抽样信号以及极点分布和时域波形的对应关系。" },
];

const chapter5KnowledgeNodes: KnowledgeNode[] = [
  { id: "ss-ch5-ideal-filter", name: "理想滤波器与频域响应", summary: "理想低通、带通与相位特性对应的时域响应与物理可实现性判断。" },
  { id: "ss-ch5-time-frequency-system", name: "时频域系统分析", summary: "由幅频相频特性、时延模块和系统结构反推输出信号或系统函数。" },
  { id: "ss-ch5-ssb-hilbert", name: "单边带与希尔伯特变换", summary: "单边带信号构造、解析信号以及希尔伯特变换的证明与应用。" },
];

const chapter6KnowledgeNodes: KnowledgeNode[] = [
  { id: "ss-ch6-orthogonal-basis", name: "正交函数集与勒让德展开", summary: "正交性、规范化、完备性以及用勒让德多项式展开信号。" },
  { id: "ss-ch6-least-square", name: "最小均方逼近", summary: "在给定区间内用低阶多项式逼近函数并最小化均方误差。" },
  { id: "ss-ch6-walsh-haar", name: "Walsh / Haar 基函数", summary: "Walsh、Haar 与相关正交基函数的三角定义、波形和展开问题。" },
  { id: "ss-ch6-energy-correlation", name: "能量与相关分析", summary: "信号正交性、能量叠加、自相关与互相关及 CDMA 码组判定。" },
];

const chapter1Questions: RawQuestion[] = [
  {
    id: "ss-zj-1-1",
    num: "1.1",
    page: 3,
    title: "题 1.1：信号类型判断（题图）",
    knowledgePoint: "信号分类与基本概念",
    prompt: "分别判断题图 1-1 所示各波形是连续时间信号还是离散时间信号，若是离散时间信号是否为数字信号？图见教材（原 PDF 第3页）。",
  },
  {
    id: "ss-zj-1-2",
    num: "1.2",
    page: 4,
    title: "题 1.2：函数式信号分类判断",
    knowledgePoint: "信号分类与基本概念",
    prompt: `分别判断下列各函数式属于何种信号？（重复 1.1 题所问）

(1) $e^{-at}\\sin(\\omega t)$；
(2) $e^{-nT}$；
(3) $\\cos(n\\pi)$；
(4) $\\sin(n\\omega_0)$（$\\omega_0$ 为任意值）；
(5) $\\left(\\dfrac{1}{2}\\right)^n$。

以上各式中 $n$ 为正整数。`,
  },
  {
    id: "ss-zj-1-3",
    num: "1.3",
    page: 5,
    title: "题 1.3：周期求解",
    knowledgePoint: "信号分类与基本概念",
    prompt: `分别求下列各周期信号的周期 $T$：

(1) $\\cos(10t)-\\cos(30t)$；
(2) $e^{j10t}$；
(3) $[5\\sin(8t)]^2$；
(4) $\\displaystyle\\sum_{n=0}^{\\infty}(-1)^n\\left[u(t-nT)-u(t-nT-T)\\right]$（$n$ 为正整数）。`,
  },
  {
    id: "ss-zj-1-4",
    num: "1.4",
    page: 6,
    title: "题 1.4：复合时域变换顺序讨论",
    knowledgePoint: "时域变换与运算次序",
    prompt: "对于教材例 1-1 所示的信号，由 $f(t)$ 求 $f(-3t-2)$，但改变运算顺序，先求 $f(3t)$ 或先求 $f(-t)$，讨论所得结果是否与原例的结果一致。",
  },
  { id: "ss-zj-1-5", num: "1.5", page: 7, title: "题 1.5：$f(t_0-at)$ 运算次序判断", knowledgePoint: "时域变换与运算次序", prompt: `已知 $f(t)$，为求 $f(t_0-at)$ 应按下列哪种运算求得正确结果（式中 $t_0,a$ 都为正值）？\n\n(1) $f(-at)$ 左移 $t_0$；\n(2) $f(at)$ 右移 $t_0$；\n(3) $f(at)$ 左移 $t_0/a$；\n(4) $f(-at)$ 右移 $t_0/a$。` },
  { id: "ss-zj-1-6", num: "1.6", page: 8, title: "题 1.6：典型信号波形绘制（一）", knowledgePoint: "波形绘制与典型信号", prompt: `绘出下列各信号的波形：\n\n(1) $\\left[1+\\dfrac{1}{2}\\sin(\\Omega t)\\right]\\sin(8\\Omega t)$；\n(2) $[1+\\sin(\\Omega t)]\\sin(8\\Omega t)$。` },
  { id: "ss-zj-1-7", num: "1.7", page: 9, title: "题 1.7：典型信号波形绘制（二）", knowledgePoint: "波形绘制与典型信号", prompt: `绘出下列各信号的波形：\n\n(1) $[u(t)-u(t-T)]\\sin\\left(\\dfrac{4\\pi}{T}t\\right)$；\n(2) $[u(t)-2u(t-T)+u(t-2T)]\\sin\\left(\\dfrac{4\\pi}{T}t\\right)$。` },
  { id: "ss-zj-1-8", num: "1.8", page: 10, title: "题 1.8：波形表达式改写为阶跃形式", knowledgePoint: "波形绘制与典型信号", prompt: "试将教材中描述图 1-15 波形的表达式(1-16) 和(1-17) 改用阶跃信号表示。" },
  { id: "ss-zj-1-9", num: "1.9", page: 11, title: "题 1.9：由函数式粗略绘图", knowledgePoint: "波形绘制与典型信号", prompt: `粗略绘出下列各函数式的波形图：\n\n(1) $f(t)=(2-e^{-t})u(t)$；\n(2) $f(t)=(3e^{-t}+6e^{-2t})u(t)$；\n(3) $f(t)=(5e^{-t}-5e^{-3t})u(t)$；\n(4) $f(t)=e^{-t}\\cos(10\\pi t)[u(t-1)-u(t-2)]$。` },
  { id: "ss-zj-1-10", num: "1.10", page: 12, title: "题 1.10：由题图写出函数式", knowledgePoint: "波形绘制与典型信号", prompt: "写出题图 1-10(a)、(b)、(c) 所示各波形的函数式。图见教材（原 PDF 第12页）。" },
  { id: "ss-zj-1-11", num: "1.11", page: 13, title: "题 1.11：时间函数波形图（一）", knowledgePoint: "波形绘制与典型信号", prompt: `绘出下列各时间函数的波形图：\n\n(1) $te^{-t}u(t)$；\n(2) $e^{-(t-1)}[u(t-1)-u(t-2)]$；\n(3) $[1+\\cos(\\pi t)][u(t)-u(t-2)]$；\n(4) $u(t)-2u(t-1)+u(t-2)$；\n(5) $\\dfrac{\\sin[a(t-t_0)]}{a(t-t_0)}$；\n(6) $\\dfrac{d}{dt}[e^{-t}\\sin tu(t)]$。` },
  { id: "ss-zj-1-12", num: "1.12", page: 14, title: "题 1.12：时间函数波形图（二）", knowledgePoint: "波形绘制与典型信号", prompt: `绘出下列各时间函数的波形图，注意它们的区别：\n\n(1) $t[u(t)-u(t-1)]$；\n(2) $t\\cdot u(t-1)$；\n(3) $t[u(t)-u(t-1)]+u(t-1)$；\n(4) $(t-1)u(t-1)$。` },
  { id: "ss-zj-1-13", num: "1.13", page: 16, title: "题 1.13：时间函数波形图（三）", knowledgePoint: "波形绘制与典型信号", prompt: `绘出下列各时间函数的波形图，注意它们的区别：\n\n(1) $f_1(t)=\\sin(\\omega t)\\cdot u(t)$；\n(2) $f_2(t)=\\sin[\\omega(t-t_0)]\\cdot u(t)$。` },
  { id: "ss-zj-1-14", num: "1.14", page: 18, title: "题 1.14：冲激抽样性质求值", knowledgePoint: "阶跃、冲激与奇偶分解", prompt: `应用冲激信号的抽样特性求下列表达式的函数值：\n\n(1) $\\int_{-\\infty}^{\\infty}f(t-t_0)\\delta(t)dt$；\n(2) $\\int_{-\\infty}^{\\infty}f(t_0-t)\\delta(t)dt$；\n(3) $\\int_{-\\infty}^{\\infty}\\delta(t-t_0)u\\left(t-\\dfrac{t_0}{2}\\right)dt$；\n(4) $\\int_{-\\infty}^{\\infty}\\delta(t-t_0)u(t-2t_0)dt$。` },
  { id: "ss-zj-1-15", num: "1.15", page: 20, title: "题 1.15：阶跃电压激励下的串联电容", knowledgePoint: "阶跃、冲激与奇偶分解", prompt: "电容 $C_1$ 与 $C_2$ 串联，以阶跃电压源 $v(t)=Eu(t)$ 串联接入，试分别写出回路中的电流 $i(t)$、每个电容两端电压 $v_{C1}(t)$、$v_{C2}(t)$ 的表示式。" },
  { id: "ss-zj-1-16", num: "1.16", page: 21, title: "题 1.16：阶跃电流激励下的并联电感", knowledgePoint: "阶跃、冲激与奇偶分解", prompt: "电感 $L_1$ 与 $L_2$ 并联，以阶跃电流源 $i(t)=Iu(t)$ 并联接入，试分别写出电感两端电压 $v(t)$、每个电感支路电流 $i_{L1}(t)$、$i_{L2}(t)$ 的表示式。" },
  { id: "ss-zj-1-17", num: "1.17", page: 22, title: "题 1.17：波形直流分量判断", knowledgePoint: "阶跃、冲激与奇偶分解", prompt: `分别指出下列各波形的直流分量等于多少？\n\n(1) 全波整流 $f(t)=|\\sin(\\omega t)|$；\n(2) $f(t)=\\sin^2(\\omega t)$。` },
  { id: "ss-zj-1-18", num: "1.18", page: 24, title: "题 1.18：偶分量与奇分量图解", knowledgePoint: "阶跃、冲激与奇偶分解", prompt: "粗略绘出题图 1-18 所示各波形的偶分量和奇分量。图见教材（原 PDF 第24页）。" },
  { id: "ss-zj-1-19", num: "1.19", page: 25, title: "题 1.19：系统仿真框图绘制", knowledgePoint: "系统性质与框图", prompt: `绘出下列系统的仿真框图：\n\n(1) $\\dfrac{d}{dt}r(t)+a_0r(t)=b_0e(t)+b_1\\dfrac{d}{dt}e(t)$；\n(2) $\\dfrac{d^2}{dt^2}r(t)+a_1\\dfrac{d}{dt}r(t)+a_0r(t)=b_0e(t)+b_1\\dfrac{d}{dt}e(t)$。` },
  { id: "ss-zj-1-20", num: "1.20", page: 26, title: "题 1.20：线性、时不变、因果性判断", knowledgePoint: "系统性质与框图", prompt: `判断下列系统是否为线性的、时不变的、因果的？\n\n(1) $r(t)=\\dfrac{de(t)}{dt}$；\n(2) $r(t)=e(t)u(t)$；\n(3) $r(t)=\\sin[e(t)]u(t)$；\n(4) $r(t)=e(1-t)$。` },
  { id: "ss-zj-1-21", num: "1.21", page: 28, title: "题 1.21：系统可逆性判断", knowledgePoint: "系统性质与框图", prompt: `判断下列系统是否是可逆的。若可逆，给出它的逆系统；若不可逆，指出使该系统产生相同输出的两个输入信号。\n\n(1) $r(t)=e(t-5)$；\n(2) $r(t)=\\dfrac{d}{dt}e(t)$。` },
  { id: "ss-zj-1-22", num: "1.22", page: 30, title: "题 1.22：按输出频率成分设计系统", knowledgePoint: "系统性质与框图", prompt: `若输入信号为 $\\cos(\\omega_0 t)$，为使输出信号中分别包含以下频率成分：\n\n(1) $\\cos(2\\omega_0 t)$；\n(2) $\\cos(3\\omega_0 t)$；\n(3) 直流。\n\n请你分别设计相应的系统（尽可能简单）满足此要求，给出系统输出与输入的约束关系式。讨论这三种要求有何共性，相应的系统有何共同性。` },
  { id: "ss-zj-1-23", num: "1.23", page: 31, title: "题 1.23：由已知 LTI 响应反求冲激响应", knowledgePoint: "系统性质与框图", prompt: "有一线性时不变系统，当激励 $e_1(t)=u(t)$ 时，响应 $r_1(t)=e^{-at}u(t)$，试求当激励 $e_2(t)=\\delta(t)$ 时，响应 $r_2(t)$ 的表示式（假定起始时刻系统无储能）。" },
  { id: "ss-zj-1-24", num: "1.24", page: 32, title: "题 1.24：冲激函数尺度特性证明", knowledgePoint: "系统性质与框图", prompt: "证明 $\\delta$ 函数的尺度运算特性满足 $\\delta(at)=\\dfrac{1}{|a|}\\delta(t)$。（提示：利用题图 1-24，当以 $t$ 为自变量时脉冲底宽为 $\\tau$，而改以 $at$ 为自变量时底宽变成 $\\tau/a$，借此关系以及偶函数特性即可求出以上结果。）图见教材（原 PDF 第32页）。" },
];

const chapter2Questions: RawQuestion[] = [
  { id: "ss-zj-2-1", num: "2.1", page: 33, title: "题 2.1：电路微分方程列写", knowledgePoint: "微分方程建模", prompt: "对题图 2-1 所示电路图分别列写求电压 $v_o(t)$ 的微分方程表示。图见教材（原 PDF 第33页）。" },
  { id: "ss-zj-2-2", num: "2.2", page: 34, title: "题 2.2：火箭推进器模型建模", knowledgePoint: "微分方程建模", prompt: "题图 2-2 所示为理想火箭推动器模型。火箭质量为 $m_1$，荷载舱质量为 $m_2$，两者中间用刚度系数为 $k$ 的弹簧相连接。火箭和荷载舱各自受到摩擦力的作用，摩擦系数分别为 $f_1$ 和 $f_2$。求火箭推进力 $e(t)$ 与荷载舱运动速度 $v_2(t)$ 之间的微分方程表示。图见教材（原 PDF 第34页）。" },
  { id: "ss-zj-2-3", num: "2.3", page: 35, title: "题 2.3：汽车底盘缓冲装置建模", knowledgePoint: "微分方程建模", prompt: "题图 2-3 是汽车底盘缓冲装置模型图，汽车底盘的高度 $z(t)=y(t)+y_0$，其中 $y_0$ 是弹簧不受任何力时的位置。缓冲器等效为弹簧与减震器并联组成，刚度系数和阻尼系数分别为 $k$ 和 $f$。由于路面的凹凸不平（表示为 $x(t)$ 的起伏）通过缓冲器间接作用到汽车底盘，使汽车震动减弱。求汽车底盘的位移量 $y(t)$ 和路面不平度 $x(t)$ 之间的微分方程。图见教材（原 PDF 第35页）。" },
  { id: "ss-zj-2-4", num: "2.4", page: 36, title: "题 2.4：零输入响应求解", knowledgePoint: "零输入零状态与完全响应", prompt: "已知系统相应的齐次方程及其对应的 $0_+$ 状态条件，求系统的零输入响应。\n\n(1) $\\dfrac{d^2}{dt^2}r(t)+2\\dfrac{d}{dt}r(t)+2r(t)=0$，给定：$r(0_+)=1$，$r'(0_+)=2$；\n(2) $\\dfrac{d^2}{dt^2}r(t)+2\\dfrac{d}{dt}r(t)+r(t)=0$，给定：$r(0_+)=1$，$r'(0_+)=2$；\n(3) $\\dfrac{d^3}{dt^3}r(t)+2\\dfrac{d^2}{dt^2}r(t)+\\dfrac{d}{dt}r(t)=0$，给定：$r(0_+)=r'(0_+)=0$，$r''(0_+)=1$。" },
  { id: "ss-zj-2-5", num: "2.5", page: 37, title: "题 2.5：起始点跳变判断", knowledgePoint: "零输入零状态与完全响应", prompt: "给定系统微分方程、起始状态以及激励信号分别为以下两种情况：\n\n(1) $\\dfrac{d}{dt}r(t)+2r(t)=e(t)$，$r(0_-)=0$，$e(t)=u(t)$；\n(2) $\\dfrac{d}{dt}r(t)+2r(t)=3\\dfrac{d}{dt}e(t)$，$r(0_-)=0$，$e(t)=u(t)$。\n\n试判断在起始点是否发生跳变，据此对 (1)(2) 分别写出其 $r(0_+)$ 值。" },
  { id: "ss-zj-2-6", num: "2.6", page: 38, title: "题 2.6：完全响应及分量分解", knowledgePoint: "零输入零状态与完全响应", prompt: "给定系统微分方程 $\\dfrac{d^2}{dt^2}r(t)+3\\dfrac{d}{dt}r(t)+2r(t)=\\dfrac{d}{dt}e(t)+3e(t)$。若激励信号和起始状态为 $e(t)=u(t)$，$r(0_-)=1$，$r'(0_-)=2$，试求它的完全响应，并指出其零输入响应、零状态响应、自由响应、强迫响应各分量。提示：将 $e(t)$ 代入方程后可见右端最高阶次奇异函数为 $\\delta(t)$，故左端最高阶次也为 $\\delta(t)$，因而 $r(t)$ 项无跳变，而 $r'(t)$ 项跳变值应为 1，由此导出 $r(0_+)$ 和 $r'(0_+)$。" },
  { id: "ss-zj-2-7", num: "2.7", page: 39, title: "题 2.7：开关电路完全响应", knowledgePoint: "零输入零状态与完全响应", prompt: "电路如题图 2-7 所示，$t=0$ 以前开关位于“1”，已进入稳态，$t=0$ 时刻，$S_1$ 与 $S_2$ 同时自“1”转至“2”，求输出电压 $v_o(t)$ 的完全响应，并指出其零输入、零状态、自由、强迫各响应分量（$E$ 和 $I_S$ 均为常量）。图见教材（原 PDF 第39页）。" },
  { id: "ss-zj-2-8", num: "2.8", page: 40, title: "题 2.8：开关切换与物理量连续性", knowledgePoint: "零输入零状态与完全响应", prompt: "题图 2-8 所示电路，$t<0$ 时，开关位于“1”且已达到稳态，$t=0$ 时刻，开关自“1”转至“2”。\n\n(1) 试从物理概念判断 $i(0_-)$、$i'(0_-)$ 和 $i(0_+)$、$i'(0_+)$。\n(2) 写出 $t\\geq 0_+$ 时间内描述系统的微分方程表示，求 $i(t)$ 的完全响应。图见教材（原 PDF 第40页）。" },
  { id: "ss-zj-2-9", num: "2.9", page: 41, title: "题 2.9：由微分方程求冲激与阶跃响应", knowledgePoint: "冲激响应与阶跃响应", prompt: `求下列微分方程描述的系统冲激响应 $h(t)$ 和阶跃响应 $g(t)$。\n\n(1) $\\dfrac{d}{dt}r(t)+3r(t)=2\\dfrac{d}{dt}e(t)$；\n(2) $\\dfrac{d^2}{dt^2}r(t)+\\dfrac{d}{dt}r(t)+r(t)=\\dfrac{d}{dt}e(t)+e(t)$；\n(3) $\\dfrac{d}{dt}r(t)+2r(t)=\\dfrac{d^2}{dt^2}e(t)+3\\dfrac{d}{dt}e(t)+3e(t)$。` },
  { id: "ss-zj-2-10", num: "2.10", page: 44, title: "题 2.10：由微分—积分方程求冲激响应", knowledgePoint: "冲激响应与阶跃响应", prompt: "一因果性的 LTI 系统，其输入、输出用下列微分一积分方程表示：$\\dfrac{d}{dt}r(t)+5r(t)=\\int_{-\\infty}^{\\infty}e(\\tau)f(t-\\tau)d\\tau-e(t)$。其中 $f(t)=e^{-t}u(t)+3\\delta(t)$，求该系统的单位冲激响应 $h(t)$。" },
  { id: "ss-zj-2-11", num: "2.11", page: 45, title: "题 2.11：根据响应形式确定初始条件与常数", knowledgePoint: "零输入零状态与完全响应", prompt: "设系统的微分方程表示为 $\\dfrac{d^2}{dt^2}r(t)+5\\dfrac{d}{dt}r(t)+6r(t)=e^{-t}u(t)$，求使完全响应为 $r(t)=Ce^{-t}u(t)$ 时的系统起始状态 $r(0_-)$ 和 $r'(0_-)$，并确定常数 $C$ 值。" },
  { id: "ss-zj-2-12", num: "2.12", page: 46, title: "题 2.12：由两组激励响应反求系统分量", knowledgePoint: "零输入零状态与完全响应", prompt: "有一系统对激励为 $e_1(t)=u(t)$ 时的完全响应为 $r_1(t)=2e^{-t}u(t)$，对激励为 $e_2(t)=\\delta(t)$ 时的完全响应为 $r_2(t)=\\delta(t)$。\n\n(1) 求该系统的零输入响应 $r_{zi}(t)$；\n(2) 系统的起始状态保持不变，求其对于激励为 $e_3(t)=e^{-t}u(t)$ 的完全响应 $r_3(t)$。" },
  { id: "ss-zj-2-13", num: "2.13", page: 47, title: "题 2.13：基本卷积计算", knowledgePoint: "卷积运算与图解", prompt: `求下列各函数 $f_1(t)$ 与 $f_2(t)$ 的卷积 $f_1(t)*f_2(t)$：\n\n(1) $f_1(t)=u(t)$，$f_2(t)=e^{-at}u(t)$；\n(2) $f_1(t)=\\delta(t)$，$f_2(t)=\\cos(\\omega t+45^\\circ)$；\n(3) $f_1(t)=(1+t)[u(t)-u(t-1)]$，$f_2(t)=u(t-1)-u(t-2)$；\n(4) $f_1(t)=\\cos(\\omega t)$，$f_2(t)=\\delta(t+1)-\\delta(t-1)$；\n(5) $f_1(t)=e^{-at}u(t)$，$f_2(t)=(\\sin t)u(t)$。` },
  { id: "ss-zj-2-14", num: "2.14", page: 49, title: "题 2.14：卷积差异比较", knowledgePoint: "卷积运算与图解", prompt: `求下列两组卷积，并注意相互间的区别。\n\n(1) $f(t)=u(t)-u(t-1)$，求 $s(t)=f(t)*f(t)$；\n(2) $f(t)=u(t-1)-u(t-2)$，求 $s(t)=f(t)*f(t)$。` },
  { id: "ss-zj-2-15", num: "2.15", page: 50, title: "题 2.15：已知信号波形的卷积绘制", knowledgePoint: "卷积运算与图解", prompt: `已知 $f_1(t)=u(t+1)-u(t-1)$，$f_2(t)=\\delta(t+5)+\\delta(t-5)$，$f_3(t)=\\delta\\left(t+\\dfrac{1}{2}\\right)+\\delta\\left(t-\\dfrac{1}{2}\\right)$，画出下列各卷积的波形：\n\n(1) $s_1(t)=f_1(t)*f_2(t)$；\n(2) $s_2(t)=f_1(t)*f_2(t)*f_2(t)$；\n(3) $s_3(t)=\\{[f_1(t)*f_2(t)][u(t+5)-u(t-5)]\\}*f_2(t)$；\n(4) $s_4(t)=f_1(t)*f_3(t)$。` },
  { id: "ss-zj-2-16", num: "2.16", page: 52, title: "题 2.16：卷积结果形式证明", knowledgePoint: "卷积运算与图解", prompt: "设 $r(t)=e^{-t}u(t)*\\sum_{k=-\\infty}^{\\infty}\\delta(t-3k)$，证明 $r(t)=Ae^{-t}(0\\leq t\\leq 3)$，并求出 $A$ 值。" },
  { id: "ss-zj-2-17", num: "2.17", page: 53, title: "题 2.17：由零状态响应反求冲激响应", knowledgePoint: "冲激响应与阶跃响应", prompt: "已知某一 LTI 系统对输入激励 $e(t)$ 的零状态响应 $r_{zs}(t)=\\int_{t-2}^{\\infty}e^{t-\\tau}e(\\tau-1)d\\tau$，求该系统的单位冲激响应。" },
  { id: "ss-zj-2-18", num: "2.18", page: 54, title: "题 2.18：由算子关系反求冲激响应", knowledgePoint: "冲激响应与阶跃响应", prompt: "某 LTI 系统，输入信号 $e(t)=2e^{-3t}u(t)$，在该输入下的响应为 $r(t)$，即 $r(t)=H[e(t)]$，又已知 $H\\left[\\dfrac{d}{dt}e(t)\\right]=-3r(t)+e^{-2t}u(t)$，求该系统的单位冲激响应 $h(t)$。" },
  { id: "ss-zj-2-19", num: "2.19", page: 55, title: "题 2.19：卷积图解与积分计算", knowledgePoint: "卷积运算与图解", prompt: "对题图 2-19 所示的各组函数，用图解的方法粗略画出 $f_1(t)$ 与 $f_2(t)$ 卷积的波形，并计算卷积积分 $f_1(t)*f_2(t)$。图见教材（原 PDF 第55页）。" },
  { id: "ss-zj-2-20", num: "2.20", page: 56, title: "题 2.20：由子系统冲激响应求总响应", knowledgePoint: "卷积运算与图解", prompt: "题图 2-20 所示系统是由几个“子系统”组成的，各子系统的冲激响应分别为：$h_1(t)=u(t)$（积分器），$h_2(t)=\\delta(t-1)$（单位延时），$h_3(t)=-\\delta(t)$（倒相器），试求总系统的冲激响应 $h(t)$。图见教材（原 PDF 第56页）。" },
  { id: "ss-zj-2-21", num: "2.21", page: 57, title: "题 2.21：已知冲激响应求特定输入输出", knowledgePoint: "杜阿美积分与系统表示", prompt: "已知系统的冲激响应 $h(t)=e^{-2t}u(t)$。\n\n(1) 若激励信号为 $e(t)=e^{-t}[u(t)-u(t-2)]+\\beta\\delta(t-2)$，式中 $\\beta$ 为常数，试决定响应 $r(t)$；\n(2) 若激励信号表示为 $e(t)=x(t)[u(t)-u(t-2)]+\\beta\\delta(t-2)$，式中 $x(t)$ 为任意 $t$ 函数，若要求系统在 $t>2$ 时的响应为零，试确定 $\\beta$ 值应等于多少？" },
  { id: "ss-zj-2-22", num: "2.22", page: 58, title: "题 2.22：杜阿美积分推导", knowledgePoint: "杜阿美积分与系统表示", prompt: "如果把施加于系统的激励信号 $e(t)$ 按题图 2-22 那样分解为许多阶跃信号的叠加，设阶跃响应为 $g(t)$，$e(t)$ 的初始值为 $e(0_+)$，在 $t_1$ 时刻阶跃信号的幅度为 $\\Delta e(t_1)$。试写出阶跃响应的叠加求和而得到的系统响应近似式；证明当取 $\\Delta t_1\\to 0$ 的极限时，响应 $r(t)$ 的表示式为 $r(t)=e(0_+)g(t)+\\int_{0_+}^{t}\\dfrac{de(\\tau)}{d\\tau}g(t-\\tau)d\\tau$。图见教材（原 PDF 第58页）。" },
  { id: "ss-zj-2-23", num: "2.23", page: 59, title: "题 2.23：LTI 系统方框图近似模拟证明", knowledgePoint: "杜阿美积分与系统表示", prompt: "若一个 LTI 系统的冲激响应为 $h(t)$，激励信号是 $e(t)$，响应是 $r(t)$。试证明此系统可以用题图 2-23 所示的方框图近似模拟。图见教材（原 PDF 第59页）。" },
  { id: "ss-zj-2-24", num: "2.24", page: 60, title: "题 2.24：算子符号式转时域表达", knowledgePoint: "杜阿美积分与系统表示", prompt: "若线性系统的响应 $r(t)$ 分别用以下各算子符号式表示，且系统起始状态为零，写出各问的时域表达式。\n\n(1) $\\dfrac{A}{p+a}\\delta(t)$；\n(2) $\\dfrac{A}{(p+\\alpha)^2}\\delta(t)$；\n(3) $\\dfrac{A}{(p+\\alpha)(p+\\beta)}\\delta(t)$。" },
  { id: "ss-zj-2-25", num: "2.25", page: 61, title: "题 2.25：LTI 算子性质证明", knowledgePoint: "杜阿美积分与系统表示", prompt: "设 $H(p)$ 是线性时不变系统的传输算子，且系统起始状态为零，试证明 $[H(p)\\delta(t)]e^{-at}=H(p+a)\\delta(t)$。" },
];

const chapter3Questions: RawQuestion[] = [
  { id: "ss-zj-3-1", num: "3.1", page: 62, title: "题 3.1：对称周期矩形信号的傅里叶级数", knowledgePoint: "周期信号傅里叶级数", prompt: "求题图 3-1 所示对称周期矩形信号的傅里叶级数（三角形式与指数形式）。图见教材（原 PDF 第62页）。" },
  { id: "ss-zj-3-2", num: "3.2", page: 63, title: "题 3.2：矩形脉冲直流分量与低次谐波", knowledgePoint: "频谱与谐波分析", prompt: "周期矩形信号如题图 3-2 所示。已知重复频率 $f=5\\text{kHz}$、脉宽 $\\tau=20\\,\\mu s$、幅度 $E=10\\text{V}$，求直流分量大小以及基波、二次和三次谐波的有效值。图见教材（原 PDF 第63页）。" },
  { id: "ss-zj-3-3", num: "3.3", page: 64, title: "题 3.3：两组矩形脉冲的谱线间隔与带宽比较", knowledgePoint: "频谱与谐波分析", prompt: "若周期矩形信号 $f_1(t)$ 和 $f_2(t)$ 波形如题图 3-2 所示，$f_1(t)$ 的参数为 $\\tau=0.5\\,\\mu s$、$T=1\\,\\mu s$、$E=1\\text{V}$；$f_2(t)$ 的参数为 $\\tau=1.5\\,\\mu s$、$T=3\\,\\mu s$、$E=3\\text{V}$。分别求：(1) $f_1(t)$ 的谱线间隔和带宽（第一零点位置），频率单位以 kHz 表示；(2) $f_2(t)$ 的谱线间隔和带宽；(3) $f_1(t)$ 与 $f_2(t)$ 的基波幅度之比；(4) $f_1(t)$ 基波与 $f_2(t)$ 三次谐波幅度之比。图见教材（原 PDF 第64-65页）。" },
  { id: "ss-zj-3-4", num: "3.4", page: 66, title: "题 3.4：周期三角信号的傅里叶级数", knowledgePoint: "周期信号傅里叶级数", prompt: "求题图 3-4 所示周期三角信号的傅里叶级数，并画出频谱图。图见教材（原 PDF 第66页）。" },
  { id: "ss-zj-3-5", num: "3.5", page: 67, title: "题 3.5：半波余弦信号的傅里叶级数", knowledgePoint: "周期信号傅里叶级数", prompt: "求题图 3-5 所示半波余弦信号的傅里叶级数。若 $E=10\\text{V}$、$f=10\\text{kHz}$，大致画出幅度谱。图见教材（原 PDF 第67页）。" },
  { id: "ss-zj-3-6", num: "3.6", page: 68, title: "题 3.6：周期锯齿信号的指数形式级数", knowledgePoint: "周期信号傅里叶级数", prompt: "求题图 3-6 所示周期锯齿信号的指数形式傅里叶级数，并大致画出频谱图。图见教材（原 PDF 第68页）。" },
  { id: "ss-zj-3-7", num: "3.7", page: 69, title: "题 3.7：利用对称性定性判断频率分量", knowledgePoint: "频谱与谐波分析", prompt: "利用 $f(t)$ 的对称性，定性判断题图 3-7 中各周期信号的傅里叶级数中所含有的频率分量。图见教材（原 PDF 第69页）。" },
  { id: "ss-zj-3-8", num: "3.8", page: 70, title: "题 3.8：两类周期波形的傅里叶级数", knowledgePoint: "周期信号傅里叶级数", prompt: "求题图 3-8 中两种周期信号的傅里叶级数。图见教材（原 PDF 第70页）。" },
  { id: "ss-zj-3-9", num: "3.9", page: 71, title: "题 3.9：余弦切顶脉冲波的谐波幅度", knowledgePoint: "频谱与谐波分析", prompt: "求题图 3-9 所示周期余弦切顶脉冲波的傅里叶级数，并求直流分量 $I_0$ 以及基波和 $k$ 次谐波的幅度（$I_1$ 和 $I_k$）。分别讨论：(1) $\\theta$ 为任意值；(2) $\\theta=60^\\circ$；(3) $\\theta=90^\\circ$。提示：$i(t)=i_m\\dfrac{\\cos(\\omega_1 t)-\\cos\\theta}{1-\\cos\\theta}$，其中 $\\omega_1$ 为 $i(t)$ 的重复角频率。图见教材（原 PDF 第71页）。" },
  { id: "ss-zj-3-10", num: "3.10", page: 72, title: "题 3.10：按谐波条件补全周期波形", knowledgePoint: "频谱与谐波分析", prompt: "已知周期函数 $f(t)$ 前四分之一周期的波形如题图 3-10 所示。根据下列各要求，画出 $f(t)$ 在一个周期 $(0\\sim T)$ 内的波形：(1) $f(t)$ 是偶函数，只含有偶次谐波；(2) $f(t)$ 是偶函数，只含有奇次谐波；(3) $f(t)$ 是偶函数，含有偶次和奇次谐波；(4) $f(t)$ 是奇函数，只含有偶次谐波；(5) $f(t)$ 是奇函数，只含有奇次谐波；(6) $f(t)$ 是奇函数，含有偶次和奇次谐波。图见教材（原 PDF 第72-73页）。" },
  { id: "ss-zj-3-11", num: "3.11", page: 74, title: "题 3.11：周期信号级数系数求解", knowledgePoint: "周期信号傅里叶级数", prompt: "求题图 3-11 所示周期信号的傅里叶级数系数。(a) 题求 $a_n,b_n$；(b) 题求 $F_n$。图见教材（原 PDF 第74页）。" },
  { id: "ss-zj-3-12", num: "3.12", page: 75, title: "题 3.12：RC 低通滤波与谐波响应", knowledgePoint: "频率选择与滤波应用", prompt: "如题图 3-12 所示，周期信号 $v_1(t)$ 加到 RC 低通滤波电路。已知频率 $f=1\\text{kHz}$、电压幅度 $E=1\\text{V}$、$R=1\\text{k}\\Omega$、$C=0.1\\,\\mu F$。分别求：(1) 稳态时电容两端电压的直流分量、基波和五次谐波的幅度；(2) 上述各分量与 $v_1(t)$ 相应分量的比值，并讨论电路对各频率分量响应的特点。图见教材（原 PDF 第75页）。" },
  { id: "ss-zj-3-13", num: "3.13", page: 76, title: "题 3.13：RLC 谐振电路的频率选择", knowledgePoint: "频率选择与滤波应用", prompt: "题图 3-13 所示的 RLC 并联电路和电流源 $i_1(t)$ 都是理想模型。已知谐振频率约为 $100\\text{kHz}$，$R=100\\text{k}\\Omega$，且品质因数 $Q$ 足够高，可滤除邻近频率成分。$i_1(t)$ 为周期短矩波，幅度为 $1\\text{mA}$。当 $i_1(t)$ 的参数 $(\\tau,T)$ 分别为 (1) $\\tau=5\\,\\mu s,T=10\\,\\mu s$；(2) $\\tau=10\\,\\mu s,T=20\\,\\mu s$；(3) $\\tau=15\\,\\mu s,T=30\\,\\mu s$ 时，粗略画出输出电压 $v_2(t)$ 的波形，并注明幅度值。图见教材（原 PDF 第76页）。" },
  { id: "ss-zj-3-14", num: "3.14", page: 77, title: "题 3.14：从矩形波中选出指定频率分量", knowledgePoint: "频率选择与滤波应用", prompt: "若信号波形和电路结构仍如题图 3-13 所示，波形参数为 $\\tau=5\\,\\mu s$、$T=10\\,\\mu s$。(1) 适当设计电路参数，能否分别从矩形波中选出以下频率分量的正弦信号：$50\\text{kHz}$、$100\\text{kHz}$、$150\\text{kHz}$、$200\\text{kHz}$、$300\\text{kHz}$、$400\\text{kHz}$？(2) 对于那些不能选出的频率成分，试分别利用其他电路（示意表明）获得所需频率分量的信号。图见教材（原 PDF 第77页）。" },
  { id: "ss-zj-3-15", num: "3.15", page: 78, title: "题 3.15：半波余弦脉冲的傅里叶变换", knowledgePoint: "非周期信号傅里叶变换", prompt: "求题图 3-15 所示半波余弦脉冲的傅里叶变换，并画出频谱图。图见教材（原 PDF 第78页）。" },
  { id: "ss-zj-3-16", num: "3.16", page: 79, title: "题 3.16：锯齿脉冲与单周正弦脉冲的傅里叶变换", knowledgePoint: "非周期信号傅里叶变换", prompt: "求题图 3-16 所示锯齿脉冲与单周正弦脉冲的傅里叶变换。图见教材（原 PDF 第79页）。" },
  { id: "ss-zj-3-17", num: "3.17", page: 80, title: "题 3.17：典型脉冲的频谱带宽判断", knowledgePoint: "非周期信号傅里叶变换", prompt: "题图 3-17 所示各波形的傅里叶变换可在教材第 3 章或附录表中找到，利用这些结果给出各波形频谱所占带宽 $B_T$（频谱图或频谱包络图的第一零点值），注意图中的时间单位都为 $\\mu s$。图见教材（原 PDF 第80页）。" },
  { id: "ss-zj-3-18", num: "3.18", page: 81, title: "题 3.18：升余弦滚降信号的傅里叶变换", knowledgePoint: "非周期信号傅里叶变换", prompt: "升余弦滚降信号的波形如题图 3-18(a) 所示，它在指定时间范围内按升余弦规律滚降变化。求此信号的傅里叶变换式，并画频谱图；讨论 $\\alpha=0$ 和 $\\alpha=1$ 两种特殊情况。提示：可将该信号分解为题图 3-18(b) 所示的两部分，分别求傅里叶变换后再相加。图见教材（原 PDF 第81页）。" },
  { id: "ss-zj-3-19", num: "3.19", page: 82, title: "题 3.19：给定频谱的逆傅里叶变换", knowledgePoint: "变换性质与逆变换", prompt: "求题图 3-19 所示 $F(\\omega)$ 的傅里叶逆变换 $f(t)$。图见教材（原 PDF 第82页）。" },
  { id: "ss-zj-3-20", num: "3.20", page: 83, title: "题 3.20：偶奇分解与傅里叶变换关系证明", knowledgePoint: "变换性质与逆变换", prompt: "函数 $f(t)$ 可以表示成偶函数 $f_e(t)$ 与奇函数 $f_o(t)$ 之和，试证明：\n\n(1) 若 $f(t)$ 是实函数，且 $\\mathcal{F}[f(t)]=F(\\omega)$，则\n$\\mathcal{F}[f_e(t)]=\\operatorname{Re}[F(\\omega)]$，\n$\\mathcal{F}[f_o(t)]=j\\operatorname{Im}[F(\\omega)]$；\n\n(2) 若 $f(t)$ 是复函数，可表示为 $f(t)=f_r(t)+jf_i(t)$，且 $\\mathcal{F}[f(t)]=F(\\omega)$，则\n$\\mathcal{F}[f_r(t)]=\\dfrac{1}{2}[F(\\omega)+F^*(-\\omega)]$，\n$\\mathcal{F}[f_i(t)]=\\dfrac{1}{2j}[F(\\omega)-F^*(-\\omega)]$，\n其中 $F^*(-\\omega)=\\mathcal{F}[f^*(t)]$。原式见教材（原 PDF 第83-84页）。" },
  { id: "ss-zj-3-21", num: "3.21", page: 85, title: "题 3.21：轴反褶后的傅里叶变换", knowledgePoint: "变换性质与逆变换", prompt: "对题图 3-21 所示波形，若已知 $\\mathcal{F}[f_1(t)]=F_1(\\omega)$，利用傅里叶变换的性质，求 $f_1(t)$ 以 $t_0/2$ 为轴反褶后所得 $f_2(t)$ 的傅里叶变换。图见教材（原 PDF 第85页）。" },
  { id: "ss-zj-3-22", num: "3.22", page: 86, title: "题 3.22：利用对称性求时间函数", knowledgePoint: "变换性质与逆变换", prompt: "利用时域与频域的对称性，求下列傅里叶变换对应的时间函数：\n\n(1) $F(\\omega)=\\delta(\\omega-\\omega_0)$；\n(2) $F(\\omega)=u(\\omega+\\omega_0)-u(\\omega-\\omega_0)$；\n(3) $F(\\omega)=\\begin{cases}\\dfrac{\\omega_0}{\\pi}, & |\\omega|\\leq \\omega_0 \\\\ 0, & \\text{其他}\\end{cases}$。", },
  { id: "ss-zj-3-23", num: "3.23", page: 87, title: "题 3.23：利用时移特性求变换并画幅度谱", knowledgePoint: "变换性质与逆变换", prompt: "若已知矩形脉冲的傅里叶变换，利用时移特性求题图 3-23 所示信号的傅里叶变换，并大致画出幅度谱。图见教材（原 PDF 第87页）。" },
  { id: "ss-zj-3-24", num: "3.24", page: 88, title: "题 3.24：三角形调幅信号的频谱", knowledgePoint: "非周期信号傅里叶变换", prompt: "求题图 3-24 所示三角形调幅信号的频谱。图见教材（原 PDF 第88页）。" },
  { id: "ss-zj-3-25", num: "3.25", page: 89, title: "题 3.25：由已知变换式推导相关结果", knowledgePoint: "变换性质与逆变换", prompt: "题图 3-25 所示信号 $f(t)$ 已知其傅里叶变换式为 $\\mathcal{F}[f(t)]=F(\\omega)=|F(\\omega)|e^{j\\varphi(\\omega)}$。利用傅里叶变换的性质（不作积分运算），求：(1) $F(0)$；(2) $\\int_{-\\infty}^{\\infty}F(\\omega)\\,d\\omega$；(3) $\\mathcal{F}\\{\\operatorname{Re}[F(\\omega)]\\}$ 的图形。原题完整图示见教材（原 PDF 第89页）。" },
  { id: "ss-zj-3-26", num: "3.26", page: 90, title: "题 3.26：梯形脉冲的傅里叶变换", knowledgePoint: "非周期信号傅里叶变换", prompt: "利用微分定理求题图 3-26 所示梯形脉冲的傅里叶变换，并大致画出 $\\tau=2\\tau_1$ 情况下该脉冲的频谱图。图见教材（原 PDF 第90页）。" },
];

const chapter4Questions: RawQuestion[] = [
  {
    id: "ss-zj-4-5",
    num: "4.5",
    page: 124,
    title: "题 4.5：逆变换的初值与终值判断",
    knowledgePoint: "拉普拉斯变换与反变换",
    prompt: `分别求下列函数逆变换的初值与终值：

(1) $\\dfrac{s+6}{(s+2)(s+5)}$；
(2) $\\dfrac{s+3}{(s+1)^2(s+2)}$。`,
  },
  {
    id: "ss-zj-4-6",
    num: "4.6",
    page: 125,
    title: "题 4.6：开关断开后的 RL 电路响应",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "题图 4-6 所示电路，$t=0$ 以前开关 $S$ 闭合，已进入稳态；$t=0$ 时开关打开，求 $v_r(t)$ 并讨论 $R$ 对波形的影响。图见教材（原 PDF 第125页）。",
  },
  {
    id: "ss-zj-4-7",
    num: "4.7",
    page: 126,
    title: "题 4.7：RC 电路电容电压求解",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "题图 4-7 所示电路，$t=0$ 时开关 $S$ 闭合，求 $v_C(t)$。图见教材（原 PDF 第126页）。",
  },
  {
    id: "ss-zj-4-8",
    num: "4.8",
    page: 127,
    title: "题 4.8：RC 分压器三种时间常数比较",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "题图 4-8 所示 RC 分压器，$t=0$ 时开关 $S$ 闭合，接入直流电压 $E$，求 $v_2(t)$ 并讨论以下三种情况的结果：(1) $R_1C_1=R_2C_2$；(2) $R_1C_1>R_2C_2$；(3) $R_1C_1<R_2C_2$。图见教材（原 PDF 第127页）。",
  },
  {
    id: "ss-zj-4-9",
    num: "4.9",
    page: 129,
    title: "题 4.9：RLC 电路电流响应",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "题图 4-9 所示 RLC 电路，$t=0$ 时开关 $S$ 闭合，求电流 $i(t)$（已知 $\\dfrac{1}{2RC}<\\dfrac{1}{\\sqrt{LC}}$）。图见教材（原 PDF 第129页）。",
  },
  {
    id: "ss-zj-4-10",
    num: "4.10",
    page: 130,
    title: "题 4.10：由电路求系统函数与冲激响应",
    knowledgePoint: "系统函数与冲激响应",
    prompt: "求题图 4-10 所示电路的系统函数 $H(s)$ 和冲激响应 $h(t)$，设激励信号为电压 $e(t)$，响应信号为电压 $r(t)$。图见教材（原 PDF 第130页）。",
  },
  {
    id: "ss-zj-4-11",
    num: "4.11",
    page: 133,
    title: "题 4.11：开关换挡后的电流表达式",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "电路如题图 4-11 所示，$t=0$ 以前开关位于“1”，电路已进入稳态；$t=0$ 时开关从“1”倒向“2”，求电流 $i(t)$ 的表示式。图见教材（原 PDF 第133页）。",
  },
  {
    id: "ss-zj-4-12",
    num: "4.12",
    page: 134,
    title: "题 4.12：耦合电感电路的输出电压与波形",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "电路如题图 4-12 所示，$t=0$ 以前电路元件无储能，$t=0$ 时开关闭合，求电压 $v_2(t)$ 的表示式和波形。图见教材（原 PDF 第134页）。",
  },
  {
    id: "ss-zj-4-13",
    num: "4.13",
    page: 135,
    title: "题 4.13：三种电路的系统函数",
    knowledgePoint: "系统函数与冲激响应",
    prompt: "分别写出题图 4-13(a)、(b)、(c) 所示电路的系统函数 $H(s)=\\dfrac{V_2(s)}{V_1(s)}$。图见教材（原 PDF 第135页）。",
  },
  {
    id: "ss-zj-4-14",
    num: "4.14",
    page: 136,
    title: "题 4.14：互感电路输出信号求解",
    knowledgePoint: "系统函数与冲激响应",
    prompt: "试求题图 4-14 所示互感电路的输出信号 $v_R(t)$。假设输入信号 $e(t)$ 分别为以下两种情况：(1) 冲激信号 $e(t)=\\delta(t)$；(2) 阶跃信号 $e(t)=u(t)$。图见教材（原 PDF 第136页）。",
  },
  {
    id: "ss-zj-4-15",
    num: "4.15",
    page: 137,
    title: "题 4.15：斜坡激励下电感电压响应",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "激励信号 $e(t)$ 波形如题图 4-15(a) 所示，电路如题图 4-15(b) 所示，起始时刻 $L$ 中无储能，求 $v_2(t)$ 的表示式和波形。图见教材（原 PDF 第137页）。",
  },
  {
    id: "ss-zj-4-16",
    num: "4.16",
    page: 138,
    title: "题 4.16：受控源网络的系统函数与冲激响应",
    knowledgePoint: "受控源与复杂网络分析",
    prompt: "电路如题图 4-16 所示，注意图中 $kv_2(t)$ 是受控源，试求：(1) 系统函数 $H(s)=\\dfrac{V_3(s)}{V_1(s)}$；(2) 若 $k=2$，求冲激响应。图见教材（原 PDF 第138页）。",
  },
  {
    id: "ss-zj-4-17",
    num: "4.17",
    page: 139,
    title: "题 4.17：两电容瞬态充放电与电荷突变讨论",
    knowledgePoint: "开关电路与暂态响应",
    prompt: "在题图 4-17 所示电路中，$C_1=1\\text{F}$，$C_2=2\\text{F}$，$R=2\\Omega$，起始条件 $v_{C1}(0_-)=E$，方向如图所示，$t=0$ 时开关闭合，求：(1) 电流 $i_1(t)$；(2) 讨论 $t=0_-$ 与 $t=0_+$ 瞬间，电容 $C_2$ 两端电荷发生的变化。图见教材（原 PDF 第139页）。",
  },
  {
    id: "ss-zj-4-18",
    num: "4.18",
    page: 140,
    title: "题 4.18：三个受控源电路的系统函数",
    knowledgePoint: "受控源与复杂网络分析",
    prompt: "题图 4-18 所示电路中有三个受控源，求系统函数 $H(s)=\\dfrac{E_o(s)}{E_i(s)}$。图见教材（原 PDF 第140页）。",
  },
  {
    id: "ss-zj-4-19",
    num: "4.19",
    page: 141,
    title: "题 4.19：由第一周期信号求周期信号拉氏变换",
    knowledgePoint: "周期信号与 s 平面理解",
    prompt: "因果周期信号 $f(t)=f(t)u(t)$，周期为 $T$，若第一周期时间信号为 $f_1(t)=f(t)[u(t)-u(t-T)]$，它的拉氏变换为 $\\mathcal{L}[f_1(t)]=F_1(s)$，求 $\\mathcal{L}[f(t)]=F(s)$ 表达式。（提示：可借助级数性质 $\\sum_{n=0}^{\\infty}a^n=\\dfrac{1}{1-a}$ 化简。）",
  },
  {
    id: "ss-zj-4-20",
    num: "4.20",
    page: 142,
    title: "题 4.20：周期矩形脉冲与全波整流脉冲的拉氏变换",
    knowledgePoint: "周期信号与 s 平面理解",
    prompt: "求题图 4-20 所示周期矩形脉冲和正弦全波整流脉冲的拉氏变换（利用上题结果）。图见教材（原 PDF 第142页）。",
  },
  {
    id: "ss-zj-4-21",
    num: "4.21",
    page: 143,
    title: "题 4.21：冲激抽样信号的拉氏变换",
    knowledgePoint: "周期信号与 s 平面理解",
    prompt: "将连续信号 $f(t)$ 以时间间隔 $T$ 进行冲激抽样得到 $f_s(t)=f(t)\\delta_T(t)$，$\\delta_T(t)=\\sum_{n=0}^{\\infty}\\delta(t-nT)$，求：(1) 抽样信号的拉氏变换 $\\mathcal{L}[f_s(t)]$；(2) 若 $f(t)=e^{-at}u(t)$，求 $\\mathcal{L}[f_s(t)]$。",
  },
  {
    id: "ss-zj-4-22",
    num: "4.22",
    page: 144,
    title: "题 4.22：s 平面极点位置与时域波形对应",
    knowledgePoint: "周期信号与 s 平面理解",
    prompt: "当 $F(s)$ 的一阶极点落于题图 4-22 所示 $s$ 平面图中各方框所处位置时，画出对应的 $f(t)$ 波形（填入方框中）。图中给出了示例，该例极点实部为正，波形是增长振荡。图见教材（原 PDF 第144页）。",
  },
  {
    id: "ss-zj-4-31",
    num: "4.31",
    page: 151,
    title: "题 4.31：并联支路电路的转移函数与零输入响应",
    knowledgePoint: "受控源与复杂网络分析",
    prompt: "如题图 4-31 所示电路：(1) 若初始无储能，信号源为 $i(t)$，为求 $i_1(t)$（零状态响应）列写转移函数 $H(s)$；(2) 若初始状态以 $i_1(0)$ 和 $v_2(0)$ 表示（都不等于零），但 $i(t)=0$（开路），求 $i_1(t)$（零输入响应）。图见教材（原 PDF 第151页）。",
  },
  {
    id: "ss-zj-4-32",
    num: "4.32",
    page: 152,
    title: "题 4.32：约束谐振条件消除稳态分量",
    knowledgePoint: "受控源与复杂网络分析",
    prompt: "如题图 4-32 所示电路：(1) 写出电压转移函数 $H(s)=\\dfrac{V_o(s)}{E(s)}$；(2) 若激励信号 $e(t)=\\cos(2t)\\cdot u(t)$，为使响应中不存在正弦稳态分量，求 $LC$ 约束；(3) 若 $R=1\\Omega$，$L=1\\text{H}$，按第 (2) 问条件，求 $v_o(t)$。图见教材（原 PDF 第152页）。",
  },
  {
    id: "ss-zj-4-35",
    num: "4.35",
    page: 156,
    title: "题 4.35：由零极点分布写网络函数",
    knowledgePoint: "周期信号与 s 平面理解",
    prompt: "已知网络函数的零、极点分布如题图 4-35 所示，此外 $H(\\infty)=5$，写出网络函数表示式 $H(s)$。图见教材（原 PDF 第156页）。",
  },
  {
    id: "ss-zj-4-39",
    num: "4.39",
    page: 160,
    title: "题 4.39：由零极点分布判断滤波器类型",
    knowledgePoint: "周期信号与 s 平面理解",
    prompt: "若 $H(s)$ 零、极点分布如题图 4-39 所示，试讨论它们分别是哪种滤波网络（低通、高通、带通、带阻）。图见教材（原 PDF 第160页）。",
  },
];

const chapter5Questions: RawQuestion[] = [
  {
    id: "ss-zj-5-9",
    num: "5.9",
    page: 181,
    title: "题 5.9：理想低通对 Sa 频谱输入的响应",
    knowledgePoint: "理想滤波器与频域响应",
    prompt: "已知理想低通的系统函数表示式为 $H(j\\omega)=\\begin{cases}1,&|\\omega|<\\dfrac{2\\pi}{\\tau}\\\\0,&|\\omega|>\\dfrac{2\\pi}{\\tau}\\end{cases}$，而激励信号的傅氏变换式为 $E(j\\omega)=\\tau\\,\\mathrm{Sa}\\left(\\dfrac{\\omega\\tau}{2}\\right)$，利用时域卷积定理求响应的时间函数表示式 $r(t)$。",
  },
  {
    id: "ss-zj-5-10",
    num: "5.10",
    page: 182,
    title: "题 5.10：理想带通滤波器的冲激响应与可实现性",
    knowledgePoint: "理想滤波器与频域响应",
    prompt: "一个理想带通滤波器的幅度特性与相位特性如题图 5-10 所示。求它的冲激响应，画响应波形，并说明此滤波器是否是物理可实现的？图见教材（原 PDF 第182页）。",
  },
  {
    id: "ss-zj-5-11",
    num: "5.11",
    page: 183,
    title: "题 5.11：延时差分后经理想低通的输出",
    knowledgePoint: "时频域系统分析",
    prompt: "题图 5-11 所示系统中，$H_i(j\\omega)$ 为理想低通特性 $H_i(j\\omega)=\\begin{cases}e^{-j\\omega t_0},&|\\omega|\\leq 1\\\\0,&|\\omega|>1\\end{cases}$。若：(1) $v_1(t)$ 为单位阶跃信号 $u(t)$，写出 $v_2(t)$ 表示式；(2) $v_1(t)=\\dfrac{2\\sin(t/2)}{t}$，写出 $v_2(t)$ 表示式。图见教材（原 PDF 第183页）。",
  },
  {
    id: "ss-zj-5-12",
    num: "5.12",
    page: 184,
    title: "题 5.12：时延差分积分系统的输出比较",
    knowledgePoint: "时频域系统分析",
    prompt: "写出题图 5-12 所示系统的系统函数 $H(s)=\\dfrac{Y(s)}{X(s)}$。以持续时间为 $\\tau$ 的矩形脉冲作激励 $x(t)$，求 $\\tau\\gg T$、$\\tau\\ll T$、$\\tau=T$ 三种情况下的输出信号 $y(t)$（从时域直接求或以拉氏变换方法求，讨论所得结果）。图见教材（原 PDF 第184页）。",
  },
  {
    id: "ss-zj-5-13",
    num: "5.13",
    page: 185,
    title: "题 5.13：升余弦低通滤波器冲激响应",
    knowledgePoint: "理想滤波器与频域响应",
    prompt: "某低通滤波器具有升余弦幅度传输特性，其相频特性为理想特性。若 $H(j\\omega)$ 表达式为 $H(j\\omega)=H_i(j\\omega)\\left[\\dfrac{1}{2}+\\dfrac{1}{2}\\cos\\left(\\dfrac{\\pi}{\\omega_c}\\omega\\right)\\right]$，其中 $H_i(j\\omega)$ 为理想低通传输特性 $H_i(j\\omega)=\\begin{cases}e^{-j\\omega t_0},&|\\omega|<\\omega_c\\\\0,&\\omega\\text{ 为其他值}\\end{cases}$，试求此系统的冲激响应，并与理想低通滤波器的冲激响应相比较。",
  },
  {
    id: "ss-zj-5-14",
    num: "5.14",
    page: 186,
    title: "题 5.14：非线性小相移低通的冲激响应",
    knowledgePoint: "理想滤波器与频域响应",
    prompt: "某低通滤波器具有非线性相移特性，而幅频响应为理想特性。若 $H(j\\omega)$ 表达式为 $H(j\\omega)=H_i(j\\omega)e^{-j\\Delta\\varphi(\\omega)}$，其中 $H_i(j\\omega)$ 为理想低通传输特性（见上题），$\\Delta\\varphi(\\omega)\\ll 1$，并可展开为 $\\Delta\\varphi(\\omega)=a_1\\sin\\left(\\dfrac{\\omega}{\\omega_1}\\right)+a_2\\sin\\left(\\dfrac{2\\omega}{\\omega_1}\\right)+\\cdots+a_m\\sin\\left(\\dfrac{m\\omega}{\\omega_1}\\right)$。试求此系统的冲激响应，并与理想低通滤波器的冲激响应相比较。",
  },
  {
    id: "ss-zj-5-15",
    num: "5.15",
    page: 187,
    title: "题 5.15：因果系统实虚部的希尔伯特约束",
    knowledgePoint: "单边带与希尔伯特变换",
    prompt: "试利用另一种方法证明因果系统的 $R(\\omega)$ 与 $X(\\omega)$ 被希尔伯特变换相互约束。(1) 已知 $h(t)=h(t)u(t)$，$h_e(t)$ 和 $h_o(t)$ 分别为 $h(t)$ 的偶分量和奇分量，$h(t)=h_e(t)+h_o(t)$。证明：$h_e(t)=h_o(t)\\operatorname{sgn}(t)$，$h_o(t)=h_e(t)\\operatorname{sgn}(t)$；(2) 由傅氏变换的奇偶虚实关系已知 $H(j\\omega)=R(\\omega)+jX(\\omega)$，$\\mathcal{F}[h_e(t)]=R(\\omega)$，$\\mathcal{F}[h_o(t)]=jX(\\omega)$，利用上述关系证明 $R(\\omega)$ 与 $X(\\omega)$ 之间满足希尔伯特变换关系。",
  },
  {
    id: "ss-zj-5-16",
    num: "5.16",
    page: 188,
    title: "题 5.16：单边频谱与解析信号证明",
    knowledgePoint: "单边带与希尔伯特变换",
    prompt: "若 $\\mathcal{F}[f(t)]=F(\\omega)$，令 $Z(\\omega)=2F(\\omega)U(\\omega)$（只取单边的频谱）。试证明：$z(t)=\\mathcal{F}^{-1}[Z(\\omega)]=f(t)+\\hat f(t)$，其中 $\\hat f(t)=\\dfrac{j}{\\pi}\\left[\\int_{-\\infty}^{\\infty}\\dfrac{f(\\tau)}{t-\\tau}d\\tau\\right]$。",
  },
  {
    id: "ss-zj-5-17",
    num: "5.17",
    page: 189,
    title: "题 5.17：单边带发送与同步解调恢复",
    knowledgePoint: "单边带与希尔伯特变换",
    prompt: "对于教材图 5-18 所示抑制载波调幅信号的频谱，由于 $G(\\omega)$ 的偶对称性，使 $F(\\omega)$ 在 $\\omega_0$ 和 $-\\omega_0$ 的左右对称，利用此特点，可以只发送频谱如题图 5-17 所示的信号，称为单边带信号，以节省频带。试证明在接收端用同步解调可以恢复原信号 $G(\\omega)$。图见教材（原 PDF 第189页）。",
  },
  {
    id: "ss-zj-5-18",
    num: "5.18",
    page: 190,
    title: "题 5.18：用移相网络产生单边带信号",
    knowledgePoint: "单边带与希尔伯特变换",
    prompt: "试证明题图 5-18 所示的系统可以产生单边带信号。图中，信号 $g(t)$ 的频谱 $G(\\omega)$ 受限于 $-\\omega_m\\sim+\\omega_m$ 之间，$\\omega_0\\gg\\omega_m$；$H(j\\omega)=-j\\operatorname{sgn}(\\omega)$。设 $v(t)$ 的频谱为 $V(\\omega)$，写出 $V(\\omega)$ 表示式，并画出图形。图见教材（原 PDF 第190页）。",
  },
  {
    id: "ss-zj-5-19",
    num: "5.19",
    page: 191,
    title: "题 5.19：带通信号经理想带通后的输出",
    knowledgePoint: "理想滤波器与频域响应",
    prompt: "已知 $g(t)=\\dfrac{\\sin(\\omega_c t)}{\\omega_c t}$，$s(t)=\\cos(\\omega_0 t)$，设 $\\omega_0\\gg\\omega_c$，将它们相乘得到 $f(t)=g(t)s(t)$，若 $f(t)$ 通过一个特性如题图 5-10 所示的理想带通滤波器，求输出信号 $f_1(t)$ 的表示式。图见教材（原 PDF 第191页）。",
  },
  {
    id: "ss-zj-5-20",
    num: "5.20",
    page: 192,
    title: "题 5.20：乘法器加理想低通系统分析",
    knowledgePoint: "时频域系统分析",
    prompt: "在题图 5-20 所示的系统中，$\\cos(\\omega_0 t)$ 是自激振荡器，理想低通滤波器的转移函数为 $H_i(j\\omega)=[u(\\omega+2\\Omega)-u(\\omega-2\\Omega)]e^{-j\\omega t_0}$，且 $\\omega_0\\gg\\Omega$。(1) 求虚框所示系统的冲激响应 $h(t)$；(2) 若输入信号为 $e(t)=\\left[\\dfrac{\\sin(\\Omega t)}{\\Omega t}\\right]^2\\cos(\\omega_0 t)$，求系统输出信号 $r(t)$；(3) 若输入信号为 $e(t)=\\left[\\dfrac{\\sin(\\Omega t)}{\\Omega t}\\right]^2\\sin(\\omega_0 t)$，求系统输出信号 $r(t)$；(4) 虚框所示系统是否为线性时不变系统？图见教材（原 PDF 第192-193页）。",
  },
  {
    id: "ss-zj-5-21",
    num: "5.21",
    page: 194,
    title: "题 5.21：电话信道上的二进制数据 Modem 方案",
    knowledgePoint: "时频域系统分析",
    prompt: "模拟电话话路的频带宽度为 $300\\text{Hz}\\sim3400\\text{Hz}$，若要利用此信道传送二进制的数据信号需要接入调制解调器（Modem）以适应该信道通带要求，问 Modem 在此完成了何种功能；请试想一种可能实现 Modem 系统的方案，画出简要的原理框图（假定数据信号的速率为 $1200\\text{b/s}$，波形为不归零矩形脉冲）。",
  },
  {
    id: "ss-zj-5-22",
    num: "5.22",
    page: 195,
    title: "题 5.22：连续小波变换的频域形式",
    knowledgePoint: "时频域系统分析",
    prompt: "若 $x(t),\\psi(t)$ 都为实函数，连续函数小波变换的定义可简写为 $WT_x(a,b)=\\dfrac{1}{\\sqrt{a}}\\int_{-\\infty}^{\\infty}x(t)\\psi\\left(\\dfrac{t-b}{a}\\right)dt$。(1) 若 $\\mathcal{F}[x(t)]=X(\\omega)$，$\\mathcal{F}[\\psi(t)]=\\varphi(\\omega)$，试证明以上定义式也可用下式给出 $WT_x(a,b)=\\dfrac{\\sqrt{a}}{2\\pi}\\int_{-\\infty}^{\\infty}X(\\omega)\\varphi(-a\\omega)e^{j\\omega b}d\\omega$；(2) 讨论定义式中 $a,b$ 参量的含义（参看教材例 5-5）。",
  },
  {
    id: "ss-zj-5-23",
    num: "5.23",
    page: 196,
    title: "题 5.23：两种短时傅里叶变换定义比较",
    knowledgePoint: "时频域系统分析",
    prompt: "在信号处理技术中应用的“短时傅里叶变换”有两种定义方式，假定信号源为 $x(t)$，时域窗函数为 $g(t)$，第一种定义方式为 $X_1(\\tau,\\omega)=\\int_{-\\infty}^{\\infty}x(t)g(t-\\tau)e^{-j\\omega t}dt$，第二种定义方式为 $X_2(\\tau,\\omega)=\\int_{-\\infty}^{\\infty}x(t+\\tau)g(t)e^{-j\\omega t}dt$，试从物理概念上说明参变量 $\\tau$ 的含义，比较两种定义结果有何联系与区别。",
  },
  {
    id: "ss-zj-5-24",
    num: "5.24",
    page: 197,
    title: "题 5.24：余弦信号冲激抽样的波形与频谱",
    knowledgePoint: "时频域系统分析",
    prompt: "若 $x(t)=\\cos(\\omega_m t)$，$\\delta_T(t)=\\sum_{n=-\\infty}^{\\infty}\\delta(t-nT)$，$T=\\dfrac{2\\pi}{\\omega_s}$，分别画出以下情况 $x(t)\\cdot\\delta_T(t)$ 的波形及其频谱 $\\mathcal{F}[x(t)\\delta_T(t)]$ 图形。讨论从 $x(t)\\delta_T(t)$ 能否恢复 $x(t)$。注意比较 (1) 和 (4) 的结果（建议画波形时保持 $T$ 不变）：(1) $\\omega_m=\\dfrac{\\omega_s}{8}=\\dfrac{\\pi}{4T}$；(2) $\\omega_m=\\dfrac{\\omega_s}{4}=\\dfrac{\\pi}{2T}$；(3) $\\omega_m=\\dfrac{\\omega_s}{2}=\\dfrac{\\pi}{T}$；(4) $\\omega_m=\\dfrac{9}{8}\\omega_s=\\dfrac{9\\pi}{4T}$。",
  },
];

const chapter6Questions: RawQuestion[] = [
  {
    id: "ss-zj-6-7",
    num: "6.7",
    page: 211,
    title: "题 6.7：前四个勒让德多项式的正交性与规范化",
    knowledgePoint: "正交函数集与勒让德展开",
    prompt: "试证明前四个勒让德多项式在 $(-1,1)$ 内是正交函数集。它是否规格化？",
  },
  {
    id: "ss-zj-6-8",
    num: "6.8",
    page: 212,
    title: "题 6.8：矩形波的勒让德级数展开系数",
    knowledgePoint: "正交函数集与勒让德展开",
    prompt: "一矩形波如题图 6-8 所示，将此函数用勒让德（傅里叶）级数表示 $f(t)=c_0p_0(t)+c_1p_1(t)+\\cdots+c_np_n(t)$，试求系数 $c_0,c_1,c_2,c_3,c_4$。图见教材（原 PDF 第212页）。",
  },
  {
    id: "ss-zj-6-9",
    num: "6.9",
    page: 213,
    title: "题 6.9：指数函数的二次最小均方逼近",
    knowledgePoint: "最小均方逼近",
    prompt: "用二次方程 $at^2+bt+c$ 来近似表示函数 $e^t$，区间在 $(-1,1)$，使方均误差最小，求系数 $a,b,c$。",
  },
  {
    id: "ss-zj-6-10",
    num: "6.10",
    page: 214,
    title: "题 6.10：拉德马赫函数集的完备性讨论",
    knowledgePoint: "Walsh / Haar 基函数",
    prompt: "试讨论图 6-6 所示拉德马赫函数集是否为完备的正交函数集。",
  },
  {
    id: "ss-zj-6-11",
    num: "6.11",
    page: 215,
    title: "题 6.11：两信号同时作用时的能量叠加",
    knowledgePoint: "能量与相关分析",
    prompt: "若信号 $f_1(t)=\\cos(\\omega t)$，$f_2(t)=\\sin(\\omega t)$，试证明当两信号同时作用于单位电阻时所产生的能量等于 $f_1(t)$ 和 $f_2(t)$ 分别作用时产生的能量之和。如果改为 $f_1(t)=\\cos(\\omega t)$，$f_2(t)=\\cos(\\omega t+45^\\circ)$，上述结论是否成立？",
  },
  {
    id: "ss-zj-6-12",
    num: "6.12",
    page: 216,
    title: "题 6.12：7 至 15 序次尔什函数的三角形式与波形",
    knowledgePoint: "Walsh / Haar 基函数",
    prompt: "以三角函数形式的定义写出序号 $k$ 从 7 至 15 的次尔什函数表示式，并画出它们的波形。",
  },
  {
    id: "ss-zj-6-16",
    num: "6.16",
    page: 220,
    title: "题 6.16：典型信号的自相关函数",
    knowledgePoint: "能量与相关分析",
    prompt: `求下列信号的自相关函数：

(1) $f(t)=e^{-at}u(t)$（$a>0$）；
(2) $f(t)=E\\cos(\\omega_0 t)u(t)$。`,
  },
  {
    id: "ss-zj-6-24",
    num: "6.24",
    page: 230,
    title: "题 6.24：Walsh 地址码的自相关、互相关与可用性",
    knowledgePoint: "能量与相关分析",
    prompt: "以题图 6-24 所示 $k=1,2,3$ 的三个 Walsh 函数作为 CDMA 系统的地址码，$c_1(t)=\\overline{\\operatorname{Wal}(1,t)}$，$c_2(t)=\\overline{\\operatorname{Wal}(2,t)}$，$c_3(t)=\\overline{\\operatorname{Wal}(3,t)}$。分别求它们的自相关函数 $R_{11}(\\tau)$、$R_{22}(\\tau)$、$R_{33}(\\tau)$ 以及互相关函数 $R_{12}(\\tau)$、$R_{21}(\\tau)$、$R_{13}(\\tau)$、$R_{31}(\\tau)$、$R_{23}(\\tau)$、$R_{32}(\\tau)$（粗略画图形即可），并由所得结果讨论此码组是否能用作地址码。图见教材（原 PDF 第230页）。",
  },
];

const chapter1TypeGroups: TypeGroup[] = [
  buildTypeGroup(
    {
      id: "ss-zj-ch1-basics",
      name: "信号分类与周期",
      description: "围绕连续/离散/数字信号判别、周期求解与基本概念。",
      difficulty: "基础",
      years: "郑君里第三版·第1章",
      knowledgePoints: ["信号分类与基本概念"],
    },
    chapter1Questions.filter((question) => ["1.1", "1.2", "1.3"].includes(question.num)),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch1-transform",
      name: "时域变换与运算顺序",
      description: "处理时移、时缩、反折与复合自变量下的时域变换顺序。",
      difficulty: "综合",
      years: "郑君里第三版·第1章",
      knowledgePoints: ["时域变换与运算次序"],
    },
    chapter1Questions.filter((question) => ["1.4", "1.5"].includes(question.num)),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch1-waveform",
      name: "波形绘制与典型信号",
      description: "由题图、函数式、阶跃式或组合信号推导出波形与表达式。",
      difficulty: "提高",
      years: "郑君里第三版·第1章",
      knowledgePoints: ["波形绘制与典型信号"],
    },
    chapter1Questions.filter((question) =>
      ["1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12", "1.13"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch1-step-impulse",
      name: "阶跃冲激与分量分析",
      description: "围绕阶跃、冲激、直流分量与奇偶分量展开的时域分析题。",
      difficulty: "综合",
      years: "郑君里第三版·第1章",
      knowledgePoints: ["阶跃、冲激与奇偶分解"],
    },
    chapter1Questions.filter((question) =>
      ["1.14", "1.15", "1.16", "1.17", "1.18"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch1-system",
      name: "系统性质与框图",
      description: "系统仿真框图、性质判定、可逆性与 LTI 基本响应。",
      difficulty: "提高",
      years: "郑君里第三版·第1章",
      knowledgePoints: ["系统性质与框图"],
    },
    chapter1Questions.filter((question) =>
      ["1.19", "1.20", "1.21", "1.22", "1.23", "1.24"].includes(question.num),
    ),
  ),
];

const chapter2TypeGroups: TypeGroup[] = [
  buildTypeGroup(
    {
      id: "ss-zj-ch2-model",
      name: "微分方程建模",
      description: "把电路系统、机械系统和等效模型转换成连续时间微分方程。",
      difficulty: "基础",
      years: "郑君里第三版·第2章",
      knowledgePoints: ["微分方程建模"],
    },
    chapter2Questions.filter((question) => ["2.1", "2.2", "2.3"].includes(question.num)),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch2-response",
      name: "零输入零状态与完全响应",
      description: "围绕齐次解、起始状态、跳变与完全响应分解的核心题型。",
      difficulty: "综合",
      years: "郑君里第三版·第2章",
      knowledgePoints: ["零输入零状态与完全响应"],
    },
    chapter2Questions.filter((question) =>
      ["2.4", "2.5", "2.6", "2.7", "2.8", "2.11", "2.12"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch2-impulse",
      name: "冲激响应与阶跃响应",
      description: "由微分方程或响应关系反求 $h(t)$、$g(t)$。",
      difficulty: "综合",
      years: "郑君里第三版·第2章",
      knowledgePoints: ["冲激响应与阶跃响应"],
    },
    chapter2Questions.filter((question) =>
      ["2.9", "2.10", "2.17", "2.18"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch2-convolution",
      name: "卷积运算与图解",
      description: "连续时间卷积的解析求解、图解、工程直觉和模块组合。",
      difficulty: "提高",
      years: "郑君里第三版·第2章",
      knowledgePoints: ["卷积运算与图解"],
    },
    chapter2Questions.filter((question) =>
      ["2.13", "2.14", "2.15", "2.16", "2.19", "2.20"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch2-system-repr",
      name: "杜阿美积分与系统表示",
      description: "从时域积分表达、方框图和算子角度理解连续时间 LTI 系统。",
      difficulty: "提高",
      years: "郑君里第三版·第2章",
      knowledgePoints: ["杜阿美积分与系统表示"],
    },
    chapter2Questions.filter((question) =>
      ["2.21", "2.22", "2.23", "2.24", "2.25"].includes(question.num),
    ),
  ),
];

const chapter3TypeGroups: TypeGroup[] = [
  buildTypeGroup(
    {
      id: "ss-zj-ch3-series",
      name: "周期信号傅里叶级数",
      description: "围绕矩形波、三角波、锯齿波与分段周期波的傅里叶级数展开。",
      difficulty: "综合",
      years: "郑君里第三版·第3章",
      knowledgePoints: ["周期信号傅里叶级数", "频谱与谐波分析"],
    },
    chapter3Questions.filter((question) =>
      ["3.1", "3.4", "3.5", "3.6", "3.8", "3.11"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch3-spectrum",
      name: "频谱与谐波分析",
      description: "聚焦谱线间隔、带宽、基波与高次谐波幅度的比较与判断。",
      difficulty: "综合",
      years: "郑君里第三版·第3章",
      knowledgePoints: ["频谱与谐波分析"],
    },
    chapter3Questions.filter((question) =>
      ["3.2", "3.3", "3.7", "3.9", "3.10"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch3-filter",
      name: "频率选择与滤波应用",
      description: "结合 RC、LC、RLC 电路讨论周期信号频率分量的选取与响应。",
      difficulty: "提高",
      years: "郑君里第三版·第3章",
      knowledgePoints: ["频率选择与滤波应用"],
    },
    chapter3Questions.filter((question) =>
      ["3.12", "3.13", "3.14"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch3-ft",
      name: "非周期信号傅里叶变换",
      description: "求典型脉冲、调幅波与滚降信号的傅里叶变换和带宽。",
      difficulty: "提高",
      years: "郑君里第三版·第3章",
      knowledgePoints: ["非周期信号傅里叶变换"],
    },
    chapter3Questions.filter((question) =>
      ["3.15", "3.16", "3.17", "3.18", "3.24", "3.26"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch3-property",
      name: "变换性质与逆变换",
      description: "利用对称性、时移、分解与逆变换求解频域时域对应关系。",
      difficulty: "提高",
      years: "郑君里第三版·第3章",
      knowledgePoints: ["变换性质与逆变换"],
    },
    chapter3Questions.filter((question) =>
      ["3.19", "3.20", "3.21", "3.22", "3.23", "3.25"].includes(question.num),
    ),
  ),
];

const chapter4TypeGroups: TypeGroup[] = [
  buildTypeGroup(
    {
      id: "ss-zj-ch4-laplace",
      name: "拉氏变换与反变换",
      description: "围绕初值终值、周期信号和抽样信号的拉普拉斯变换与反变换。",
      difficulty: "综合",
      years: "郑君里第三版·第4章",
      knowledgePoints: ["拉普拉斯变换与反变换", "周期信号与 s 平面理解"],
    },
    chapter4Questions.filter((question) => ["4.5", "4.19", "4.20", "4.21", "4.22"].includes(question.num)),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch4-response",
      name: "开关电路与暂态响应",
      description: "RC、RL、RLC、耦合电感和电容网络的典型暂态响应题。",
      difficulty: "提高",
      years: "郑君里第三版·第4章",
      knowledgePoints: ["开关电路与暂态响应"],
    },
    chapter4Questions.filter((question) =>
      ["4.6", "4.7", "4.8", "4.9", "4.11", "4.12", "4.15", "4.17"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch4-system",
      name: "系统函数与冲激响应",
      description: "从电路网络直接列写或化简系统函数，并进一步求冲激响应。",
      difficulty: "提高",
      years: "郑君里第三版·第4章",
      knowledgePoints: ["系统函数与冲激响应"],
    },
    chapter4Questions.filter((question) =>
      ["4.10", "4.13", "4.14"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch4-dependent",
      name: "受控源与复杂网络",
      description: "受控源、互感与复合储能网络在 s 域下的综合分析。",
      difficulty: "提高",
      years: "郑君里第三版·第4章",
      knowledgePoints: ["受控源与复杂网络分析"],
    },
    chapter4Questions.filter((question) =>
      ["4.16", "4.18", "4.31"].includes(question.num),
    ),
  ),
];

const chapter5TypeGroups: TypeGroup[] = [
  buildTypeGroup(
    {
      id: "ss-zj-ch5-filter",
      name: "理想滤波器与冲激响应",
      description: "理想低通、带通和升余弦类滤波器的频率响应、冲激响应与实现性分析。",
      difficulty: "提高",
      years: "郑君里第三版·第5章",
      knowledgePoints: ["理想滤波器与频域响应"],
    },
    chapter5Questions.filter((question) =>
      ["5.9", "5.10", "5.13", "5.14"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch5-system",
      name: "时频域系统推导",
      description: "利用时延、理想低通和结构方框图在时域和频域之间切换求解。",
      difficulty: "综合",
      years: "郑君里第三版·第5章",
      knowledgePoints: ["时频域系统分析"],
    },
    chapter5Questions.filter((question) =>
      ["5.11", "5.12", "5.20", "5.21", "5.22", "5.23", "5.24"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch5-ssb",
      name: "单边带与希尔伯特变换",
      description: "围绕解析信号、希尔伯特变换以及单边带的发送与生成展开。",
      difficulty: "提高",
      years: "郑君里第三版·第5章",
      knowledgePoints: ["单边带与希尔伯特变换"],
    },
    chapter5Questions.filter((question) =>
      ["5.15", "5.16", "5.17", "5.18"].includes(question.num),
    ),
  ),
  buildTypeGroup(
    {
      id: "ss-zj-ch5-bandpass",
      name: "调制与带通信号",
      description: "抑制载波调制、带通滤波以及频带搬移后的输出分析。",
      difficulty: "提高",
      years: "郑君里第三版·第5章",
      knowledgePoints: ["理想滤波器与频域响应", "时频域系统分析"],
    },
    chapter5Questions.filter((question) =>
      ["5.19", "5.20"].includes(question.num),
    ),
  ),
];

const importedSignalSystemChapters: ChapterNode[] = [
  {
    id: "signal-system-zhengjunli-ch1",
    name: "第一章 绪论",
    summary: "《郑君里〈信号与系统第三版〉做题本》第 1 章题目，覆盖信号分类、周期、波形绘制、阶跃冲激和系统性质。",
    knowledgeNodes: chapter1KnowledgeNodes,
    typeGroups: chapter1TypeGroups,
  },
  {
    id: "signal-system-zhengjunli-ch2",
    name: "第二章 连续时间系统的时域分析",
    summary: "《郑君里〈信号与系统第三版〉做题本》第 2 章题目，覆盖微分方程建模、完全响应、冲激响应、卷积与系统表示。",
    knowledgeNodes: chapter2KnowledgeNodes,
    typeGroups: chapter2TypeGroups,
  },
  {
    id: "signal-system-zhengjunli-ch3",
    name: "第三章 傅里叶变换",
    summary: "《郑君里〈信号与系统第三版〉做题本》第 3 章题目，覆盖周期信号傅里叶级数、频谱分析、滤波应用以及傅里叶变换性质。",
    knowledgeNodes: chapter3KnowledgeNodes,
    typeGroups: chapter3TypeGroups,
  },
  {
    id: "signal-system-zhengjunli-ch4",
    name: "第四章 拉普拉斯变换、连续时间系统的 s 域分析",
    summary: "《郑君里〈信号与系统第三版〉做题本》第 4 章已导入当前人工核对完成的题目，覆盖拉氏变换、系统函数、开关电路与周期信号分析。",
    knowledgeNodes: chapter4KnowledgeNodes,
    typeGroups: chapter4TypeGroups,
  },
  {
    id: "signal-system-zhengjunli-ch5",
    name: "第五章 傅里叶变换应用于通信系统: 滤波、调制与抽样",
    summary: "《郑君里〈信号与系统第三版〉做题本》第 5 章已导入当前人工核对完成的首批题目，覆盖理想滤波器、时频域系统分析、单边带与希尔伯特变换。",
    knowledgeNodes: chapter5KnowledgeNodes,
    typeGroups: chapter5TypeGroups,
  },
];

export const signalSystemImportedSubject: SubjectWiki = {
  id: "signal-system",
  name: "信号与系统",
  shortName: "Signal & System",
  description: "已替换为《郑君里〈信号与系统第三版〉做题本》前五章题库，图形题统一保留“图见教材 / 原 PDF 页码”提示。",
  chapters: importedSignalSystemChapters,
};
