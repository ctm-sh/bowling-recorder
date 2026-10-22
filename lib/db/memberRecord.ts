import "server-only";
import type { GameRecord } from "@/lib/domain/stats";
import { db } from "./client";

export type PlayedGame = GameRecord & {
  sessionId: string;
  date: string;
  gameNo: number;
  /** 그 게임 당시 티어 (member_id → tier_snapshot) */
  tierAt: Record<string, number>;
};

type Row = {
  id: string;
  game_no: number;
  session_id: string;
  sessions: { date: string };
  teams: {
    team_no: number;
    handicap: number;
    team_members: { member_id: string; tier_snapshot: number; handicap_snapshot: number; group_no: number }[];
  }[];
  scores: { member_id: string; score: number }[];
};

/**
 * 회원이 뛴 게임 중 모든 사람 점수가 들어온 게임만 (오래된 순).
 * 승률·상대 전적 계산에 쓴다.
 */
export async function playedGames(memberId: string): Promise<PlayedGame[]> {
  const mine = await db().from("team_members").select("teams!inner(game_id)").eq("member_id", memberId);
  if (mine.error) throw mine.error;
  const gameIds = [...new Set(mine.data.map((r) => (r.teams as unknown as { game_id: string }).game_id))];
  if (gameIds.length === 0) return [];

  const { data, error } = await db()
    .from("games")
    .select(
      "id, game_no, session_id, sessions!inner(date), teams(team_no, handicap, team_members(member_id, tier_snapshot, handicap_snapshot, group_no)), scores(member_id, score)",
    )
    .in("id", gameIds);
  if (error) throw error;

  return (data as unknown as Row[])
    .map((g) => {
      const score = new Map(g.scores.map((s) => [s.member_id, s.score]));
      const people = g.teams.flatMap((t) => t.team_members);
      if (people.some((m) => !score.has(m.member_id))) return null;
      return {
        gameId: g.id,
        sessionId: g.session_id,
        date: g.sessions.date,
        gameNo: g.game_no,
        tierAt: Object.fromEntries(people.map((m) => [m.member_id, m.tier_snapshot])),
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
      };
    })
    .filter((g): g is PlayedGame => g !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.gameNo - b.gameNo);
}

/** 엑셀에서 가져온 이전 기록 (오래된 순). 날짜·팀 정보가 없다. */
export async function legacyScores(memberId: string): Promise<number[]> {
  const { data, error } = await db()
    .from("scores")
    .select("score")
    .eq("member_id", memberId)
    .is("game_id", null)
    .order("seq");
  if (error) throw error;
  return data.map((s) => s.score as number);
}
