import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML_DIR = path.join(ROOT, "docs", "general-chemistry");
const OUT_DIR = path.join(ROOT, "output", "pdf");
const PUBLIC_DIR = path.join(ROOT, "public", "general-chemistry");
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const files = fs.readdirSync(HTML_DIR).filter((f) => f.endsWith(".html"));
const browser = await puppeteer.launch();
const page = await browser.newPage();

for (const file of files) {
  const url = "file:///" + path.join(HTML_DIR, file).replaceAll("\\", "/");
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const chapterName = await page.evaluate(
    () => document.querySelector("h1")?.textContent?.trim() ?? ""
  );
  const pdfName = file.replace("general-", "general-chemistry-").replace(".html", ".pdf");
  const out = path.join(OUT_DIR, pdfName);
  await page.pdf({
    path: out,
    format: "A4",
    margin: { top: "20mm", bottom: "16mm", left: "12mm", right: "12mm" },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-family:sans-serif;font-size:8px;width:100%;padding:0 12mm;color:#64748b;text-align:right;">เคมีทั่วไปตามแนวทาง สสวท. · ${chapterName}</div>`,
    footerTemplate: `<div style="font-family:sans-serif;font-size:8px;width:100%;padding:0 12mm;color:#94a3b8;display:flex;justify-content:center;"><span class="pageNumber"></span>&nbsp;/&nbsp;<span class="totalPages"></span></div>`,
  });
  fs.copyFileSync(out, path.join(PUBLIC_DIR, pdfName));
  console.log(`✓ ${path.relative(ROOT, out)}`);
}

await browser.close();
