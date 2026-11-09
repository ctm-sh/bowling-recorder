import { notFound } from "next/navigation";
import { NavBar } from "@/components/PageHeader";
import { getHandicapTable } from "@/lib/db/games";
import { listMembers } from "@/lib/db/members";
import { getRankingMatch } from "@/lib/db/rankingMatches";
import { effectiveTier, personalHandicap } from "@/lib/domain/teams";
import { SetupWizard, type SetupPerson } from "./SetupWizard";

export default async function RankingSetupPage({ params }: PageProps<"/admin/ranking-matches/[id]/setup">) {
  const { id } = await params;
  const [data, members, table] = await Promise.all([getRankingMatch(id), listMembers(), getHandicapTable()]);
  if (!data) notFound();

  const back = `/admin/ranking-matches/${id}`;
  const locked = data.entries.some((e) => e.scores.some((s) => s !== null));
  if (data.match.closed_at || locked) {
    return (
      <>
        <NavBar title="참가자·구성" back={back} backLabel="랭킹전" />
        <p className="mx-5 mt-5 rounded-2xl bg-surface p-4 text-[15px] text-muted">
          {data.match.closed_at ? "마감된 랭킹전이에요." : "점수를 입력한 뒤에는 참가자와 팀을 바꿀 수 없어요."}
        </p>
      </>
    );
  }

  const entered = new Set(data.entries.map((e) => e.memberId));
  const people: SetupPerson[] = members
    .filter((m) => m.active || entered.has(m.id))
    .map((m) => {
      const tier = effectiveTier(m.tier);
      return { id: m.id, name: m.name, tier: m.tier, avg: m.avg, baseHandicap: personalHandicap(tier, table) };
    });

  return (
    <SetupWizard
      matchId={id}
      back={back}
      people={people}
      initial={{
        format: data.match.format ?? "team",
        selected: data.entries.map((e) => e.memberId),
        handicaps: Object.fromEntries(data.entries.map((e) => [e.memberId, String(e.handicap)])),
        teamCount: Math.max(2, data.teams.length),
        assign: Object.fromEntries(data.entries.filter((e) => e.teamNo).map((e) => [e.memberId, e.teamNo!])),
        fills: Object.fromEntries(data.teams.filter((t) => t.fill !== null).map((t) => [t.teamNo, String(t.fill)])),
        tiers: data.match.target_tiers.map((t) => ({ minTotal: String(t.minTotal), prize: String(t.prize) })),
      }}
    />
  );
}
