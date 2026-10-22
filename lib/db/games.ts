import "server-only";
import { db } from "./client";

export type GameTeamMember = {
  member_id: string;
  tier_snapshot: number;
  handicap_snapshot: number;
  handicap_default: number;
  group_no: number;
};

export type GameTeam = {
  id: string;
  team_no: number;
  handicap: number;
  handicap_default: number;
  fill_score: number | null;
  fill_score_default: number | null;
  team_members: GameTeamMember[];
};

export type Game = {
  id: string;
  game_no: number;
  mode: "random" | "manual";
  confirmed_at: string | null;
  teams: GameTeam[];
  scoreCount: number;
};

export async function listGames(sessionId: string): Promise<Game[]> {
  const { data, error } = await db()
    .from("games")
    .select(
      "id, game_no, mode, confirmed_at, scores(count), teams(id, team_no, handicap, handicap_default, fill_score, fill_score_default, team_members(member_id, tier_snapshot, handicap_snapshot, handicap_default, group_no))",
    )
    .eq("session_id", sessionId)
    .order("game_no");
  if (error) throw error;

  return data.map(({ scores, teams, ...g }) => ({
    ...(g as Omit<Game, "teams" | "scoreCount">),
    scoreCount: (scores as { count: number }[])[0]?.count ?? 0,
    teams: (teams as GameTeam[])
      .sort((a, b) => a.team_no - b.team_no)
      .map((t) => ({ ...t, team_members: [...t.team_members].sort((a, b) => a.group_no - b.group_no) })),
  }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 한 게임의 팀 구성과 입력된 점수 */
export async function getGameWithScores(sessionId: string, gameId: string) {
  if (!UUID.test(gameId)) return null;
  const games = await listGames(sessionId);
  const game = games.find((g) => g.id === gameId);
  if (!game) return null;

  const { data, error } = await db().from("scores").select("member_id, score").eq("game_id", gameId);
  if (error) throw error;
  return { game, scores: Object.fromEntries(data.map((s) => [s.member_id as string, s.score as number])) };
}

export async function getHandicapTable() {
  const { data, error } = await db().from("settings").select("handicap_table").eq("id", 1).single();
  if (error) throw error;
  return data.handicap_table as Record<string, number>;
}
