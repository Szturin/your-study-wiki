"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const endpoint = "https://api.github.com/repos/Szturin/your-study-wiki/contents/sync/843-state.enc";
const stateKeys = ["study-wiki-wall.persisted-state.ustc843", "study-wiki-wall.learning-journal"];
const tokenKey = "study-wiki-wall.github-token.enc";
type CloudState = { version: 1; updatedAt: string; values: Record<string, string> };
type GithubFile = { content: string; sha: string };
type GithubPut = { content: { sha: string } };
type Status = "local" | "connecting" | "choice" | "ready" | "syncing" | "success" | "error";

function base64(bytes: Uint8Array) {
  let result = "";
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
}
function unbase64(value: string) {
  return Uint8Array.from(atob(value.replace(/\s/g, "")), c => c.charCodeAt(0));
}
async function encrypt(key: CryptoKey, bytes: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes as BufferSource));
  const output = new Uint8Array(iv.length + body.length);
  output.set(iv); output.set(body, iv.length);
  return base64(output);
}
async function decrypt(key: CryptoKey, encoded: string) {
  const bytes = unbase64(encoded);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12)));
}
async function request<T>(token: string, method: "GET" | "PUT", body?: object): Promise<T | null> {
  const response = await fetch(endpoint, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  if (method === "GET" && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${response.status === 401 ? "令牌无效" : response.status === 403 ? "缺少 Contents 权限" : "同步失败"}`);
  return response.json() as Promise<T>;
}

export function GithubSync({ keyMaterial, onRestore }: { keyMaterial: CryptoKey; onRestore: () => void }) {
  const [token, setToken] = useState("");
  const [entry, setEntry] = useState("");
  const [sha, setSha] = useState("");
  const [remote, setRemote] = useState<CloudState | null>(null);
  const [status, setStatus] = useState<Status>("local");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const pending = useRef(false);
  const timer = useRef<number | null>(null);
  const suppressUntil = useRef(0);
  const local = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const busy = status === "connecting" || status === "syncing";

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const connect = useCallback(async (credential: string) => {
    if (!credential) return;
    setStatus("connecting"); setMessage("");
    try {
      const response = await request<GithubFile>(credential, "GET");
      let cloud: CloudState | null = null;
      if (response?.content) {
        cloud = JSON.parse(new TextDecoder().decode(await decrypt(keyMaterial, response.content))) as CloudState;
        if (cloud.version !== 1 || !cloud.values) throw new Error("云端记录版本不受支持");
      }
      setToken(credential); setSha(response?.sha || ""); setRemote(cloud);
      setStatus(cloud ? "choice" : "ready");
      setMessage(cloud ? "发现云端记录，请选择使用哪份" : "已连接，云端暂无记录");
      localStorage.setItem(tokenKey, await encrypt(keyMaterial, new TextEncoder().encode(credential)));
      setEntry("");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "连接失败"); }
  }, [keyMaterial]);

  useEffect(() => {
    const saved = localStorage.getItem(tokenKey);
    if (saved) decrypt(keyMaterial, saved).then(bytes => connect(new TextDecoder().decode(bytes))).catch(() => localStorage.removeItem(tokenKey));
  }, [keyMaterial, connect]);

  const upload = useCallback(async (credential: string, knownSha: string) => {
    if (pending.current || !navigator.onLine) return;
    pending.current = true; setStatus("syncing"); setMessage("正在同步学习记录");
    try {
      const current = await request<GithubFile>(credential, "GET");
      if ((current?.sha || "") !== knownSha) throw new Error("云端记录已变化，请重新连接并选择版本");
      const values = Object.fromEntries(stateKeys.map(key => [key, localStorage.getItem(key) || ""]));
      const payload = await encrypt(keyMaterial, new TextEncoder().encode(JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), values })));
      const result = await request<GithubPut>(credential, "PUT", { message: "Sync encrypted 843 learning record", content: payload, ...(knownSha ? { sha: knownSha } : {}) });
      if (!result?.content?.sha) throw new Error("GitHub 未返回文件版本");
      setSha(result.content.sha); setRemote(null); setStatus("success");
      setMessage(`同步成功 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "同步失败"); }
    finally { pending.current = false; }
  }, [keyMaterial]);

  useEffect(() => {
    if (!token || remote || !online) return;
    const schedule = () => {
      if (Date.now() < suppressUntil.current) return;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void upload(token, sha); }, 2000);
    };
    window.addEventListener("study-record-changed", schedule);
    return () => { window.removeEventListener("study-record-changed", schedule); if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [token, remote, online, sha, upload]);

  function restore() {
    if (!remote) return;
    suppressUntil.current = Date.now() + 4000;
    for (const key of stateKeys) { if (remote.values[key]) localStorage.setItem(key, remote.values[key]); else localStorage.removeItem(key); }
    setRemote(null); setStatus("success"); setMessage("云端记录已恢复到本机"); onRestore();
  }
  function disconnect() {
    setToken(""); setSha(""); setRemote(null); setStatus("local"); setMessage(""); localStorage.removeItem(tokenKey);
  }

  const effective = online ? status : "offline";
  const label = effective === "offline" ? "离线使用" : effective === "local" ? (local ? "本地服务" : "网页服务") :
    effective === "connecting" ? "正在连接" : effective === "choice" ? "等待选择记录" : effective === "ready" ? "已连接" :
    effective === "syncing" ? "正在同步" : effective === "success" ? "同步成功" : "同步失败";
  const toastText = effective === "offline" ? "网络已断开，学习记录保存在本机" : message ||
    (local ? "本地题库已就绪，学习记录保存在本机" : "网页题库已就绪，学习记录保存在当前浏览器");
  return <div className="sync-widget" data-status={effective}>
    <button type="button" className="sync-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={`同步状态：${label}`}><span className="sync-dot" aria-hidden="true" />{label}</button>
    <div key={toastText} className="sync-toast" role="status">{toastText}</div>
    {open && <div className="sync-popover">
      <div className="sync-popover-heading"><strong>{local ? "本地真题墙" : "网页真题墙"}</strong><button type="button" aria-label="关闭同步面板" onClick={() => setOpen(false)}>×</button></div>
      <p>{!online ? "网络不可用，学习记录保存在本机。" : token ? "学习记录加密后同步到 GitHub。" : "学习记录保存在当前浏览器。连接 GitHub 后可跨设备同步。"}</p>
      {!token && <form onSubmit={event => { event.preventDefault(); void connect(entry.trim()); }}><label htmlFor="github-pat">GitHub 仓库令牌</label><input id="github-pat" type="password" autoComplete="off" value={entry} onChange={event => setEntry(event.target.value)} required /><button disabled={busy || !online}>连接</button></form>}
      {token && remote && <div className="sync-actions"><button disabled={busy} onClick={restore}>使用云端记录</button><button disabled={busy} onClick={() => { setRemote(null); void upload(token, sha); }}>使用本机记录</button></div>}
      {token && !remote && <div className="sync-actions"><button disabled={busy || !online} onClick={() => void upload(token, sha)}>立即同步</button><button onClick={disconnect}>断开连接</button></div>}
    </div>}
  </div>;
}
