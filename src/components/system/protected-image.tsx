"use client";

import { useEffect, useState } from "react";

export function ProtectedImage({ path, assetUrl, className, alt, width, height, style }: {
  path: string;
  assetUrl: (path: string) => Promise<string>;
  className?: string;
  alt: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}) {
  const [result, setResult] = useState<{ path: string; url?: string; failed?: boolean }>({ path: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    assetUrl(path).then(result => {
      objectUrl = result;
      if (active) setResult({ path, url: result });
      else URL.revokeObjectURL(result);
    }).catch(() => { if (active) setResult({ path, failed: true }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, assetUrl, attempt]);
  if (result.path !== path) return <span role="status" className="protected-image-loading">正在读取题图…</span>;
  if (result.failed) return <span role="alert" className="protected-image-loading">题图读取失败 <button type="button" onClick={() => { setResult({ path: "" }); setAttempt(value => value + 1); }}>重试加载</button></span>;
  // Decrypted blob URLs are already sized and cannot use Next's image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return result.url ? <img src={result.url} className={className} alt={alt} width={width} height={height} style={style} /> : <span role="status" className="protected-image-loading">正在读取题图…</span>;
}
