"use client";

import { useState } from "react";
import type { MasteryState, QuestionEntry } from "@/types/study-wall";
export type MasteryRow = { question: QuestionEntry; chapterId: string; chapterName: string; groupId: string; groupName: string };
type Status = "unseen" | MasteryState;
const labels: Record<Status, string> = { unseen: "未作答", mastered: "已掌握", blurred: "不确定", unknown: "不会做" };
const symbols: Record<Status, string> = { unseen: "", mastered: "✓", blurred: "!", unknown: "×" };
const statuses: Status[] = ["mastered", "blurred", "unknown", "unseen"];

export function MasteryOverview({ rows, byYear, mastery, favorites, notes, onPractice }: {
  rows: MasteryRow[]; byYear: boolean; mastery: Record<string, MasteryState>; favorites: Record<string, boolean>; notes: Record<string, string>;
  onPractice: (rows: MasteryRow[], id?: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [notesOnly, setNotesOnly] = useState(false);
  const [mode, setMode] = useState<"progress" | "map">("progress");
  const [showSymbols, setShowSymbols] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const status = (r: MasteryRow): Status => mastery[r.question.id] || "unseen";
  const keyOf = (r: MasteryRow) => byYear ? r.question.year : r.chapterId;
  const keys = [...new Set(rows.map(keyOf))];
  if (byYear) keys.sort().reverse();
  const titleOf = (key: string) => byYear ? `${key}年` : rows.find(r => r.chapterId === key)?.chapterName;
  const scope = rows.filter(r => !selected || keyOf(r) === selected);
  const matching = scope.filter(r => (statusFilter === "all" || status(r) === statusFilter) && (!favoriteOnly || favorites[r.question.id]) && (!notesOnly || notes[r.question.id]?.trim()));
  const ordered = byYear ? [...matching].sort((a, b) => Number(b.question.year) - Number(a.question.year) || (a.question.paperMajor || 0) - (b.question.paperMajor || 0) || (a.question.paperMinor || 0) - (b.question.paperMinor || 0)) : matching;
  const counts = (items: MasteryRow[]) => Object.fromEntries(statuses.map(s => [s, items.filter(r => status(r) === s).length])) as Record<Status, number>;
  const scopeCounts = counts(scope);
  const cells = (items: MasteryRow[]) => <div className="mastery-cells">{items.map(r => <button key={r.question.id} className={`mastery-cell ${status(r)}`} title={`${r.question.source} · ${r.groupName} · ${labels[status(r)]}`} aria-label={`${r.question.source}，${r.groupName}，${labels[status(r)]}`} onClick={() => onPractice(ordered, r.question.id)}>{showSymbols ? symbols[status(r)] : ""}</button>)}</div>;
  return <section className="mastery-overview">
    <div className="wall-page-heading"><div><span className="wall-eyebrow">843 信号与系统 · 复盘工作台</span><h1>真题掌握</h1><p>按{byYear ? "年份" : "题型"}查看薄弱点，点击题格直接练习</p></div><button className="wall-button-primary" disabled={!matching.length} onClick={() => onPractice(ordered)}>练习所选题目（{matching.length}）</button></div>
    <div className="wall-panel mastery-panel">
      <div className="mastery-filter-row"><strong>{byYear ? "年份" : "分类"}</strong><div className="mastery-chips"><button aria-pressed={!selected} onClick={() => setSelected("")}>全部 <small>{rows.length}</small></button>{keys.map(key => <button key={key} aria-pressed={selected === key} onClick={() => setSelected(selected === key ? "" : key)}>{titleOf(key)} <small>{rows.filter(r => keyOf(r) === key).length}</small></button>)}</div></div>
      <div className="mastery-filter-row"><strong>掌握状态</strong><div className="mastery-chips"><button aria-pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")}>全部 <small>{scope.length}</small></button>{statuses.map(s => <button key={s} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}><i className={`mastery-key ${s}`}>{symbols[s]}</i>{labels[s]} <small>{scopeCounts[s]}</small></button>)}</div></div>
      <div className="mastery-filter-row mastery-properties"><strong>题目属性</strong><div className="mastery-chips"><button aria-pressed={favoriteOnly} onClick={() => setFavoriteOnly(!favoriteOnly)}>☆ 收藏题 <small>{scope.filter(r => favorites[r.question.id]).length}</small></button><button aria-pressed={notesOnly} onClick={() => setNotesOnly(!notesOnly)}>有笔记 <small>{scope.filter(r => notes[r.question.id]?.trim()).length}</small></button>{(selected || statusFilter !== "all" || favoriteOnly || notesOnly) && <button onClick={() => { setSelected(""); setStatusFilter("all"); setFavoriteOnly(false); setNotesOnly(false); }}>清除筛选</button>}</div></div>
      <div className="mastery-toolbar"><div className="wall-tabs" role="tablist" aria-label="掌握展示方式"><button role="tab" aria-selected={mode === "progress"} className={mode === "progress" ? "is-active" : ""} onClick={() => setMode("progress")}>学习进度</button><button role="tab" aria-selected={mode === "map"} className={mode === "map" ? "is-active" : ""} onClick={() => setMode("map")}>题目地图</button></div><label><input type="checkbox" checked={showSymbols} onChange={e => setShowSymbols(e.target.checked)} />显示状态符号</label><span>{matching.length} 题</span></div>
      {selected === "2025" && <p className="wall-gap-note">2025 年选择题第 7、8 题缺失，第 4 题选项不全，以下按已收录单元统计。</p>}
      {!matching.length ? <div className="wall-empty">没有符合筛选条件的题目</div> : mode === "map" ? <><p className="mastery-hint">{byYear ? "按年份从新到旧、卷内题号排序" : "按章节与题型排序"} · 悬停查看题源，点击开始练习</p>{cells(ordered)}</> : keys.map(key => {
        const items = ordered.filter(r => keyOf(r) === key);
        if (!items.length) return null;
        // Summary always uses the whole group: selecting a status must not inflate mastery rate.
        const all = scope.filter(r => keyOf(r) === key);
        const c = counts(all); const percentage = c.mastered / all.length * 100;
        return <section className="mastery-progress-row" key={key}><button className="mastery-progress-toggle" aria-expanded={!!expanded[key]} onClick={() => setExpanded({ ...expanded, [key]: !expanded[key] })}><span className="mastery-progress-caption"><strong>{titleOf(key)}</strong><span>掌握 {c.mastered} / {all.length} 题</span><b>{Number(percentage.toFixed(1))}%</b><span aria-hidden="true">{expanded[key] ? "⌃" : "⌄"}</span></span><span className="mastery-bar" role="img" aria-label={statuses.map(s => `${labels[s]}${c[s]}题`).join("，")}>{statuses.map(s => <span key={s} className={s} style={{ width: `${c[s] / all.length * 100}%` }} />)}</span></button>{expanded[key] && <div className="mastery-progress-detail"><p>{statuses.map(s => `${labels[s]} ${c[s]} 题`).join("　 ·　 ")}</p>{cells(items)}<button className="wall-quiet" onClick={() => onPractice(items)}>练习本组（{items.length}） →</button></div>}</section>;
      })}
      <p className="mastery-hint mastery-footnote">按已收录题目单元统计；同一道题在分类与套卷中共用学习记录。</p>
    </div>
  </section>;
}
