import { notFound, redirect } from "next/navigation";
import { NavBar } from "@/components/PageHeader";
import { getRankingMatch } from "@/lib/db/rankingMatches";
import { saveMastersPicks, saveMastersScore } from "../../actions";
import { RankingScoreSheet } from "../RankingScoreSheet";
import { MastersPick } from "./MastersPick";

export default async function MastersPage({ params, searchParams }: PageProps<"/admin/ranking-matches/[id]/masters">) {
  const { id } = await params;
  const { edit } = await searchParams;
  const data = await getRankingMatch(id);
  if (!data) notFound();
  const hub = `/admin/ranking-matches/${id}`;
  if (data.stage === "setup" || data.stage === "playing") redirect(hub);

  const closed = !!data.match.closed_at;
  if (!closed && (data.match.masters_size === null || edit === "1")) {
    const picked = new Set(data.masters.map((m) => m.memberId));
    const size = data.match.masters_size ?? Math.min(4, data.entries.length);
    // 다시 정할 때: 지금 진출자보다 위 순위인데 빠져 있는 사람은 제외 상태로 시작한다
    const lastPickRank = Math.max(0, ...data.ranked.map((e, i) => (picked.has(e.memberId) ? i + 1 : 0)));
    const excluded = data.ranked.slice(0, lastPickRank).filter((e) => !picked.has(e.memberId));
    return (
      <>
        <NavBar title="마스터즈 진출자" back={hub} backLabel="랭킹전" />
        <MastersPick
          entries={data.ranked.map((e) => ({
            memberId: e.memberId,
            name: data.byMember.get(e.memberId)!.name,
            rank: e.rank,
            total: e.total,
            handicap: e.handicap,
          }))}
          initialSize={size}
          initialExcluded={excluded.map((e) => e.memberId)}
          save={saveMastersPicks.bind(null, id)}
        />
      </>
    );
  }

  const entries = data.entries.filter((e) => e.mastersSeed !== null).sort((a, b) => a.mastersSeed! - b.mastersSeed!);
  return (
    <RankingScoreSheet
      title="마스터즈 점수"
      back={hub}
      groups={[
        {
          key: "masters",
          label: `진출자 ${entries.length}명`,
          fill: null,
          people: entries.map((e) => ({ id: e.entryId, name: e.name, handicap: e.handicap })),
        },
      ]}
      initialScores={Object.fromEntries(
        entries.flatMap((e) => (e.mastersScore === null ? [] : [[e.entryId, e.mastersScore]])),
      )}
      readOnly={closed}
      save={saveMastersScore.bind(null, id)}
      nextHref={hub}
      nextLabel="최종 결과 보기"
    />
  );
}
