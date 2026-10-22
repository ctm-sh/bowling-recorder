// 구글 시트에 쓸 표(행 배열) 만들기. DB·네트워크와 분리해 테스트한다.
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

export type ExportMember = { id: string; name: string; tier: number | null; active: boolean };

const round1 = (n: number | null) => (n === null ? "" : Math.round(n * 10) / 10);

/**
 * 점수기록지: 기존 엑셀 `점수기록지` 시트와 같은 모양.
 * 한 사람 한 줄에 이름·티어·판수·에버, 그 오른쪽으로 점수를 옛날 것부터 가로로 나열한다.
 * 엑셀 이전 기록이 먼저, 그다음 앱 게임(날짜·게임 순). 활동 회원은 모두, 비활성은 기록이 있을 때만.
 */
export function scoreSheetRows(
  members: ExportMember[],
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
