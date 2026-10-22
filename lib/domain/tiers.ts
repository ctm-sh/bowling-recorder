// 티어 판단 보조. 티어를 자동으로 바꾸지 않고, 운영진이 볼 근거(기준 에버·후보)만 계산한다.

export const MAX_TIER = 14;

export type TierSample = { tier: number | null; avg: number | null; games: number; active: boolean };

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * 티어별 기준 에버: 그 티어 활동 회원(minGames 이상)의 전체 에버 중앙값.
 * 데이터가 없는 티어는 205 - 티어×10.
 */
export function tierReferences(members: TierSample[], minGames = 10): number[] {
  return Array.from({ length: MAX_TIER + 1 }, (_, tier) => {
    const avgs = members
      .filter((m) => m.active && m.tier === tier && m.avg !== null && m.games >= minGames)
      .map((m) => m.avg!);
    return avgs.length ? median(avgs) : 205 - tier * 10;
  });
}

export type TierSuggestion =
  { kind: "up" | "down"; to: number; threshold: number; recentAvg: number } | { kind: "none" };

/**
 * 승급·강등 후보.
 * - 승급: 최근 에버가 (현재 티어 기준 + 한 단계 위 기준)의 중간값 이상
 * - 강등: 최근 에버가 (현재 티어 기준 + 한 단계 아래 기준)의 중간값 이하
 * 최근 게임이 minRecentGames보다 적거나 티어 미정이면 판단하지 않는다.
 */
export function suggestTier(
  member: { tier: number | null; recentAvg: number | null; recentGames: number },
  refs: number[],
  minRecentGames = 10,
): TierSuggestion {
  const { tier, recentAvg, recentGames } = member;
  if (tier === null || recentAvg === null || recentGames < minRecentGames) return { kind: "none" };

  if (tier > 0) {
    const threshold = (refs[tier] + refs[tier - 1]) / 2;
    if (recentAvg >= threshold) return { kind: "up", to: tier - 1, threshold, recentAvg };
  }
  if (tier < MAX_TIER) {
    const threshold = (refs[tier] + refs[tier + 1]) / 2;
    if (recentAvg <= threshold) return { kind: "down", to: tier + 1, threshold, recentAvg };
  }
  return { kind: "none" };
}

/** 활동 회원 중 승급(up)·강등(down) 후보 */
export function tierCandidates(
  members: (TierSample & { id: string; recentAvg: number | null; recentGames: number })[],
) {
  const refs = tierReferences(members);
  return Object.fromEntries(
    members
      .filter((m) => m.active)
      .map((m) => [m.id, suggestTier(m, refs)] as const)
      .filter(([, s]) => s.kind !== "none")
      .map(([id, s]) => [id, s.kind as "up" | "down"]),
  );
}
