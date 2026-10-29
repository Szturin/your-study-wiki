"use client";

import { useCallback, useEffect, useState } from "react";
import { StudyWallDashboard } from "@/components/dashboard/study-wall-dashboard";
import { GithubSync } from "@/components/system/github-sync";
import { assetObjectUrl, decryptJson, unlockKey } from "@/lib/protected-content";
import { clearDeviceKey, loadDeviceKey, saveDeviceKey } from "@/lib/device-key";
import type { SubjectWiki } from "@/types/study-wall";

type FormulaBank = { source: string; sheet: string; cards: { id: string; title: string; chapter: string; content: string; sourceRow: number }[] };

export function ProtectedGate() {
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState<{ bank: SubjectWiki; formulas: FormulaBank; key: CryptoKey } | null>(null);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [recordsReady, setRecordsReady] = useState(false);
  const markReady = useCallback(() => setRecordsReady(true), []);
  const restoreRecords = useCallback(() => { setRecordsReady(false); setWorkspaceVersion(value => value + 1); }, []);
  const [checkingDevice, setCheckingDevice] = useState(true);

  async function openWithKey(key: CryptoKey) {
    const [bank, formulas] = await Promise.all([
      decryptJson<SubjectWiki>(key, "/protected/bank.enc"),
      decryptJson<FormulaBank>(key, "/protected/formulas.enc"),
    ]);
    if (!bank.chapters?.length || !formulas.cards?.length) throw new Error("题库内容不完整");
    setUnlocked({ bank, formulas, key });
  }

  useEffect(() => {
    let active = true;
    loadDeviceKey().then(async key => {
      if (!active) return;
      if (key) {
        try { await openWithKey(key); return; }
        catch { await clearDeviceKey(); }
      }
      if (!["localhost", "127.0.0.1"].includes(location.hostname)) return;
      const match = /^#local-key=(.+)$/.exec(location.hash);
      if (!match) return;
      history.replaceState(null, "", location.pathname + location.search);
      try {
        const localKey = await unlockKey(decodeURIComponent(match[1]));
        await openWithKey(localKey);
        await saveDeviceKey(localKey);
      } catch { setError("本机设备授权失效，请重新配对。"); }
    }).catch(() => {}).finally(() => { if (active) setCheckingDevice(false); });
    return () => { active = false; };
  }, []);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const key = await unlockKey(passphrase);
      await openWithKey(key);
      await saveDeviceKey(key).catch(() => {});
      setPassphrase("");
    } catch {
      setError("密钥无效，或加密题库暂不可用");
    } finally {
      setBusy(false);
    }
  }

  if (unlocked) return <><GithubSync keyMaterial={unlocked.key} recordsReady={recordsReady} onRestore={restoreRecords} /><StudyWallDashboard key={workspaceVersion} subjects={[unlocked.bank]} formulas={unlocked.formulas} assetUrl={path => assetObjectUrl(unlocked.key, path)} onReady={markReady} /></>;
  if (checkingDevice) return <main className="unlock-page"><p role="status">正在打开题库…</p></main>;
  return <main className="unlock-page"><form className="unlock-form" onSubmit={unlock}>
    <span className="unlock-kicker">中国科学技术大学 · 843</span>
    <h1>真题墙</h1>
    <label htmlFor="pairing-key">配对密钥</label>
    <input id="pairing-key" type="password" autoComplete="off" value={passphrase} onChange={event => setPassphrase(event.target.value)} required disabled={busy} />
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "正在解锁…" : "解锁题库"}</button>
  </form></main>;
}
