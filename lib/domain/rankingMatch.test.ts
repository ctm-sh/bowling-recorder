import { describe, expect, it } from "vitest";
import {
  allScored,
  defaultFillScore,
  mastersPick,
  mastersWinnerCandidates,
  matchPrize,
  monthRange,
  rankEntries,
  rankMasters,
  rankTeams,
  reachedTier,
  representativeCandidates,
  targetTiersError,
  targetTotal,
  type RankingEntry,
} from "./rankingMatch";

const entry = (memberId: string, handicap: number, scores: (number | null)[], teamNo: number | null = null): RankingEntry => ({
  memberId,
  teamNo,
  handicap,
  scores,
});

describe("rankEntries", () => {
  it("adds the handicap once per game played", () => {
    const [a] = rankEntries([entry("a", 20, [150, 160, 170])]);
    expect(a).toMatchObject({ raw: 480, total: 540, played: 3, rank: 1 });
  });

  it("counts only the games entered so far", () => {
    const [a] = rankEntries([entry("a", 20, [150, null, null])]);
    expect(a).toMatchObject({ raw: 150, total: 170, played: 1 });
  });

  it("breaks a tie with the smaller handicap", () => {
    const ranked = rankEntries([entry("big", 30, [170, 170, 170]), entry("small", 10, [190, 190, 190])]);
    expect(ranked.map((e) => [e.memberId, e.rank])).toEqual([
      ["small", 1],
      ["big", 2],
    ]);
  });

  it("shares a rank when total and handicap are both equal", () => {
    const ranked = rankEntries([
      entry("a", 10, [100, 100, 100]),
      entry("b", 10, [100, 100, 100]),
      entry("c", 0, [90, 90, 90]),
    ]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 1, 3]);
  });
});

describe("rankTeams", () => {
  // 엑셀 제9회: 1팀 2582+120×3=2942, 2팀 2565+122×3=2931
  const member = (teamNo: number, total: number, handicap: number, n: number) =>
    entry(`${teamNo}-${n}`, handicap, [total, 0, 0], teamNo);

  it("matches the recorded 9th match", () => {
    const ranked = rankTeams([
      { teamNo: 1, fill: null, members: [member(1, 2582, 120, 1)] },
      { teamNo: 2, fill: null, members: [member(2, 2565, 122, 1)] },
    ]);
    expect(ranked.map((t) => [t.teamNo, t.total, t.rank])).toEqual([
      [1, 2942, 1],
      [2, 2931, 2],
    ]);
  });

  it("adds the puppet score for every game", () => {
    const [t] = rankTeams([{ teamNo: 1, fill: 150, members: [entry("a", 10, [100, 100, 100], 1)] }]);
    expect(t.total).toBe(300 + 30 + 450);
  });

  it("puts the team with the bigger handicap lower on a tie", () => {
    const ranked = rankTeams([
      { teamNo: 1, fill: null, members: [entry("a", 30, [100, 100, 100], 1)] },
      { teamNo: 2, fill: null, members: [entry("b", 10, [120, 120, 120], 2)] },
    ]);
    expect(ranked.map((t) => t.teamNo)).toEqual([2, 1]);
  });
});

describe("target", () => {
  const tiers = [
    { minTotal: 1800, prize: 50_000 },
    { minTotal: 2000, prize: 70_000 },
    { minTotal: 2100, prize: 100_000 },
  ];

  it("sums everyone's score and handicap", () => {
    expect(targetTotal([entry("a", 10, [100, 100, 100]), entry("b", 0, [50, 50, 50])])).toBe(330 + 150);
  });

  it.each([
    [1799, null],
    [1800, 50_000],
    [2050, 70_000],
    [2100, 100_000],
    [3000, 100_000],
  ])("total %i reaches prize %s", (total, prize) => {
    expect(reachedTier(total, tiers)?.prize ?? null).toBe(prize);
  });

  it("validates tiers", () => {
    expect(targetTiersError(tiers)).toBeNull();
    expect(targetTiersError([])).toMatch("하나 이상");
    expect(targetTiersError([{ minTotal: 1800, prize: 100_001 }])).toMatch("10만원");
    expect(
      targetTiersError([
        { minTotal: 1800, prize: 70_000 },
        { minTotal: 2000, prize: 50_000 },
      ]),
    ).toMatch("상금도 커야");
    expect(
      targetTiersError([
        { minTotal: 1800, prize: 50_000 },
        { minTotal: 1800, prize: 70_000 },
      ]),
    ).toMatch("두 번");
  });
});

describe("masters", () => {
  const ranked = rankEntries([
    entry("a", 0, [200, 200, 200]),
    entry("b", 0, [190, 190, 190]),
    entry("c", 0, [180, 180, 180]),
    entry("d", 0, [170, 170, 170]),
  ]);

  it("takes the top N and moves up the next person when someone is excluded", () => {
    expect(mastersPick(ranked, 2, []).map((e) => e.memberId)).toEqual(["a", "b"]);
    expect(mastersPick(ranked, 2, ["a"]).map((e) => e.memberId)).toEqual(["b", "c"]);
  });

  it("ranks by score plus handicap and leaves unscored people last", () => {
    const result = rankMasters([
      { memberId: "a", handicap: 12, score: 258 },
      { memberId: "b", handicap: 60, score: 145 },
      { memberId: "c", handicap: 4, score: null },
    ]);
    expect(result.map((e) => [e.memberId, e.total, e.rank])).toEqual([
      ["a", 270, 1],
      ["b", 205, 2],
      ["c", null, null],
    ]);
  });

  it("returns every tied winner as a candidate", () => {
    const result = rankMasters([
      { memberId: "a", handicap: 10, score: 200 },
      { memberId: "b", handicap: 10, score: 200 },
    ]);
    expect(mastersWinnerCandidates(result)).toEqual(["a", "b"]);
  });
});

describe("monthRange", () => {
  it("covers one calendar month", () => {
    expect(monthRange("2026-11-09")).toEqual({ start: "2026-11-01", end: "2026-12-01" });
  });

  it("rolls over the year in December", () => {
    expect(monthRange("2026-12-31")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("prizes and completion", () => {
  const tiers = [{ minTotal: 500, prize: 50_000 }];
  const low = [entry("a", 0, [100, 100, 100], 1)];
  const high = [entry("a", 0, [200, 200, 200], 1)];

  it("pays the fixed team prize", () => {
    expect(matchPrize({ format: "team", teamPrize: 100_000, targetTiers: [] }, low)).toBe(100_000);
  });

  it("pays nothing when no tier is reached", () => {
    expect(matchPrize({ format: "target", teamPrize: 100_000, targetTiers: tiers }, low)).toBe(0);
    expect(matchPrize({ format: "target", teamPrize: 100_000, targetTiers: tiers }, high)).toBe(50_000);
  });

  it("limits representatives to the winning team in a team match", () => {
    const entries = [entry("a", 0, [200, 200, 200], 1), entry("b", 0, [100, 100, 100], 2)];
    const teams = rankTeams([
      { teamNo: 1, fill: null, members: [entries[0]] },
      { teamNo: 2, fill: null, members: [entries[1]] },
    ]);
    expect(representativeCandidates("team", entries, teams)).toEqual(["a"]);
    expect(representativeCandidates("target", entries, teams)).toEqual(["a", "b"]);
  });

  it("detects whether all three games are scored", () => {
    expect(allScored([entry("a", 0, [1, 2, 3])])).toBe(true);
    expect(allScored([entry("a", 0, [1, 2, null])])).toBe(false);
    expect(allScored([])).toBe(false);
  });

  it("rounds the default puppet score", () => {
    expect(defaultFillScore([150, 151])).toBe(151);
    expect(defaultFillScore([])).toBe(0);
  });
});
