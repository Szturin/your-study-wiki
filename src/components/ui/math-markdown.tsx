"use client";

/* eslint-disable @next/next/no-img-element */

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { useMemo } from "react";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type MathMarkdownProps = {
  content: string;
  className?: string;
};

const CODE_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
const DISPLAY_MATH_ENVIRONMENTS = ["equation", "equation*", "align", "align*", "gather", "gather*", "multline", "multline*"];

function normalizeMathSegment(segment: string) {
  let normalized = segment
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, formula: string) => `\n\n$$\n${formula.trim()}\n$$\n\n`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, formula: string) => `$${formula.trim()}$`);

  for (const environment of DISPLAY_MATH_ENVIRONMENTS) {
    const escapedEnvironment = environment.replace("*", "\\*");
    const pattern = new RegExp(`\\\\begin\\{${escapedEnvironment}\\}([\\s\\S]*?)\\\\end\\{${escapedEnvironment}\\}`, "g");

    normalized = normalized.replace(pattern, (_, formula: string) => {
      const body = formula.trim();

      if (environment.startsWith("align")) {
        return `\n\n$$\n\\begin{aligned}\n${body}\n\\end{aligned}\n$$\n\n`;
      }

      return `\n\n$$\n${body}\n$$\n\n`;
    });
  }

  return normalized;
}

export function normalizeMathMarkdown(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .split(CODE_FENCE_PATTERN)
    .map((segment) => (segment.startsWith("`") || segment.startsWith("~~~") ? segment : normalizeMathSegment(segment)))
    .join("");
}

const markdownComponents: Components = {
  a: ({ children, href }) => (
    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  code: ({ children, className }) => <code className={className}>{children}</code>,
  del: ({ children }) => <del>{children}</del>,
  em: ({ children }) => <em>{children}</em>,
  h1: ({ children }) => <h1>{children}</h1>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  hr: () => <hr />,
  img: ({ alt, src }) => (src ? <img alt={alt ?? ""} src={src} loading="lazy" decoding="async" /> : null),
  input: ({ checked, disabled, type }) => <input checked={checked} disabled={disabled} readOnly type={type} />,
  li: ({ children }) => <li>{children}</li>,
  ol: ({ children }) => <ol>{children}</ol>,
  p: ({ children }) => <p>{children}</p>,
  pre: ({ children }) => <pre>{children}</pre>,
  strong: ({ children }) => <strong>{children}</strong>,
  table: ({ children }) => (
    <div className="math-table-wrap">
      <table>{children}</table>
    </div>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  td: ({ children }) => <td>{children}</td>,
  th: ({ children }) => <th>{children}</th>,
  thead: ({ children }) => <thead>{children}</thead>,
  tr: ({ children }) => <tr>{children}</tr>,
  ul: ({ children }) => <ul>{children}</ul>,
};

export function MathMarkdown({ content, className = "" }: MathMarkdownProps) {
  const normalizedContent = useMemo(() => normalizeMathMarkdown(content), [content]);

  return (
    <div className={`math-content ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
