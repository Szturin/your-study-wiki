"use client";

import { useState } from "react";
import { MathMarkdown } from "@/components/ui/math-markdown";

export type FormulaBank = { source: string; sheet: string; cards: { id: string; title: string; chapter: string; content: string; sourceRow: number }[] };

export function FormulaLibrary({ search, bank }: { search: string; bank: FormulaBank }) {
  const [chapter, setChapter] = useState("");
  const [open, setOpen] = useState(bank.cards[0]?.id || "");
  const chapters = [...new Set(bank.cards.map(c => c.chapter))];
  const query = search.trim().toLowerCase();
  const cards = bank.cards.filter(c => (!chapter || c.chapter === chapter) && (!query || `${c.title} ${c.chapter} ${c.content}`.toLowerCase().includes(query)));
  return <section className="formula-library">
    <header className="wall-page-heading"><div><span className="wall-eyebrow">墨墨记忆卡 · 843 复习资料</span><h1>公式与知识点</h1><p>{bank.cards.length} 张知识卡 · {chapters.length} 个章节 · 公式、判据与真题方法</p></div></header>
    <div className="formula-layout"><nav className="wall-panel formula-chapters" aria-label="公式章节"><button aria-pressed={!chapter} onClick={() => setChapter("")}>全部知识点 <small>{bank.cards.length}</small></button>{chapters.map(ch => <button key={ch} aria-pressed={chapter === ch} onClick={() => setChapter(ch)}>{ch.replace(/^SS/, "").replace(/^DSP/, "DSP · ")}<small>{bank.cards.filter(c => c.chapter === ch).length}</small></button>)}</nav>
      <div className="formula-results"><div className="formula-result-heading"><span>{chapter || "全部章节"}</span><span>{cards.length} 张</span></div>{cards.length ? cards.map(c => <article className="wall-panel formula-card" key={c.id}><button className="formula-card-toggle" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? "" : c.id)}><span><small>{c.chapter.replace(/^SS/, "")}</small><strong>{c.title.replaceAll("|", " · ")}</strong></span><span aria-hidden="true">{open === c.id ? "−" : "+"}</span></button>{open === c.id && <div className="formula-card-body"><MathMarkdown content={c.content} /><footer>墨墨记忆卡 · 源表第 {c.sourceRow} 行</footer></div>}</article>) : <div className="wall-panel wall-empty">未找到匹配的知识点，请调整搜索或章节。</div>}
      <details className="formula-provenance"><summary>资料来源</summary><p>{bank.source} · {bank.sheet}。保留旧卡 ID 和源表行号；新增卡按真题题型补强。已校订重点公式，其他旧卡仍需逐项复核。</p></details></div>
    </div>
  </section>;
}
