"use client";

import { useState } from "react";

import { MathMarkdown } from "@/components/ui/math-markdown";

type AlgorithmId = "cfs" | "ctft" | "s" | "z" | "dtft" | "dfs" | "dft" | "fft";
type FrequencyVisualKind = "bars" | "curve" | "plane" | "butterfly";
type SignalRenderMode = "continuous" | "stems";

type AlgorithmDefinition = {
  id: AlgorithmId;
  shortName: string;
  title: string;
  subtitle: string;
  domain: string;
  range: string;
  equation: string;
  example: string;
  visualLabel: string;
  visualKind: FrequencyVisualKind;
  insight: string;
  steps: readonly string[];
};

type PlotPoint = {
  x: number;
  y: number;
};

type BarPoint = {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "zero";
};

type PlaneMarker = {
  kind: "pole" | "zero";
  x: number;
  y: number;
  label: string;
};

type LabParams = {
  poleA: number;
  sampleCount: number;
  harmonicCount: number;
  binIndex: number;
};

type LabModel = {
  signalTitle: string;
  signalSubtitle: string;
  renderMode: SignalRenderMode;
  timePoints: PlotPoint[];
  curvePoints: PlotPoint[];
  bars: BarPoint[];
  planeMarkers: PlaneMarker[];
  rocLabel: string;
};

function displayEquation(formula: string) {
  return `\\[\n${formula}\n\\]`;
}

const ALGORITHMS: readonly AlgorithmDefinition[] = [
  {
    id: "cfs",
    shortName: "CFS",
    title: "连续时间傅里叶级数",
    subtitle: "周期方波的奇次谐波线谱",
    domain: "周期 x(t)",
    range: "a_k",
    equation: displayEquation(String.raw`x(t)=\frac{4}{\pi}\sum_{m=0}^{M}\frac{\sin((2m+1)t)}{2m+1}`),
    example: "标准 2π 周期奇方波，部分和重建与 Gibbs 现象",
    visualLabel: "复指数系数幅度 |a_k|",
    visualKind: "bars",
    insight: "方波只有奇次谐波；截断谐波数增加时边沿更陡，但跳变处会保留超调。",
    steps: ["取基波 omega0=1", "保留奇次谐波 k=±1,±3,...", "用部分和观察逼近与 Gibbs 现象"],
  },
  {
    id: "ctft",
    shortName: "CTFT",
    title: "连续时间傅里叶变换",
    subtitle: "矩形脉冲与 sinc 连续谱",
    domain: "非周期 x(t)",
    range: "X(j omega)",
    equation: displayEquation(String.raw`\operatorname{rect}\left(\frac{t}{T}\right) \leftrightarrow T\operatorname{sinc}\left(\frac{\omega T}{2}\right)`),
    example: "宽度 T=1 的矩形脉冲，零点位于 omega=±2π, ±4π,...",
    visualLabel: "连续频谱 |X(jω)|",
    visualKind: "curve",
    insight: "矩形脉冲越宽，sinc 主瓣越窄；时域截断会带来频域旁瓣。",
    steps: ["固定非周期矩形脉冲", "直接积分得到 sinc 谱", "用零点间隔读出脉冲宽度"],
  },
  {
    id: "s",
    shortName: "S",
    title: "拉普拉斯变换",
    subtitle: "右边指数信号的 s 平面极点与 ROC",
    domain: "e^{-at}u(t)",
    range: "1/(s+a)",
    equation: displayEquation(String.raw`e^{-at}u(t) \leftrightarrow \frac{1}{s+a},\quad \mathrm{ROC}:\operatorname{Re}\{s\}>-a`),
    example: "单极点一阶稳定连续系统",
    visualLabel: "s 平面：极点与 ROC",
    visualKind: "plane",
    insight: "极点在左半平面，且虚轴位于 ROC 内时，系统频响 H(jω) 存在并稳定。",
    steps: ["从右边信号 e^{-at}u(t) 出发", "积分得到 1/(s+a)", "ROC 是极点右侧半平面"],
  },
  {
    id: "z",
    shortName: "Z",
    title: "Z 变换",
    subtitle: "右边指数序列的 z 平面极点与单位圆",
    domain: "a^n u[n]",
    range: "1/(1-a z^{-1})",
    equation: displayEquation(String.raw`a^n u[n] \leftrightarrow \frac{1}{1-a z^{-1}},\quad \mathrm{ROC}: |z|>|a|`),
    example: "一阶 IIR 离散系统，0<a<1",
    visualLabel: "z 平面：极点、单位圆与 ROC",
    visualKind: "plane",
    insight: "单位圆落在 ROC 内，因此 DTFT 存在；a 越接近 1，低频峰越尖、记忆越长。",
    steps: ["把右边序列写成几何级数", "极点位于 z=a", "ROC 是极点外侧区域"],
  },
  {
    id: "dtft",
    shortName: "DTFT",
    title: "离散时间傅里叶变换",
    subtitle: "指数序列沿单位圆得到 2π 周期频谱",
    domain: "a^n u[n]",
    range: "X(e^{j omega})",
    equation: displayEquation(String.raw`\left|X(e^{j\omega})\right|=\frac{1}{\sqrt{1+a^2-2a\cos\omega}}`),
    example: "右边指数序列的经典 DTFT 幅度",
    visualLabel: "连续且 2π 周期的 |X(e^{jω})|",
    visualKind: "curve",
    insight: "DTFT 是 Z 变换在单位圆上的取值；它连续随 ω 变化，并以 2π 为周期。",
    steps: ["从 Z 变换 X(z) 出发", "令 z=e^{jω}", "沿单位圆扫一圈得到 DTFT"],
  },
  {
    id: "dfs",
    shortName: "DFS",
    title: "离散傅里叶级数",
    subtitle: "N 点周期方波的一周期谱线",
    domain: "周期 x[n]",
    range: "X[k]",
    equation: displayEquation(String.raw`x[n]=\frac{1}{N}\sum_{k=0}^{N-1}X[k]e^{j2\pi kn/N}`),
    example: "N 点周期序列：前半周期为 1，后半周期为 -1",
    visualLabel: "一周期 DFS 系数 |X[k]|/N",
    visualKind: "bars",
    insight: "DFS 描述周期离散信号；频域只有 N 个系数，并且天然按 N 周期循环。",
    steps: ["取一个周期 N", "计算 N 点周期序列的系数", "用循环频率 k 表示谱线"],
  },
  {
    id: "dft",
    shortName: "DFT",
    title: "离散傅里叶变换",
    subtitle: "有限长序列的频率采样",
    domain: "有限 x[n]",
    range: "X[k]",
    equation: displayEquation(String.raw`X[k]=\sum_{n=0}^{N-1}x[n]e^{-j2\pi kn/N}`),
    example: "N 点余弦序列，峰值落在 ±m 两个频点",
    visualLabel: "N 点 DFT 幅度谱 |X[k]|",
    visualKind: "bars",
    insight: "当信号频率正好落在 DFT 栅格上，能量集中在对应正负频点；否则会出现谱泄漏。",
    steps: ["选定有限长度 N", "与 N 组旋转因子相关", "读取 k 与 N-k 的共轭对称峰"],
  },
  {
    id: "fft",
    shortName: "FFT",
    title: "快速傅里叶变换",
    subtitle: "8 点 radix-2 DIT 蝶形结构",
    domain: "8 点 x[n]",
    range: "X[k]",
    equation: displayEquation(String.raw`N=8:\quad 3\text{ stages},\quad 12\text{ butterflies}`),
    example: "FFT 只改变 DFT 的计算流程，不改变 DFT 结果",
    visualLabel: "radix-2 DIT butterfly",
    visualKind: "butterfly",
    insight: "8 点 FFT 有 log2(8)=3 级，每级 4 个蝶形；旋转因子只在合并阶段出现。",
    steps: ["按 bit-reversal 排列输入", "第 1/2/3 级分别做 2/4/8 点合并", "输出与 8 点 DFT 完全一致"],
  },
];

const ALGORITHM_MAP = new Map(ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]));
const TWO_PI = Math.PI * 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sinc(value: number) {
  if (Math.abs(value) < 1e-8) {
    return 1;
  }

  return Math.sin(value) / value;
}

function normalizeBars(values: readonly { label: string; value: number; tone?: BarPoint["tone"] }[]): BarPoint[] {
  const maxValue = Math.max(...values.map((item) => Math.abs(item.value)), 1e-8);

  return values.map((item) => ({
    ...item,
    value: Math.abs(item.value) / maxValue,
  }));
}

function computeDft(values: readonly number[]) {
  const count = values.length;

  return Array.from({ length: count }, (_, k) => {
    let real = 0;
    let imaginary = 0;

    for (let n = 0; n < count; n += 1) {
      const angle = (-TWO_PI * k * n) / count;
      real += values[n] * Math.cos(angle);
      imaginary += values[n] * Math.sin(angle);
    }

    return Math.sqrt(real * real + imaginary * imaginary);
  });
}

function createSquarePartial(harmonicCount: number): PlotPoint[] {
  const maxOdd = harmonicCount % 2 === 0 ? harmonicCount - 1 : harmonicCount;
  return Array.from({ length: 161 }, (_, index) => {
    const t = -Math.PI + (TWO_PI * index) / 160;
    let value = 0;

    for (let k = 1; k <= maxOdd; k += 2) {
      value += Math.sin(k * t) / k;
    }

    return { x: index / 160, y: clamp((4 / Math.PI) * value, -1.18, 1.18) / 1.18 };
  });
}

function createRectPulse(): PlotPoint[] {
  return [
    { x: 0.08, y: 0 },
    { x: 0.24, y: 0 },
    { x: 0.24, y: 1 },
    { x: 0.76, y: 1 },
    { x: 0.76, y: 0 },
    { x: 0.92, y: 0 },
  ];
}

function createSincSpectrum(): PlotPoint[] {
  return Array.from({ length: 181 }, (_, index) => {
    const omega = -6 * Math.PI + (12 * Math.PI * index) / 180;
    return {
      x: index / 180,
      y: Math.abs(sinc(omega / 2)),
    };
  });
}

function createRightSidedExponential(a: number, count: number): PlotPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: count === 1 ? 0 : index / (count - 1),
    y: Math.pow(a, index),
  }));
}

function createDtftMagnitude(a: number): PlotPoint[] {
  const raw = Array.from({ length: 181 }, (_, index) => {
    const omega = -Math.PI + (TWO_PI * index) / 180;
    return {
      x: index / 180,
      y: 1 / Math.sqrt(1 + a * a - 2 * a * Math.cos(omega)),
    };
  });
  const maxValue = Math.max(...raw.map((point) => point.y));

  return raw.map((point) => ({ ...point, y: point.y / maxValue }));
}

function createPeriodicSquare(count: number): PlotPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: count === 1 ? 0 : index / (count - 1),
    y: index < count / 2 ? 1 : -1,
  }));
}

function createGridCosine(count: number, binIndex: number): PlotPoint[] {
  const safeBin = Math.min(Math.max(1, Math.round(binIndex)), Math.max(1, Math.floor(count / 2) - 1));

  return Array.from({ length: count }, (_, index) => ({
    x: count === 1 ? 0 : index / (count - 1),
    y: Math.cos((TWO_PI * safeBin * index) / count),
  }));
}

function createCfsBars(harmonicCount: number): BarPoint[] {
  const maxOdd = harmonicCount % 2 === 0 ? harmonicCount - 1 : harmonicCount;
  const values = Array.from({ length: maxOdd * 2 + 1 }, (_, index) => {
    const k = index - maxOdd;
    const active = k !== 0 && Math.abs(k) % 2 === 1;

    return {
      label: k === 0 ? "0" : String(k),
      tone: k === 0 ? "zero" : k > 0 ? "positive" : "negative",
      value: active ? 1 / Math.abs(k) : 0,
    } satisfies BarPoint;
  });

  return normalizeBars(values);
}

function createDfsBars(count: number): BarPoint[] {
  const values = createPeriodicSquare(count).map((point) => point.y);
  const dft = computeDft(values).map((value) => value / count);

  return normalizeBars(
    dft.map((value, index) => ({
      label: String(index),
      value,
      tone: index === 0 ? "zero" : "positive",
    })),
  );
}

function createDftBars(count: number, binIndex: number): BarPoint[] {
  const values = createGridCosine(count, binIndex).map((point) => point.y);
  const dft = computeDft(values);

  return normalizeBars(
    dft.map((value, index) => ({
      label: String(index),
      value,
      tone: index === 0 ? "zero" : "positive",
    })),
  );
}

function createLabModel(algorithmId: AlgorithmId, params: LabParams): LabModel {
  const discreteCount = Math.max(8, params.sampleCount);
  const poleA = clamp(params.poleA, 0.2, 0.9);

  if (algorithmId === "cfs") {
    return {
      signalTitle: "x(t): 方波部分和",
      signalSubtitle: `保留最高 ${params.harmonicCount} 次奇谐波`,
      renderMode: "continuous",
      timePoints: createSquarePartial(params.harmonicCount),
      curvePoints: [],
      bars: createCfsBars(params.harmonicCount),
      planeMarkers: [],
      rocLabel: "",
    };
  }

  if (algorithmId === "ctft") {
    return {
      signalTitle: "x(t): rect(t/T)",
      signalSubtitle: "矩形脉冲宽度 T=1",
      renderMode: "continuous",
      timePoints: createRectPulse(),
      curvePoints: createSincSpectrum(),
      bars: [],
      planeMarkers: [],
      rocLabel: "",
    };
  }

  if (algorithmId === "s") {
    return {
      signalTitle: "x(t): e^{-at}u(t)",
      signalSubtitle: `a=${poleA.toFixed(2)}，右边信号`,
      renderMode: "continuous",
      timePoints: createRightSidedExponential(poleA, 96),
      curvePoints: [],
      bars: [],
      planeMarkers: [{ kind: "pole", x: -poleA, y: 0, label: `s=-${poleA.toFixed(2)}` }],
      rocLabel: `ROC: Re{s}>-${poleA.toFixed(2)}`,
    };
  }

  if (algorithmId === "z") {
    return {
      signalTitle: "x[n]: a^n u[n]",
      signalSubtitle: `a=${poleA.toFixed(2)}，右边序列`,
      renderMode: "stems",
      timePoints: createRightSidedExponential(poleA, discreteCount),
      curvePoints: [],
      bars: [],
      planeMarkers: [{ kind: "pole", x: poleA, y: 0, label: `z=${poleA.toFixed(2)}` }],
      rocLabel: `ROC: |z|>${poleA.toFixed(2)}`,
    };
  }

  if (algorithmId === "dtft") {
    return {
      signalTitle: "x[n]: a^n u[n]",
      signalSubtitle: `沿单位圆 z=e^{jω} 取值，a=${poleA.toFixed(2)}`,
      renderMode: "stems",
      timePoints: createRightSidedExponential(poleA, discreteCount),
      curvePoints: createDtftMagnitude(poleA),
      bars: [],
      planeMarkers: [],
      rocLabel: "",
    };
  }

  if (algorithmId === "dfs") {
    return {
      signalTitle: "x[n]: N 点周期方波的一周期",
      signalSubtitle: `N=${discreteCount}，循环序列`,
      renderMode: "stems",
      timePoints: createPeriodicSquare(discreteCount),
      curvePoints: [],
      bars: createDfsBars(discreteCount),
      planeMarkers: [],
      rocLabel: "",
    };
  }

  if (algorithmId === "dft" || algorithmId === "fft") {
    const count = algorithmId === "fft" ? 8 : discreteCount;
    const safeBin = Math.min(Math.max(1, Math.round(params.binIndex)), Math.max(1, Math.floor(count / 2) - 1));

    return {
      signalTitle: `x[n]: cos(2π·${safeBin}n/${count})`,
      signalSubtitle: `有限长 ${count} 点序列`,
      renderMode: "stems",
      timePoints: createGridCosine(count, safeBin),
      curvePoints: [],
      bars: createDftBars(count, safeBin),
      planeMarkers: [],
      rocLabel: "",
    };
  }

  return {
    signalTitle: "",
    signalSubtitle: "",
    renderMode: "continuous",
    timePoints: [],
    curvePoints: [],
    bars: [],
    planeMarkers: [],
    rocLabel: "",
  };
}

function createLinePath(points: readonly PlotPoint[], width: number, height: number, padding = 24) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = padding + point.x * (width - padding * 2);
      const y = height / 2 - point.y * (height * 0.34);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function SignalScope({ mode, points, subtitle, title }: { mode: SignalRenderMode; points: readonly PlotPoint[]; subtitle: string; title: string }) {
  const width = 680;
  const height = 260;
  const path = createLinePath(points, width, height);

  return (
    <div className="wiki-algo-scope-shell">
      <div className="wiki-algo-chart-caption">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <svg className="wiki-algo-scope" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id="algoWaveGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.28" />
            <stop offset="48%" stopColor="#2dd4bf" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.86" />
          </linearGradient>
          <filter id="algoWaveGlow" x="-12%" y="-90%" width="124%" height="280%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: 9 }, (_, index) => (
          <path key={`vertical-${index}`} d={`M ${24 + index * 79} 22 V 238`} className="wiki-algo-grid-line" />
        ))}
        {Array.from({ length: 5 }, (_, index) => (
          <path key={`horizontal-${index}`} d={`M 24 ${42 + index * 44} H 656`} className="wiki-algo-grid-line" />
        ))}
        <path d="M 24 130 H 656" className="wiki-algo-axis-line" />
        {mode === "continuous" ? (
          <>
            <path d={path} className="wiki-algo-wave-shadow" />
            <path d={path} className="wiki-algo-wave-line" />
          </>
        ) : (
          points.map((point, index) => {
            const x = 34 + point.x * (width - 68);
            const y = height / 2 - point.y * (height * 0.34);

            return (
              <g key={`${point.x}-${index}`}>
                <path d={`M ${x.toFixed(1)} 130 V ${y.toFixed(1)}`} className="wiki-algo-stem-line" />
                <circle cx={x} cy={y} r="4.2" className="wiki-algo-sample-dot" />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

function CurvePanel({ points }: { points: readonly PlotPoint[] }) {
  const width = 420;
  const height = 190;
  const path = createLinePath(points, width, height, 20);

  return (
    <svg className="wiki-algo-curve" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="连续频谱曲线">
      {Array.from({ length: 7 }, (_, index) => (
        <path key={`curve-grid-${index}`} d={`M ${20 + index * 63} 18 V 166`} className="wiki-algo-grid-line" />
      ))}
      <path d="M20 95 H400" className="wiki-algo-axis-line" />
      <path d={path} className="wiki-algo-wave-shadow" />
      <path d={path} className="wiki-algo-wave-line" />
    </svg>
  );
}

function SpectrumPanel({ bars }: { bars: readonly BarPoint[] }) {
  return (
    <div className="wiki-algo-spectrum" aria-label="离散谱线">
      {bars.map((bar, index) => (
        <div key={`${bar.label}-${index}`} className="wiki-algo-spectrum-bin">
          <div
            className={`wiki-algo-spectrum-bar wiki-algo-spectrum-bar-${bar.tone ?? "positive"}`}
            style={{
              height: `${Math.round(12 + bar.value * 116)}px`,
              opacity: bar.value <= 0.01 ? 0.16 : 0.5 + bar.value * 0.5,
            }}
          />
          <span>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function PlanePanel({ algorithmId, markers, rocLabel }: { algorithmId: AlgorithmId; markers: readonly PlaneMarker[]; rocLabel: string }) {
  const isZPlane = algorithmId === "z";
  const centerX = 150;
  const centerY = 120;
  const scale = isZPlane ? 76 : 58;

  return (
    <svg className="wiki-algo-plane" viewBox="0 0 300 240" role="img" aria-label={isZPlane ? "z 平面" : "s 平面"}>
      <path d="M150 18 V222" className="wiki-algo-grid-line" />
      <path d="M36 120 H264" className="wiki-algo-grid-line" />
      {isZPlane ? <circle cx={centerX} cy={centerY} r={scale} className="wiki-algo-plane-unit" /> : null}
      {!isZPlane && markers[0] ? (
        <rect
          x={centerX + markers[0].x * scale}
          y="34"
          width={264 - (centerX + markers[0].x * scale)}
          height="172"
          className="wiki-algo-roc-region"
        />
      ) : null}
      {isZPlane && markers[0] ? (
        <circle cx={centerX} cy={centerY} r={Math.abs(markers[0].x) * scale} className="wiki-algo-roc-circle" />
      ) : null}
      {markers.map((marker) => {
        const cx = centerX + marker.x * scale;
        const cy = centerY - marker.y * scale;

        return marker.kind === "pole" ? (
          <g key={marker.label}>
            <circle cx={cx} cy={cy} r="9" className="wiki-algo-plane-pole" />
            <path d={`M${cx - 6} ${cy - 6} l12 12 M${cx + 6} ${cy - 6} l-12 12`} className="wiki-algo-plane-pole-mark" />
            <text x={cx + 10} y={cy - 10} className="wiki-algo-plane-label">
              {marker.label}
            </text>
          </g>
        ) : (
          <g key={marker.label}>
            <circle cx={cx} cy={cy} r="8" className="wiki-algo-plane-zero" />
            <text x={cx + 10} y={cy - 10} className="wiki-algo-plane-label">
              {marker.label}
            </text>
          </g>
        );
      })}
      <text x="42" y="38" className="wiki-algo-plane-label">
        {isZPlane ? "z-plane" : "s-plane"}
      </text>
      <text x="154" y="214" className="wiki-algo-plane-label">
        {rocLabel}
      </text>
    </svg>
  );
}

function FftButterfly() {
  const rows = 8;
  const stages = [
    [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ],
    [
      [0, 2],
      [1, 3],
      [4, 6],
      [5, 7],
    ],
    [
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ],
  ];
  const x = (stage: number) => 34 + stage * 116;
  const y = (row: number) => 24 + row * 24;

  return (
    <svg className="wiki-algo-butterfly" viewBox="0 0 420 220" role="img" aria-label="8 点 radix-2 FFT 蝶形网络">
      {stages.map((pairs, stageIndex) =>
        pairs.map(([top, bottom], pairIndex) => (
          <g key={`${stageIndex}-${pairIndex}`}>
            <path
              d={`M${x(stageIndex)} ${y(top)} C${x(stageIndex) + 34} ${y(top)}, ${x(stageIndex + 1) - 34} ${y(top)}, ${x(stageIndex + 1)} ${y(top)}`}
              className="wiki-algo-butterfly-link"
            />
            <path
              d={`M${x(stageIndex)} ${y(top)} C${x(stageIndex) + 34} ${y(top)}, ${x(stageIndex + 1) - 34} ${y(bottom)}, ${x(stageIndex + 1)} ${y(bottom)}`}
              className="wiki-algo-butterfly-link wiki-algo-butterfly-link-soft"
            />
            <path
              d={`M${x(stageIndex)} ${y(bottom)} C${x(stageIndex) + 34} ${y(bottom)}, ${x(stageIndex + 1) - 34} ${y(top)}, ${x(stageIndex + 1)} ${y(top)}`}
              className="wiki-algo-butterfly-link wiki-algo-butterfly-link-soft"
            />
            <path
              d={`M${x(stageIndex)} ${y(bottom)} C${x(stageIndex) + 34} ${y(bottom)}, ${x(stageIndex + 1) - 34} ${y(bottom)}, ${x(stageIndex + 1)} ${y(bottom)}`}
              className="wiki-algo-butterfly-link"
            />
          </g>
        )),
      )}
      {Array.from({ length: 4 }, (_, stage) =>
        Array.from({ length: rows }, (_, row) => (
          <g key={`${stage}-${row}`}>
            <circle cx={x(stage)} cy={y(row)} r="4.5" className="wiki-algo-butterfly-node" />
            {stage === 0 ? (
              <text x={x(stage) - 26} y={y(row) + 4} className="wiki-algo-plane-label">
                x{row}
              </text>
            ) : null}
          </g>
        )),
      )}
      {["N=2", "N=4", "N=8"].map((label, index) => (
        <text key={label} x={x(index) + 42} y="210" className="wiki-algo-plane-label">
          {label}
        </text>
      ))}
    </svg>
  );
}

function ParameterSlider({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  function handleValueChange(nextValue: string) {
    onChange(Number(nextValue));
  }

  return (
    <label className="wiki-algo-control">
      <span>{label}</span>
      <div className="wiki-algo-stepper">
        <button type="button" onClick={() => onChange(clamp(value - step, min, max))} aria-label={`${label}减少`}>
          -
        </button>
        <strong>{Number.isInteger(value) ? value : value.toFixed(2)}</strong>
        <button type="button" onClick={() => onChange(clamp(value + step, min, max))} aria-label={`${label}增加`}>
          +
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => handleValueChange(event.target.value)}
        onInput={(event) => handleValueChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function SignalAlgorithmLab() {
  const [activeAlgorithmId, setActiveAlgorithmId] = useState<AlgorithmId>("ctft");
  const [params, setParams] = useState<LabParams>({
    binIndex: 2,
    harmonicCount: 9,
    poleA: 0.65,
    sampleCount: 16,
  });

  const activeAlgorithm = ALGORITHM_MAP.get(activeAlgorithmId) ?? ALGORITHMS[0];
  const model = createLabModel(activeAlgorithmId, params);

  function updateParam<Key extends keyof LabParams>(key: Key, value: LabParams[Key]) {
    setParams((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section className="wiki-algo-page">
      <div className="wiki-algo-hero">
        <div>
          <div className="wiki-algo-kicker">Signal Processing Workbench</div>
          <h1>信号与系统算法演示</h1>
          <p>每个模块绑定一个教材级经典例子：左侧看原信号，右侧看严格对应的频谱、零极点或 FFT 蝶形结构。</p>
        </div>
        <div className="wiki-algo-hero-readout">
          <span>ACTIVE</span>
          <strong>{activeAlgorithm.shortName}</strong>
          <small>
            {activeAlgorithm.domain} {"->"} {activeAlgorithm.range}
          </small>
        </div>
      </div>

      <div className="wiki-algo-layout">
        <div className="wiki-algo-picker" aria-label="算法选择">
          {ALGORITHMS.map((algorithm) => (
            <button
              key={algorithm.id}
              type="button"
              onClick={() => setActiveAlgorithmId(algorithm.id)}
              className={`wiki-algo-picker-item ${algorithm.id === activeAlgorithmId ? "wiki-algo-picker-item-active" : ""}`}
              aria-pressed={algorithm.id === activeAlgorithmId}
            >
              <span>{algorithm.shortName}</span>
              <strong>{algorithm.title}</strong>
            </button>
          ))}
        </div>

        <div className="wiki-algo-main">
          <div className="wiki-algo-stage">
            <div className="wiki-algo-stage-header">
              <div>
                <div className="wiki-algo-kicker">{activeAlgorithm.shortName}</div>
                <h2>{activeAlgorithm.title}</h2>
                <p>{activeAlgorithm.subtitle}</p>
              </div>
              <MathMarkdown className="wiki-algo-equation" content={activeAlgorithm.equation} />
            </div>

            <SignalScope mode={model.renderMode} points={model.timePoints} subtitle={model.signalSubtitle} title={model.signalTitle} />

            <div className="wiki-algo-visual-grid">
              <div className="wiki-algo-visual-card">
                <span>{activeAlgorithm.visualLabel}</span>
                {activeAlgorithm.visualKind === "plane" ? (
                  <PlanePanel algorithmId={activeAlgorithmId} markers={model.planeMarkers} rocLabel={model.rocLabel} />
                ) : activeAlgorithm.visualKind === "butterfly" ? (
                  <FftButterfly />
                ) : activeAlgorithm.visualKind === "curve" ? (
                  <CurvePanel points={model.curvePoints} />
                ) : (
                  <SpectrumPanel bars={model.bars} />
                )}
              </div>

              <div className="wiki-algo-visual-card wiki-algo-insight-card">
                <span>经典例子</span>
                <p>{activeAlgorithm.example}</p>
                <span className="mt-4">观察结论</span>
                <p>{activeAlgorithm.insight}</p>
                <div className="wiki-algo-metric-grid">
                  <div>
                    <small>N</small>
                    <strong>{activeAlgorithmId === "fft" ? 8 : params.sampleCount}</strong>
                  </div>
                  <div>
                    <small>a / k</small>
                    <strong>{activeAlgorithmId === "s" || activeAlgorithmId === "z" || activeAlgorithmId === "dtft" ? params.poleA.toFixed(2) : params.binIndex}</strong>
                  </div>
                  <div>
                    <small>Harmonics</small>
                    <strong>{params.harmonicCount}</strong>
                  </div>
                </div>
                <div className="wiki-algo-flow-block">
                  <span>算法流程</span>
                  <ol className="wiki-algo-step-list">
                    {activeAlgorithm.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <aside className="wiki-algo-side">
            <div className="wiki-algo-parameter-console">
              <div className="wiki-algo-console-header">
                <span>CONTROL</span>
                <h3>参数控制</h3>
              </div>
              <ParameterSlider label="极点 a" min={0.2} max={0.9} step={0.05} value={params.poleA} onChange={(value) => updateParam("poleA", value)} />
              <ParameterSlider label="采样点 N" min={8} max={32} step={8} value={params.sampleCount} onChange={(value) => updateParam("sampleCount", value)} />
              <ParameterSlider label="谐波上限" min={3} max={15} step={2} value={params.harmonicCount} onChange={(value) => updateParam("harmonicCount", value)} />
              <ParameterSlider label="DFT 频点 k" min={1} max={7} step={1} value={params.binIndex} onChange={(value) => updateParam("binIndex", value)} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
