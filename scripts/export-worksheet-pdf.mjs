// แปลงชีท docs/worksheets/chNN.html → PDF จริง docs/worksheets/pdf/chNN.pdf
// (เฉลยย่ออยู่หน้าสุดท้ายแยกจากแบบฝึกหัดเสมอ — break-before: page ใน CSS)
// ใช้: node scripts/build-worksheet.mjs && node scripts/export-worksheet-pdf.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WS_DIR = path.join(ROOT, "docs", "worksheets");
const PDF_DIR = path.join(WS_DIR, "pdf");

fs.mkdirSync(PDF_DIR, { recursive: true });

const files = fs.readdirSync(WS_DIR).filter((f) => f.endsWith(".html"));
const browser = await puppeteer.launch();
const page = await browser.newPage();

for (const file of files) {
  const url = "file:///" + path.join(WS_DIR, file).replaceAll("\\", "/");
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  const out = path.join(PDF_DIR, file.replace(".html", ".pdf"));
  await page.pdf({
    path: out,
    format: "A4",
    margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
    printBackground: true,
  });
  console.log(`✓ ${path.relative(ROOT, out)}`);
}

await browser.close();
