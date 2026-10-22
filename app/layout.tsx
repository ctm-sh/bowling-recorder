import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { APP_NAME, TEAM_NAME } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
// 한글 글리프는 구글이 유니코드 범위별로 나눠 주므로 미리 받지 않는다
const notoKr = Noto_Sans_KR({ weight: ["400", "500", "700"], variable: "--font-noto-kr", preload: false });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${TEAM_NAME} 볼링 동호회 점수 기록 · 팀 배분 · 정산`,
  appleWebApp: { capable: true, title: TEAM_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${inter.variable} ${notoKr.variable}`}>
      <body className="min-h-full">
        <div className="mx-auto min-h-dvh max-w-[480px] bg-background has-[.screen-dark]:bg-black">{children}</div>
      </body>
    </html>
  );
}
