import type { Metadata } from "next";
import { Noto_Sans_SC, Rubik } from "next/font/google";
import "@/app/globals.css";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700", "800"]
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "夯拉排行榜",
  description: "社区总榜、条目定档、锐评和个人排行榜发布平台。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} ${rubik.variable} bg-ink text-sand antialiased`}>
        {children}
      </body>
    </html>
  );
}
