"use client";

import { useState } from "react";

type AlgorithmId = "cfs" | "ctft" | "s" | "z" | "dtft" | "dfs" | "dft" | "fft";

type AlgorithmDefinition = {
  id: AlgorithmId;
  shortName: string;
  title: string;
  subtitle: string;
  domain: string;
  range: string;
  equation: string;
  insight: string;
  steps: readonly string[];
};

type PlotPoint = {
  x: number;
  y: number;
};

type SpectrumBar = {
  label: string;
  value: number;
  phase: number;
};

type LabParams = {
  frequency: number;
  damping: number;
  sampleCount: number;
  harmonicCount: number;
};

const ALGORITHMS: readonly AlgorithmDefinition[] = [
  {
    id: "cfs",
    shortName: "CFS",
    title: "连续时间傅里叶级数",
    subtitle: "把周期连续信号拆成离散谐波线谱",
    domain: "周期 x(t)",
    range: "a_k",
    equation: "x(t)=sum a_k e^{jk omega_0 t}",
    insight: "周期性把频率轴钉成一排离散谱线，谐波越高通常贡献越小。",
    steps: ["确定基波周期 T", "积分得到每个 a_k", "按幅度与相位重建波形"],
  },
  {
    id: "ctft",
    shortName: "CTFT",
    title: "连续时间傅里叶变换",
    subtitle: "把非周期连续信号映射到连续频谱",
    domain: "非周期 x(t)",
    range: "X(j omega)",
    equation: "X(j omega)=integral x(t)e^{-j omega t}dt",
    insight: "时域越集中，频域越铺开；调制会把谱搬移到载频附近。",
    steps: ["选取时间窗观察信号", "与复指数相关", "扫描连续频率得到谱包络"],
  },
  {
    id: "s",
    shortName: "S",
    title: "拉普拉斯变换",
    subtitle: "用 s 平面描述连续系统稳定性与瞬态",
    domain: "x(t), h(t)",
    range: "X(s), H(s)",
    equation: "H(s)=Y(s)/X(s)",
    insight: "极点位置决定系统是否衰减、振荡或发散，ROC 决定变换能否成立。",
    steps: ["写出微分方程", "代入 s 域代数关系", "观察极点、零点与 ROC"],
  },
  {
    id: "z",
    shortName: "Z",
    title: "Z 变换",
    subtitle: "离散系统的极点、零点与收敛域",
    domain: "x[n], h[n]",
    range: "X(z), H(z)",
    equation: "X(z)=sum x[n]z^{-n}",
    insight: "单位圆上的响应就是 DTFT，极点半径越接近 1，记忆越长。",
    steps: ["把差分方程写成 z^{-1}", "因式分解得到零极点", "检查单位圆是否在 ROC 内"],
  },
  {
    id: "dtft",
    shortName: "DTFT",
    title: "离散时间傅里叶变换",
    subtitle: "无限长离散序列的连续频谱",
    domain: "x[n]",
    range: "X(e^{j omega})",
    equation: "X(e^{j omega})=sum x[n]e^{-j omega n}",
    insight: "离散时间导致频谱以 2π 为周期，采样点越稀疏越容易混叠。",
    steps: ["给定序列 x[n]", "沿单位圆计算 Z 变换", "观察周期频谱"],
  },
  {
    id: "dfs",
    shortName: "DFS",
    title: "离散傅里叶级数",
    subtitle: "周期离散序列的一周期频域表示",
    domain: "周期 x[n]",
    range: "X[k]",
    equation: "x[n]=1/N sum X[k]e^{j2πkn/N}",
    insight: "N 点周期序列只需要 N 条频域谱线，时域循环对应频域离散。",
    steps: ["截取一个周期 N", "计算 N 个 DFS 系数", "用循环移位理解相位"],
  },
  {
    id: "dft",
    shortName: "DFT",
    title: "离散傅里叶变换",
    subtitle: "有限长采样序列的频域采样",
    domain: "有限 x[n]",
    range: "X[k]",
    equation: "X[k]=sum x[n]e^{-j2πkn/N}",
    insight: "DFT 是 DTFT 在 N 个频点上的采样，窗长决定分辨率。",
    steps: ["选择采样长度 N", "乘上有限窗口", "计算各频点相关强度"],
  },
  {
    id: "fft",
    shortName: "FFT",
    title: "快速傅里叶变换",
    subtitle: "把 DFT 的重复计算拆成蝶形网络",
    domain: "N 点 x[n]",
    range: "X[k]",
    equation: "O(N^2) -> O(N log N)",
    insight: "FFT 不改变 DFT 的结果，只是利用对称性把计算量压下来。",
    steps: ["按奇偶分解序列", "递归计算小 DFT", "用旋转因子合并蝶形"],
  },
];

const ALGORITHM_MAP = new Map(ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]));

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createWavePoints(algorithmId: AlgorithmId, params: LabParams): PlotPoint[] {
  const count = algorithmId === "ctft" || algorithmId === "s" ? 120 : params.sampleCount;
  const points: PlotPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const normalized = count === 1 ? 0 : index / (count - 1);
    const centered = normalized * 2 - 1;
    const omega = 2 * Math.PI * params.frequency;
    const envelope = Math.exp(-params.damping * Math.max(0, normalized * 3.2));
    let y = 0;

    if (algorithmId === "cfs" || algorithmId === "dfs") {
      const harmonics = Math.max(1, params.harmonicCount);
      for (let k = 1; k <= harmonics; k += 2) {
        y += Math.sin(k * omega * normalized) / k;
      }
      y *= 0.78;
    } else if (algorithmId === "ctft") {
      y = Math.exp(-3.2 * centered * centered) * Math.cos(omega * centered);
    } else if (algorithmId === "s") {
      y = envelope * Math.cos(omega * normalized * 1.4);
    } else if (algorithmId === "z" || algorithmId === "dtft") {
      y = Math.pow(clamp(1 - params.damping * 0.18, 0.2, 0.96), index) * Math.cos(omega * index / count * 2.2);
    } else {
      y = Math.sin(omega * normalized) + 0.42 * Math.sin(2 * omega * normalized + 0.7);
      y *= 0.54;
    }

    points.push({ x: normalized, y: clamp(y, -1, 1) });
  }

  return points;
}

function createSpectrumBars(algorithmId: AlgorithmId, params: LabParams): SpectrumBar[] {
  const barCount = algorithmId === "cfs" ? params.harmonicCount * 2 + 1 : params.sampleCount;
  const half = Math.floor(barCount / 2);

  return Array.from({ length: barCount }, (_, index) => {
    const shifted = index - half;
    const distanceFromCarrier = Math.abs(Math.abs(shifted) - params.frequency);
    let value = 0;

    if (algorithmId === "cfs" || algorithmId === "dfs") {
      value = shifted === 0 ? 0.22 : 1 / (1 + Math.abs(shifted) * 0.42);
      if (Math.abs(shifted) % 2 === 0 && shifted !== 0) {
        value *= 0.36;
      }
    } else if (algorithmId === "ctft") {
      value = Math.exp(-distanceFromCarrier * distanceFromCarrier * 0.18);
    } else if (algorithmId === "dtft" || algorithmId === "z") {
      value = 1 / Math.sqrt(1 + distanceFromCarrier * distanceFromCarrier * params.damping * 0.42);
    } else {
      const leakage = Math.abs(Math.sin((distanceFromCarrier + 0.18) * Math.PI) / ((distanceFromCarrier + 0.18) * Math.PI));
      value = clamp(leakage + (index % 5 === 0 ? 0.1 : 0), 0.06, 1);
    }

    return {
      label: shifted === 0 ? "0" : shifted > 0 ? `+${shifted}` : `${shifted}`,
      phase: Math.sin(index * 0.72 + params.damping),
      value: clamp(value, 0.04, 1),
    };
  });
}

function createWavePath(points: readonly PlotPoint[], width: number, height: number) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = 24 + point.x * (width - 48);
      const y = height / 2 - point.y * (height * 0.34);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function SignalScope({ points }: { points: readonly PlotPoint[] }) {
  const width = 680;
  const height = 260;
  const path = createWavePath(points, width, height);

  return (
    <svg className="wiki-algo-scope" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="信号波形演示">
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
        <path
          key={`vertical-${index}`}
          d={`M ${24 + index * 79} 22 V 238`}
          className="wiki-algo-grid-line"
        />
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <path key={`horizontal-${index}`} d={`M 24 ${42 + index * 44} H 656`} className="wiki-algo-grid-line" />
      ))}
      <path d="M 24 130 H 656" className="wiki-algo-axis-line" />
      <path d={path} className="wiki-algo-wave-shadow" />
      <path d={path} className="wiki-algo-wave-line" />
      {points.length <= 32
        ? points.map((point, index) => (
            <circle
              key={`${point.x}-${index}`}
              cx={24 + point.x * (width - 48)}
              cy={height / 2 - point.y * (height * 0.34)}
              r="3.2"
              className="wiki-algo-sample-dot"
            />
          ))
        : null}
    </svg>
  );
}

function SpectrumPanel({ bars }: { bars: readonly SpectrumBar[] }) {
  const visibleBars = bars.slice(0, 33);

  return (
    <div className="wiki-algo-spectrum" aria-label="频谱幅度演示">
      {visibleBars.map((bar, index) => (
        <div key={`${bar.label}-${index}`} className="wiki-algo-spectrum-bin">
          <div
            className="wiki-algo-spectrum-bar"
            style={{
              height: `${Math.round(18 + bar.value * 112)}px`,
              opacity: 0.48 + bar.value * 0.52,
            }}
          />
          <span>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function PlanePanel({ algorithmId, damping }: { algorithmId: AlgorithmId; damping: number }) {
  const poleRadius = algorithmId === "s" ? clamp(0.74 - damping * 0.08, 0.28, 0.86) : clamp(0.92 - damping * 0.09, 0.32, 0.9);

  return (
    <svg className="wiki-algo-plane" viewBox="0 0 300 240" role="img" aria-label="极点零点平面演示">
      <path d="M150 18 V222" className="wiki-algo-grid-line" />
      <path d="M36 120 H264" className="wiki-algo-grid-line" />
      <circle cx="150" cy="120" r="76" className="wiki-algo-plane-unit" />
      <circle cx={150 + poleRadius * 72} cy="90" r="8" className="wiki-algo-plane-pole" />
      <path d={`M${150 + poleRadius * 72 - 7} 83 l14 14 M${150 + poleRadius * 72 + 7} 83 l-14 14`} className="wiki-algo-plane-pole-mark" />
      <circle cx={150 + poleRadius * 72} cy="150" r="8" className="wiki-algo-plane-pole" />
      <path d={`M${150 + poleRadius * 72 - 7} 143 l14 14 M${150 + poleRadius * 72 + 7} 143 l-14 14`} className="wiki-algo-plane-pole-mark" />
      <circle cx="98" cy="120" r="9" className="wiki-algo-plane-zero" />
      <text x="42" y="38" className="wiki-algo-plane-label">
        {algorithmId === "s" ? "s-plane" : "z-plane"}
      </text>
      <text x="174" y="212" className="wiki-algo-plane-label">
        ROC / unit circle
      </text>
    </svg>
  );
}

function FftButterfly({ sampleCount }: { sampleCount: number }) {
  const stageCount = Math.max(3, Math.round(Math.log2(sampleCount)));
  const rows = 8;

  return (
    <svg className="wiki-algo-butterfly" viewBox="0 0 420 220" role="img" aria-label="FFT 蝶形网络演示">
      {Array.from({ length: stageCount }, (_, stage) =>
        Array.from({ length: rows / 2 }, (_, pair) => {
          const x1 = 34 + stage * (350 / stageCount);
          const x2 = 34 + (stage + 1) * (350 / stageCount);
          const span = Math.pow(2, stage);
          const y1 = 24 + ((pair * 2) % rows) * 24;
          const y2 = 24 + (((pair * 2 + span) % rows) || pair * 2 + 1) * 24;
          return (
            <g key={`${stage}-${pair}`}>
              <path d={`M${x1} ${y1} C${x1 + 24} ${y1}, ${x2 - 24} ${y2}, ${x2} ${y2}`} className="wiki-algo-butterfly-link" />
              <path d={`M${x1} ${y2} C${x1 + 24} ${y2}, ${x2 - 24} ${y1}, ${x2} ${y1}`} className="wiki-algo-butterfly-link wiki-algo-butterfly-link-soft" />
            </g>
          );
        }),
      )}
      {Array.from({ length: stageCount + 1 }, (_, stage) =>
        Array.from({ length: rows }, (_, row) => (
          <circle key={`${stage}-${row}`} cx={34 + stage * (350 / stageCount)} cy={24 + row * 24} r="4.5" className="wiki-algo-butterfly-node" />
        )),
      )}
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
        <strong>{value}</strong>
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
    damping: 1.4,
    frequency: 3,
    harmonicCount: 7,
    sampleCount: 16,
  });

  const activeAlgorithm = ALGORITHM_MAP.get(activeAlgorithmId) ?? ALGORITHMS[0];
  const wavePoints = createWavePoints(activeAlgorithmId, params);
  const spectrumBars = createSpectrumBars(activeAlgorithmId, params);
  const transformIsPlane = activeAlgorithmId === "s" || activeAlgorithmId === "z";
  const transformIsFft = activeAlgorithmId === "fft";

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
          <p>
            从 CFS、CTFT 到 Z/S 域，再到 DFT 与 FFT，把“变换”的直觉放到同一个可调示波台里。
          </p>
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
              <div className="wiki-algo-equation">{activeAlgorithm.equation}</div>
            </div>

            <SignalScope points={wavePoints} />

            <div className="wiki-algo-visual-grid">
              <div className="wiki-algo-visual-card">
                <span>{transformIsPlane ? "极点零点" : transformIsFft ? "蝶形网络" : "频域读数"}</span>
                {transformIsPlane ? (
                  <PlanePanel algorithmId={activeAlgorithmId} damping={params.damping} />
                ) : transformIsFft ? (
                  <FftButterfly sampleCount={params.sampleCount} />
                ) : (
                  <SpectrumPanel bars={spectrumBars} />
                )}
              </div>

              <div className="wiki-algo-visual-card wiki-algo-insight-card">
                <span>观察结论</span>
                <p>{activeAlgorithm.insight}</p>
                <div className="wiki-algo-metric-grid">
                  <div>
                    <small>Samples</small>
                    <strong>{params.sampleCount}</strong>
                  </div>
                  <div>
                    <small>Frequency</small>
                    <strong>{params.frequency.toFixed(1)}</strong>
                  </div>
                  <div>
                    <small>Damping</small>
                    <strong>{params.damping.toFixed(1)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="wiki-algo-side">
            <div className="wiki-algo-side-card">
              <h3>参数控制</h3>
              <ParameterSlider
                label="频率"
                min={1}
                max={8}
                step={0.5}
                value={params.frequency}
                onChange={(value) => updateParam("frequency", value)}
              />
              <ParameterSlider
                label="阻尼"
                min={0.2}
                max={3.2}
                step={0.1}
                value={params.damping}
                onChange={(value) => updateParam("damping", value)}
              />
              <ParameterSlider
                label="采样点"
                min={8}
                max={32}
                step={8}
                value={params.sampleCount}
                onChange={(value) => updateParam("sampleCount", value)}
              />
              <ParameterSlider
                label="谐波数"
                min={3}
                max={11}
                step={2}
                value={params.harmonicCount}
                onChange={(value) => updateParam("harmonicCount", value)}
              />
            </div>

            <div className="wiki-algo-side-card">
              <h3>算法流程</h3>
              <ol className="wiki-algo-step-list">
                {activeAlgorithm.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
