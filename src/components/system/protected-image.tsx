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
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    assetUrl(path).then(result => {
      objectUrl = result;
      if (active) setUrl(result);
      else URL.revokeObjectURL(result);
    }).catch(() => { if (active) setUrl(""); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, assetUrl]);
  return url ? <img src={url} className={className} alt={alt} width={width} height={height} style={style} /> : <span role="status" className="protected-image-loading">正在读取题图…</span>;
}
