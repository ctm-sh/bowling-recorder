import "server-only";
import type { GameRecord } from "@/lib/domain/stats";
import { db } from "./client";

type Row = {
  id: string;
  teams: {
    team_no: number;
    handicap: number;
    team_members: { member_id: string; handicap_snapshot: number; group_no: number }[];
  }[];
  scores: { member_id: string; score: number }[];
};

/** 모든 사람 점수가 들어온 게임 전체 (랭킹의 승률 계산용) */
export async function completeGames(): Promise<GameRecord[]> {
  const { data, error } = await db()
    .from("games")
    .select("id, teams(team_no, handicap, team_members(member_id, handicap_snapshot, group_no)), scores(member_id, score)");
  if (error) throw error;

  return (data as unknown as Row[]).flatMap((g) => {
    const score = new Map(g.scores.map((s) => [s.member_id, s.score]));
    if (g.teams.some((t) => t.team_members.some((m) => !score.has(m.member_id)))) return [];
    return [
      {
        gameId: g.id,
        teams: g.teams.map((t) => ({
          teamNo: t.team_no,
          handicap: t.handicap,
          members: t.team_members.map((m) => ({
            memberId: m.member_id,
            score: score.get(m.member_id)!,
            handicap: m.handicap_snapshot,
            groupNo: m.group_no,
          })),
        })),
      },
    ];
  });
}
