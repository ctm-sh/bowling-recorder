import type { Metadata, Viewport } from "next";
import { APP_NAME, TEAM_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${TEAM_NAME} 볼링 동호회 점수 기록 · 팀 배분 · 정산`,
  appleWebApp: { capable: true, title: TEAM_NAME, statusBarStyle: "default" },
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
        <div className="mx-auto min-h-dvh max-w-[480px] bg-surface pb-20 shadow-sm">{children}</div>
      </body>
    </html>
  );
}
