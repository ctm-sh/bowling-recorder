import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "볼링 기록",
  description: "볼링 동호회 점수 기록 · 팀 배분 · 정산",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e2a5a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto min-h-dvh max-w-[480px] bg-surface pb-20">{children}</div>
      </body>
    </html>
  );
}
