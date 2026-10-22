import type { Charge } from "./result";
import type { RankedTeam } from "./types";

export type GameSettlement = {
  gameNo: number;
  ranked: RankedTeam[];
  charges: Charge[];
};

export type PersonTotal = { memberId: string; total: number; games: number };

/** 정모 전체 사람별 낼 금액 합계 (많이 내는 순) */
export function totalsByMember(games: GameSettlement[]): PersonTotal[] {
  const map = new Map<string, PersonTotal>();
  for (const g of games) {
    for (const c of g.charges) {
      const t = map.get(c.memberId) ?? { memberId: c.memberId, total: 0, games: 0 };
      t.total += c.amount;
      t.games += 1;
      map.set(c.memberId, t);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total || b.games - a.games);
}

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 1등 승, 꼴찌 패, 가운데는 순위 */
function outcome(rank: number, teamCount: number) {
  if (rank === 1) return "승";
  if (rank === teamCount) return "패";
  return `${rank}위`;
}

/**
 * 카톡에 붙여넣을 정산 텍스트
 *   🎳 10/22 (목) 정산
 *   1게임
 *   1팀: 이영희, 박민수 620 승
 */
export function settlementText({
  title,
  games,
  nameOf,
}: {
  title: string;
  games: GameSettlement[];
  nameOf: (memberId: string) => string;
}) {
  const lines = [`🎳 ${title} 정산`, ""];

  for (const g of games) {
    lines.push(`${g.gameNo}게임`);
    for (const t of [...g.ranked].sort((a, b) => a.teamNo - b.teamNo)) {
      const members = t.members.map((m) => nameOf(m.memberId)).join(", ");
      lines.push(`${t.teamNo}팀: ${members} ${t.total} ${outcome(t.rank, g.ranked.length)}`);
    }
    lines.push("");
  }

  const totals = totalsByMember(games);
  lines.push("💸 낼 금액");
  for (const t of totals) {
    if (t.total > 0) lines.push(`${nameOf(t.memberId)} ${won(t.total)}`);
  }
  const free = totals.filter((t) => t.total === 0).map((t) => nameOf(t.memberId));
  if (free.length) lines.push(`🎉 0원: ${free.join(", ")}`);

  lines.push("", `합계 ${won(totals.reduce((s, t) => s + t.total, 0))}`);
  return lines.join("\n");
}
