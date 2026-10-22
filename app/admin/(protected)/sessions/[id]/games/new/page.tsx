import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getHandicapTable, listGames } from "@/lib/db/games";
import { listMembers } from "@/lib/db/members";
import { getSession } from "@/lib/db/sessions";
import { assignRandom, defaultTeamCount, effectiveTier } from "@/lib/domain/teams";
import { TeamBuilder, type BuilderPerson, type BuilderInitial } from "./TeamBuilder";

export default async function NewGamePage({ params, searchParams }: PageProps<"/admin/sessions/[id]/games/new">) {
  const { id } = await params;
  const { from } = await searchParams;
  const data = await getSession(id);
  if (!data) notFound();

  const [members, games, table] = await Promise.all([listMembers(), listGames(id), getHandicapTable()]);
  const attending = new Set(data.attendeeIds);
  const people: BuilderPerson[] = members
    .filter((m) => attending.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, tier: m.tier, avg: m.avg }));

  // "팀 그대로": 이전 게임의 팀·묶음·합의값을 미리 채운다. 아니면 서버에서 첫 랜덤 배정.
  const source = typeof from === "string" ? games.find((g) => g.id === from) : undefined;
  const players = people.map((p) => ({ id: p.id, tier: effectiveTier(p.tier), avg: p.avg }));
  const initial: BuilderInitial = source ? {
    mode: source.mode,
    slots: source.teams.flatMap((t) =>
      t.team_members.map((m) => ({ memberId: m.member_id, teamNo: t.team_no, groupNo: m.group_no })),
    ),
    // 합의 조정했던 순 핸디만 이어받는다
    overrides: Object.fromEntries(
      source.teams.filter((t) => t.handicap !== t.handicap_default).map((t) => [t.team_no, t.handicap]),
    ),
    sourceGameNo: source.game_no,
  } : {
    mode: "random",
    slots: people.length >= 2 ? assignRandom(players, defaultTeamCount(players.length)) : [],
    overrides: {},
  };

  const gameNo = (games.at(-1)?.game_no ?? 0) + 1;

  return (
    <>
      <PageHeader
        title={`${gameNo}게임 팀 구성`}
        back={`/admin/sessions/${id}`}
      />
      {data.session.closed_at ? (
        <p className="m-4 rounded-xl bg-background p-4 text-sm text-muted">마감된 정모예요.</p>
      ) : people.length < 2 ? (
        <p className="m-4 rounded-xl bg-background p-4 text-sm text-muted">
          참석자가 2명 이상이어야 팀을 나눌 수 있어요.{" "}
          <Link href={`/admin/sessions/${id}/attendance`} className="font-bold text-brand underline">
            참석 체크
          </Link>
        </p>
      ) : (
        <TeamBuilder sessionId={id} people={people} handicapTable={table} initial={initial} />
      )}
    </>
  );
}
