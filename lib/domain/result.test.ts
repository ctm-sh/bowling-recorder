import { describe, expect, it } from "vitest";
import { rankTeams, settle, splitAmount } from "./result";
import type { MemberEntry, TeamEntry } from "./types";

const FEE = 2800;

function team(teamNo: number, scores: number[], handicap = 0): TeamEntry {
  const members: MemberEntry[] = scores.map((score, i) => ({
    memberId: `t${teamNo}m${i + 1}`,
    score,
    handicap: 0,
    groupNo: i + 1,
  }));
  return { teamNo, handicap, members };
}

function amounts(charges: ReturnType<typeof settle>) {
  return Object.fromEntries(charges.map((c) => [c.memberId, c.amount]));
}

describe("rankTeams", () => {
  it("팀 점수 = 점수 합 + 순 핸디", () => {
    const [first, second] = rankTeams([team(1, [150, 150], 10), team(2, [160, 160])]);
    expect(first.teamNo).toBe(2);
    expect(first.total).toBe(320);
    expect(second.total).toBe(310);
  });

  it("1명 적은 팀: 꼭두각시 점수는 순 핸디에 포함된다 (스크린샷 예: 4+100 vs 4 → 100)", () => {
    const [first, second] = rankTeams([team(1, [180, 170, 150], 100), team(2, [185, 160, 153, 100])]);
    expect(first.teamNo).toBe(1);
    expect(first.raw).toBe(500);
    expect(first.total).toBe(600);
    expect(second.total).toBe(598);
  });

  it("동점이면 핸디를 받은(핸디가 큰) 팀이 진다", () => {
    const ranked = rankTeams([team(1, [300], 20), team(2, [320], 0)]);
    expect(ranked.map((t) => t.teamNo)).toEqual([2, 1]);
  });

  it("꼭두각시를 받은 팀도 동점이면 진다", () => {
    const ranked = rankTeams([team(1, [300, 200], 100), team(2, [300, 200, 100])]);
    expect(ranked.map((t) => t.teamNo)).toEqual([2, 1]);
  });
});

describe("splitAmount", () => {
  it("100원 단위 올림", () => {
    expect(splitAmount(30800, 3)).toBe(10300);
    expect(splitAmount(16800, 3)).toBe(5600);
    expect(splitAmount(2800, 1)).toBe(2800);
  });
});

describe("settle", () => {
  it("2팀(4 vs 4): 진 팀이 8명분을 나눠 낸다", () => {
    const charges = settle(rankTeams([team(1, [200, 200, 200, 200]), team(2, [100, 100, 100, 100])]), FEE);
    const a = amounts(charges);
    expect(a.t1m1).toBe(0);
    expect(a.t2m1).toBe(5600);
    expect(charges.reduce((s, c) => s + c.amount, 0)).toBe(8 * FEE);
  });

  it("3팀(4·4·3, 1등 4명·꼴찌 3명): 꼴찌가 3+3명분, 1등 개인 꼴찌는 자기 몫, 2등은 각자", () => {
    const first = team(1, [210, 200, 190, 120]);
    const second = team(2, [170, 170, 170, 170]);
    const last = team(3, [150, 150, 150], 150);
    const charges = settle(rankTeams([first, second, last]), FEE);
    const a = amounts(charges);

    expect(a.t3m1).toBe(5600); // 16,800 ÷ 3
    expect(a.t1m4).toBe(FEE); // 1등 팀에서 점수 꼴찌
    expect([a.t1m1, a.t1m2, a.t1m3]).toEqual([0, 0, 0]);
    expect([a.t2m1, a.t2m2, a.t2m3, a.t2m4]).toEqual([FEE, FEE, FEE, FEE]);
  });

  it("1등 팀 자기 몫 대상은 개인 점수 + 개인 핸디로 정한다", () => {
    const first: TeamEntry = {
      teamNo: 1,
      handicap: 0,
      members: [
        { memberId: "a", score: 200, handicap: 0, groupNo: 1 },
        { memberId: "b", score: 150, handicap: 60, groupNo: 2 }, // 210
        { memberId: "c", score: 170, handicap: 0, groupNo: 3 }, // 170 ← 꼴찌
        { memberId: "d", score: 180, handicap: 0, groupNo: 4 },
      ],
    };
    const last = team(2, [100, 100, 100], 100);
    const a = amounts(settle(rankTeams([first, last]), FEE));
    expect(a.c).toBe(FEE);
    expect(a.b).toBe(0);
  });

  it("3명 팀이 이기고 4명 팀이 지면: 진 팀이 3+4명분을 4명이 나눈다", () => {
    const charges = settle(rankTeams([team(1, [250, 250, 250], 250), team(2, [100, 100, 100, 100])]), FEE);
    const a = amounts(charges);
    expect(a.t2m1).toBe(splitAmount(7 * FEE, 4)); // 4,900
    expect([a.t1m1, a.t1m2, a.t1m3]).toEqual([0, 0, 0]);
  });

  it("개인전 1v1v1v1: 4등이 1등 몫, 3등이 2등 몫", () => {
    const charges = settle(rankTeams([team(1, [200]), team(2, [180]), team(3, [160]), team(4, [140])]), FEE);
    const a = amounts(charges);
    expect(a).toEqual({ t1m1: 0, t4m1: 2 * FEE, t2m1: 0, t3m1: 2 * FEE });
  });

  it("5팀이면 가운데 3등은 자기 몫만", () => {
    const charges = settle(
      rankTeams([team(1, [200]), team(2, [190]), team(3, [180]), team(4, [170]), team(5, [160])]),
      FEE,
    );
    const a = amounts(charges);
    expect(a.t3m1).toBe(FEE);
    expect(a.t5m1).toBe(2 * FEE);
    expect(a.t4m1).toBe(2 * FEE);
  });

  it("게임비가 바뀌면 그대로 반영", () => {
    const a = amounts(settle(rankTeams([team(1, [200]), team(2, [100])]), 3000));
    expect(a.t2m1).toBe(6000);
  });
});
