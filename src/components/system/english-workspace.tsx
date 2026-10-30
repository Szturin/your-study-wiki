"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";
import { trackRecordChange } from "@/lib/sync-record";
import type { EnglishBank } from "@/types/english";
import type { EnglishSection } from "./study-portal";

type Preferences = { theme: "light" | "dark"; size: number; spacing: "normal" | "relaxed"; width: "normal" | "wide" };
type WritingProvider = "codex" | "deepseek";
type ProviderOption = { id: WritingProvider; label: string; model: string; available: boolean };
const defaults: Preferences = { theme: "light", size: 17, spacing: "relaxed", width: "normal" };
const labels: Record<EnglishSection, string> = { reading: "阅读真题", writing: "写作系统", knowledge: "精读知识点" };

function useSavedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    const restored = () => {
      try { const raw = localStorage.getItem(key); if (raw) setValue(JSON.parse(raw) as T); }
      catch { /* keep current state */ }
    };
    window.addEventListener("study-record-restored", restored);
    return () => window.removeEventListener("study-record-restored", restored);
  }, [key]);
  useEffect(() => {
    try {
      const next = JSON.stringify(value);
      const previous = localStorage.getItem(key);
      if (previous !== next) {
        trackRecordChange(key, previous, next);
        localStorage.setItem(key, next);
        window.dispatchEvent(new Event("study-record-changed"));
      }
    } catch { /* private mode */ }
  }, [key, value]);
  return [value, setValue] as const;
}

function Reading({ bank }: { bank: EnglishBank["reading"] }) {
  const [mode, setMode] = useState<"articles" | "questions" | "vocab" | "phrases" | "daily" | "review">("articles");
  const [year, setYear] = useState("all");
  const [query, setQuery] = useState("");
  const [articleId, setArticleId] = useState("");
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useSavedState<Record<string, { choice?: string; reveal?: boolean }>>("english-reading-answers-v1", {});
  const [mastered, setMastered] = useSavedState<string[]>("lab-mastered", []);
  const [more, setMore] = useState(40);
  const years = useMemo(() => [...new Set(bank.articles.map(item => item.year))].sort((a, b) => b - a), [bank]);
  const search = query.trim().toLowerCase();
  const articles = useMemo(() => bank.articles.filter(a => (year === "all" || String(a.year) === year) && (!search || `${a.year} ${a.text} ${a.topic} ${a.body ?? a.paragraphs.map(p => p.text).join(" ")}`.toLowerCase().includes(search))), [bank, year, search]);
  const questions = useMemo(() => bank.questions.filter(q => (year === "all" || String(q.year) === year) && (!search || `${q.year} ${q.number} ${q.stem} ${q.options.map(o => o.text).join(" ")}`.toLowerCase().includes(search))), [bank, year, search]);
  const vocab = useMemo(() => bank.vocab.filter(v => !search || `${v.word} ${v.meaning} ${v.usage}`.toLowerCase().includes(search)), [bank, search]);
  const phrases = useMemo(() => bank.phrases.filter(v => !search || v.join(" ").toLowerCase().includes(search)), [bank, search]);
  const selectedArticle = bank.articles.find(a => a.id === articleId);
  const pages = Math.max(1, Math.ceil(questions.length / 10));

  function openQuestions(article: EnglishBank["reading"]["articles"][number]) {
    setMode("questions"); setYear(String(article.year)); setQuery("");
    const first = bank.questions.findIndex(q => q.year === article.year && q.text === article.text);
    const yearStart = bank.questions.findIndex(q => q.year === article.year);
    setPage(Math.max(0, Math.floor((first - yearStart) / 10)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <>
    <div className="english-subnav" role="tablist" aria-label="阅读内容">
      {([ ["articles", "历年文章"], ["questions", "题目与选项"], ["vocab", "词汇"], ["phrases", "词组搭配"], ["review", "FSRS 复习"], ["daily", "每日阅读"] ] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? "active" : ""} onClick={() => { setMode(id); setQuery(""); setPage(0); }}>{label}</button>)}
    </div>
    {!["daily", "review"].includes(mode) && <div className="english-controls"><label className="english-search"><Search size={17} /><input aria-label="搜索英语内容" placeholder="搜索文章、题干或词汇" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>{["articles", "questions"].includes(mode) && <select aria-label="年份" value={year} onChange={e => { setYear(e.target.value); setPage(0); setArticleId(""); }}><option value="all">全部年份</option>{years.map(y => <option key={y}>{y}</option>)}</select>}<span className="english-count">{mode === "articles" ? `${articles.length} 篇` : mode === "questions" ? `${questions.length} 题` : mode === "phrases" ? `${phrases.length} 条` : `${vocab.length} 词`}</span></div>}
    {mode === "articles" && <div className="english-content">
      {selectedArticle && <article className="english-article" id="english-article"><div className="english-article-head"><button className="english-text-button" onClick={() => setArticleId("")}><ArrowLeft size={17} /> 文章目录</button><span>{selectedArticle.year} · Text {selectedArticle.text}</span></div><h2>{selectedArticle.topic}</h2>{selectedArticle.paragraphs.map(p => <p key={p.label}><b>{p.label}</b> {p.text}</p>)}<button className="english-primary" onClick={() => openQuestions(selectedArticle)}>练习本篇题目 <ArrowRight size={17} /></button></article>}
      {!selectedArticle && <div className="english-article-list">{articles.map(a => <button key={a.id} onClick={() => { setArticleId(a.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>{a.year} · Text {a.text}</span><strong>{a.topic}</strong><small>{a.questions.length} 题</small><ArrowRight size={17} /></button>)}</div>}
    </div>}
    {mode === "questions" && <div className="english-content english-questions">{questions.slice(page * 10, page * 10 + 10).map(q => { const state = answers[q.id] || {}; return <article className="english-question" key={q.id}><div className="english-question-meta"><span>{q.year} · Text {q.text} · {q.number}</span><span>{q.type}</span></div><h2>{q.stem}</h2><div className="english-options">{q.options.map(o => <button key={o.label} disabled={state.reveal} className={`${state.choice === o.label ? "selected" : ""} ${state.reveal && o.label === q.answer ? "correct" : ""} ${state.reveal && state.choice === o.label && o.label !== q.answer ? "incorrect" : ""}`} onClick={() => setAnswers({ ...answers, [q.id]: { choice: o.label } })}><b>{o.label}</b><span>{o.text}</span></button>)}</div><div className="english-question-actions"><button className="english-text-button" onClick={() => setAnswers({ ...answers, [q.id]: { ...state, reveal: !state.reveal } })}>{state.reveal ? "收起解析" : "核对答案"}</button><button className="english-text-button" onClick={() => { setMode("articles"); setYear(String(q.year)); setQuery(""); setArticleId(`${q.year}-T${q.text}`); }}>阅读原文 <BookOpen size={15} /></button></div>{state.reveal && <div className="english-answer"><strong>答案 {q.answer}</strong>{q.locator?.length > 0 && <p><b>{q.locator[0].p}</b> {q.locator[0].text}</p>}<small>定位段落供回看原文；没有人工解析的题目不推断选项理由。</small></div>}</article>; })}{questions.length > 10 && <div className="english-pager"><button disabled={page <= 0} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }); }} aria-label="上一页"><ChevronLeft /></button><span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }); }} aria-label="下一页"><ChevronRight /></button></div>}</div>}
    {mode === "vocab" && <div className="english-content english-vocab-list">{vocab.slice(0, more).map(v => <article key={v.word} className="english-vocab"><div><strong>{v.word}</strong>{v.phonetic && <small> /{v.phonetic}/</small>}</div><p>{v.meaning}</p><small>{v.usage}</small><button className={mastered.includes(v.word) ? "mastered" : ""} onClick={() => setMastered(mastered.includes(v.word) ? mastered.filter(w => w !== v.word) : [...mastered, v.word])}>{mastered.includes(v.word) ? <><Check size={15} /> 已掌握</> : "标为掌握"}</button></article>)}{more < vocab.length && <button className="english-primary" onClick={() => setMore(more + 40)}>显示更多</button>}</div>}
    {mode === "phrases" && <div className="english-content english-phrase-list">{phrases.map(([type, en, zh, note], i) => <article key={`${type}-${en}-${i}`}><small>{type}</small><h2>{en}</h2><p>{zh}</p><span>{note}</span></article>)}</div>}
    {mode === "daily" && <DailyReading />}
    {mode === "review" && <ReadingReview vocab={bank.vocab} />}
  </>;
}

type DailyData = {
  date: string; title: string;
  article: { wordCount: number; paragraphs: { number: number; text: string }[] };
  questions: { number: number; stem: string; options: Record<string, string>; answer: string; explanation?: string }[];
  structure: { overall: string; paragraphRelations: string[] };
  targetVocabulary: { word: string; contextMeaning: string; collocation: string; paragraph: number }[];
  targetPhrases: { phrase: string; meaning: string; paragraph: number }[];
};

function DailyReading() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong" }).format(new Date());
  const [cache, setCache] = useSavedState<Record<string, DailyData>>("english-daily-cache-v1", {});
  const data = cache[date] || null;
  const [theme, setTheme] = useState("随机主题");
  const [difficulty, setDifficulty] = useState("标准");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<number[]>([]);

  async function generate() {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) { setMessage("每日阅读生成服务仅在本机可用，已有内容可继续阅读。"); return; }
    setBusy(true); setMessage("正在生成阅读内容…");
    try {
      const response = await fetch("http://127.0.0.1:8765/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, theme, difficulty }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = await response.json() as DailyData;
      if (!next.article?.paragraphs?.length || !next.questions?.length) throw new Error("内容不完整");
      setCache({ ...cache, [date]: next }); setChoices({}); setRevealed([]); setMessage("");
    } catch { setMessage("生成服务未启动或连接失败。请启动 Vault 中的每日阅读服务。"); }
    finally { setBusy(false); }
  }

  return <div className="english-content english-daily"><div className="english-daily-controls"><select aria-label="阅读主题" value={theme} onChange={e => setTheme(e.target.value)}>{["随机主题", "社会与公共生活", "教育与工作", "科技与科学", "文化与媒体", "环境与政策"].map(x => <option key={x}>{x}</option>)}</select><select aria-label="阅读难度" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>标准</option><option>稍难</option></select><button className="english-primary" disabled={busy} onClick={generate}>{data ? "重新生成" : "生成今日阅读"}</button></div>{message && <p role="status" className="english-daily-message">{message}</p>}{data && <><div className="english-daily-heading"><span>{data.date} · {data.article.wordCount} 词</span><h2>{data.title}</h2></div><article className="english-article">{data.article.paragraphs.map(p => <p key={p.number}><b>P{p.number}</b> {p.text}</p>)}</article><section className="english-daily-section"><h3>练习题</h3>{data.questions.map(q => <div className="english-question" key={q.number}><h2>{q.number}. {q.stem}</h2><div className="english-options">{Object.entries(q.options).map(([letter, text]) => <button key={letter} disabled={revealed.includes(q.number)} className={`${choices[q.number] === letter ? "selected" : ""} ${revealed.includes(q.number) && letter === q.answer ? "correct" : ""}`} onClick={() => setChoices({ ...choices, [q.number]: letter })}><b>{letter}</b><span>{text}</span></button>)}</div><button className="english-text-button" onClick={() => setRevealed([...revealed, q.number])}>核对答案</button>{revealed.includes(q.number) && <div className="english-answer"><strong>答案 {q.answer}</strong>{q.explanation && <p>{q.explanation}</p>}</div>}</div>)}</section><section className="english-daily-section"><h3>文章结构</h3><p>{data.structure.overall}</p>{data.structure.paragraphRelations?.map((x, i) => <p key={i}>P{i + 1} · {x}</p>)}</section><section className="english-daily-section"><h3>重点词汇</h3>{data.targetVocabulary.map(v => <p key={v.word}><b>{v.word}</b> · {v.contextMeaning} · {v.collocation}</p>)}</section><section className="english-daily-section"><h3>词组搭配</h3>{data.targetPhrases.map(v => <p key={v.phrase}><b>{v.phrase}</b> · {v.meaning}</p>)}</section></>}</div>;
}

type ReviewDb = { cards: Record<string, Card>; logs: unknown[]; settings: { retention: number; newLimit: number } };
const emptyReviewDb: ReviewDb = { cards: {}, logs: [], settings: { retention: .9, newLimit: 20 } };

function ReadingReview({ vocab }: { vocab: EnglishBank["reading"]["vocab"] }) {
  const [db, setDb] = useSavedState<ReviewDb>("reading-lab-fsrs-v1", emptyReviewDb);
  const [seen, setSeen] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const now = new Date();
  const due = vocab.filter(v => (!db.cards?.[v.word] || new Date(db.cards[v.word].due) <= now) && !seen.includes(v.word)).slice(0, Math.max(0, (db.settings?.newLimit || 20) - seen.length));
  const item = due[0] || null;

  function grade(rating: 1 | 2 | 3 | 4) {
    if (!item) return;
    const scheduler = fsrs({ request_retention: db.settings?.retention || .9, maximum_interval: 36500, enable_fuzz: true, enable_short_term: true, learning_steps: ["1m", "10m"], relearning_steps: ["10m"] });
    let card: Card;
    try { const stored = db.cards[item.word]; card = stored ? { ...stored, due: new Date(stored.due), last_review: stored.last_review ? new Date(stored.last_review) : undefined } : createEmptyCard(new Date()); scheduler.repeat(card, new Date()); }
    catch { card = createEmptyCard(new Date()); }
    const result = scheduler.repeat(card, new Date())[rating];
    setDb({ ...db, cards: { ...db.cards, [item.word]: result.card }, logs: [...(db.logs || []), result.log] });
    setSeen([...seen, item.word]); setFlipped(false);
  }

  return <div className="english-content english-review"><div className="english-review-top"><span>到期 {due.length} 词</span><label>目标记忆率 <select value={db.settings?.retention || .9} onChange={e => setDb({ ...db, settings: { ...db.settings, retention: Number(e.target.value) } })}><option value="0.85">85%</option><option value="0.9">90%</option><option value="0.95">95%</option></select></label><label>新词上限 <select value={db.settings?.newLimit || 20} onChange={e => setDb({ ...db, settings: { ...db.settings, newLimit: Number(e.target.value) } })}>{[10, 20, 30, 50].map(x => <option key={x}>{x}</option>)}</select></label></div>{item ? <div className="english-review-card"><small>本次已复习 {seen.length} 词</small><h2>{item.word}</h2>{flipped ? <><p>{item.meaning}</p><p>{item.usage}</p>{item.example && <blockquote>{item.example.sentence}<small>{item.example.source}</small></blockquote>}<div className="english-review-ratings">{([ [Rating.Again, "忘记"], [Rating.Hard, "困难"], [Rating.Good, "良好"], [Rating.Easy, "简单"] ] as const).map(([r, name]) => <button key={r} onClick={() => grade(r)}>{name}</button>)}</div></> : <button className="english-primary" onClick={() => setFlipped(true)}>显示答案</button>}</div> : <p>当前队列已完成。</p>}</div>;
}

function Knowledge({ bank }: { bank: EnglishBank["knowledge"] }) {
  const [kind, setKind] = useState<"vocab" | "sentence" | "method">("vocab");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const cards = bank.cards.filter(c => c.kind === kind && (source === "all" || c.source === source) && (!query || `${c.title} ${c.en || ""} ${c.body || ""}`.toLowerCase().includes(query.toLowerCase())));
  return <><div className="english-subnav" role="tablist" aria-label="知识点分类">{([ ["vocab", "词汇"], ["sentence", "长难句"], ["method", "阅读方法"] ] as const).map(([id, name]) => <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? "active" : ""} onClick={() => setKind(id)}>{name}</button>)}</div><div className="english-controls"><label className="english-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索知识点" aria-label="搜索知识点" /></label><select value={source} onChange={e => setSource(e.target.value)} aria-label="文章来源"><option value="all">全部来源</option>{Object.entries(bank.sources).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><span className="english-count">{cards.length} 条</span></div><div className="english-content english-knowledge-list">{cards.map((c, i) => <article className="english-knowledge" key={`${c.source}-${c.title}-${i}`}><span>{bank.sources[c.source]}</span><h2>{c.title}</h2>{c.en && <blockquote>{c.en}</blockquote>}{c.body && <p>{c.body}</p>}{c.chips && <div className="english-chips">{c.chips.map(x => <small key={x}>{x}</small>)}</div>}{c.steps && <div className="english-steps">{c.steps.map(([name, body], j) => <p key={j}><b>{name}</b><span>{body}</span></p>)}</div>}</article>)}</div></>;
}

function Writing({ bank, provider, model, providers }: { bank: EnglishBank["writing"]; provider: WritingProvider; model: string; providers: ProviderOption[] }) {
  const [mode, setMode] = useState<"method" | "small" | "big" | "phrases" | "words" | "generate">("method");
  const [template, setTemplate] = useState(0);
  const [masked, setMasked] = useState(false);
  const [draft, setDraft] = useSavedState("english-writing-draft-v1", "");
  const templates = mode === "small" ? bank.smallTemplates : bank.bigTemplates;
  return <><div className="english-subnav" role="tablist" aria-label="写作内容">{([ ["method", "方法论"], ["small", "小作文"], ["big", "大作文"], ["phrases", "功能句"], ["words", "词与主题"], ["generate", "作文生成"] ] as const).map(([id, name]) => <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? "active" : ""} onClick={() => { setMode(id); setTemplate(0); setMasked(false); }}>{name}</button>)}</div><div className="english-content english-writing">
    {mode === "method" && <><h2>写作方法论</h2>{bank.methodSections.map((part, i) => <section className="english-method-section" key={`${part.title}-${i}`}><h3>{part.title}</h3>{part.blocks.map((block, j) => block.kind === "heading" ? <h4 key={j}>{block.text}</h4> : <p className={block.kind === "list" ? "english-method-list" : ""} key={j}>{block.text}</p>)}</section>)}<h3>练习草稿</h3><textarea className="english-draft" aria-label="写作草稿" placeholder="在这里练习写作，草稿自动保存在本机" value={draft} onChange={e => setDraft(e.target.value)} /></>}
    {(mode === "small" || mode === "big") && <><h2>{mode === "small" ? "小作文模板" : "大作文模板"}</h2><div className="english-template-select">{templates.map((t, i) => <button key={t.name} className={template === i ? "active" : ""} onClick={() => { setTemplate(i); setMasked(false); }}>{t.name}</button>)}</div><div className="english-template-tools"><span>{templates[template].logic.join(" → ")}</span><button onClick={() => setMasked(!masked)}>{masked ? "显示模板" : "遮住模板"}</button></div><pre className={masked ? "english-template masked" : "english-template"}>{templates[template].tpl}</pre></>}
    {mode === "phrases" && <><h2>功能句</h2>{Object.entries(bank.phraseGroups).map(([id, groups]) => <section key={id}><h3>{id === "small" ? "小作文" : "大作文"}</h3>{groups.map(([title, lines]) => <div className="english-phrase-group" key={title}><h4>{title}</h4>{lines.map(([en, cn], i) => <p key={i}><span>{en}</span><small>{cn}</small></p>)}</div>)}</section>)}</>}
    {mode === "words" && <><h2>核心词与主题</h2>{bank.coreWords.map(([title, words]) => <div className="english-phrase-group" key={title}><h4>{title}</h4>{words.map(([en, cn], i) => <p key={i}><span>{en}</span><small>{cn}</small></p>)}</div>)}<h3>主题表达</h3>{bank.topics.map(([title, words]) => <div className="english-phrase-group" key={title}><h4>{title}</h4>{words.map(([en, cn], i) => <p key={i}><span>{en}</span><small>{cn}</small></p>)}</div>)}</>}
    {mode === "generate" && <WritingGenerator provider={provider} model={model} providers={providers} />}
  </div></>;
}

type EssayResult = { essay: string; structure?: { part?: string; function?: string; analysis?: string }[]; keywords?: { word: string; meaning: string; usage?: string }[]; translation?: string };

function WritingGenerator({ provider, model, providers }: { provider: WritingProvider; model: string; providers: ProviderOption[] }) {
  const [kind, setKind] = useState<"small" | "big">("small");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [result, setResult] = useState<EssayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedProvider = providers.find(item => item.id === provider && item.model === model);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type) || file.size > 10 * 1024 * 1024) { setMessage("仅支持 10 MB 内的 PNG、JPG 或 WebP 图片。"); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl; });
    const scale = Math.min(1, 1400 / Math.max(bitmap.naturalWidth, bitmap.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.naturalWidth * scale); canvas.height = Math.round(bitmap.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    setImage({ name: file.name, type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", .87) }); setMessage("");
  }

  async function generate() {
    if (!prompt.trim() && !image) { setMessage("请先输入题干或上传题图。"); return; }
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) { setMessage("作文生成服务仅在本机可用。"); return; }
    setBusy(true); setMessage("正在生成作文…"); setResult(null);
    try {
      const healthy = async () => {
        try { const response = await fetch("http://127.0.0.1:38389/health", { cache: "no-store" }); return response.ok && !!(await response.json()).ok; }
        catch { return false; }
      };
      if (!await healthy()) {
        setMessage("正在启动写作服务…");
        const frame = document.createElement("iframe"); frame.hidden = true; frame.src = `english-writing-agent://start?t=${Date.now()}`; document.body.append(frame);
        let ready = false;
        for (let i = 0; i < 24; i++) { await new Promise(resolve => setTimeout(resolve, 500)); if (await healthy()) { ready = true; break; } }
        frame.remove();
        if (!ready) throw new Error("写作服务未启动");
      }
      const response = await fetch("http://127.0.0.1:38389/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: kind, prompt, image, provider, model }) });
      const next = await response.json() as EssayResult & { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(next.error || `写作服务 HTTP ${response.status}`);
      if (next.ok === false || !next.essay) throw new Error(next.error || "生成结果为空");
      setResult(next); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "作文生成失败"); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!result) return;
    const markdown = `# ${kind === "small" ? "小作文" : "大作文"}\n\n## 题目\n${prompt}\n\n## 范文\n${result.essay}\n\n## 译文\n${result.translation || ""}`;
    try { await navigator.clipboard.writeText(markdown); setMessage("已复制 Markdown"); }
    catch { setMessage("复制失败，请检查浏览器剪贴板权限。"); }
  }

  return <div className="english-generator"><h2>作文生成</h2><p className="english-provider-hint">当前模型：{selectedProvider ? selectedProvider.label + " · " + selectedProvider.model : provider === "codex" ? "Codex" : "DeepSeek"} · 在右上角设置中切换</p><div className="english-generator-controls"><label>作文类型 <select value={kind} onChange={e => setKind(e.target.value as "small" | "big")}><option value="small">小作文</option><option value="big">大作文</option></select></label><label className="english-upload">上传题图 <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => upload(e.target.files?.[0]).catch(() => setMessage("图片读取失败。"))} /></label>{image && <button className="english-text-button" onClick={() => setImage(null)}>移除 {image.name}</button>}</div><textarea aria-label="作文题目" placeholder="输入题干或写作要求" value={prompt} onChange={e => setPrompt(e.target.value)} /><div className="english-generator-actions"><button className="english-primary" disabled={busy} onClick={generate}>{busy ? "生成中…" : "生成作文"}</button>{result && <><button className="english-text-button" onClick={copy}>复制 MD</button><button className="english-text-button" onClick={() => window.print()}>打印 / 导出 PDF</button></>}</div>{message && <p role="status">{message}</p>}{result && <div className="english-generated"><h3>范文</h3><p>{result.essay}</p>{!!result.structure?.length && <><h3>结构拆解</h3>{result.structure.map((x, i) => <p key={i}><b>{x.part || x.function}</b> {x.analysis || x.function}</p>)}</>}{!!result.keywords?.length && <><h3>核心词</h3>{result.keywords.map((x, i) => <p key={i}><b>{x.word}</b> · {x.meaning} {x.usage}</p>)}</>}{result.translation && <><h3>中文译文</h3><p>{result.translation}</p></>}</div>}</div>;
}

export function EnglishWorkspace({ section, onBack, bank }: { section: EnglishSection; onBack: () => void; bank: EnglishBank | null }) {
  const [preferences] = useSavedState<Preferences>("english-reading-preferences-v1", defaults);
  const [modelChoice] = useSavedState<string>("english-writing-model-v1", "");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  useEffect(() => {
    if (section !== "writing" || !["localhost", "127.0.0.1"].includes(location.hostname)) return;
    let active = true;
    const scan = async () => {
      try {
        const response = await fetch("http://127.0.0.1:38389/providers", { cache: "no-store" });
        if (!response.ok) throw new Error("服务未就绪");
        const data = await response.json() as { providers?: ProviderOption[] };
        if (active) setProviders(data.providers || []);
      } catch { if (active) setProviders([]); }
    };
    void scan();
    const timer = window.setInterval(() => { void scan(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [section]);
  const p = { ...defaults, ...preferences };
  const selectedModel = providers.find(item => `${item.id}:${item.model}` === modelChoice && item.available) || providers.find(item => item.id === "codex" && item.available) || providers.find(item => item.available);
  const writingProvider = selectedModel?.id || "codex";
  const writingModel = selectedModel?.model || "";
  return <main className={`english-workspace ${p.theme === "dark" ? "is-dark" : ""} ${p.width === "wide" ? "is-wide" : ""} ${p.spacing === "relaxed" ? "is-relaxed" : ""}`} style={{ "--english-font-size": `${p.size}px` } as React.CSSProperties}>
    <header className="english-header"><button className="english-back" onClick={onBack}><ArrowLeft size={18} /> 英语</button><strong>{labels[section]}</strong></header>
    <div className="english-main"><div className="english-title"><span>ENGLISH I</span><h1>{labels[section]}</h1></div>{bank ? section === "reading" ? <Reading bank={bank.reading} /> : section === "knowledge" ? <Knowledge bank={bank.knowledge} /> : <Writing bank={bank.writing} provider={writingProvider} model={writingModel} providers={providers} /> : <p className="english-loading" role="status">正在读取英语资料…</p>}</div>
  </main>;
}
