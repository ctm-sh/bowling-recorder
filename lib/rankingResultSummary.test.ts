import { describe, expect, it } from "vitest";
import { buildRankingSummary, formatPrize, rankingResultText } from "./rankingResultSummary";

const base = {
  date: "2026-11-09",
  format: "team" as const,
  winnerTeams: [["도관현", "황지민"]],
  targetTotal: 0,
  prize: 100_000,
  mastersWinner: "도관현",
  mastersPrize: 30_000,
};

describe("rankingResultText", () => {
  it("matches the agreed team format", () => {
    expect(rankingResultText(buildRankingSummary(base))).toBe(
      "2026년 11월 랭킹전 결과\n\n우승팀: 도관현 황지민 (상금 10만원)\n마스터즈 우승: 도관현 3만원",
    );
  });

  it("separates tied winning teams", () => {
    const s = buildRankingSummary({ ...base, winnerTeams: [["가", "나"], ["다", "라"]] });
    expect(s.winner).toBe("가 나 / 다 라");
  });

  it("shows the total for a target match", () => {
    const s = buildRankingSummary({ ...base, format: "target", targetTotal: 2082, prize: 70_000 });
    expect(rankingResultText(s)).toContain("점수 넘기기: 2,082점 (상금 7만원)");
  });

  it("says when no prize was reached", () => {
    const s = buildRankingSummary({ ...base, format: "target", targetTotal: 1700, prize: 0 });
    expect(s.prize).toBe("상금 없음");
  });
});

describe("formatPrize", () => {
  it("uses 만원 only for whole units", () => {
    expect(formatPrize(50_000)).toBe("5만원");
    expect(formatPrize(75_000)).toBe("75,000원");
  });
});
