import { describe, expect, it } from "vitest";
import { rankTeams, settle } from "./result";
import { settlementText, totalsByMember, type GameSettlement } from "./settlement";
import type { TeamEntry } from "./types";

const FEE = 2800;

function team(teamNo: number, members: [string, number][], handicap = 0): TeamEntry {
  return {
    teamNo,
    handicap,
    members: members.map(([memberId, score], i) => ({ memberId, score, handicap: 0, groupNo: i + 1 })),
  };
}

function game(gameNo: number, teams: TeamEntry[]): GameSettlement {
  const ranked = rankTeams(teams);
  return { gameNo, ranked, charges: settle(ranked, FEE) };
}

const g1 = game(1, [team(1, [["a", 200], ["b", 180]]), team(2, [["c", 150], ["d", 140]])]);
const g2 = game(2, [team(1, [["a", 120], ["c", 130]]), team(2, [["b", 200], ["d", 210]])]);

describe("totalsByMember", () => {
  it("게임별 금액을 사람별로 더하고 많이 내는 순 (같으면 먼저 낸 순)", () => {
    // g1: c·d 각 5,600 / g2: a·c 각 5,600
    expect(totalsByMember([g1, g2])).toEqual([
      { memberId: "c", total: 11200, games: 2 },
      { memberId: "d", total: 5600, games: 2 },
      { memberId: "a", total: 5600, games: 2 },
      { memberId: "b", total: 0, games: 2 },
    ]);
  });

  it("합계 = 전체 게임비 (나누어떨어질 때)", () => {
    const sum = totalsByMember([g1, g2]).reduce((s, t) => s + t.total, 0);
    expect(sum).toBe(2 * 4 * FEE);
  });
});

describe("settlementText", () => {
  it("3팀이면 가운데는 순위로", () => {
    const g = game(1, [team(1, [["a", 100]]), team(2, [["b", 200]]), team(3, [["c", 150]])]);
    const text = settlementText({ title: "t", games: [g], nameOf: (id) => id });
    expect(text).toContain("1팀: a 100 패\n2팀: b 200 승\n3팀: c 150 2위");
  });

  it("게임별 팀 줄(이름·점수·승패), 낼 금액, 0원, 합계", () => {
    const names: Record<string, string> = { a: "철수", b: "영희", c: "민수", d: "지수" };
    const text = settlementText({ title: "10/25 (토)", games: [g1, g2], nameOf: (id) => names[id] });
    expect(text).toBe(
      [
        "🎳 10/25 (토) 정산",
        "",
        "1게임",
        "1팀: 철수, 영희 380 승",
        "2팀: 민수, 지수 290 패",
        "",
        "2게임",
        "1팀: 철수, 민수 250 패",
        "2팀: 영희, 지수 410 승",
        "",
        "💸 낼 금액",
        "민수 11,200원",
        "지수 5,600원",
        "철수 5,600원",
        "🎉 0원: 영희",
        "",
        "합계 22,400원",
      ].join("\n"),
    );
  });
});
