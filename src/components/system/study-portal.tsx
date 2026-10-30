"use client";

import { ArrowLeft, ArrowRight, BookOpen, FileText, PenLine } from "lucide-react";
import { EnglishWorkspace } from "@/components/system/english-workspace";
import type { EnglishBank } from "@/types/english";

export type EnglishSection = "reading" | "writing" | "knowledge";
export { EnglishWorkspace };
export type { EnglishBank };

function SignalFigure() {
  const signal = (x: number) => Math.sin(x * 0.047) * Math.exp(-Math.pow((x - 310) / 235, 2));
  const line = Array.from({ length: 316 }, (_, i) => `${i ? "L" : "M"}${i * 2} ${(161 - signal(i * 2) * 92).toFixed(1)}`).join(" ");
  const samples = Array.from({ length: 32 }, (_, i) => ({ x: 12 + i * 19, y: 161 - signal(12 + i * 19) * 92 }));
  return <svg className="portal-signal" viewBox="0 0 630 330" role="img" aria-label="连续信号与离散采样示意图">
    <line x1="12" y1="161" x2="620" y2="161" className="portal-axis" /><line x1="310" y1="20" x2="310" y2="302" className="portal-axis" />
    <path d={line} className="portal-wave" />
    {samples.map(({ x, y }) => <g key={x}><line x1={x} y1="161" x2={x} y2={y} className="portal-stem" /><circle cx={x} cy={y} r="2.6" className="portal-sample" /></g>)}
    <text x="617" y="180">t</text><text x="319" y="25">f(t)</text>
    <text x="34" y="291" className="portal-figure-caption">CONTINUOUS</text><text x="492" y="291" className="portal-figure-caption">SAMPLED</text>
  </svg>;
}

function SpectrumFigure() {
  return <svg className="portal-mini-figure" viewBox="0 0 300 100" role="img" aria-label="频谱与采样频谱">
    <line x1="8" y1="70" x2="292" y2="70" />
    <path d="M12 69 C45 69 54 38 76 22 C96 7 119 70 149 70 C177 70 197 12 218 22 C241 35 250 69 288 69" />
    {[31, 76, 121, 166, 211, 256].map((x, i) => <g key={x}><line className="portal-mini-stem" x1={x} y1="70" x2={x} y2={i === 1 || i === 4 ? 29 : 48} /><circle className="portal-mini-dot" cx={x} cy={i === 1 || i === 4 ? 29 : 48} r="2" /></g>)}
  </svg>;
}

export function StudyPortal({ onSignal, onEnglish }: { onSignal: () => void; onEnglish: () => void }) {
  return <main className="study-portal">
    <header className="portal-header"><div className="portal-brand"><BookOpen size={28} strokeWidth={1.8} /><strong>我的学习</strong></div></header>
    <section className="portal-hero" aria-labelledby="portal-title"><div className="portal-hero-copy"><span className="portal-kicker">USTC 843 / ENGLISH I</span><h1 id="portal-title">我的考研</h1><p>843 信号与系统 · 英语</p></div><SignalFigure /></section>
    <section className="portal-subjects" aria-label="学习板块">
      <button className="portal-subject portal-subject-signal" onClick={onSignal}><SpectrumFigure /><span className="portal-subject-number">01 / 专业课</span><strong>843 信号与系统</strong><span className="portal-subject-detail">真题分类 · 历年套卷 · 公式</span><span className="portal-subject-enter">进入 <ArrowRight size={20} /></span></button>
      <button className="portal-subject portal-subject-english" onClick={onEnglish}><div className="portal-type-figure" aria-hidden="true"><span>R</span><i>/</i><span>W</span></div><span className="portal-subject-number">02 / 英语一</span><strong>英语</strong><span className="portal-subject-detail">阅读 · 写作</span><span className="portal-subject-enter">进入 <ArrowRight size={20} /></span></button>
    </section>
  </main>;
}

export function EnglishPortal({ onBack, onOpen }: { onBack: () => void; onOpen: (section: EnglishSection) => void }) {
  return <main className="study-portal portal-english-page">
    <header className="portal-header"><button className="portal-back" onClick={onBack}><ArrowLeft size={19} /> 返回首页</button><span className="portal-header-label">ENGLISH I</span></header>
    <section className="portal-english-heading"><span className="portal-kicker">02 / ENGLISH I</span><h1>英语</h1><p>阅读 · 写作</p></section>
    <section className="portal-english-links" aria-label="英语学习入口">
      <button onClick={() => onOpen("reading")}><BookOpen size={32} strokeWidth={1.5} /><span><strong>阅读真题</strong><small>历年阅读与精读</small></span><ArrowRight size={20} /></button>
      <button onClick={() => onOpen("writing")}><PenLine size={32} strokeWidth={1.5} /><span><strong>写作系统</strong><small>大作文 · 小作文</small></span><ArrowRight size={20} /></button>
      <button onClick={() => onOpen("knowledge")}><FileText size={32} strokeWidth={1.5} /><span><strong>精读知识点</strong><small>词句 · 方法</small></span><ArrowRight size={20} /></button>
    </section>
  </main>;
}
