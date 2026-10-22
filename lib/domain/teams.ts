import type { HandicapTable, Player, Slot } from "./types";

export type Rng = () => number;

/** 티어 미정 회원은 팀 배분·핸디에서 가장 낮은 티어로 취급한다 */
export const UNSET_TIER_AS = 14;

export function effectiveTier(tier: number | null) {
  return tier ?? UNSET_TIER_AS;
}

/** 기록이 없는 회원의 배분용 추정 에버: 실제 기록상 한 티어 ≈ 10점 */
export function estimatedAvg(player: Player) {
  return player.avg ?? 205 - player.tier * 10;
}

export function personalHandicap(tier: number, table: HandicapTable) {
  return table[String(tier)] ?? 0;
}

/**
 * 게임에서 각자 받는 핸디: 같은 묶음(상대방) 안에서 핸디표 값이 가장 작은 사람(가장 높은 티어)을 0으로 두고
 * 그 차이만큼 받는다. 예) 4티어(20) vs 5티어(26) → 4티어 0, 5티어 +6. 상대가 없으면 0.
 */
export function matchupHandicaps(slots: Slot[], tierById: Map<string, number>, table: HandicapTable) {
  const base = new Map<number, number>();
  for (const s of slots) {
    const h = personalHandicap(tierById.get(s.memberId)!, table);
    base.set(s.groupNo, Math.min(base.get(s.groupNo) ?? h, h));
  }
  return new Map(
    slots.map((s) => [s.memberId, personalHandicap(tierById.get(s.memberId)!, table) - base.get(s.groupNo)!]),
  );
}

/**
 * 팀이 실제로 받는 핸디(순 핸디).
 * 팀별 (팀원이 받은 핸디 합 + 꼭두각시 점수)를 모은 뒤 가장 적은 팀을 0으로 두고 차이만 준다.
 * 예) 1팀 4 + 꼭두각시 100 = 104, 2팀 4 → 1팀 100, 2팀 0
 */
export function netTeamHandicaps(gross: Record<number, number>) {
  const min = Math.min(...Object.values(gross));
  return Object.fromEntries(Object.entries(gross).map(([teamNo, h]) => [Number(teamNo), h - min])) as Record<
    number,
    number
  >;
}

/** 팀원들이 받은 핸디의 합 (꼭두각시 제외) */
export function teamHandicaps(slots: Slot[], given: Map<string, number>) {
  const sums: Record<number, number> = {};
  for (const s of slots) sums[s.teamNo] = (sums[s.teamNo] ?? 0) + given.get(s.memberId)!;
  return sums;
}

/** n명을 k팀으로 나눌 때 팀별 인원. 인원 차이는 최대 1명, 앞 팀부터 1명씩 더 많다. */
export function teamSizes(n: number, k: number) {
  if (k < 2 || k > n) throw new Error(`${n}명을 ${k}팀으로 나눌 수 없어요.`);
  const base = Math.floor(n / k);
  return Array.from({ length: k }, (_, i) => base + (i < n % k ? 1 : 0));
}

/** 처음 보여줄 팀 수: 9명 이상이면 3팀, 아니면 2팀 */
export function defaultTeamCount(n: number) {
  return n >= 9 ? 3 : 2;
}

/** 가능한 팀 형태 목록 (2팀 ~ 개인전) */
export function formations(n: number) {
  const list: { teams: number; sizes: number[] }[] = [];
  for (let k = 2; k <= n; k++) list.push({ teams: k, sizes: teamSizes(n, k) });
  return list;
}

/** 직접 구성한 팀의 인원 구성이 규칙(2팀 이상, 차이 최대 1명, 빈 팀 없음)에 맞는지 */
export function isValidSizes(sizes: number[]) {
  if (sizes.length < 2 || sizes.some((s) => s < 1)) return false;
  return Math.max(...sizes) - Math.min(...sizes) <= 1;
}

function shuffle<T>(items: T[], rng: Rng) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function byAvgDesc(a: Player, b: Player) {
  return estimatedAvg(b) - estimatedAvg(a);
}

/**
 * 랜덤 배분: 에버 순으로 정렬해 팀 수만큼씩 묶고, 각 묶음을 팀별로 한 명씩 랜덤 배정한다.
 * 마지막 묶음이 팀 수보다 적으면 그 인원은 서로 다른 랜덤 팀에 들어간다.
 */
export function assignRandom(players: Player[], teamCount: number, rng: Rng = Math.random): Slot[] {
  teamSizes(players.length, teamCount);
  const sorted = [...players].sort(byAvgDesc);
  const teamNos = Array.from({ length: teamCount }, (_, i) => i + 1);
  const slots: Slot[] = [];

  for (let start = 0, groupNo = 1; start < sorted.length; start += teamCount, groupNo++) {
    const group = sorted.slice(start, start + teamCount);
    const targets = shuffle(teamNos, rng);
    group.forEach((p, i) => slots.push({ memberId: p.id, teamNo: targets[i], groupNo }));
  }
  return slots;
}

/** 직접 구성: 각 팀을 에버 순으로 세워 같은 순번끼리 같은 묶음(상대방)으로 지정한다. */
export function assignGroupsByOrder(teams: Player[][]): Slot[] {
  return teams.flatMap((members, t) =>
    [...members].sort(byAvgDesc).map((p, i) => ({ memberId: p.id, teamNo: t + 1, groupNo: i + 1 })),
  );
}

/**
 * 확정 전 라인업 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지.
 * - 참석자만, 한 사람은 한 번만
 * - 팀 번호는 1..k 연속, 인원 차이 최대 1명
 * - 같은 묶음(상대방) 안에서는 모두 다른 팀
 */
export function lineupError(slots: Slot[], attendeeIds: Iterable<string>): string | null {
  if (slots.length < 2) return "2명 이상이어야 팀을 나눌 수 있어요.";
  const attendees = new Set(attendeeIds);
  const seen = new Set<string>();
  for (const s of slots) {
    if (!attendees.has(s.memberId)) return "참석하지 않은 사람이 들어 있어요.";
    if (seen.has(s.memberId)) return "같은 사람이 두 번 들어 있어요.";
    seen.add(s.memberId);
  }

  const teamCount = Math.max(...slots.map((s) => s.teamNo));
  const sizes = Array.from({ length: teamCount }, (_, i) => slots.filter((s) => s.teamNo === i + 1).length);
  if (!isValidSizes(sizes)) return "팀은 2개 이상, 팀 간 인원 차이는 최대 1명이어야 해요.";

  const groups = new Map<number, Set<number>>();
  for (const s of slots) {
    const teams = groups.get(s.groupNo) ?? new Set<number>();
    if (teams.has(s.teamNo)) return "같은 팀 안에 서로 상대방인 사람이 있어요.";
    teams.add(s.teamNo);
    groups.set(s.groupNo, teams);
  }
  return null;
}

/**
 * 인원이 1명 적은 팀의 보정 점수 기본값.
 * 마지막 묶음(상대 없던 사람들)의 전체 에버 평균을 정수로 반올림해 적은 팀마다 준다.
 * 인원이 모두 같으면 빈 객체.
 */
export function defaultFillScores(slots: Slot[], players: Player[]): Record<number, number> {
  const sizes = new Map<number, number>();
  for (const s of slots) sizes.set(s.teamNo, (sizes.get(s.teamNo) ?? 0) + 1);
  const max = Math.max(...sizes.values());
  const short = [...sizes].filter(([, size]) => size < max).map(([teamNo]) => teamNo);
  if (short.length === 0) return {};

  const lastGroup = Math.max(...slots.map((s) => s.groupNo));
  const avgById = new Map(players.map((p) => [p.id, estimatedAvg(p)]));
  const unpaired = slots.filter((s) => s.groupNo === lastGroup).map((s) => avgById.get(s.memberId)!);
  const fill = Math.round(unpaired.reduce((a, b) => a + b, 0) / unpaired.length);

  return Object.fromEntries(short.map((teamNo) => [teamNo, fill]));
}
