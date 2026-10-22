import { describe, expect, it } from "vitest";
import type { TeamEntry } from "@/lib/domain/types";
import { scoreSheetRows, type ExportGame } from "./rows";

function team(teamNo: number, members: [string, number, number?][], handicap = 0): TeamEntry {
  return {
    teamNo,
    handicap,
    members: members.map(([memberId, score, h = 0], i) => ({ memberId, score, handicap: h, groupNo: i + 1 })),
  };
}

const g1: ExportGame = {
  date: "2026-10-22",
  gameNo: 1,
  closed: true,
  fee: 2800,
  teams: [team(1, [["a", 200], ["b", 180]]), team(2, [["c", 150, 6], ["d", 140]], 6)],
  scored: new Set(["a", "b", "c", "d"]),
};

describe("scoreSheetRows", () => {
  it("엑셀 점수기록지 모양: 한 사람 한 줄, 이전 기록 다음 앱 점수", () => {
    const members = [
      { id: "a", name: "철수", tier: 2, active: true },
      { id: "b", name: "영희", tier: 1, active: true },
      { id: "c", name: "민수", tier: null, active: true },
      { id: "d", name: "지수", tier: 3, active: false },
      { id: "e", name: "유령", tier: 5, active: false },
    ];
    const tab = scoreSheetRows(members, [g1], [{ memberId: "a", score: 225 }]);
    expect(tab.title).toBe("점수기록지");
    expect(tab.rows).toEqual([
      ["이름", "티어", "판수", "에버", "점수"],
      ["영희", 1, 1, 180, 180],
      ["철수", 2, 2, 212.5, 225, 200],
      ["민수", "미정", 1, 150, 150],
      ["지수", 3, 1, 140, 140],
    ]);
  });
});
