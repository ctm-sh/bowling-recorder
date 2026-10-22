import type { PlayedGame } from "@/lib/db/memberRecord";
import { rankTeams } from "@/lib/domain/result";
import { matchups, winRecord, type Matchup } from "@/lib/domain/stats";

export type OpponentRecord = {
  opponentId: string;
  wins: number;
  losses: number;
  draws: number;
  /** 최근 순 */
  recent: (Matchup & { date: string; gameNo: number })[];
};

export type RecentGame = {
  gameId: string;
  sessionId: string;
  date: string;
  gameNo: number;
  score: number;
  handicap: number;
  rank: number;
  teamCount: number;
};

/** 회원 한 명의 승률·상대 전적·최근 게임 (조회 화면용) */
export function memberInsights(memberId: string, games: PlayedGame[]) {
  const win = winRecord(games, memberId);
  const meta = new Map(games.map((g) => [g.gameId, g]));

  const opponents = new Map<string, OpponentRecord>();
  const byTier = new Map<number, { wins: number; losses: number; draws: number }>();
  for (const m of matchups(games, memberId)) {
    const g = meta.get(m.gameId)!;
    const rec = opponents.get(m.opponentId) ?? { opponentId: m.opponentId, wins: 0, losses: 0, draws: 0, recent: [] };
    const tier = g.tierAt[m.opponentId];
    const t = byTier.get(tier) ?? { wins: 0, losses: 0, draws: 0 };
    const key = m.result === "W" ? "wins" : m.result === "L" ? "losses" : "draws";
    rec[key]++;
    t[key]++;
    rec.recent.unshift({ ...m, date: g.date, gameNo: g.gameNo });
    opponents.set(m.opponentId, rec);
    byTier.set(tier, t);
  }

  // 앱에서 기록한 전체 게임 (최근 순)
  const allGames: RecentGame[] = [...games]
    .reverse()
    .map((g) => {
      const ranked = rankTeams(g.teams);
      const mine = ranked.find((t) => t.members.some((m) => m.memberId === memberId))!;
      const me = mine.members.find((m) => m.memberId === memberId)!;
      return {
        gameId: g.gameId,
        sessionId: g.sessionId,
        date: g.date,
        gameNo: g.gameNo,
        score: me.score,
        handicap: me.handicap,
        rank: mine.rank,
        teamCount: ranked.length,
      };
    });

  return {
    win,
    opponents: [...opponents.values()].sort(
      (a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws),
    ),
    byTier: [...byTier.entries()].sort((a, b) => a[0] - b[0]).map(([tier, r]) => ({ tier, ...r })),
    allGames,
  };
}
