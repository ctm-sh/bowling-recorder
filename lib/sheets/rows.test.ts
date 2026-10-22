import { describe, expect, it } from "vitest";
import type { TeamEntry } from "@/lib/domain/types";
import { memberRows, scoreRows, settlementRows, type ExportGame } from "./rows";

function team(teamNo: number, members: [string, number, number?][], handicap = 0): TeamEntry {
  return {
    teamNo,
    handicap,
    members: members.map(([memberId, score, h = 0], i) => ({ memberId, score, handicap: h, groupNo: i + 1 })),
  };
}

const names: Record<string, string> = { a: "철수", b: "영희", c: "민수", d: "지수" };
const nameOf = (id: string) => names[id];

const g1: ExportGame = {
  date: "2026-10-22",
  gameNo: 1,
  closed: true,
  fee: 2800,
  teams: [team(1, [["a", 200], ["b", 180]]), team(2, [["c", 150, 6], ["d", 140]], 6)],
  scored: new Set(["a", "b", "c", "d"]),
};

describe("scoreRows", () => {
  it("게임별 사람 행 + 엑셀 이전 기록", () => {
    const tab = scoreRows([g1], [{ memberId: "a", score: 225 }], nameOf);
    expect(tab.title).toBe("점수기록");
    expect(tab.rows).toEqual([
      ["날짜", "게임", "이름", "팀", "점수", "받은 핸디", "팀 점수", "팀 순위", "승패"],
      ["2026-10-22", 1, "철수", "1팀", 200, 0, 380, 1, "승"],
      ["2026-10-22", 1, "영희", "1팀", 180, 0, 380, 1, "승"],
      ["2026-10-22", 1, "민수", "2팀", 150, 6, 296, 2, "패"],
      ["2026-10-22", 1, "지수", "2팀", 140, 0, 296, 2, "패"],
      ["엑셀 이전 기록", "", "철수", "", 225, "", "", "", ""],
    ]);
  });

  it("점수가 덜 들어간 게임은 입력된 사람만, 승패는 '입력 중'", () => {
    const partial = { ...g1, scored: new Set(["a"]) };
    const rows = scoreRows([partial], [], nameOf).rows;
    expect(rows).toHaveLength(2);
    expect(rows[1].slice(-3)).toEqual(["", "", "입력 중"]);
  });
});

describe("memberRows", () => {
  it("활동 → 티어 순, 승률, 미정 티어", () => {
    const tab = memberRows(
      [
        { id: "b", name: "영희", tier: 1, active: true, games: 15, avg: 200.24, recentAvg: 201.25, wins: 1, losses: 3 },
        { id: "a", name: "철수", tier: 0, active: true, games: 29, avg: 209.04, recentAvg: null, wins: 0, losses: 0 },
        { id: "x", name: "은별", tier: null, active: false, games: 0, avg: null, recentAvg: null, wins: 0, losses: 0 },
      ],
      20,
    );
    expect(tab.rows[0][5]).toBe("최근 20게임 에버");
    expect(tab.rows.slice(1)).toEqual([
      ["철수", 0, "활동", 29, 209, "", 0, 0, ""],
      ["영희", 1, "활동", 15, 200.2, 201.3, 1, 3, "25%"],
      ["은별", "미정", "비활성", 0, "", "", 0, 0, ""],
    ]);
  });
});

describe("settlementRows", () => {
  it("마감된 정모만, 정모별 사람별 합계", () => {
    const open = { ...g1, date: "2026-10-29", closed: false };
    const tab = settlementRows([g1, open], nameOf);
    expect(tab.rows).toEqual([
      ["날짜", "이름", "게임 수", "낼 금액"],
      ["2026-10-22", "민수", 1, 5600],
      ["2026-10-22", "지수", 1, 5600],
      ["2026-10-22", "영희", 1, 0],
      ["2026-10-22", "철수", 1, 0],
    ]);
  });
});
