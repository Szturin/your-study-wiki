import type { SubjectWiki } from "@/types/study-wall";
import { signalSystemImportedSubject } from "@/lib/signal-system-import";

const baseSubjectWikis: SubjectWiki[] = [
  {
    id: "math",
    name: "数学",
    shortName: "Math",
    description: "收录热门院校真题、精选习题册、模拟题，按章节、知识点与题目建立数学 wiki 墙。",
    chapters: [
      {
        id: "advanced-math",
        name: "高等数学",
        summary: "围绕极限、导数、积分与级数整理高频题目。",
        knowledgeNodes: [
          { id: "limits", name: "函数与极限", summary: "极限计算、连续性与参数问题。" },
          { id: "derivative", name: "导数与微分", summary: "极值、单调、凹凸性与图像。" },
          { id: "integral", name: "积分计算", summary: "定积分、不定积分与换元分部。" },
          { id: "series", name: "无穷级数", summary: "敛散性、幂级数与展开式。" },
        ],
        typeGroups: [
          {
            id: "math-derivative-property",
            name: "导数性质判断题",
            description: "利用单调性、极值、凹凸性和图像进行快速判断。",
            difficulty: "基础",
            years: "2012-2025",
            questionCount: 16,
            knowledgePoints: ["导数与微分"],
            questions: [
              {
                id: "math-q-2025-1",
                title: "凹凸性、极值点与拐点综合判断",
                year: "2025",
                source: "热门院校真题",
                knowledgePoint: "导数与微分",
                prompt:
                  "已知函数满足若干导数符号条件，判断给定图像结论、极值点个数与拐点位置是否成立。",
                note: "先看一二阶导的变号，再决定是否需要硬算。",
                strategy: [
                  "先列出 f'(x)、f''(x) 的符号变化区间。",
                  "把极值、单调、凹凸三个判断拆开逐项核对。",
                  "图像题优先用定性分析，最后才代入具体点。",
                ],
                mastery: "blurred",
              },
              {
                id: "math-q-2023-1",
                title: "函数图像与导数关系判断",
                year: "2023",
                source: "模拟题",
                knowledgePoint: "导数与微分",
                prompt:
                  "根据候选函数图像判断导函数零点、符号区间及原函数单调性的对应关系。",
                note: "适合总结成图像-导数互推模板。",
                strategy: [
                  "先从原函数斜率读出导数正负。",
                  "再定位驻点与可能的不可导点。",
                  "最后检查图像端点和特殊转折是否被忽略。",
                ],
                mastery: "mastered",
              },
            ],
          },
          {
            id: "math-integral-region",
            name: "积分区域与换序题",
            description: "重点处理区域分析、换序、对称性和极坐标。",
            difficulty: "提高",
            years: "2011-2024",
            questionCount: 12,
            knowledgePoints: ["积分计算"],
            questions: [
              {
                id: "math-q-2024-14",
                title: "二重积分换序计算",
                year: "2024",
                source: "热门院校真题",
                knowledgePoint: "积分计算",
                prompt:
                  "给定平面区域与积分次序，要求改写为另一种积分次序并完成积分计算。",
                note: "先画区域，再决定是否换序。",
                strategy: [
                  "先把边界曲线画在同一坐标系中。",
                  "按 x 型区域或 y 型区域重新拆分积分范围。",
                  "确认换序后上下限连续，再开始计算。",
                ],
                mastery: "mastered",
              },
              {
                id: "math-q-2019-15",
                title: "极坐标下的二重积分",
                year: "2019",
                source: "精选习题册",
                knowledgePoint: "积分计算",
                prompt:
                  "将给定直角坐标区域转化为极坐标表示，并完成二重积分求值。",
                note: "注意雅可比与积分边界统一写法。",
                strategy: [
                  "先判断区域是否关于原点或圆弧天然适合极坐标。",
                  "写清 r 与 θ 的范围，再补上雅可比 r。",
                  "若区域分块，优先分角度区间而不是硬拆 r。",
                ],
                mastery: "blurred",
              },
            ],
          },
          {
            id: "math-series-convergence",
            name: "级数敛散性题",
            description: "围绕比较、比值、根值判别与幂级数展开。",
            difficulty: "综合",
            years: "2009-2025",
            questionCount: 14,
            knowledgePoints: ["无穷级数"],
            questions: [
              {
                id: "math-q-2025-2",
                title: "常数项级数收敛性判定",
                year: "2025",
                source: "热门院校真题",
                knowledgePoint: "无穷级数",
                prompt:
                  "比较多个常数项级数，判断其绝对收敛、条件收敛或发散，并说明所用判别法。",
                note: "先辨认通项结构，再选择判别法。",
                strategy: [
                  "先看是否能转成 p 级数、等比级数或交错级数。",
                  "再选择比较、比值、根值等合适判别法。",
                  "遇到端点型表达式时注意先化简主项。",
                ],
                mastery: "unknown",
              },
              {
                id: "math-q-2021-3",
                title: "幂级数收敛区间与端点讨论",
                year: "2021",
                source: "精选习题册",
                knowledgePoint: "无穷级数",
                prompt:
                  "求某幂级数的收敛半径、收敛区间，并分别讨论两个端点的敛散性。",
                note: "端点单独讨论，经常是失分点。",
                strategy: [
                  "先用比值法或根值法求收敛半径。",
                  "区间先写开区间，再单独代入端点。",
                  "端点不要沿用比值法结论，要重新判别。",
                ],
                mastery: "blurred",
              },
            ],
          },
        ],
      },
      {
        id: "linear-algebra",
        name: "线性代数",
        summary: "围绕秩、特征值、线性方程组与二次型建立题目索引。",
        knowledgeNodes: [
          { id: "rank", name: "矩阵的秩", summary: "矩阵秩、线性相关与可逆性。" },
          { id: "eigen", name: "特征值与特征向量", summary: "相似对角化与特征多项式。" },
          { id: "quadratic", name: "二次型", summary: "标准形、正定性与合同变换。" },
        ],
        typeGroups: [
          {
            id: "math-rank-judge",
            name: "秩与线性表示题",
            description: "把条件统一转成秩、线性相关与可逆矩阵判断。",
            difficulty: "综合",
            years: "2010-2025",
            questionCount: 15,
            knowledgePoints: ["矩阵的秩"],
            questions: [
              {
                id: "math-la-2025-11",
                title: "向量组与秩联动判断",
                year: "2025",
                source: "热门院校真题",
                knowledgePoint: "矩阵的秩",
                prompt:
                  "已知向量组满足若干线性关系，判断它们的秩、线性相关性以及是否能由部分向量线性表示。",
                note: "适合汇总成“秩题四种转化”。",
                strategy: [
                  "先把题目语言统一翻译成矩阵秩问题。",
                  "利用等价命题连接线性相关、可逆与解空间维数。",
                  "带参数时优先找临界秩变化点。",
                ],
                mastery: "mastered",
              },
              {
                id: "math-la-2018-10",
                title: "可逆条件与线性无关判断",
                year: "2018",
                source: "模拟题",
                knowledgePoint: "矩阵的秩",
                prompt:
                  "利用矩阵可逆条件与齐次方程解的性质，判断向量组是否线性无关。",
                note: "常与行列式题联动出现。",
                strategy: [
                  "优先检查行列式或秩是否能直接判断可逆。",
                  "将线性无关转成齐次方程只有零解。",
                  "注意方阵与非方阵的判断路径不同。",
                ],
                mastery: "blurred",
              },
            ],
          },
          {
            id: "math-eigen-diagonal",
            name: "特征值与对角化题",
            description: "整理特征值重数、特征向量个数与对角化条件。",
            difficulty: "提高",
            years: "2011-2025",
            questionCount: 11,
            knowledgePoints: ["特征值与特征向量"],
            questions: [
              {
                id: "math-la-2020-16",
                title: "相似对角化条件判定",
                year: "2020",
                source: "热门院校真题",
                knowledgePoint: "特征值与特征向量",
                prompt:
                  "根据矩阵的特征值信息与参数条件，判断其是否可相似对角化，并说明原因。",
                note: "要和线性无关特征向量个数一起看。",
                strategy: [
                  "先看特征值是否互异，可快速得到充分条件。",
                  "重根场景下继续检查特征子空间维数。",
                  "最后把结论写成‘代数重数 = 几何重数’的形式。",
                ],
                mastery: "unknown",
              },
              {
                id: "math-la-2016-13",
                title: "特征值求参数",
                year: "2016",
                source: "精选习题册",
                knowledgePoint: "特征值与特征向量",
                prompt:
                  "通过已知特征值或特征向量关系，反求矩阵参数并判断对应矩阵结构。",
                note: "适合并入“带参数矩阵题”专题。",
                strategy: [
                  "先由特征方程列出参数关系。",
                  "若已知特征向量，直接代入 (A-λI)x=0。",
                  "别忘了回代验证参数是否满足原题附加条件。",
                ],
                mastery: "blurred",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "signal-system",
    name: "信号与系统",
    shortName: "Signal & System",
    description: "收录热门院校真题、精选习题册、模拟题，按章节、知识点与题目整理信号与系统 wiki 墙。",
    chapters: [
      {
        id: "signal-function-and-analysis",
        name: "信号的函数表示与系统分析方法",
        summary:
          "已补全白皮书第 1 章例题 1.1—1.10，覆盖波形草图、冲激阶跃、时域变换、系统性质与方框图。",
        knowledgeNodes: [
          {
            id: "continuous-waveform",
            name: "常用连续信号与波形",
            summary: "把函数式、分段式和图形三种表示快速互相转换。",
          },
          {
            id: "step-and-impulse",
            name: "单位阶跃与单位冲激",
            summary: "掌握 ε(t)、δ(t)、δ'(t) 的开关、抽样与求导积分性质。",
          },
          {
            id: "time-transform",
            name: "时移、时缩与反折",
            summary: "先处理时间轴，再处理幅值伸缩，避免图像变换出错。",
          },
          {
            id: "signal-combination",
            name: "信号组合与波形变换",
            summary: "两个已知波形相乘时，重点抓重叠区间与关键折点。",
          },
          {
            id: "system-property-judge",
            name: "系统性质判别",
            summary: "围绕线性、时变/时不变、因果性与稳定性做结构化判断。",
          },
          {
            id: "step-response-recovery",
            name: "阶跃响应反推",
            summary: "已知组合输入输出时，反推系统对单位阶跃的响应。",
          },
          {
            id: "block-diagram",
            name: "微分方程与方框图",
            summary: "在微分方程、算子式与方框图三种表示之间来回转换。",
          },
        ],
        typeGroups: [
          {
            id: "ss-ch1-waveform-sketch",
            name: "函数式到波形图",
            description: "先由函数式找支撑区间和关键点，再落到分段表达与图像草图。",
            difficulty: "基础",
            years: "白皮书第1章",
            questionCount: 2,
            knowledgePoints: ["常用连续信号与波形", "单位阶跃与单位冲激"],
            questions: [
              {
                id: "ss-whitebook-1-1",
                title: "例 1.1：由阶跃函数表达式快速画波形",
                year: "例 1.1",
                source: "白皮书·第1章",
                knowledgePoint: "常用连续信号与波形",
                prompt: `概略画出下列函数式表示的信号波形：

- (a) $f_1(t)=\\left(1-\\frac{|t|}{2}\\right)\\left[\\varepsilon(t+2)-\\varepsilon(t-2)\\right]$
- (b) $f_2(t)=\\varepsilon(t)-2\\varepsilon(t-1)+\\varepsilon(t-2)$
- (c) $f_3(t)=E\\sin\\frac{\\pi t}{T}\\cdot\\left[\\varepsilon(t)-\\varepsilon(t-T)\\right]$
- (d) $f_4(t)=\\varepsilon(-t+1)-\\varepsilon(-t-1)$`,
                note: "先把阶跃差转成有效区间，再抓起点、终点、峰值和跳变点，最后再落到图像。",
                strategy: [
                  "先用 ε(t-a) 判断每个表达式在哪些区间非零。",
                  "对关键时刻 t=-2,-1,0,1,2 与 0,T 代值，快速确定端点和峰值。",
                  "把图像先写成分段结果，再统一画图，避免只靠直觉。",
                ],
                mastery: "blurred",
              },
              {
                id: "ss-whitebook-1-2",
                title: "例 1.2：导数、积分与符号函数对应波形",
                year: "例 1.2",
                source: "白皮书·第1章",
                knowledgePoint: "单位阶跃与单位冲激",
                prompt: `概略画出下列函数式所表示的信号波形：

- (a) $f_1(t)=\\dfrac{d}{dt}\\left[e^{-t}\\sin t\\cdot\\varepsilon(t)\\right]$
- (b) $f_2(t)=\\varepsilon(t^2-1)$
- (c) $f_3(t)=\\int_{-\\infty}^{t} e^{-\\tau}\\delta'(\\tau)\\,d\\tau$
- (d) $f_4(t)=\\operatorname{sgn}(\\sin \\pi t)\\cdot\\varepsilon(t)$`,
                note: "这类题核心不是硬算，而是识别 ε、δ、δ' 和周期符号函数各自触发的波形特征。",
                strategy: [
                  "含 ε(t) 的表达式先看开关区间，含 δ(t)、δ'(t) 的表达式先想抽样与广义导数。",
                  "遇到 sgn[sin πt] 先取一个周期，再向右延拓为周期方波。",
                  "画图前先口算出零点、跳变点和单调区间，图像会稳定很多。",
                ],
                mastery: "unknown",
              },
            ],
          },
          {
            id: "ss-ch1-delta-eval",
            name: "冲激与阶跃求值题",
            description: "用冲激筛选、阶跃定义和广义函数规则，把表达式迅速化成具体数值或简单结果。",
            difficulty: "综合",
            years: "白皮书第1章",
            questionCount: 1,
            knowledgePoints: ["单位阶跃与单位冲激"],
            questions: [
              {
                id: "ss-whitebook-1-3",
                title: "例 1.3：利用冲激抽样与阶跃性质求函数值",
                year: "例 1.3",
                source: "白皮书·第1章",
                knowledgePoint: "单位阶跃与单位冲激",
                prompt: `求下列函数值：

- (a) $f_1(t)=\\dfrac{d}{dt}\\left[e^{-2t}\\varepsilon(t)\\right]$
- (b) $f_2(t)=\\int_{-\\infty}^{+\\infty}\\delta(t-t_0)\\varepsilon(t-2t_0)\\,dt\\quad (t_0>0)$
- (c) $f_3(t)=\\int_{-\\infty}^{+\\infty}(t+\\sin t)\\delta\\left(t-\\frac{\\pi}{6}\\right)dt$
- (d) $f_4(t)=2\\varepsilon(t+3)\\delta(t+2)$`,
                note: "遇到 δ 或 δ'，第一反应就是把普通函数在冲激点处取值；遇到 ε 再判断该取值是否被开关截断。",
                strategy: [
                  "先把每一项改写成“普通函数 × 冲激/阶跃”的标准形式。",
                  "用 f(t)δ(t-t0)=f(t0)δ(t-t0) 和积分抽样性质先消掉 δ。",
                  "最后再检查阶跃函数在对应点是 0 还是 1，避免漏掉开关条件。",
                ],
                mastery: "blurred",
              },
            ],
          },
          {
            id: "ss-ch1-time-transform",
            name: "时移、时缩与反折题",
            description: "时间轴变换遵循“先里面后外面”：先平移/翻转/缩放时间，再做幅值伸缩与冲激幅度修正。",
            difficulty: "综合",
            years: "白皮书第1章",
            questionCount: 2,
            knowledgePoints: ["时移、时缩与反折"],
            questions: [
              {
                id: "ss-whitebook-1-4",
                title: "例 1.4：已知波形下的时域变换",
                year: "例 1.4",
                source: "白皮书·第1章",
                knowledgePoint: "时移、时缩与反折",
                prompt:
                  "已知连续信号 f(t) 的波形如图 1.9，画出并标注下列信号的波形：(a) f(t+4)；(b) 2f(t/2-2)；(c) 2f(1-2t)；(d) 2f(t-2)。",
                note: "所有图像变换题都先改时间轴，再改幅值；不要把平移、反折、伸缩混在一起做。",
                strategy: [
                  "先从括号内部读出时移、时缩与反折关系，单独画出关键坐标变换表。",
                  "原图的每个折点都要同步映射，尤其关注 0 点、平台端点与斜边端点。",
                  "最后再统一乘上幅值系数 2，检查纵坐标是否全部翻倍。",
                ],
                mastery: "unknown",
              },
              {
                id: "ss-whitebook-1-6",
                title: "例 1.6：由复合自变量波形反求原信号",
                year: "例 1.6",
                source: "白皮书·第1章",
                knowledgePoint: "时移、时缩与反折",
                prompt: `已知 $f\\left(2-\\dfrac{t}{3}\\right)$ 的波形如图 1.19 所示，试概略画出 $f(t)$ 的波形图。

重点注意：

- 时间轴关系 $t' = 2-\\dfrac{t}{3}$
- 冲激在尺度变换下满足 $\\delta(at)=\\dfrac{1}{|a|}\\delta(t)$`,
                note:
                  "这题不是正向做图，而是反求原函数。先把已知图变成时间变量对应表，再做平移、反折、尺度三步逆变换。",
                strategy: [
                  "先令 $t'=2-\\dfrac{t}{3}$，把图上关键点 $t=-3,0,3,6,9$ 映射到 $t'=3,2,1,0,-1$。",
                  "反折与尺度变换时，折点位置要全量重排，不能只盯住一段图像。",
                  "若含冲激项，记得同步修正冲激强度，例如 $2\\delta(3t-9)=\\dfrac{2}{3}\\delta(t-3)$。",
                ],
                mastery: "blurred",
              },
            ],
          },
          {
            id: "ss-ch1-signal-composition",
            name: "信号组合与乘积题",
            description: "两个已知波形相乘时，关键是先找到共同非零区间，再分段做乘积。",
            difficulty: "提高",
            years: "白皮书第1章",
            questionCount: 1,
            knowledgePoints: ["信号组合与波形变换"],
            questions: [
              {
                id: "ss-whitebook-1-5",
                title: "例 1.5：两个已知波形相乘后的结果判断",
                year: "例 1.5",
                source: "白皮书·第1章",
                knowledgePoint: "信号组合与波形变换",
                prompt:
                  "若 h(t) 的波形如图 1.14，f(t) 的波形如图 1.9，试概略画出并标注下列信号波形：(a) h(t)f(t+1)；(b) h(t)f(-t)；(c) h(t-1)f(1-t)；(d) h(1-t)f(t-1)。",
                note: "先分别变换 h(t) 与 f(t)，再做点乘；只有两者同时非零的区间，乘积图像才会留下来。",
                strategy: [
                  "分别画出每个因子变换后的支撑区间与关键折点，不要直接在脑中相乘。",
                  "先取两个波形的共同非零区间，再逐段判断乘积是常数段、斜线段还是零段。",
                  "最后统一补上端点坐标，确保图像的起止点和高度都可追溯。",
                ],
                mastery: "unknown",
              },
            ],
          },
          {
            id: "ss-ch1-system-property",
            name: "系统性质判断题",
            description: "把系统性质判断拆成四条线：线性、时变/时不变、因果、稳定，逐项核对。",
            difficulty: "综合",
            years: "白皮书第1章",
            questionCount: 1,
            knowledgePoints: ["系统性质判别"],
            questions: [
              {
                id: "ss-whitebook-1-7",
                title: "例 1.7：由阶跃响应形式判断系统性质",
                year: "例 1.7",
                source: "白皮书·第1章",
                knowledgePoint: "系统性质判别",
                prompt: `对于下述连续信号系统，输入为 $\\varepsilon(t)$，输出为 $r(t)$。已知 $T[\\varepsilon(t)]$ 表示系统对 $\\varepsilon(t)$ 的响应，试判定下述系统是否为：

1. 线性系统
2. 时不变系统
3. 因果系统
4. 稳定系统

- (a) $r(t)=T[\\varepsilon(t)]=\\varepsilon(t-2)$
- (b) $r(t)=T[\\varepsilon(t)]=\\varepsilon(-t)$
- (c) $r(t)=T[\\varepsilon(t)]=\\varepsilon(t)\\cos t$
- (d) $r(t)=T[\\varepsilon(t)]=a^{\\varepsilon(t)}$`,
                note:
                  "这题最容易乱在‘同时判断四种性质’。最稳妥的办法是四个判断标准分开写，别在脑中混判。",
                strategy: [
                  "线性：检验叠加与齐次性，优先看 $T[a_1e_1(t)+a_2e_2(t)]$ 是否能拆开。",
                  "时不变：比较 $T[\\varepsilon(t-t_0)]$ 与 $r(t-t_0)$ 是否相同。",
                  "因果与稳定：前者看输出是否先于输入变化，后者按 BIBO 准则判断。",
                ],
                mastery: "blurred",
              },
            ],
          },
          {
            id: "ss-ch1-step-response",
            name: "阶跃响应反推题",
            description: "已知某组输入输出图像，反推出系统对单位阶跃信号的响应函数。",
            difficulty: "提高",
            years: "白皮书第1章",
            questionCount: 1,
            knowledgePoints: ["阶跃响应反推"],
            questions: [
              {
                id: "ss-whitebook-1-8",
                title: "例 1.8：由组合输入输出反推单位阶跃响应",
                year: "例 1.8",
                source: "白皮书·第1章",
                knowledgePoint: "阶跃响应反推",
                prompt: `一线性非时变因果系统的输入 $e(t)$ 与输出 $r(t)$ 如图 1.23 所示，试求该系统对单位阶跃信号 $\\varepsilon(t)$ 的响应。

已知该输入可分解为：

$$
e(t)=\\varepsilon(t)+\\varepsilon(t-1)-\\varepsilon(t-2)-\\varepsilon(t-3)
$$

若把系统对单位阶跃信号的响应记为 $g(t)$，则有

$$
r(t)=g(t)+g(t-1)-g(t-2)-g(t-3)
$$`,
                note:
                  "关键不是直接解方程，而是把输入拆成四个阶跃，再逐时间区间比较输出，反推出 $g(t)$ 的每一段。",
                strategy: [
                  "先把输入波形写成多个阶跃信号的线性组合。",
                  "再按时间区间 $0<t<1,1<t<2,2<t<3,\\dots$ 分段比较 $r(t)$ 与各移位 $g(t-k)$。",
                  "利用线性与时不变性，把求得的一段响应继续向后平移复用。",
                ],
                mastery: "unknown",
              },
            ],
          },
          {
            id: "ss-ch1-block-diagram",
            name: "微分方程与方框图题",
            description: "先写算子式，再决定积分器级联与反馈支路，避免直接画图出错。",
            difficulty: "提高",
            years: "白皮书第1章",
            questionCount: 2,
            knowledgePoints: ["微分方程与方框图"],
            questions: [
              {
                id: "ss-whitebook-1-9",
                title: "例 1.9：由微分方程画系统方框图",
                year: "例 1.9",
                source: "白皮书·第1章",
                knowledgePoint: "微分方程与方框图",
                prompt: `试用加法器、系数乘法器和积分器画出下述微分方程所表示的系统方框图：

$$
\\frac{d^3}{dt^3}y(t)+2\\frac{d^2}{dt^2}y(t)+2\\frac{d}{dt}y(t)+y(t)
=\\frac{d}{dt}x(t)+3x(t)
$$`,
                note:
                  "这类题先别急着画。先把系统改写成算子形式，再把最高阶导数留在一侧，转成积分器串联结构最稳。",
                strategy: [
                  "令 $p=\\dfrac{d}{dt}$，把方程改写为 $p^3y+2p^2y+2py+y=px+3x$。",
                  "先构造中间变量或状态变量，用 $p^{-1}$ 串联搭主通道。",
                  "剩余项统一回接到求和点，系数 $2,2,1,3$ 分别落实到反馈或前馈支路。",
                ],
                mastery: "unknown",
              },
              {
                id: "ss-whitebook-1-10",
                title: "例 1.10：由方框图反推微分方程",
                year: "例 1.10",
                source: "白皮书·第1章",
                knowledgePoint: "微分方程与方框图",
                prompt: `试求出图 1.30 所示方框图表示的系统的微分方程。

由节点关系可先写出：

$$
r(t)=bx(t)+p^{-1}x(t),\\qquad x(t)=e(t)+ap^{-1}x(t)
$$

其中 $p^{-1}$ 表示积分器。`,
                note:
                  "和例 1.9 方向相反：先做节点方程，再消去中间变量 $x(t)$，最后把算子式还原成微分方程。",
                strategy: [
                  "先按求和点与支路关系列出 $r(t)$、$x(t)$ 的算子方程。",
                  "把 $x(t)=\\dfrac{e(t)}{1-ap^{-1}}$ 代回输出表达式，统一整理成 $p$ 的多项式形式。",
                  "最后把 $p$ 重新换回 $\\dfrac{d}{dt}$，得到标准微分方程。",
                ],
                mastery: "blurred",
              },
            ],
          },
        ],
      },
      {
        id: "transform-and-sampling",
        name: "傅里叶、拉普拉斯与采样",
        summary: "变换性质、系统函数与采样恢复是综合题高频区域。",
        knowledgeNodes: [
          { id: "fourier-property", name: "傅里叶变换性质", summary: "时移、频移、尺度、微分积分性质。" },
          { id: "spectrum-plot", name: "频谱图像", summary: "幅频、相频与典型信号频谱。" },
          { id: "laplace-roc", name: "系统函数与收敛域", summary: "因果、稳定与零极点图。" },
          { id: "sampling", name: "采样定理", summary: "采样、混叠与理想恢复。" },
        ],
        typeGroups: [
          {
            id: "ss-fourier-property",
            name: "变换性质综合题",
            description: "把时移、频移、卷积和微分积分性质组合起来。",
            difficulty: "综合",
            years: "2015-2026",
            questionCount: 14,
            knowledgePoints: ["傅里叶变换性质"],
            questions: [
              {
                id: "ss-2024-5",
                title: "傅里叶变换性质综合应用",
                year: "2024",
                source: "热门院校真题",
                knowledgePoint: "傅里叶变换性质",
                prompt:
                  "利用时移、频移、微分和卷积等性质，求复杂信号的傅里叶变换表达式。",
                note: "建议先逐步写出所用性质，再合并结果。",
                strategy: [
                  "先从最接近的基础变换对出发。",
                  "每用一个性质就单独写一层变换关系。",
                  "最后统一整理幅度系数、相位项和变量替换。",
                ],
                mastery: "mastered",
              },
              {
                id: "ss-2020-6",
                title: "频谱图像反推原信号",
                year: "2020",
                source: "模拟题",
                knowledgePoint: "频谱图像",
                prompt:
                  "根据给定幅频/相频图像，反推出时域信号的奇偶性、实虚性和可能表达式。",
                note: "适合单独开一个图像反推专题。",
                strategy: [
                  "先判断频谱的对称性，确定时域信号类型。",
                  "识别矩形谱、冲激谱等典型频谱模板。",
                  "必要时先构造基信号，再通过性质逆推。",
                ],
                mastery: "blurred",
              },
            ],
          },
          {
            id: "ss-laplace-sampling",
            name: "系统函数与采样题",
            description: "围绕收敛域、系统函数、采样定理与恢复整理。",
            difficulty: "提高",
            years: "2018-2026",
            questionCount: 10,
            knowledgePoints: ["系统函数与收敛域", "采样定理"],
            questions: [
              {
                id: "ss-2021-5",
                title: "由系统函数判断因果与稳定",
                year: "2021",
                source: "热门院校真题",
                knowledgePoint: "系统函数与收敛域",
                prompt:
                  "已知连续时间系统函数 H(s)，结合极点与收敛域判断系统是否因果、稳定。",
                note: "可与 Z 变换题型共用判断逻辑。",
                strategy: [
                  "先定位极点，再列出可能的收敛域区间。",
                  "因果系统的收敛域通常在最右极点右侧。",
                  "稳定要求 jω 轴落在收敛域内。",
                ],
                mastery: "blurred",
              },
              {
                id: "ss-topic-7",
                title: "采样恢复条件判断",
                year: "专题",
                source: "精选习题册",
                knowledgePoint: "采样定理",
                prompt:
                  "已知信号带宽与采样频率，判断是否混叠、能否理想恢复，并说明恢复条件。",
                note: "建议把“会不会混叠”做成固定判定树。",
                strategy: [
                  "先比较采样角频率与 2 倍最高频率。",
                  "再画频谱复制后的间隔关系。",
                  "恢复题最后一定写出理想低通的截止频率条件。",
                ],
                mastery: "unknown",
              },
            ],
          },
        ],
      },
    ],
  },
];

export const subjectWikis: SubjectWiki[] = baseSubjectWikis.map((subject) =>
  subject.id === signalSystemImportedSubject.id ? signalSystemImportedSubject : subject,
);
