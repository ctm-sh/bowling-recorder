import "server-only";
import { rankTeams, settle, type Charge } from "@/lib/domain/result";
import type { RankedTeam, TeamEntry } from "@/lib/domain/types";
import { db } from "./client";
import { listGames, type Game } from "./games";

export type GameResult = {
  game: Game;
  ranked: RankedTeam[];
  /** 모든 사람 점수가 입력됐는지 */
  complete: boolean;
  missing: number;
  /** 점수가 다 들어온 게임만 정산한다 */
  charges: Charge[];
  scores: Record<string, number>;
};

/** DB의 게임 + 점수 → 순위 계산용 팀. 아직 입력 안 된 점수는 0으로 둔다. */
function toEntries(game: Game, scores: Record<string, number>): TeamEntry[] {
  return game.teams.map((t) => ({
    teamNo: t.team_no,
    handicap: t.handicap,
    members: t.team_members.map((m) => ({
      memberId: m.member_id,
      score: scores[m.member_id] ?? 0,
      handicap: m.handicap_snapshot,
      groupNo: m.group_no,
    })),
  }));
}

export async function getSessionResults(sessionId: string, fee: number): Promise<GameResult[]> {
  const games = await listGames(sessionId);
  if (games.length === 0) return [];

  const { data, error } = await db()
    .from("scores")
    .select("game_id, member_id, score")
    .in("game_id", games.map((g) => g.id));
  if (error) throw error;

  return games.map((game) => {
    const scores: Record<string, number> = {};
    for (const s of data) if (s.game_id === game.id) scores[s.member_id as string] = s.score as number;
    const people = game.teams.flatMap((t) => t.team_members);
    const missing = people.filter((m) => scores[m.member_id] === undefined).length;
    const ranked = rankTeams(toEntries(game, scores));
    return {
      game,
      ranked,
      complete: missing === 0,
      missing,
      charges: missing === 0 ? settle(ranked, fee) : [],
      scores,
    };
  });
}
