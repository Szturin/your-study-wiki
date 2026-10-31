"use client";

import { MathMarkdown } from "@/components/ui/math-markdown";
import { ProtectedImage } from "@/components/system/protected-image";
import type { CanvasAnnotation } from "@/types/canvas-annotations";

export function CanvasAnnotationsPanel({ entries, yearEntries, assetUrl }: {
  entries: CanvasAnnotation[];
  yearEntries: CanvasAnnotation[];
  assetUrl: (path: string) => Promise<string>;
}) {
  const groups = [{ label: "本题批注", items: entries }, { label: "整卷批注 · 未拆分到单题", items: yearEntries }];
  return <div className="wall-canvas-annotations">
    <p className="wall-canvas-context">来自套卷一刷 Canvas。错因和手写内容保留原貌；当前掌握程度请用下方三个按钮重新确认。</p>
    {groups.map(group => group.items.length > 0 && <div key={group.label}><h3 className="wall-canvas-group-title">{group.label}</h3>{group.items.map(entry => <article className="wall-canvas-entry" key={entry.nodeId}>
      <div className="wall-canvas-entry-head"><strong>{entry.title || "原始批注"}</strong>{entry.deepLink && <a href={entry.deepLink}>在 MarginNote 中查看 ↗</a>}</div>
      {entry.tags.length > 0 && <div className="wall-canvas-tags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
      {entry.text && <MathMarkdown content={entry.text} />}
      {entry.images.map((image, index) => <figure key={image.path}>
        <ProtectedImage path={image.path} assetUrl={assetUrl} alt={`${entry.title || "原始批注"}：${image.label} ${index + 1}`} />
        <figcaption>{image.label} {entry.images.length > 1 ? index + 1 : ""}</figcaption>
      </figure>)}
    </article>)}</div>)}
  </div>;
}
