// 구글 시트에 쓸 표(행 배열) 만들기. DB·네트워크와 분리해 테스트한다.
import { rankTeams, settle } from "@/lib/domain/result";
import { totalsByMember } from "@/lib/domain/settlement";
import type { TeamEntry } from "@/lib/domain/types";

export type Cell = string | number;
export type Tab = { title: string; rows: Cell[][] };

export type ExportGame = {
  date: string;
  gameNo: number;
  closed: boolean;
  fee: number;
  teams: TeamEntry[];
  /** 점수가 입력된 사람 */
  scored: Set<string>;
};

export type ExportMember = {
  id: string;
  name: string;
  tier: number | null;
  active: boolean;
  games: number;
  avg: number | null;
  recentAvg: number | null;
  wins: number;
  losses: number;
};

const round1 = (n: number | null) => (n === null ? "" : Math.round(n * 10) / 10);

function outcome(rank: number, count: number) {
  return rank === 1 ? "승" : rank === count ? "패" : `${rank}위`;
}

/** 점수기록: 앱 게임(날짜순) 다음에 엑셀에서 가져온 이전 기록 */
export function scoreRows(
  games: ExportGame[],
  legacy: { memberId: string; score: number }[],
  nameOf: (id: string) => string,
): Tab {
  const rows: Cell[][] = [["날짜", "게임", "이름", "팀", "점수", "받은 핸디", "팀 점수", "팀 순위", "승패"]];
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date) || a.gameNo - b.gameNo);
  for (const g of sorted) {
    const complete = g.teams.every((t) => t.members.every((m) => g.scored.has(m.memberId)));
    const ranked = rankTeams(g.teams);
    for (const t of [...ranked].sort((a, b) => a.teamNo - b.teamNo)) {
      for (const m of t.members) {
        if (!g.scored.has(m.memberId)) continue;
        rows.push([
          g.date,
          g.gameNo,
          nameOf(m.memberId),
          `${t.teamNo}팀`,
          m.score,
          m.handicap,
          complete ? t.total : "",
          complete ? t.rank : "",
          complete ? outcome(t.rank, ranked.length) : "입력 중",
        ]);
      }
    }
  }
  for (const s of legacy) rows.push(["엑셀 이전 기록", "", nameOf(s.memberId), "", s.score, "", "", "", ""]);
  return { title: "점수기록", rows };
}

/** 회원현황: 티어 순 */
export function memberRows(members: ExportMember[], recentN: number): Tab {
  const rows: Cell[][] = [
    ["이름", "티어", "활동", "게임 수", "전체 에버", `최근 ${recentN}게임 에버`, "승", "패", "승률"],
  ];
  const sorted = [...members].sort(
    (a, b) => Number(b.active) - Number(a.active) || (a.tier ?? 99) - (b.tier ?? 99) || (b.avg ?? 0) - (a.avg ?? 0),
  );
  for (const m of sorted) {
    const played = m.wins + m.losses;
    rows.push([
      m.name,
      m.tier ?? "미정",
      m.active ? "활동" : "비활성",
      m.games,
      round1(m.avg),
      round1(m.recentAvg),
      m.wins,
      m.losses,
      played ? `${Math.round((m.wins / played) * 100)}%` : "",
    ]);
  }
  return { title: "회원현황", rows };
}

/** 정산: 마감된 정모만, 정모별 사람별 낼 금액 */
export function settlementRows(games: ExportGame[], nameOf: (id: string) => string): Tab {
  const rows: Cell[][] = [["날짜", "이름", "게임 수", "낼 금액"]];
  const byDate = new Map<string, ExportGame[]>();
  for (const g of games.filter((g) => g.closed)) byDate.set(g.date, [...(byDate.get(g.date) ?? []), g]);

  for (const date of [...byDate.keys()].sort()) {
    const settled = byDate
      .get(date)!
      .sort((a, b) => a.gameNo - b.gameNo)
      .map((g) => {
        const ranked = rankTeams(g.teams);
        return { gameNo: g.gameNo, ranked, charges: settle(ranked, g.fee) };
      });
    for (const t of totalsByMember(settled)) rows.push([date, nameOf(t.memberId), t.games, t.total]);
  }
  return { title: "정산", rows };
}

/**
 * 점수기록지: 기존 엑셀 `점수기록지` 시트와 같은 모양.
 * 한 사람 한 줄에 이름·티어·판수·에버, 그 오른쪽으로 점수를 옛날 것부터 가로로 나열한다.
 * 엑셀 이전 기록이 먼저, 그다음 앱 게임(날짜·게임 순). 활동 회원은 모두, 비활성은 기록이 있을 때만.
 */
export function scoreSheetRows(
  members: Pick<ExportMember, "id" | "name" | "tier" | "active">[],
  games: ExportGame[],
  legacy: { memberId: string; score: number }[],
): Tab {
  const scores = new Map<string, number[]>();
  const add = (id: string, score: number) => scores.set(id, [...(scores.get(id) ?? []), score]);
  for (const s of legacy) add(s.memberId, s.score);
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date) || a.gameNo - b.gameNo);
  for (const g of sorted) {
    for (const t of [...g.teams].sort((a, b) => a.teamNo - b.teamNo)) {
      for (const m of t.members) if (g.scored.has(m.memberId)) add(m.memberId, m.score);
    }
  }

  const avgOf = (id: string) => {
    const list = scores.get(id) ?? [];
    return list.length ? list.reduce((s, n) => s + n, 0) / list.length : null;
  };
  const listed = members
    .filter((m) => m.active || scores.has(m.id))
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        (a.tier ?? 99) - (b.tier ?? 99) ||
        (avgOf(b.id) ?? 0) - (avgOf(a.id) ?? 0) ||
        a.name.localeCompare(b.name, "ko"),
    );

  const rows: Cell[][] = [["이름", "티어", "판수", "에버", "점수"]];
  for (const m of listed) {
    const list = scores.get(m.id) ?? [];
    rows.push([m.name, m.tier ?? "미정", list.length, list.length ? round1(avgOf(m.id)) : "", ...list]);
  }
  return { title: "점수기록지", rows };
}
