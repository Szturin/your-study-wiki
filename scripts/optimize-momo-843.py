"""Build a traceable Momo revision from the July 29 workbook."""

import hashlib
import json
from pathlib import Path

import openpyxl

SOURCE = Path(
    "S:/0_Obsidian/my_study_library/考研/1-843信号与系统/附件/墨墨记忆卡/"
    "中科大843信号与系统_总体编辑版_20260729_六性判别补强.xlsx"
)
OUTPUT_DIR = SOURCE.parent
STEM = "中科大843信号与系统_真题校订与方法补强版_20261027"


def title(name):
    return f"[P#H1,center#[T#B,!2f80ed#{name}]]"


def section(name):
    return f"[P#H2#[T#B,!2f80ed#{name}]]"


def formula(expression):
    return f"[E##{expression}]"


def card(name, *parts):
    return "\n\n".join([title(name), *parts])


REPLACEMENTS = {
    62: [(
        "[P#H2#[T#B,!2f80ed#自满性]]",
        "[P#H2#[T#B,!2f80ed#因果频谱关系]]",
    )],
    179: [(
        "采样频率为 f_s，采样点数为 N：",
        "采样频率为 f_s，DFT 长度为 N（未补零时也为观测点数）：",
    )],
    188: [(
        "Z^{}[(-k)_N]",
        "Z^{*}[(-k)_N]",
    )],
    194: [(
        "[T#!d1242f#易错]：线性相位限制相位形状，不等于幅频一定理想。",
        "[T#!d1242f#易错]：相位式只在频率响应不为零的连续频段使用，幅度符号变化可引起 π 跳变；反对称型还需包含 ±π/2 相位项。线性相位不等于理想幅频。",
    )],
    197: [(
        "\\sum{k=0}^{N}a_k y[n-k]=\\sum{m=0}^{M}bm x[n-m]",
        "\\sum_{k=0}^{N}a_k y[n-k]=\\sum_{m=0}^{M}b_m x[n-m]",
    )],
    198: [(
        "使数字滤波器冲激响应等于模拟滤波器冲激响应的抽样：",
        "按一种归一化约定，数字冲激响应取模拟冲激响应抽样乘 T；也有不乘 T 的定义，需按题目约定确定整体增益：",
    )],
}

ADDITIONS = {
    "SS第2章 连续时间系统的时域分析": [
        card(
            "时域求解|指定方法与分段边界",
            section("卷积法"),
            "先由系统方程或阶跃响应求 h(t)，再列 y(t)=x(t)*h(t)；分段端点由两信号支撑区间重叠决定。",
            formula(r"y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau"),
            section("微分方程法"),
            "零输入与零状态分别求；冲激输入须检查跳变量及其导数项。题干指定时域法时，不以变换域结果代替过程。",
            "[T#!d1242f#易错]：图解卷积必须标出各临界时刻，不能只凭最终波形猜分段。真题：2006年第一大题第1小题、2008年第一大题第1小题。",
        ),
        card(
            "输入输出反求|移位叠加与阶跃响应",
            section("已知一对输入输出"),
            "若目标输入可由已知输入的移位、尺度和线性组合构成，则目标输出作同样组合；先写等式，再作图。",
            formula(r"x_2(t)=\sum_k c_k x_1(t-t_k)\ \Rightarrow\ y_2(t)=\sum_k c_k y_1(t-t_k)"),
            section("反求系统"),
            "已知矩形输入时，可写成两个阶跃的差；从输出的移位递推关系反求阶跃响应，再由微分得到冲激响应。",
            formula(r"x(t)=u(t)-u(t-T)\ \Rightarrow\ y(t)=s(t)-s(t-T)"),
            "[T#!d1242f#条件]：上述推论要求同一零状态 LTI 系统。真题：2005年第一题、2008年第一大题第3小题、2021年第二题。",
        ),
    ],
    "SS第3章 傅里叶分析": [
        card(
            "系统频率响应|群时延与导数证明",
            section("定义"),
            "在 H 不为零、相位可微的频段，群时延是展开相位的负导数；零点处不可直接套用。",
            formula(r"\tau_g(\omega)=-\frac{d}{d\omega}\arg H(e^{j\omega})"),
            section("由系统函数求群时延"),
            "令 z 在单位圆上取值，由链式法则：",
            formula(r"z=e^{j\omega},\qquad \frac{d}{d\omega}\ln H(z)=jz\frac{H'(z)}{H(z)}"),
            "对相位项取虚部：",
            formula(r"\tau_g(\omega)=-\operatorname{Re}\left\{\frac{zH'(z)}{H(z)}\right\}_{z=e^{j\omega}}"),
            "[T#!d1242f#易错]：相位跳变点与 H=0 处需单独处理；证明时不要漏掉链式求导的 jz。真题：2016年第七题、2021年第一大题第8小题。",
        ),
        card(
            "对称频响|等效带宽与阶跃上升时间",
            section("适用条件"),
            "H(ω) 为实、非负、偶函数，H(0)>0，面积积分存在；定义等效带宽时使用双边频率轴。",
            formula(r"B_e=\frac{1}{H(0)}\int_{-\infty}^{\infty}H(\omega)\,d\omega"),
            section("从频域回到阶跃响应"),
            formula(r"h(0)=\frac{1}{2\pi}\int_{-\infty}^{\infty}H(\omega)\,d\omega"),
            formula(r"t_r=\frac{s(+\infty)}{h(0)}=\frac{H(0)}{h(0)},\qquad B_et_r=2\pi"),
            "[T#!d1242f#易错]：t_r 是题目定义的最大斜率等效时间，不是通用 10%—90% 上升时间。真题：2023年第二题。",
        ),
    ],
    "SS第7章 信号与系统的综合应用": [
        card(
            "离散90度移相器|冲激响应与窗逼近",
            section("理想系统"),
            "主值区间内 H(e^{jω})=-j sgn(ω)，在 0、π 的点值按题目约定处理。",
            formula(r"h[n]=\begin{cases}\dfrac{1-(-1)^n}{\pi n},&n\ne0,\\0,&n=0.\end{cases}"),
            "h[n] 为双边、不可绝对求和序列；理想移相器非因果且非 BIBO 稳定。",
            section("有限长逼近"),
            "截取对称区间并右移 N 点得到因果 FIR；窗长与窗形决定过渡带和旁瓣。真题：1999年第四题。",
        ),
    ],
    "DSP第1章 离散傅里叶变换DFT": [
        card(
            "谱分析|观测长度与补零分辨率",
            section("区分两个间隔"),
            "设实际观测 L 点，FFT 长度 N≥L，采样率 f_s；DFT 栅格间距是 f_s/N，能分辨两个近频率的能力主要由观测时长 L/f_s 与窗主瓣决定。",
            formula(r"\Delta f_{\mathrm{bin}}=\frac{f_s}{N},\qquad T_{\mathrm{obs}}=\frac{L}{f_s}"),
            "[T#!d1242f#易错]：补零增大 N，只加密频谱采样；不能把 f_s/N 当成补零后实际分辨能力。真题：2025年第六题。",
        ),
        card(
            "实序列DFT|一次N点FFT求2N点变换",
            section("偶奇拆分"),
            "令 a[n]=x[2n]，b[n]=x[2n+1]，以一次 N 点 FFT 计算 y[n]=a[n]+jb[n] 的 Y[k]。",
            formula(r"A[k]=\frac{Y[k]+Y^*[(-k)_N]}{2},\quad B[k]=\frac{Y[k]-Y^*[(-k)_N]}{2j}"),
            formula(r"X_{2N}[k]=A[k\bmod N]+W_{2N}^{k}B[k\bmod N]"),
            "[T#!d1242f#易错]：分离实部对应的两个 DFT 时，必须对 Y[(-k)_N] 取复共轭。真题：2001年第五题。",
        ),
    ],
    "DSP第2章 快速傅里叶变换FFT": [
        card(
            "复合数FFT|N=ML分解",
            section("指标拆分"),
            "令 n=Ln_1+n_2，k=k_1+Mk_2；其中 0≤n_1<M，0≤n_2<L，0≤k_1<M，0≤k_2<L。",
            formula(r"X[k_1+Mk_2]=\sum_{n_2=0}^{L-1}\left[W_N^{n_2k_1}\sum_{n_1=0}^{M-1}x[Ln_1+n_2]W_M^{n_1k_1}\right]W_L^{n_2k_2}"),
            "计算路径：L 个 M 点 DFT → 旋转因子 → M 个 L 点 DFT。按此直接计数，复乘至多 LM²+ML²+ML；可剔除旋转因子为 1 的乘法。",
            "[T#!d1242f#易错]：先检查指标是否遍历 0 到 N−1，再画流程图并逐级标注旋转因子。真题：2010年第六题、2017年第一大题第9小题、2022年第六题。",
        ),
        card(
            "FFT运算量|基2蝶形与补零代价",
            section("基2流程"),
            "N=2^m 时有 m 级，每级 N/2 个蝶形。按每蝶形一次一般复乘、两次复加的简单计数：",
            formula(r"C_{\times}=\frac{N}{2}\log_2N,\qquad C_{+}=N\log_2N"),
            "旋转因子 1、−1、±j 可进一步减少实际复乘；比较不同方案必须说明是否计入这些特例。",
            "[T#!d1242f#易错]：500 点序列补零到 512 点，FFT 栅格变密，但实际观测时长及频率分辨能力不变。真题：2025年第六题。",
        ),
        card(
            "快速卷积|重叠相加与重叠保留",
            section("线性卷积条件"),
            "FIR 长度 M，FFT 长度 N≥M，输入块有效长度 L=N−M+1。",
            formula(r"N\ge L+M-1"),
            "重叠相加：每块做 N 点圆周卷积，输出相邻块重叠的 M−1 点相加。重叠保留：输入块重叠 M−1 点，舍弃每块输出前 M−1 个污染点。",
            "[T#!d1242f#易错]：两法的重叠发生在不同位置，端点序列需补零处理。",
        ),
    ],
    "DSP第3章 数字滤波器设计": [
        card(
            "IIR设计|指标、原型与频率变换",
            section("从数字指标到模拟原型"),
            "先统一通阻带边缘频率及 dB 指标；双线性变换须分别对每个数字边缘频率预畸变，再选择模拟低通原型和阶数。高通/带通先做模拟频率变换。",
            formula(r"\Omega=\frac{2}{T}\tan\frac{\omega}{2},\qquad s=\frac{2}{T}\frac{1-z^{-1}}{1+z^{-1}}"),
            section("核验"),
            "变换得到 H(z) 后检查单位圆内极点、通阻带指标及边缘频率。脉冲响应不变法须检查频谱混叠，不适合用它直接实现理想高通。",
            "[T#!d1242f#易错]：单凭“选择 Butterworth”不能算完成设计，须给原型参数、阶数或按题目要求推导 H(z)。真题：2015年第五题、2023年第五题、2024年第六题第1小题。",
        ),
        card(
            "FIR线性相位|四类与端点约束",
            section("按长度和对称性判型"),
            "I 型：奇长度对称；II 型：偶长度对称；III 型：奇长度反对称；IV 型：偶长度反对称。",
            "II 型在 ω=π 必为零；III 型在 ω=0、π 必为零；IV 型在 ω=0 必为零。约束由 h[n] 与 h[N−1−n] 配对推出。",
            formula(r"H(e^{j\omega})=e^{-j\omega(N-1)/2}A(\omega)"),
            "其中 A(ω) 可能为实函数或纯虚函数，零点处相位跳变需单独处理。真题：2020年第七题。",
        ),
        card(
            "FIR实现|对称折叠与最少乘法器",
            section("配对相同系数"),
            "若 h[n]=h[N−1−n]，先将对称输入相加再乘同一系数；奇长度中心抽头单独处理。",
            formula(r"y[n]=\sum_{k=0}^{\lfloor N/2\rfloor-1}h[k]\{x[n-k]+x[n-(N-1-k)]\}+\mathbf1_{N\,\mathrm{odd}}h[(N-1)/2]x[n-(N-1)/2]"),
            "一般上界为 ⌈N/2⌉ 个不同乘法器；系数 0、±1 可继续简化。反对称时改用输入相减。",
            "[T#!d1242f#易错]：先化简系数再数乘法器；频率搬移 H(ω−π) 对应时域乘 (−1)^n。真题：2008年第一大题第7小题、2019年第六题。",
        ),
        card(
            "FIR窗函数法|指标反推长度",
            section("设计次序"),
            "将 Hz 边缘频率换成数字角频率，按阻带衰减选窗；用该窗给出的主瓣宽度系数估算长度，再取满足线性相位类型的整数长度。",
            formula(r"\Delta\omega=\frac{2\pi\Delta f}{f_s},\qquad h[n]=h_d[n]w[n]"),
            "不同资料对窗长 N、滤波器阶数 N−1 的记号可能相反，必须按题目表格定义代入。高通理想冲激响应用频谱反变换或谱反转得到。",
            "[T#!d1242f#易错]：不要只列“窗长越长过渡带越窄”；真题要求实际窗型、整数长度和 h[n]。真题：2010年第七题、2020年第六题。",
        ),
        card(
            "频率采样FIR|系统函数与稳定实现",
            section("由采样值构造"),
            "已知 H[k]，先 IDFT 求有限长 h[n]，再写 H(z)；也可用频率采样结构表示。",
            formula(r"H(z)=\frac{1-z^{-N}}{N}\sum_{k=0}^{N-1}\frac{H[k]}{1-W_N^{-k}z^{-1}}"),
            "各支路的单位圆极点与前因子的零点理想情况下抵消；有限精度下直接实现可能出现抵消误差。",
            "[T#!d1242f#实现]：先通过 IDFT 得 h[n]，再用 FIR 横向结构实现，避免依赖单位圆极零精确抵消。真题：2021年第六题。",
        ),
    ],
    "附录 历史信息论题（非现行大纲主线）": [
        card(
            "历史信息论|编码、信息熵与信道容量",
            section("信源与信道编码"),
            "信源编码去统计冗余，着重有效性；信道编码增加受控冗余，着重抗差错可靠性。",
            section("离散信源的不确定性"),
            formula(r"H(X)=-\sum_i p_i\log_2p_i"),
            "概率越集中，信息熵越小；同样符号数下均匀分布达到最大熵。",
            section("串接信道"),
            "接收端再经一段信道传送前段输出时，后段容量至少应能承载所需的信息率；必须先明确每次使用信道对应的符号数与速率，再比较互信息与容量。",
            formula(r"I(X;Y)=H(Y)-H(Y\mid X),\qquad C=\max_{p(x)}I(X;Y)"),
            "[T#!d1242f#范围]：此卡只服务 2011 年历史真题第 1 大题第 3、4 小题及第 7 题；2026 年官方大纲没有单列信息论章节。",
        ),
    ],
}


def main():
    book = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    source_rows = list(book.active.values)
    assert source_rows[0] == ("card id", "chapter name", "card content")
    output = [list(source_rows[0])]
    chapters = [row[1] for row in source_rows[1:]]
    edits = []
    for i, row in enumerate(source_rows[1:], 2):
        card_id, chapter, content = row
        if i in REPLACEMENTS:
            for before, after in REPLACEMENTS[i]:
                assert before in content, (i, before)
                content = content.replace(before, after)
            edits.append(i)
        output.append([card_id, chapter, content])
        if i == len(source_rows) or chapters[i - 1] != chapter:
            output.extend([[None, chapter, text] for text in ADDITIONS.get(chapter, [])])
    appendix = "附录 历史信息论题（非现行大纲主线）"
    output.extend([[None, appendix, text] for text in ADDITIONS[appendix]])
    assert len(output) - 1 == 201 + sum(map(len, ADDITIONS.values()))
    assert len({row[0] for row in output[1:] if row[0]}) == len([row for row in output[1:] if row[0]])
    intermediate = OUTPUT_DIR / (STEM + ".json")
    intermediate.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    last_chapter = None
    for _, chapter, content in output[1:]:
        if chapter != last_chapter:
            lines.append("###" + chapter)
            last_chapter = chapter
        heading, separator, body = content.replace("\r\n", "\n").partition("\n")
        assert separator and heading.startswith("[P#H1")
        lines.extend([heading, "---", body.lstrip("\n"), "==="])
    (OUTPUT_DIR / (STEM + "_一键导入.md")).write_text("\n".join(lines) + "\n", encoding="utf-8")
    audit = {
        "source": SOURCE.name,
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "originalCards": 201,
        "correctedSourceRows": edits,
        "newCards": sum(map(len, ADDITIONS.values())),
        "totalCards": len(output) - 1,
        "newByChapter": {chapter: len(cards) for chapter, cards in ADDITIONS.items()},
        "knownUnverified": "Existing cards beyond the listed corrections require item-by-item mathematical review; no future-exam percentage is claimed.",
    }
    (OUTPUT_DIR / (STEM + "_审计.json")).write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False))


if __name__ == "__main__":
    main()
