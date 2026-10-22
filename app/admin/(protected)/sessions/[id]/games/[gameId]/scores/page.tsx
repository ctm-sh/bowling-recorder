import { notFound } from "next/navigation";
import { getGameWithScores } from "@/lib/db/games";
import { listMembers } from "@/lib/db/members";
import { getSession } from "@/lib/db/sessions";
import { ScoreEntry, type EntryTeam } from "./ScoreEntry";

export default async function ScoresPage({ params }: PageProps<"/admin/sessions/[id]/games/[gameId]/scores">) {
  const { id, gameId } = await params;
  const [session, data, members] = await Promise.all([getSession(id), getGameWithScores(id, gameId), listMembers()]);
  if (!session || !data) notFound();

  const byId = new Map(members.map((m) => [m.id, m]));
  const teams: EntryTeam[] = data.game.teams.map((t) => ({
    teamNo: t.team_no,
    handicap: t.handicap,
    adjusted: t.handicap !== t.handicap_default,
    puppet: t.fill_score,
    members: t.team_members.map((m) => ({
      id: m.member_id,
      name: byId.get(m.member_id)?.name ?? "?",
      tier: m.tier_snapshot,
      handicap: m.handicap_snapshot,
    })),
  }));

  return (
    <>
      <ScoreEntry
        gameNo={data.game.game_no}
        sessionId={id}
        gameId={gameId}
        teams={teams}
        initialScores={data.scores}
        readOnly={!!session.session.closed_at}
      />
    </>
  );
}
