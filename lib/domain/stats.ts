import { rankTeams } from "./result";
import type { TeamEntry } from "./types";

export function average(scores: number[]) {
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** 오래된 순으로 정렬된 점수에서 최근 n게임 에버 */
export function recentAverage(scoresOldestFirst: number[], n: number) {
  return average(scoresOldestFirst.slice(-n));
}

/** 최근 폼 = 최근 n게임 에버 - 전체 에버 (기록이 없으면 null) */
export function form(scoresOldestFirst: number[], n: number) {
  const all = average(scoresOldestFirst);
  const recent = recentAverage(scoresOldestFirst, n);
  return all === null || recent === null ? null : recent - all;
}

export type GameRecord = { gameId: string; teams: TeamEntry[] };

/** 개인 승률: 팀이 1등이면 승, 나머지는 패 */
export function winRecord(games: GameRecord[], memberId: string) {
  let wins = 0;
  let played = 0;
  for (const game of games) {
    const ranked = rankTeams(game.teams);
    const mine = ranked.find((t) => t.members.some((m) => m.memberId === memberId));
    if (!mine) continue;
    played++;
    if (mine.rank === 1) wins++;
  }
  return { wins, losses: played - wins, played, rate: played ? wins / played : null };
}

export type Matchup = {
  gameId: string;
  opponentId: string;
  my: { score: number; handicap: number };
  their: { score: number; handicap: number };
  result: "W" | "L" | "D";
};

/** 상대 전적: 같은 게임에서 같은 묶음이었던 상대방과 개인 점수 + 개인 핸디로 비교 */
export function matchups(games: GameRecord[], memberId: string): Matchup[] {
  const list: Matchup[] = [];
  for (const game of games) {
    const everyone = game.teams.flatMap((t) => t.members.map((m) => ({ ...m, teamNo: t.teamNo })));
    const me = everyone.find((m) => m.memberId === memberId);
    if (!me) continue;
    for (const other of everyone) {
      if (other.groupNo !== me.groupNo || other.teamNo === me.teamNo) continue;
      const diff = me.score + me.handicap - (other.score + other.handicap);
      list.push({
        gameId: game.gameId,
        opponentId: other.memberId,
        my: { score: me.score, handicap: me.handicap },
        their: { score: other.score, handicap: other.handicap },
        result: diff > 0 ? "W" : diff < 0 ? "L" : "D",
      });
    }
  }
  return list;
}

/** 상대별 승·패·무 합계 */
export function headToHead(games: GameRecord[], memberId: string) {
  const byOpponent = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const m of matchups(games, memberId)) {
    const rec = byOpponent.get(m.opponentId) ?? { wins: 0, losses: 0, draws: 0 };
    if (m.result === "W") rec.wins++;
    else if (m.result === "L") rec.losses++;
    else rec.draws++;
    byOpponent.set(m.opponentId, rec);
  }
  return byOpponent;
}
