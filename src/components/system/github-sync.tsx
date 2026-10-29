"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applySnapshot, localSnapshot, mergeRecords, sameSnapshot, type CloudState } from "@/lib/sync-record";

const endpoint = "https://api.github.com/repos/Szturin/your-study-wiki/contents/sync/843-state.enc";
const syncBranch = "study-sync";
const tokenKey = "study-wiki-wall.github-token.enc";
type GithubFile = { content: string; sha: string };
type GithubPut = { content: { sha: string } };
type Status = "local" | "connecting" | "syncing" | "success" | "error";

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
  const response = await fetch(method === "GET" ? `${endpoint}?ref=${syncBranch}` : endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (method === "GET" && response.status === 404) return null;
  if (response.status === 409) throw new Error("同步版本冲突");
  if (response.status === 429 || response.headers.get("X-RateLimit-Remaining") === "0") throw new Error("GitHub 请求限额已用尽，稍后自动重试");
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${response.status === 401 ? "令牌无效" : response.status === 403 ? "缺少 Contents 权限" : "同步失败"}`);
  return response.json() as Promise<T>;
}

async function readCloud(key: CryptoKey, token: string) {
  const file = await request<GithubFile>(token, "GET");
  if (!file) return { sha: "", state: null as CloudState | null };
  const state = JSON.parse(new TextDecoder().decode(await decrypt(key, file.content))) as CloudState;
  if (state.version !== 1 || !state.values || typeof state.values !== "object") throw new Error("云端记录格式不受支持");
  return { sha: file.sha, state };
}

export function GithubSync({ keyMaterial, recordsReady, onRestore }: { keyMaterial: CryptoKey; recordsReady: boolean; onRestore: () => void }) {
  const [token, setToken] = useState("");
  const [entry, setEntry] = useState("");
  const [status, setStatus] = useState<Status>("local");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const pending = useRef(false);
  const queued = useRef(false);
  const timer = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const failures = useRef(0);
  const lastAttempt = useRef(0);
  const nextAttempt = useRef(0);
  const local = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const busy = status === "connecting" || status === "syncing";

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const sync = useCallback(async (credential: string) => {
    if (!navigator.onLine) return;
    if (pending.current) { queued.current = true; return; }
    if (Date.now() < nextAttempt.current) return;
    if (retryTimer.current !== null) { window.clearTimeout(retryTimer.current); retryTimer.current = null; }
    lastAttempt.current = Date.now();
    pending.current = true;
    setStatus("syncing"); setMessage("正在同步学习记录");
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const cloud = await readCloud(keyMaterial, credential);
        const localState = localSnapshot();
        const merged = mergeRecords(localState, cloud.state);
        if (!sameSnapshot(localState, merged)) { applySnapshot(merged); onRestore(); }
        if (cloud.state && sameSnapshot(merged, cloud.state)) {
          failures.current = 0;
          nextAttempt.current = 0;
          setStatus("success"); setMessage("学习记录已是最新");
          return;
        }
        try {
          const content = await encrypt(keyMaterial, new TextEncoder().encode(JSON.stringify(merged)));
          const result = await request<GithubPut>(credential, "PUT", {
            message: "Sync encrypted 843 learning record", content, branch: syncBranch, ...(cloud.sha ? { sha: cloud.sha } : {}),
          });
          if (!result?.content?.sha) throw new Error("GitHub 未返回文件版本");
          failures.current = 0;
          nextAttempt.current = 0;
          setStatus("success");
          setMessage(`同步成功 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
          return;
        } catch (error) {
          if (error instanceof Error && error.message === "同步版本冲突" && attempt < 2) continue;
          throw error;
        }
      }
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "同步失败");
      const authFailure = error instanceof Error && /401|403|令牌无效|权限/.test(error.message);
      if (!authFailure) {
        failures.current += 1;
        const delay = Math.min(300000, 5000 * 2 ** Math.min(failures.current - 1, 6));
        nextAttempt.current = Date.now() + delay;
        retryTimer.current = window.setTimeout(() => window.dispatchEvent(new Event("study-sync-requested")), delay);
      }
    } finally {
      pending.current = false;
      if (queued.current) { queued.current = false; window.dispatchEvent(new Event("study-sync-requested")); }
    }
  }, [keyMaterial, onRestore]);

  const connect = useCallback(async (credential: string) => {
    if (!credential || !navigator.onLine) return;
    setStatus("connecting"); setMessage("");
    try {
      await readCloud(keyMaterial, credential);
      localStorage.setItem(tokenKey, await encrypt(keyMaterial, new TextEncoder().encode(credential)));
      setToken(credential); setEntry("");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "连接失败"); }
  }, [keyMaterial]);

  useEffect(() => {
    const saved = localStorage.getItem(tokenKey);
    if (saved) decrypt(keyMaterial, saved).then(bytes => setToken(new TextDecoder().decode(bytes))).catch(() => localStorage.removeItem(tokenKey));
  }, [keyMaterial]);

  useEffect(() => {
    if (!token || !recordsReady || !online) return;
    const schedule = (delay: number) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      const wait = Math.max(delay, 15000 - (Date.now() - lastAttempt.current), nextAttempt.current - Date.now());
      timer.current = window.setTimeout(() => { void sync(token); }, Math.max(0, wait));
    };
    schedule(0);
    const changed = () => schedule(2500);
    const visible = () => { if (document.visibilityState === "visible") schedule(0); };
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") schedule(0); }, 60000);
    window.addEventListener("study-record-changed", changed);
    window.addEventListener("study-sync-requested", changed);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
      window.clearInterval(poll);
      window.removeEventListener("study-record-changed", changed);
      window.removeEventListener("study-sync-requested", changed);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [token, recordsReady, online, sync]);

  function disconnect() {
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    nextAttempt.current = 0;
    setToken(""); setStatus("local"); setMessage(""); localStorage.removeItem(tokenKey);
  }

  const effective = online ? status : "offline";
  const label = effective === "offline" ? "离线使用" : effective === "local" ? (local ? "本地服务" : "网页服务") :
    effective === "connecting" ? "正在连接" : effective === "syncing" ? "正在同步" : effective === "success" ? "同步成功" : "同步失败";
  const toastText = effective === "offline" ? "网络已断开，学习记录保存在本机" : message ||
    (local ? "本地题库已就绪，学习记录保存在本机" : "网页题库已就绪，学习记录保存在当前浏览器");
  return <div className="sync-widget" data-status={effective}>
    <button type="button" className="sync-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={`同步状态：${label}`}><span className="sync-dot" aria-hidden="true" />{label}</button>
    <div key={toastText} className="sync-toast" role="status">{toastText}</div>
    {open && <div className="sync-popover">
      <div className="sync-popover-heading"><strong>{local ? "本地真题墙" : "网页真题墙"}</strong><button type="button" aria-label="关闭同步面板" onClick={() => setOpen(false)}>×</button></div>
      <p>{!online ? "网络不可用，学习记录保存在本机。" : token ? "学习记录已开启自动同步。" : "学习记录保存在当前浏览器。连接 GitHub 后自动同步。"}</p>
      {!token && <form onSubmit={event => { event.preventDefault(); void connect(entry.trim()); }}><label htmlFor="github-pat">GitHub 仓库令牌</label><input id="github-pat" type="password" autoComplete="off" value={entry} onChange={event => setEntry(event.target.value)} required /><button disabled={busy || !online}>连接并自动同步</button></form>}
      {token && <div className="sync-actions">{status === "error" && <button disabled={!online} onClick={() => void sync(token)}>重试同步</button>}<button onClick={disconnect}>断开连接</button></div>}
    </div>}
  </div>;
}
