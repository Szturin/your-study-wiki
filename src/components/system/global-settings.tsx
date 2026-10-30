"use client";

import { useEffect, useState } from "react";
import { Moon, Settings2, Sun, X } from "lucide-react";
import { trackRecordChange } from "@/lib/sync-record";

type Preferences = { theme: "light" | "dark"; size: number; spacing: "normal" | "relaxed"; width: "normal" | "wide" };
type Provider = "codex" | "deepseek";
type ProviderOption = { id: Provider; label: string; model: string; available: boolean };
type SyncDisplay = "full" | "compact" | "hidden";
const defaults: Preferences = { theme: "light", size: 17, spacing: "relaxed", width: "normal" };

function readSaved<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}

export function GlobalSettings() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [modelChoice, setModelChoice] = useState("");
  const [syncDisplay, setSyncDisplay] = useState<SyncDisplay>("full");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providerStatus, setProviderStatus] = useState("");
  useEffect(() => {
    const restore = () => {
      setPreferences({ ...defaults, ...readSaved("english-reading-preferences-v1", defaults) });
      setModelChoice(readSaved("english-writing-model-v1", ""));
      setSyncDisplay(readSaved("study-wiki-wall.sync-display-v1", "full"));
    };
    restore();
    window.addEventListener("study-record-restored", restore);
    return () => window.removeEventListener("study-record-restored", restore);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.studyTheme = preferences.theme;
    document.documentElement.style.setProperty("--study-font-size", `${preferences.size}px`);
    document.documentElement.style.setProperty("--study-question-size", `${preferences.size + 1}px`);
    document.documentElement.style.setProperty("--study-formula-size", `${preferences.size - 1}px`);
  }, [preferences]);
  useEffect(() => {
    if (!open || !["localhost", "127.0.0.1"].includes(location.hostname)) return;
    let active = true;
    const scan = async () => {
      try {
        const response = await fetch("http://127.0.0.1:38389/providers", { cache: "no-store" });
        if (!response.ok) throw new Error("服务未就绪");
        const data = await response.json() as { providers?: ProviderOption[] };
        if (active) { setProviders(data.providers || []); setProviderStatus("已从 cc-switch 自动读取"); }
      } catch { if (active) setProviderStatus("写作服务未启动"); }
    };
    void scan();
    const timer = window.setInterval(() => { void scan(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [open]);
  function save<T>(key: string, value: T) {
    const next = JSON.stringify(value);
    const previous = localStorage.getItem(key);
    if (previous !== next) { trackRecordChange(key, previous, next); localStorage.setItem(key, next); window.dispatchEvent(new Event("study-record-changed")); }
    window.dispatchEvent(new Event("study-record-restored"));
  }
  function update(value: Preferences) { setPreferences(value); save("english-reading-preferences-v1", value); }
  function chooseModel(value: string) { setModelChoice(value); save("english-writing-model-v1", value); }
  function chooseSyncDisplay(value: SyncDisplay) { setSyncDisplay(value); save("study-wiki-wall.sync-display-v1", value); }
  return <div className="global-settings-root" data-open={open}>
    <button type="button" className="global-settings-trigger" aria-label="全站设置" aria-expanded={open} onClick={() => setOpen(!open)}><Settings2 size={19} /></button>
    {open && <section className="global-settings-panel" aria-label="全站设置"><header><strong>设置</strong><button aria-label="关闭设置" onClick={() => setOpen(false)}><X size={18} /></button></header>
      <div><span>外观</span><div className="global-setting-options"><button aria-pressed={preferences.theme === "light"} onClick={() => update({ ...preferences, theme: "light" })}><Sun size={16} /> 浅色</button><button aria-pressed={preferences.theme === "dark"} onClick={() => update({ ...preferences, theme: "dark" })}><Moon size={16} /> 暗色</button></div></div>
      <label>内容字号 <input type="range" min="15" max="23" value={preferences.size} onChange={e => update({ ...preferences, size: Number(e.target.value) })} /><output>{preferences.size}px</output></label>
      <div><span>行距</span><div className="global-setting-options"><button aria-pressed={preferences.spacing === "normal"} onClick={() => update({ ...preferences, spacing: "normal" })}>标准</button><button aria-pressed={preferences.spacing === "relaxed"} onClick={() => update({ ...preferences, spacing: "relaxed" })}>舒展</button></div></div>
      <div><span>阅读宽度</span><div className="global-setting-options"><button aria-pressed={preferences.width === "normal"} onClick={() => update({ ...preferences, width: "normal" })}>标准</button><button aria-pressed={preferences.width === "wide"} onClick={() => update({ ...preferences, width: "wide" })}>加宽</button></div></div>
      <div><span>同步状态</span><div className="global-setting-options">{([ ["full", "完整"], ["compact", "绿点"], ["hidden", "隐藏"] ] as const).map(([id, label]) => <button key={id} aria-pressed={syncDisplay === id} onClick={() => chooseSyncDisplay(id)}>{label}</button>)}</div></div>
      <div><label htmlFor="writing-model">作文生成模型</label><select id="writing-model" value={modelChoice} onChange={e => chooseModel(e.target.value)} disabled={!providers.some(item => item.available)}><option value="">自动选择当前模型</option>{modelChoice && !providers.some(item => `${item.id}:${item.model}` === modelChoice && item.available) && <option value={modelChoice} disabled>{modelChoice.split(":").slice(1).join(":")} · 暂不可用</option>}{providers.filter(item => item.available && item.model).map(item => <option key={`${item.id}:${item.model}`} value={`${item.id}:${item.model}`}>{item.model} · {item.label}</option>)}</select>{providerStatus && <small>{providerStatus}</small>}</div>
    </section>}
  </div>;
}
