import type { MetadataRoute } from "next";
import { APP_NAME, TEAM_NAME } from "@/lib/brand";

// 휴대폰 "홈 화면에 추가" 시 앱처럼 열리도록
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: TEAM_NAME,
    description: `${TEAM_NAME} 볼링 동호회 점수·팀·정산 기록`,
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#1e2a5a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
