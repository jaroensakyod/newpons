"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

// ย่อหน้าที่ hast (root/element/text) — พิมพ์แบบย่อ กันไม่ต้องพึ่ง @types/hast
type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

// จัดกล่องเน้นความสำคัญ (หลักคิด/ขั้นที่/ตรวจสอบ/ระวัง/ตอบ) จากรูปแบบ **ป้าย:** —
// ต้องคง logic เดียวกับ styleCallouts() ใน scripts/build-worksheet.mjs เสมอ (คนละ runtime
// พอร์ตแยกกันคนละไฟล์ เพราะไฟล์นั้นเป็น Node ESM script ส่วนนี้เป็น Next/TS component)
function calloutInfo(rawLabel: string): { cls: string; stepNum?: string } | null {
  const label = rawLabel.replace(/[:：]\s*$/, "").trim();
  if (label === "ตอบ") return { cls: "cal-answer" };
  const stepMatch = label.match(/^ขั้นที่\s*\d+/);
  if (stepMatch) return { cls: "cal-step", stepNum: label.match(/\d+/)?.[0] };
  if (/หลักคิด|วิธีคิด|หลักการ|นิยาม|สูตรลัด|วิธีจำ|เกร็ดเพิ่ม/.test(label)) {
    return { cls: "cal-info" };
  }
  if (/ตรวจสอบ|^ตรวจ|สรุป|สังเกต|ข้อสังเกต/.test(label)) return { cls: "cal-check" };
  if (/ระวัง|ตัวลวง/.test(label)) return { cls: "cal-warn" };
  return null;
}

function walk(node: HastNode) {
  for (const child of node.children ?? []) walk(child);
  if (node.type !== "element" || node.tagName !== "p") return;
  const first = node.children?.[0];
  if (!first || first.type !== "element" || first.tagName !== "strong") return;
  const label = textOf(first).trim();
  if (!label || label.length > 50) return;
  const info = calloutInfo(label);
  if (!info) return;
  node.tagName = "div";
  node.properties = { ...(node.properties ?? {}), className: ["cal", info.cls] };
  if (info.cls === "cal-step" && info.stepNum) {
    node.children!.unshift({
      type: "element",
      tagName: "span",
      properties: { className: ["step-badge"] },
      children: [{ type: "text", value: info.stepNum }],
    });
  }
}

function rehypeCallouts() {
  return (tree: HastNode) => walk(tree);
}

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={[[rehypeKatex, { strict: false }], rehypeCallouts as any]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
