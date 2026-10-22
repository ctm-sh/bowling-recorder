import { describe, expect, it } from "vitest";
import {
  assignGroupsByOrder,
  assignGroupsInOrder,
  assignRandom,
  defaultFillScores,
  effectiveTier,
  formations,
  isValidSizes,
  lineupError,
  matchupHandicaps,
  netTeamHandicaps,
  teamHandicaps,
  teamSizes,
} from "./teams";
import type { HandicapTable, Player } from "./types";

const table: HandicapTable = {
  "0": 0, "1": 8, "2": 12, "3": 16, "4": 20, "5": 26, "6": 32, "7": 38,
  "8": 46, "9": 60, "10": 65, "11": 75, "12": 85, "13": 95, "14": 100,
};

// 결정적인 테스트용 의사 난수
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const players = (avgs: number[]): Player[] =>
  avgs.map((avg, i) => ({ id: `p${i + 1}`, tier: 3, avg }));

describe("teamSizes / formations", () => {
  it("11명 3팀은 4·4·3", () => {
    expect(teamSizes(11, 3)).toEqual([4, 4, 3]);
  });

  it("4명은 2팀(2·2), 3팀(2·1·1), 개인전(1·1·1·1)", () => {
    expect(formations(4)).toEqual([
      { teams: 2, sizes: [2, 2] },
      { teams: 3, sizes: [2, 1, 1] },
      { teams: 4, sizes: [1, 1, 1, 1] },
    ]);
  });

  it("2명은 1v1 하나뿐", () => {
    expect(formations(2)).toEqual([{ teams: 2, sizes: [1, 1] }]);
  });

  it("팀 수가 인원보다 많거나 1팀이면 에러", () => {
    expect(() => teamSizes(3, 4)).toThrow();
    expect(() => teamSizes(5, 1)).toThrow();
  });

  it("직접 구성은 인원 차이 2명 이상이면 거부", () => {
    expect(isValidSizes([4, 3])).toBe(true);
    expect(isValidSizes([5, 3])).toBe(false);
    expect(isValidSizes([4, 0])).toBe(false);
    expect(isValidSizes([4])).toBe(false);
  });
});

describe("effectiveTier", () => {
  it("티어 미정은 14로 취급", () => {
    expect(effectiveTier(null)).toBe(14);
    expect(effectiveTier(3)).toBe(3);
  });
});

describe("matchupHandicaps / teamHandicaps", () => {
  const tiers = (entries: Record<string, number>) => new Map(Object.entries(entries));

  it("4티어 vs 5티어: 5티어가 차이 6점을 받는다", () => {
    const slots = [
      { memberId: "a", teamNo: 1, groupNo: 1 },
      { memberId: "b", teamNo: 2, groupNo: 1 },
    ];
    const given = matchupHandicaps(slots, tiers({ a: 4, b: 5 }), table);
    expect(given.get("a")).toBe(0);
    expect(given.get("b")).toBe(6);
  });

  it("3명 묶음(2·4·5티어): 가장 높은 티어 기준으로 차이", () => {
    const slots = [
      { memberId: "a", teamNo: 1, groupNo: 1 },
      { memberId: "b", teamNo: 2, groupNo: 1 },
      { memberId: "c", teamNo: 3, groupNo: 1 },
    ];
    const given = matchupHandicaps(slots, tiers({ a: 2, b: 4, c: 5 }), table);
    expect([given.get("a"), given.get("b"), given.get("c")]).toEqual([0, 8, 14]);
  });

  it("상대가 없거나 같은 티어끼리면 0, 팀 핸디는 팀원이 받은 핸디의 합", () => {
    const slots = [
      { memberId: "a", teamNo: 1, groupNo: 1 }, // 1티어
      { memberId: "b", teamNo: 2, groupNo: 1 }, // 7티어 → +30
      { memberId: "c", teamNo: 1, groupNo: 2 }, // 3티어
      { memberId: "d", teamNo: 2, groupNo: 2 }, // 3티어 → 0
      { memberId: "e", teamNo: 1, groupNo: 3 }, // 상대 없음
    ];
    const given = matchupHandicaps(slots, tiers({ a: 1, b: 7, c: 3, d: 3, e: 14 }), table);
    expect(given.get("b")).toBe(30);
    expect(given.get("d")).toBe(0);
    expect(given.get("e")).toBe(0);
    expect(teamHandicaps(slots, given)).toEqual({ 1: 0, 2: 30 });
  });

  it("순 핸디: 꼭두각시 포함 합계에서 가장 적은 팀을 0으로", () => {
    expect(netTeamHandicaps({ 1: 4 + 100, 2: 4 })).toEqual({ 1: 100, 2: 0 });
    expect(netTeamHandicaps({ 1: 10, 2: 30, 3: 14 })).toEqual({ 1: 0, 2: 20, 3: 4 });
    expect(netTeamHandicaps({ 1: 0, 2: 0 })).toEqual({ 1: 0, 2: 0 });
  });

  it("높은 티어가 어느 팀에 있든 낮은 티어 쪽이 받는다", () => {
    const slots = [
      { memberId: "a", teamNo: 1, groupNo: 1 },
      { memberId: "b", teamNo: 2, groupNo: 1 },
      { memberId: "c", teamNo: 1, groupNo: 2 },
      { memberId: "d", teamNo: 2, groupNo: 2 },
    ];
    const given = matchupHandicaps(slots, tiers({ a: 5, b: 4, c: 2, d: 6 }), table);
    expect(teamHandicaps(slots, given)).toEqual({ 1: 6, 2: 20 });
  });
});

describe("assignRandom", () => {
  const eleven = players([200, 195, 190, 185, 180, 175, 170, 165, 160, 155, 150]);

  it("11명 3팀: 인원 4·4·3, 묶음 4개(3·3·3·2)", () => {
    const slots = assignRandom(eleven, 3, seeded(1));
    const sizes = [1, 2, 3].map((t) => slots.filter((s) => s.teamNo === t).length).sort();
    expect(sizes).toEqual([3, 4, 4]);
    const groupSizes = [1, 2, 3, 4].map((g) => slots.filter((s) => s.groupNo === g).length);
    expect(groupSizes).toEqual([3, 3, 3, 2]);
  });

  it("같은 묶음 사람들은 모두 다른 팀이고, 에버가 비슷한 사람끼리 묶인다", () => {
    const slots = assignRandom(eleven, 3, seeded(7));
    for (const g of [1, 2, 3, 4]) {
      const inGroup = slots.filter((s) => s.groupNo === g);
      expect(new Set(inGroup.map((s) => s.teamNo)).size).toBe(inGroup.length);
    }
    expect(slots.filter((s) => s.groupNo === 1).map((s) => s.memberId).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("시드가 달라지면 배정이 달라질 수 있다 (랜덤)", () => {
    const results = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) =>
        assignRandom(eleven, 3, seeded(seed)).map((s) => s.teamNo).join(""),
      ),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("기록이 없는 회원은 티어로 추정한 에버로 정렬된다", () => {
    const list: Player[] = [
      { id: "new", tier: 0, avg: null }, // 추정 205
      { id: "a", tier: 3, avg: 180 },
      { id: "b", tier: 3, avg: 170 },
      { id: "c", tier: 3, avg: 160 },
    ];
    const slots = assignRandom(list, 2, seeded(3));
    const group1 = slots.filter((s) => s.groupNo === 1).map((s) => s.memberId).sort();
    expect(group1).toEqual(["a", "new"]);
  });
});

describe("assignGroupsByOrder (직접 구성)", () => {
  it("각 팀 에버 순 같은 순번끼리 상대방, 남는 사람은 마지막 묶음", () => {
    const [a1, a2, a3, a4, b1, b2, b3] = players([150, 190, 170, 160, 185, 140, 175]);
    const slots = assignGroupsByOrder([[a1, a2, a3, a4], [b1, b2, b3]]);
    const group = (id: string) => slots.find((s) => s.memberId === id)!.groupNo;
    expect(group(a2.id)).toBe(group(b1.id)); // 190 vs 185
    expect(group(a3.id)).toBe(group(b3.id)); // 170 vs 175
    expect(group(a4.id)).toBe(group(b2.id)); // 160 vs 140
    expect(group(a1.id)).toBe(4); // 150은 상대 없음
  });
});

describe("assignGroupsInOrder (순서를 직접 바꾼 경우)", () => {
  it("세운 순서 그대로 같은 순번끼리 상대방", () => {
    expect(assignGroupsInOrder([["a", "b"], ["c", "d", "e"]])).toEqual([
      { memberId: "a", teamNo: 1, groupNo: 1 },
      { memberId: "b", teamNo: 1, groupNo: 2 },
      { memberId: "c", teamNo: 2, groupNo: 1 },
      { memberId: "d", teamNo: 2, groupNo: 2 },
      { memberId: "e", teamNo: 2, groupNo: 3 },
    ]);
  });
});

describe("lineupError", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const ok = [
    { memberId: "a", teamNo: 1, groupNo: 1 },
    { memberId: "b", teamNo: 2, groupNo: 1 },
    { memberId: "c", teamNo: 1, groupNo: 2 },
    { memberId: "d", teamNo: 2, groupNo: 2 },
    { memberId: "e", teamNo: 1, groupNo: 3 },
  ];

  it("정상 라인업은 null", () => {
    expect(lineupError(ok, ids)).toBeNull();
  });

  it("랜덤 배분 결과는 항상 통과", () => {
    const list = players([200, 195, 190, 185, 180, 175, 170, 165, 160, 155, 150]);
    for (const k of [2, 3, 4, 5, 11]) {
      expect(lineupError(assignRandom(list, k, seeded(k)), list.map((p) => p.id))).toBeNull();
    }
  });

  it("참석자가 아니거나 중복이면 에러", () => {
    expect(lineupError([...ok, { memberId: "x", teamNo: 2, groupNo: 3 }], ids)).toMatch("참석");
    expect(lineupError([...ok, { memberId: "a", teamNo: 2, groupNo: 3 }], ids)).toMatch("두 번");
  });

  it("인원 차이 2명 이상이거나 1팀뿐이면 에러", () => {
    const lopsided = ok.map((s) => (s.memberId === "d" ? { ...s, teamNo: 1, groupNo: 4 } : s));
    expect(lineupError(lopsided, ids)).toMatch("인원 차이");
    expect(lineupError(ok.map((s) => ({ ...s, teamNo: 1, groupNo: 1 })), ids)).not.toBeNull();
  });

  it("같은 묶음이 같은 팀에 있으면 에러", () => {
    const clash = ok.map((s) => (s.memberId === "b" ? { ...s, groupNo: 2 } : s.memberId === "d" ? { ...s, groupNo: 1 } : s));
    expect(lineupError(clash, ids)).toBeNull();
    const bad = ok.map((s) => (s.memberId === "c" ? { ...s, groupNo: 1 } : s));
    expect(lineupError(bad, ids)).toMatch("상대방");
  });
});

describe("defaultFillScores", () => {
  it("4 vs 3: 상대 없던 사람의 에버를 3명 팀에 준다", () => {
    const list = players([200, 190, 180, 170, 160, 150, 171]);
    const slots = assignGroupsByOrder([list.slice(0, 4).concat(), list.slice(4, 7)]);
    // 1팀: 200·190·180·170, 2팀: 171·160·150 → 1팀 170이 상대 없음
    expect(defaultFillScores(slots, list)).toEqual({ 2: 170 });
  });

  it("4·4·3: 마지막 묶음 2명 에버 평균(반올림)을 3명 팀에 준다", () => {
    const list = players([200, 195, 190, 185, 180, 175, 170, 165, 160, 155, 150]);
    const slots = assignRandom(list, 3, seeded(11));
    const fills = defaultFillScores(slots, list);
    const shortTeam = [1, 2, 3].find((t) => slots.filter((s) => s.teamNo === t).length === 3)!;
    expect(fills).toEqual({ [shortTeam]: Math.round((155 + 150) / 2) });
  });

  it("인원이 같으면 보정 없음", () => {
    const list = players([200, 190, 180, 170]);
    expect(defaultFillScores(assignRandom(list, 2, seeded(2)), list)).toEqual({});
  });
});
