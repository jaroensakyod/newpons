"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

export function MathMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`md-body ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { strict: false }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
