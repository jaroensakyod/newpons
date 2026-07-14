import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ติวเคมี สอวน. ค่าย 1",
  description:
    "ฝึกทำข้อสอบเคมี สอวน. ค่าย 1 พร้อมเฉลยละเอียด และดูว่าตัวเองอ่อนหมวดไหน",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body
        className={`${notoSansThai.className} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
