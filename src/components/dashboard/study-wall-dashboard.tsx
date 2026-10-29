"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudyWallDashboard } from "@/hooks/use-study-wall-dashboard";
import { localDay, useLearningJournal } from "@/hooks/use-learning-journal";
import { FormulaLibrary, type FormulaBank } from "@/components/dashboard/formula-library";
import { MasteryOverview } from "@/components/dashboard/mastery-overview";
import { MathMarkdown } from "@/components/ui/math-markdown";
import { ProtectedImage } from "@/components/system/protected-image";
import { Copy } from "lucide-react";
import type { MasteryState, QuestionEntry, SubjectWiki } from "@/types/study-wall";

type View = "home" | "browse" | "favorite" | "review" | "notes" | "map" | "formulas";
type Filter = "all" | "unseen" | MasteryState;
type Row = { question: QuestionEntry; chapterId: string; chapterName: string; groupId: string; groupName: string };
const statusLabels = { unseen: "未作答", mastered: "熟悉", blurred: "模糊", unknown: "不会" };

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z", star: "m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4L2.8 9.7l6.4-.9Z",
    review: "M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2", grid: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
    note: "M5 3h14v18H5ZM9 7h6M9 11h6M9 15h4", search: "M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    arrow: "m9 5 7 7-7 7", back: "m15 5-7 7 7 7", more: "M5 12h.01M12 12h.01M19 12h.01",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", book: "M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16",
    close: "m6 6 12 12M6 18 18 6", menu: "M4 6h16M4 12h16M4 18h16", settings: "M4 7h16M4 17h16M9 4v6M15 14v6",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.book} /></svg>;
}

function Activity({ activity, today }: { activity: Record<string, number>; today: string }) {
  const days = useMemo(() => {
    if (!today) return [];
    const end = new Date(`${today}T12:00:00`);
    // Complete calendar columns; the final column ends at today.
    const start = new Date(end); start.setDate(end.getDate() - 364 - ((end.getDay() + 6) % 7));
    const result = [];
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) result.push(localDay(date));
    return result;
  }, [today]);
  return <section className="wall-panel wall-activity"><div className="wall-between"><h2>学习足迹 <span>过去一年</span></h2><span>今日复盘 <b>{activity[today] || 0}</b> 次</span></div>
    <div className="wall-heat-scroll"><div className="wall-heat-months">{days.filter((_, i) => i % 28 === 0).map(d => <span key={d}>{Number(d.slice(5, 7))}月</span>)}</div>
      <div className="wall-heat" role="img" aria-label="过去一年学习热力图，颜色越深表示复盘次数越多">{days.map(d => <span key={d} title={`${d}：复盘 ${activity[d] || 0} 次`} data-level={!activity[d] ? 0 : activity[d] < 5 ? 1 : activity[d] < 15 ? 2 : activity[d] < 30 ? 3 : 4} />)}</div></div>
    <div className="wall-heat-legend">少 {[0, 1, 2, 3, 4].map(n => <i key={n} data-level={n} />)} 多</div></section>;
}

export function StudyWallDashboard({ subjects, formulas, assetUrl, onReady }: { subjects: readonly SubjectWiki[]; formulas: FormulaBank; assetUrl: (path: string) => Promise<string>; onReady?: () => void }) {
  async function openPaper(year: string) {
    const tab = window.open("about:blank", "_blank");
    if (!tab) return;
    try { tab.location.href = await assetUrl(`/843/papers/${year}.pdf`); }
    catch { tab.close(); window.alert("试卷读取失败，请重新解锁后重试。 "); }
  }
  const state = useStudyWallDashboard(subjects, "study-wiki-wall.persisted-state.ustc843");
  const rows = useMemo<Row[]>(() => subjects.flatMap(subject => subject.chapters.flatMap(chapter => chapter.typeGroups.flatMap(group => group.questions.map(question => ({ question, chapterId: chapter.id, chapterName: chapter.name, groupId: group.id, groupName: group.name }))))), [subjects]);
  const ids = useMemo(() => new Set(rows.map(r => r.question.id)), [rows]);
  const learning = useLearningJournal(ids);
  const { journal, today } = learning;
  const [view, setView] = useState<View>("home");
  const [tab, setTab] = useState<"classified" | "papers">("classified");
  const [chapter, setChapter] = useState("");
  const [group, setGroup] = useState("");
  const [year, setYear] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState("");
  const [more, setMore] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [panel, setPanel] = useState<"notes" | "scratch" | "source" | null>(null);
  const [settings, setSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState("");
  const loaded = state.hasLoadedPersistedState && learning.ready;
  useEffect(() => { if (loaded) onReady?.(); }, [loaded, onReady]);
  const activeId = practiceIds[index];
  const active = rows.find(r => r.question.id === activeId);
  const practicing = !!active;
  const standalone = ["map", "formulas", "favorite"].includes(view);
  useEffect(() => {
    if (!practicing || paused) return;
    const timer = window.setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [practicing, paused]);
  const status = (id: string) => state.questionMasteryMap[id] || "unseen";
  const reviewRows = rows.filter(r => ["blurred", "unknown"].includes(status(r.question.id)));
  const mastered = rows.filter(r => status(r.question.id) === "mastered").length;
  const filtered = useMemo(() => rows.filter(r => {
    const q = r.question;
    if (chapter && r.chapterId !== chapter || group && r.groupId !== group || year && q.year !== year) return false;
    if (view === "favorite" && !state.questionFavoriteMap[q.id]) return false;
    if (view === "review" && !["blurred", "unknown"].includes(state.questionMasteryMap[q.id])) return false;
    if (view === "notes" && !journal.notes[q.id]?.trim()) return false;
    if (filter !== "all" && (state.questionMasteryMap[q.id] || "unseen") !== filter) return false;
    const text = `${q.source} ${q.prompt} ${r.chapterName} ${r.groupName} ${journal.notes[q.id] || ""}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [rows, chapter, group, year, view, state.questionFavoriteMap, state.questionMasteryMap, journal.notes, filter, search]);
  const years = useMemo(() => [...new Set(rows.map(r => r.question.year))].sort().reverse(), [rows]);
  const last = rows.find(r => r.question.id === (journal.lastQuestionId || state.lastMasteredRecord?.questionId));
  const chapters = subjects[0]?.chapters || [];
  const progress = rows.length ? Math.round(mastered / rows.length * 100) : 0;
  const countdown = journal.examDate && today ? Math.ceil((Date.parse(`${journal.examDate}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86400000) : null;

  function navigate(next: View) {
    setView(next); setPracticeIds([]); setChapter(""); setGroup(""); setYear(""); setFilter("all"); setSearch(""); setSidebar(false); setSettings(false);
  }
  function start(list: Row[], id?: string) {
    if (!loaded || !list.length) return;
    const ordered = tab === "papers" ? [...list].sort((a, b) => Number(b.question.year) - Number(a.question.year) || (a.question.paperMajor || 0) - (b.question.paperMajor || 0) || (a.question.paperMinor || 0) - (b.question.paperMinor || 0)) : list;
    const next = Math.max(0, ordered.findIndex(r => r.question.id === id));
    setPracticeIds(ordered.map(r => r.question.id)); setIndex(next); setPanel(null); setSettings(false); setElapsed(0); setPaused(false); setNotice("");
    learning.update({ lastQuestionId: ordered[next].question.id }); window.scrollTo(0, 0);
  }
  function move(next: number) {
    if (next < 0 || next >= practiceIds.length) return;
    setIndex(next); setPanel(null); setNotice(""); learning.update({ lastQuestionId: practiceIds[next] }); window.scrollTo(0, 0);
  }
  function rate(mastery: MasteryState) {
    state.setQuestionMastery(activeId, mastery); learning.recordReview(); setNotice(`已标记：${statusLabels[mastery]}`);
  }
  async function copyQuestion() {
    if (!active?.question.latex) { setNotice("本题暂无可复制的排版源码"); return; }
    try {
      await navigator.clipboard.writeText(`${active.question.source}\n\n${active.question.latex}`);
      setNotice("已复制题目 LaTeX 源码");
    } catch { setNotice("复制失败，请检查浏览器剪贴板权限"); }
  }
  const title = { home: "学习首页", browse: tab === "papers" ? "历年套卷" : "分类题库", favorite: "收藏本", review: "错题复测", notes: "题目笔记", map: "真题掌握", formulas: "公式与知识点" }[view];
  const chooseChapter = (id: string) => { setChapter(id); setGroup(""); setYear(""); setView("browse"); setExpanded(id); setSidebar(false); start(rows.filter(r => r.chapterId === id)); };

  const searchField = <label className="wall-search"><Icon name="search" /><input aria-label={view === "formulas" ? "搜索公式知识点" : "搜索真题"} placeholder={view === "formulas" ? "搜索公式、性质、知识点…" : "搜索年份、题干、题型…"} value={search} onChange={e => { setSearch(e.target.value); if (view === "home") setView("browse"); }} />{search && <button className="wall-icon" aria-label="清除搜索" onClick={() => setSearch("")}><Icon name="close" size={16} /></button>}</label>;

  const practiceView = practicing ? <div className="wall-app wall-practice" style={{ "--question-size": `${fontSize}px` } as React.CSSProperties}>
    <header className="wall-practice-header"><button className="wall-quiet" onClick={() => { setPracticeIds([]); setSettings(false); }}><Icon name="back" />返回{title}</button><span className="wall-practice-collection">843 信号与系统 <span>/ {tab === "papers" ? `${active.question.year}年套卷` : active.chapterName}</span></span>
      <div className="wall-actions"><button className="wall-quiet" onClick={() => setPaused(!paused)} aria-label={paused ? "继续计时" : "暂停计时"}><Icon name="clock" />{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}{paused ? " · 已暂停" : ""}</button><button className="wall-quiet" onClick={() => setPanel(panel === "scratch" ? null : "scratch")} aria-pressed={panel === "scratch"}>草稿</button><button className="wall-icon" aria-label="练习设置" aria-pressed={settings} onClick={() => setSettings(!settings)}><Icon name="settings" /></button></div></header>
    {settings && <section className="wall-settings wall-panel"><label>题面大小<input type="range" min="15" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} /></label><button onClick={() => setSettings(false)}>完成</button></section>}
    <div className="wall-practice-body"><div className="wall-question-top"><label>题目 <select aria-label="切换题目" value={index} onChange={e => move(Number(e.target.value))}>{practiceIds.map((id, i) => <option key={id} value={i}>{i + 1} · {rows.find(r => r.question.id === id)?.question.source}</option>)}</select></label><span>{index + 1} / {practiceIds.length}</span></div>
      <div className="wall-between wall-question-meta"><span className="wall-source">{active.question.source}</span><div className="wall-question-tools"><button className="wall-icon" aria-label="复制题目 LaTeX 源码" title="复制题目 LaTeX 源码" disabled={!active.question.latex} onClick={() => void copyQuestion()}><Copy size={19} strokeWidth={1.9} /></button><button className={`wall-icon ${state.questionFavoriteMap[activeId] ? "is-favorite" : ""}`} aria-label={state.questionFavoriteMap[activeId] ? "取消收藏" : "收藏题目"} aria-pressed={!!state.questionFavoriteMap[activeId]} onClick={() => state.toggleQuestionFavorite(activeId)}><Icon name="star" /></button></div></div>
      <article className="wall-question" aria-label={active.question.source}>
        {active.question.image ? <ProtectedImage className="wall-question-image" path={active.question.image} assetUrl={assetUrl} width={active.question.imageWidth} height={active.question.imageHeight} alt={`${active.question.source}题面（含公式与配图，资料缺损以题内标注为准）`} style={{ width: `${fontSize / 18 * 100}%`, maxWidth: "none" }} /> : <MathMarkdown content={active.question.prompt} />}
      </article>
      <details className="wall-knowledge"><summary>相关题型 <span>{active.groupName}</span>{active.question.proofMarker && <b>{active.question.proofMarker}</b>}</summary><p>{active.chapterName} / {active.groupName}</p><button onClick={() => { setPracticeIds([]); setTab("classified"); setView("browse"); setChapter(active.chapterId); setGroup(active.groupId); setYear(""); setFilter("all"); setSearch(""); }}>查看同类题</button></details>
      {active.question.note && !active.question.image && <div className="wall-source-note"><MathMarkdown content={active.question.note} /></div>}
      {panel && <section className="wall-panel wall-editor"><div className="wall-between"><h2>{panel === "notes" ? "本题笔记" : panel === "scratch" ? "本题草稿" : "题源说明"}</h2><button className="wall-icon" aria-label="关闭面板" onClick={() => setPanel(null)}><Icon name="close" /></button></div>{panel === "source" ? <><p>题面来自已整理的1997—2026年843真题分类册，第{active.question.sourcePage}页。保留原有公式、配图和资料疑点标注。</p><p>当前未导入正式答案与解析。</p><button className="wall-quiet" onClick={() => openPaper(active.question.year)}>打开{active.question.year}年套卷 ↗</button></> : <><textarea aria-label={panel === "notes" ? "本题笔记" : "本题草稿"} placeholder={panel === "notes" ? "记录错因、关键条件与下次解题的切入点……" : "在这里记录演算思路……"} value={(panel === "notes" ? journal.notes : journal.scratch)[activeId] || ""} onChange={e => learning.setText(panel === "notes" ? "notes" : "scratch", activeId, e.target.value)} /><small>{learning.saveError ? "本地存储不可用，请复制保存。" : "自动保存在当前浏览器"}</small></>}</section>}
      <div className="wall-question-pagination"><button className="wall-page-arrow wall-page-prev" aria-label="上一题" title="上一题" disabled={index === 0} onClick={() => move(index - 1)}><Icon name="back" size={25} /></button><span className={`wall-status ${status(activeId)}`}>{statusLabels[status(activeId)]}</span><button className="wall-page-arrow wall-page-next" aria-label="下一题" title="下一题" disabled={index === practiceIds.length - 1} onClick={() => move(index + 1)}><Icon name="arrow" size={25} /></button></div>
    </div>
    <footer className="wall-practice-footer"><div className="wall-actions"><button onClick={() => setPanel(panel === "source" ? null : "source")} aria-pressed={panel === "source"}>题源说明</button><button onClick={() => setPanel(panel === "notes" ? null : "notes")} aria-pressed={panel === "notes"}><Icon name="note" />笔记{journal.notes[activeId]?.trim() ? " ·" : ""}</button></div><div className="wall-ratings" aria-label="标记掌握程度"><button className="mastered" aria-pressed={status(activeId) === "mastered"} onClick={() => rate("mastered")}>✓ 熟悉</button><button className="blurred" aria-pressed={status(activeId) === "blurred"} onClick={() => rate("blurred")}>! 模糊</button><button className="unknown" aria-pressed={status(activeId) === "unknown"} onClick={() => rate("unknown")}>× 不会</button></div><span role="status" className="wall-save-notice">{notice}</span></footer>
  </div> : null;

  return <>{practiceView}<div style={{ display: practicing ? "none" : undefined }}><div className={`wall-app wall-shell ${standalone ? "wall-map-shell" : ""}`}>
    {!standalone && <><button className="wall-mobile-nav wall-icon" aria-label="打开章节目录" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><Icon name="menu" /></button>{sidebar && <button className="wall-sidebar-backdrop" aria-label="关闭章节目录" onClick={() => setSidebar(false)} />}
      <aside className={`wall-sidebar ${sidebar ? "is-open" : ""}`}><button className="wall-brand" onClick={() => { navigate("home"); }}><span className="wall-brand-mark"><Icon name="book" size={25} /></span><strong>843 <small>信号与系统</small></strong></button>
        <nav aria-label="学习导航">{([ ["home", "home", "首页"], ["favorite", "star", "收藏本"], ["review", "review", "错题复测"], ["formulas", "book", "公式与知识点"] ] as const).map(([id, icon, label]) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => navigate(id)}><Icon name={icon} />{label}{id === "review" && reviewRows.length > 0 && <small>{reviewRows.length}</small>}</button>)}<button onClick={() => setMore(!more)} aria-expanded={more}><Icon name="more" />更多功能<span className="wall-nav-chevron">{more ? "⌄" : "›"}</span></button>{more && <div className="wall-more">{([ ["map", "grid", "真题掌握"], ["notes", "note", "题目笔记"] ] as const).map(([id, icon, label]) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => navigate(id)}><Icon name={icon} />{label}</button>)}</div>}</nav>
        <div className="wall-sidebar-divider" /><nav aria-label="真题目录入口"><button className={tab === "classified" && view === "browse" ? "is-active" : ""} aria-pressed={tab === "classified"} onClick={() => { setTab("classified"); navigate("browse"); }}><Icon name="grid" />分类<span className="wall-nav-chevron">{tab === "classified" ? "⌄" : "›"}</span></button><button className={tab === "papers" && view === "browse" ? "is-active" : ""} aria-pressed={tab === "papers"} onClick={() => { setTab("papers"); navigate("browse"); }}><Icon name="book" />套卷<span className="wall-nav-chevron">{tab === "papers" ? "⌄" : "›"}</span></button></nav><div className="wall-sidebar-label">{tab === "classified" ? "题型目录" : "年份目录"} <span>1997—2026</span></div>
        <div className="wall-tree">{tab === "classified" ? chapters.map((c, i) => <div className="wall-tree-item" key={c.id}><button className={`wall-tree-chapter ${chapter === c.id ? "is-selected" : ""}`} onClick={() => chooseChapter(c.id)}><span className="wall-chapter-number">{String(i + 1).padStart(2, "0")}</span><span>{c.name}</span></button><button className="wall-tree-expand" aria-label={`展开${c.name}题型`} aria-expanded={expanded === c.id} onClick={() => setExpanded(expanded === c.id ? "" : c.id)}>{expanded === c.id ? "⌄" : "›"}</button>{expanded === c.id && <div className="wall-tree-groups">{c.typeGroups.map(g => <button key={g.id} className={group === g.id ? "is-selected" : ""} onClick={() => { setChapter(c.id); setGroup(g.id); setView("browse"); setSidebar(false); start(rows.filter(r => r.groupId === g.id)); }}>{g.name}{g.questions.some(q => q.proofMarker) && <small>含证明</small>}</button>)}</div>}</div>) : years.map(y => <button key={y} className={`wall-tree-chapter ${year === y ? "is-selected" : ""}`} onClick={() => { setYear(y); setChapter(""); setGroup(""); setView("browse"); setSidebar(false); start(rows.filter(r => r.question.year === y)); }}><Icon name="book" size={17} />{y}年真题</button>)}</div>
        <div className="wall-sidebar-bottom"><span>本地学习空间</span><small>记录保存在当前浏览器</small></div></aside></>}
    <div className="wall-main"><header className="wall-topbar">{standalone ? <div className="wall-standalone-nav"><button className="wall-quiet" onClick={() => navigate("home")}><Icon name="back" />返回首页</button>{view !== "map" && searchField}</div> : searchField}<div className="wall-top-identity"><span className="wall-local-dot" /> 本地学习 <span className="wall-avatar">843</span></div></header>
      <div className="wall-content"><div className="wall-section-top">{view === "map" && <div className="wall-tabs" role="tablist" aria-label="掌握地图组织方式"><button role="tab" aria-selected={tab === "classified"} className={tab === "classified" ? "is-active" : ""} onClick={() => { setTab("classified"); navigate("map"); }}>真题分类</button><button role="tab" aria-selected={tab === "papers"} className={tab === "papers" ? "is-active" : ""} onClick={() => { setTab("papers"); navigate("map"); }}>年份</button></div>}{!standalone && <button className="wall-date-setting" onClick={() => setSettings(!settings)}>{countdown !== null ? countdown >= 0 ? <>距离考试 <b>{countdown}</b> 天</> : "考试日期已过 · 修改" : "设置考试日期"}</button>}</div>
        {settings && <div className="wall-date-editor wall-panel"><label>目标考试日期 <input aria-label="目标考试日期" type="date" value={journal.examDate} onChange={e => learning.update({ examDate: e.target.value })} /></label><button onClick={() => setSettings(false)}>完成</button></div>}
        {!loaded ? <div className="wall-empty" role="status">正在读取本地学习记录…</div> : view === "home" ? <>
          <div className="wall-date">{today ? new Date(`${today}T12:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" }) : ""}<span>中国科学技术大学 · 843</span></div>
          <div className="wall-home-cards"><section className="wall-panel wall-continue"><div className="wall-between"><span className="wall-eyebrow">继续学习</span><button className="wall-quiet" onClick={() => navigate("browse")}>切换题目 <Icon name="arrow" size={16} /></button></div><h1>{last ? last.groupName : "信号与系统基础"}</h1><p>{last ? `${last.chapterName} / ${last.question.source}` : "从一道题开始，逐步建立你的掌握地图"}</p><span className="wall-card-caption">1997—2026年真题 · {rows.length}个已收录单元</span><button className="wall-button-outline" onClick={() => start(rows, last?.question.id)}>{last ? "继续学习" : "开始学习"}<Icon name="arrow" size={16} /></button></section>
          <section className="wall-panel wall-review-card"><div className="wall-between"><span className="wall-eyebrow">待复测</span><button className="wall-quiet" onClick={() => navigate("review")}>查看错题 <Icon name="arrow" size={16} /></button></div><div className="wall-review-number">{reviewRows.length}<span>题待复测</span></div><p>{reviewRows.length ? "再做一次，检查不确定的条件与步骤。" : "标记“不确定”或“不会做”的题目会收录在这里。"}</p><button className="wall-button-primary" disabled={!reviewRows.length} onClick={() => { setView("review"); start(reviewRows); }}>开始复测<Icon name="arrow" size={16} /></button></section></div>
          <Activity activity={journal.activity} today={today} />
          <section className="wall-panel wall-progress-card"><div><h2>掌握情况</h2><p>已掌握 {mastered} / {rows.length} 题</p></div><div className="wall-progress-track"><span style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong><button className="wall-quiet" onClick={() => navigate("map")}>查看真题掌握<Icon name="arrow" size={16} /></button></section>
          <div className="wall-data-note">资料说明：已整理30个年份；2025年选择题第7、8题缺失，第4题选项不全。尚未导入正式答案。</div>
        </> : view === "formulas" ? <FormulaLibrary search={search} bank={formulas} /> : view === "map" ? <MasteryOverview key={tab} rows={rows} byYear={tab === "papers"} mastery={state.questionMasteryMap} favorites={state.questionFavoriteMap} notes={journal.notes} onPractice={start} /> : <>
          <div className="wall-page-heading"><div><span className="wall-eyebrow">843 信号与系统 · {tab === "classified" ? "按题型复盘" : "按年份训练"}</span><h1>{title}</h1><p>{filtered.length} 个题目单元{chapter ? ` · ${chapters.find(c => c.id === chapter)?.name}` : ""}{group ? ` / ${rows.find(r => r.groupId === group)?.groupName}` : ""}</p></div><button className="wall-button-primary" disabled={!filtered.length} onClick={() => start(filtered)}>开始练习<Icon name="arrow" size={17} /></button></div>
          <section className="wall-panel wall-bank-panel"><div className="wall-filterbar"><label>{tab === "papers" ? "年份" : "章节"}<select aria-label={tab === "papers" ? "筛选年份" : "筛选章节"} value={tab === "papers" ? year : chapter} onChange={e => { if (tab === "papers") setYear(e.target.value); else { setChapter(e.target.value); setGroup(""); } }}><option value="">全部{tab === "papers" ? "年份" : "章节"}</option>{tab === "papers" ? years.map(y => <option key={y} value={y}>{y}年</option>) : chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>掌握状态<select aria-label="筛选掌握状态" value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">全部状态</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{group && <button className="wall-quiet" onClick={() => setGroup("")}>清除题型筛选 ×</button>}<div className="wall-view-switch"><button aria-pressed={!listMode} onClick={() => setListMode(false)}><Icon name="grid" size={16} />地图</button><button aria-pressed={listMode} onClick={() => setListMode(true)}><Icon name="note" size={16} />列表</button></div></div>
          <div className="wall-legend">{Object.entries(statusLabels).map(([key, label]) => <span key={key}><i className={`wall-status-dot ${key}`} />{label}</span>)}</div>
          {!filtered.length ? <div className="wall-empty"><Icon name={view === "favorite" ? "star" : view === "notes" ? "note" : "search"} size={30} /><h2>{view === "favorite" ? "还没有符合条件的收藏" : view === "notes" ? "还没有符合条件的笔记" : "没有符合条件的题目"}</h2><p>可调整筛选，或回到题库选择题目。</p><button onClick={() => navigate("browse")}>浏览全部真题</button></div> : (tab === "papers" ? years : chapters.map(c => c.id)).map(key => {
            const sectionRows = filtered.filter(r => tab === "papers" ? r.question.year === key : r.chapterId === key);
            if (!sectionRows.length) return null;
            const sorted = tab === "papers" ? [...sectionRows].sort((a, b) => (a.question.paperMajor || 0) - (b.question.paperMajor || 0) || (a.question.paperMinor || 0) - (b.question.paperMinor || 0)) : sectionRows;
            return <section className="wall-question-group" key={key}><div className="wall-between"><h2>{tab === "papers" ? `${key}年真题` : sectionRows[0].chapterName}<span>{sectionRows.length}题</span></h2>{tab === "papers" && <button className="wall-quiet" onClick={() => openPaper(key)}>原排版PDF ↗</button>}</div>{key === "2025" && <p className="wall-gap-note">选择题第7、8题缺失，第4题选项不全，按现有来源保留。</p>}
              {listMode ? <div className="wall-question-list">{sorted.map(r => <button key={r.question.id} onClick={() => start(filtered, r.question.id)}><span className={`wall-status-dot ${status(r.question.id)}`} /><span><strong>{r.question.source}{r.question.proofMarker && <em>{r.question.proofMarker}</em>}</strong><small>{r.groupName}</small>{view === "notes" && <p>{journal.notes[r.question.id]}</p>}</span>{state.questionFavoriteMap[r.question.id] && <span className="is-favorite">★</span>}<Icon name="arrow" size={16} /></button>)}</div> : <div className="wall-question-grid">{sorted.map(r => <button key={r.question.id} className={`wall-tile ${status(r.question.id)}`} aria-label={`${r.question.source}，${r.groupName}，${statusLabels[status(r.question.id)]}`} onClick={() => start(filtered, r.question.id)}><span>{r.question.year}</span><strong>{r.question.paperMajor}{r.question.paperMinor ? `（${r.question.paperMinor}）` : ""}</strong><small>{status(r.question.id) === "mastered" ? "✓" : status(r.question.id) === "blurred" ? "!" : status(r.question.id) === "unknown" ? "×" : "·"}</small>{state.questionFavoriteMap[r.question.id] && <i>★</i>}{journal.notes[r.question.id]?.trim() && <b className="wall-tile-note" aria-label="有笔记" />}</button>)}</div>}</section>;
          })}</section>
        </>}
        {learning.saveError && <p role="alert">浏览器本地存储不可用，请复制保存笔记。</p>}
      </div>
    </div>
  </div></div></>;
}
