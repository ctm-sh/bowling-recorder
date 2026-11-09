/** 랭킹전 규칙 (docs/04-ranking-match.md). 정모와 달리 팀이 3게임 고정이고 핸디표 값을 그대로 쓴다. */

export const RANKING_GAMES = 3;
export const DEFAULT_TEAM_PRIZE = 100_000;
export const DEFAULT_MASTERS_PRIZE = 30_000;
/** 점수 넘기기 상금 한도 */
export const MAX_TARGET_PRIZE = 100_000;

export type RankingEntry = {
  memberId: string;
  teamNo: number | null;
  handicap: number;
  /** 게임 번호순. 아직 입력하지 않은 게임은 null */
  scores: (number | null)[];
};

export type RankedEntry = RankingEntry & { raw: number; total: number; played: number; rank: number };

export type RankingTeam = { teamNo: number; fill: number | null; members: RankingEntry[] };
export type RankedRankingTeam = RankingTeam & {
  raw: number;
  handicap: number;
  total: number;
  rank: number;
};

export type TargetTier = { minTotal: number; prize: number };

function played(scores: (number | null)[]) {
  return scores.filter((s): s is number => s !== null);
}

/** 입력된 게임 수만큼만 핸디를 더한다. 진행 중에도 지금까지의 합으로 순위를 볼 수 있다. */
function entryTotals(entry: RankingEntry) {
  const scores = played(entry.scores);
  const raw = scores.reduce((sum, s) => sum + s, 0);
  return { raw, played: scores.length, total: raw + entry.handicap * scores.length };
}

/** 앞 사람과 비교 값이 모두 같으면 같은 순위를 준다 (1, 1, 3) */
function withRanks<T>(sorted: T[], same: (a: T, b: T) => boolean) {
  const ranks: number[] = [];
  sorted.forEach((item, i) => {
    ranks.push(i > 0 && same(sorted[i - 1], item) ? ranks[i - 1] : i + 1);
  });
  return sorted.map((item, i) => ({ ...item, rank: ranks[i] }));
}

/** 개인 순위: 점수 합 + 핸디. 동점이면 핸디가 작은 사람이 위, 그래도 같으면 같은 순위 */
export function rankEntries(entries: RankingEntry[]): RankedEntry[] {
  const sorted = entries
    .map((e) => ({ ...e, ...entryTotals(e) }))
    .sort((a, b) => b.total - a.total || a.handicap - b.handicap);
  return withRanks(sorted, (a, b) => a.total === b.total && a.handicap === b.handicap);
}

/**
 * 팀 순위: 팀원 점수 합 + 팀원 핸디 합 + 꼭두각시 점수를 게임마다 더한다.
 * 동점이면 핸디 합이 큰 팀이 아래, 그래도 같으면 같은 순위.
 */
export function rankTeams(teams: RankingTeam[]): RankedRankingTeam[] {
  const sorted = teams
    .map((t) => {
      const totals = t.members.map(entryTotals);
      const raw = totals.reduce((sum, m) => sum + m.raw, 0);
      const games = Math.max(0, ...totals.map((m) => m.played));
      const handicap = t.members.reduce((sum, m, i) => sum + m.handicap * totals[i].played, 0);
      return { ...t, raw, handicap, total: raw + handicap + (t.fill ?? 0) * games };
    })
    .sort((a, b) => b.total - a.total || a.handicap - b.handicap);
  return withRanks(sorted, (a, b) => a.total === b.total && a.handicap === b.handicap);
}

/** 점수 넘기기 판정 점수: 참가자 전원의 점수 합 + 핸디 */
export function targetTotal(entries: RankingEntry[]) {
  return entries.reduce((sum, e) => sum + entryTotals(e).total, 0);
}

/** 도달한 가장 높은 구간. 구간 기준 이상이면 달성이다. */
export function reachedTier(total: number, tiers: TargetTier[]): TargetTier | null {
  return [...tiers].sort((a, b) => b.minTotal - a.minTotal).find((t) => total >= t.minTotal) ?? null;
}

/** 구간 입력 검사. 문제가 없으면 null */
export function targetTiersError(tiers: TargetTier[]): string | null {
  if (tiers.length === 0) return "구간을 하나 이상 입력해주세요.";
  for (const t of tiers) {
    if (!Number.isInteger(t.minTotal) || t.minTotal <= 0) return "기준 점수는 1 이상 숫자로 입력해주세요.";
    if (!Number.isInteger(t.prize) || t.prize <= 0) return "상금은 1원 이상 숫자로 입력해주세요.";
    if (t.prize > MAX_TARGET_PRIZE) return "상금은 10만원을 넘을 수 없어요.";
  }
  const sorted = [...tiers].sort((a, b) => a.minTotal - b.minTotal);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minTotal === sorted[i - 1].minTotal) return "같은 기준 점수가 두 번 들어 있어요.";
    if (sorted[i].prize <= sorted[i - 1].prize) return "기준 점수가 높은 구간일수록 상금도 커야 해요.";
  }
  return null;
}

/** 인원이 적은 팀에 넣을 꼭두각시 기본 점수: 참가자 전체 에버 평균 */
export function defaultFillScore(avgs: number[]) {
  return avgs.length === 0 ? 0 : Math.round(avgs.reduce((sum, a) => sum + a, 0) / avgs.length);
}

/** 순위대로 제외자를 빼고 N명을 고른다. 제외한 만큼 다음 순위가 올라온다. */
export function mastersPick(ranked: RankedEntry[], size: number, excluded: Iterable<string>) {
  const skip = new Set(excluded);
  return ranked.filter((e) => !skip.has(e.memberId)).slice(0, size);
}

export type MastersEntry = { memberId: string; handicap: number; score: number | null };
export type RankedMasters = MastersEntry & { total: number | null; rank: number | null };

/** 마스터즈 순위: 단판 점수 + 핸디. 동점이면 핸디가 작은 사람이 위, 그래도 같으면 같은 순위. */
export function rankMasters(entries: MastersEntry[]): RankedMasters[] {
  const done = entries
    .filter((e) => e.score !== null)
    .map((e) => ({ ...e, total: e.score! + e.handicap }))
    .sort((a, b) => b.total - a.total || a.handicap - b.handicap);
  const ranked: RankedMasters[] = withRanks(done, (a, b) => a.total === b.total && a.handicap === b.handicap);
  return [...ranked, ...entries.filter((e) => e.score === null).map((e) => ({ ...e, total: null, rank: null }))];
}

/** 3게임 점수가 모두 들어왔는지 */
export function allScored(entries: RankingEntry[]) {
  return entries.length > 0 && entries.every((e) => played(e.scores).length === RANKING_GAMES);
}

/** 그 날짜가 속한 달의 첫날과 다음 달 첫날 (YYYY-MM-DD) */
export function monthRange(date: string) {
  const [y, m] = date.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { start: `${y}-${pad(m)}-01`, end: m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01` };
}

export type MatchStage = "setup" | "playing" | "pick-masters" | "masters" | "finish" | "closed";

/** 지금 해야 할 단계 */
export function matchStage(
  match: { format: "team" | "target" | null; closed: boolean; mastersSize: number | null },
  entries: RankingEntry[],
  masters: MastersEntry[],
): MatchStage {
  if (match.closed) return "closed";
  if (!match.format || entries.length === 0) return "setup";
  if (!allScored(entries)) return "playing";
  if (match.mastersSize === null) return "pick-masters";
  return masters.every((m) => m.score !== null) ? "finish" : "masters";
}

/** 대표자로 고를 수 있는 사람: 팀전은 1등 팀원(공동 1등 포함), 점수 넘기기는 참가자 전원 */
export function representativeCandidates(format: "team" | "target", entries: RankingEntry[], teams: RankedRankingTeam[]) {
  if (format === "target") return entries.map((e) => e.memberId);
  return teams.filter((t) => t.rank === 1).flatMap((t) => t.members.map((m) => m.memberId));
}

/** 이번 회차 상금. 점수 넘기기에서 구간에 못 미치면 0 */
export function matchPrize(
  match: { format: "team" | "target"; teamPrize: number; targetTiers: TargetTier[] },
  entries: RankingEntry[],
) {
  if (match.format === "team") return match.teamPrize;
  return reachedTier(targetTotal(entries), match.targetTiers)?.prize ?? 0;
}

/** 마스터즈 우승 후보 (공동 1등이면 여러 명, 운영진이 정한다) */
export function mastersWinnerCandidates(ranked: RankedMasters[]) {
  return ranked.filter((e) => e.rank === 1).map((e) => e.memberId);
}
