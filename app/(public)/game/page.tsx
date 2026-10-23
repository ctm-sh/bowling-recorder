import type { Metadata } from "next";
import { MinigameRanking } from "@/components/MinigameRanking";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/ui";
import { TEAM_NAME } from "@/lib/brand";
import { getMember } from "@/lib/db/members";
import { minigameRanking } from "@/lib/db/minigame";
import { getMeId } from "@/lib/me";
import { BowlingGame } from "./BowlingGame";

export const metadata: Metadata = { title: "미니게임" };

export default async function GamePage() {
  const [ranking, meId] = await Promise.all([minigameRanking(), getMeId()]);
  const me = meId ? await getMember(meId) : null;
  const myBest = ranking.find((r) => r.memberId === meId)?.best ?? null;

  return (
    <div className="pb-6">
      <PageHeader back="/home" backLabel="홈" eyebrow={`${TEAM_NAME} 볼링`} title="미니게임" />
      <BowlingGame meName={me?.member.name ?? null} myBest={myBest} />
      <SectionTitle note="회원별 최고 점수">게임 랭킹</SectionTitle>
      <MinigameRanking ranking={ranking} meId={meId} limit={10} playLink={false} className="mx-5" />
    </div>
  );
}
