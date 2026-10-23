import "server-only";
import { db } from "./client";

export type MinigameRank = {
  memberId: string;
  name: string;
  best: number;
  plays: number;
  /** 최고 점수를 낸 때 */
  bestAt: string;
};

/** 회원별 최고 점수 순위 (같으면 먼저 낸 사람이 위) */
export async function minigameRanking(): Promise<MinigameRank[]> {
  const { data, error } = await db()
    .from("minigame_scores")
    .select("member_id, score, created_at, members(name)")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const byMember = new Map<string, MinigameRank>();
  for (const row of data as unknown as {
    member_id: string;
    score: number;
    created_at: string;
    members: { name: string } | null;
  }[]) {
    const cur = byMember.get(row.member_id);
    if (!cur) {
      byMember.set(row.member_id, {
        memberId: row.member_id,
        name: row.members?.name ?? "?",
        best: row.score,
        plays: 1,
        bestAt: row.created_at,
      });
      continue;
    }
    cur.plays++;
    if (row.score > cur.best) {
      cur.best = row.score;
      cur.bestAt = row.created_at;
    }
  }
  return [...byMember.values()].sort((a, b) => b.best - a.best || a.bestAt.localeCompare(b.bestAt));
}

export async function addMinigameScore(memberId: string, score: number) {
  const { error } = await db().from("minigame_scores").insert({ member_id: memberId, score });
  if (error) throw error;
}
