import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Empty, PageHeader } from "@/components/PageHeader";
import { hasScore, RankingMatchResult } from "@/components/RankingMatchResult";
import { getRankingMatch } from "@/lib/db/rankingMatches";
import { formatDateLong, rankingMatchTitle } from "@/lib/format";

export default async function PublicRankingMatchPage({ params }: PageProps<"/ranking-matches/[id]">) {
  await connection();
  const { id } = await params;
  const data = await getRankingMatch(id);
  if (!data) notFound();
  const live = !data.match.closed_at;

  return (
    <div className="pb-6">
      {live && <LiveRefresh />}
      <PageHeader
        back="/ranking-matches"
        backLabel="랭킹전"
        eyebrow={live ? <span className="text-accent">실시간</span> : "마감"}
        title={rankingMatchTitle(data.match.date)}
        sub={`${formatDateLong(data.match.date)} · ${data.entries.length}명`}
      />
      {hasScore(data) ? (
        <RankingMatchResult data={data} />
      ) : (
        <Empty>아직 입력된 점수가 없어요. 입력되면 여기에 바로 나타나요.</Empty>
      )}
    </div>
  );
}
