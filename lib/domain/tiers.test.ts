import { describe, expect, it } from "vitest";
import { suggestTier, tierReferences, type TierSample } from "./tiers";

const sample = (tier: number | null, avg: number | null, games = 20, active = true): TierSample => ({
  tier,
  avg,
  games,
  active,
});

describe("tierReferences", () => {
  it("티어별 활동 회원 에버 중앙값, 없으면 205-10×티어", () => {
    const refs = tierReferences([sample(2, 180), sample(2, 190), sample(2, 186), sample(3, 176), sample(3, 170)]);
    expect(refs[2]).toBe(186);
    expect(refs[3]).toBe(173);
    expect(refs[5]).toBe(155);
  });

  it("게임 수가 적거나 비활성·미정·기록 없음은 제외", () => {
    const refs = tierReferences([sample(4, 300, 3), sample(4, 300, 20, false), sample(null, 300), sample(4, null)]);
    expect(refs[4]).toBe(165);
  });
});

describe("suggestTier", () => {
  const refs = tierReferences([]); // 0:205, 1:195, 2:185, 3:175 ...

  it("최근 에버가 위 티어와의 중간값 이상이면 승급 후보", () => {
    expect(suggestTier({ tier: 3, recentAvg: 180, recentGames: 20 }, refs)).toEqual({
      kind: "up",
      to: 2,
      threshold: 180,
      recentAvg: 180,
    });
  });

  it("아래 티어와의 중간값 이하이면 강등 후보", () => {
    expect(suggestTier({ tier: 3, recentAvg: 168, recentGames: 20 }, refs)).toMatchObject({ kind: "down", to: 4 });
  });

  it("사이에 있으면 후보 아님", () => {
    expect(suggestTier({ tier: 3, recentAvg: 175, recentGames: 20 }, refs)).toEqual({ kind: "none" });
  });

  it("최근 게임이 10게임 미만, 티어 미정, 기록 없음이면 판단 안 함", () => {
    expect(suggestTier({ tier: 3, recentAvg: 220, recentGames: 9 }, refs)).toEqual({ kind: "none" });
    expect(suggestTier({ tier: null, recentAvg: 220, recentGames: 20 }, refs)).toEqual({ kind: "none" });
    expect(suggestTier({ tier: 3, recentAvg: null, recentGames: 0 }, refs)).toEqual({ kind: "none" });
  });

  it("0티어는 승급, 14티어는 강등 없음", () => {
    expect(suggestTier({ tier: 0, recentAvg: 280, recentGames: 20 }, refs)).toEqual({ kind: "none" });
    expect(suggestTier({ tier: 14, recentAvg: 10, recentGames: 20 }, refs)).toEqual({ kind: "none" });
  });
});
