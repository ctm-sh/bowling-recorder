import type { RankedTeam, TeamEntry } from "./types";

/**
 * 팀 순위. 팀 점수 = 팀원 점수 합 + 순 핸디(꼭두각시 포함).
 * 동점이면 핸디가 큰(핸디를 받은) 팀이 아래. 핸디까지 같으면 실제 점수도 같으므로 팀 번호 순.
 */
export function rankTeams(teams: TeamEntry[]): RankedTeam[] {
  return teams
    .map((t) => {
      const raw = t.members.reduce((sum, m) => sum + m.score, 0);
      return { ...t, raw, total: raw + t.handicap, rank: 0 };
    })
    .sort((a, b) => b.total - a.total || a.handicap - b.handicap || a.teamNo - b.teamNo)
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

export type Charge = {
  memberId: string;
  teamNo: number;
  amount: number;
  /** winner: 상대 팀이 대신 냄 / self: 자기 몫만 / loser: 상대 팀 몫까지 */
  kind: "winner" | "self" | "loser";
};

/** 1/N 금액은 100원 단위로 올림 */
export function splitAmount(total: number, people: number) {
  return Math.ceil(total / people / 100) * 100;
}

/**
 * 정산: 1등↔꼴찌, 2등↔뒤에서 2등 순으로 짝짓는다.
 * - 아래 팀은 (대신 내는 인원 + 자기 팀 인원) × 게임비를 1/N로 나눠 낸다.
 *   대신 내는 인원 = min(위 팀 인원, 아래 팀 인원)
 * - 위 팀 인원이 더 많으면, 개인 점수+핸디가 낮은 사람부터 남는 인원만큼 자기 몫을 낸다.
 * - 짝이 없는 가운데 팀은 각자 자기 몫만 낸다.
 */
export function settle(ranked: RankedTeam[], fee: number): Charge[] {
  const ordered = [...ranked].sort((a, b) => a.rank - b.rank);
  const k = ordered.length;
  const charges: Charge[] = [];

  for (let i = 0; i < Math.floor(k / 2); i++) {
    const upper = ordered[i];
    const lower = ordered[k - 1 - i];
    const covered = Math.min(upper.members.length, lower.members.length);

    const perLoser = splitAmount((covered + lower.members.length) * fee, lower.members.length);
    for (const m of lower.members) {
      charges.push({ memberId: m.memberId, teamNo: lower.teamNo, amount: perLoser, kind: "loser" });
    }

    const weakestFirst = [...upper.members].sort(
      (a, b) => a.score + a.handicap - (b.score + b.handicap),
    );
    const selfPayers = upper.members.length - covered;
    weakestFirst.forEach((m, idx) => {
      const self = idx < selfPayers;
      charges.push({
        memberId: m.memberId,
        teamNo: upper.teamNo,
        amount: self ? fee : 0,
        kind: self ? "self" : "winner",
      });
    });
  }

  if (k % 2 === 1) {
    const middle = ordered[Math.floor(k / 2)];
    for (const m of middle.members) {
      charges.push({ memberId: m.memberId, teamNo: middle.teamNo, amount: fee, kind: "self" });
    }
  }
  return charges;
}
