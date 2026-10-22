import { describe, expect, it } from "vitest";
import { average, form, headToHead, matchups, recentAverage, winRecord, type GameRecord } from "./stats";

describe("에버와 최근 폼", () => {
  it("전체 에버, 최근 n게임 에버, 폼", () => {
    const scores = [150, 150, 150, 210, 210];
    expect(average(scores)).toBe(174);
    expect(recentAverage(scores, 2)).toBe(210);
    expect(form(scores, 2)).toBe(36);
  });

  it("기록이 없으면 null, n보다 기록이 적으면 있는 만큼", () => {
    expect(average([])).toBeNull();
    expect(form([], 20)).toBeNull();
    expect(recentAverage([100, 200], 20)).toBe(150);
  });
});

// 게임 1: 민수(1팀) vs 지수(2팀)이 묶음 1, 바다(1팀) vs 하늘(2팀)이 묶음 2
const games: GameRecord[] = [
  {
    gameId: "g1",
    teams: [
      {
        teamNo: 1,
        handicap: 32,
        members: [
          { memberId: "minsu", score: 192, handicap: 12, groupNo: 1 },
          { memberId: "bada", score: 168, handicap: 20, groupNo: 2 },
        ],
      },
      {
        teamNo: 2,
        handicap: 28,
        members: [
          { memberId: "jisu", score: 201, handicap: 12, groupNo: 1 },
          { memberId: "haneul", score: 179, handicap: 16, groupNo: 2 },
        ],
      },
    ],
  },
  {
    gameId: "g2",
    teams: [
      {
        teamNo: 1,
        handicap: 32,
        members: [
          { memberId: "minsu", score: 220, handicap: 12, groupNo: 1 },
          { memberId: "haneul", score: 150, handicap: 16, groupNo: 2 },
        ],
      },
      {
        teamNo: 2,
        handicap: 32,
        members: [
          { memberId: "jisu", score: 200, handicap: 12, groupNo: 1 },
          { memberId: "bada", score: 190, handicap: 20, groupNo: 2 },
        ],
      },
    ],
  },
];

describe("winRecord (1등만 승)", () => {
  it("게임별 팀 순위로 승패", () => {
    // g1: 1팀 392 vs 2팀 408 → 2팀 승 / g2: 1팀 402 vs 2팀 422 → 2팀 승
    expect(winRecord(games, "jisu")).toEqual({ wins: 2, losses: 0, played: 2, rate: 1 });
    expect(winRecord(games, "minsu")).toEqual({ wins: 0, losses: 2, played: 2, rate: 0 });
    expect(winRecord(games, "haneul")).toEqual({ wins: 1, losses: 1, played: 2, rate: 0.5 });
    expect(winRecord(games, "nobody").rate).toBeNull();
  });
});

describe("상대 전적 (같은 묶음끼리, 점수+핸디)", () => {
  it("같은 묶음 상대와만 비교하고 핸디를 따로 기록", () => {
    const list = matchups(games, "minsu");
    expect(list).toEqual([
      {
        gameId: "g1",
        opponentId: "jisu",
        my: { score: 192, handicap: 12 },
        their: { score: 201, handicap: 12 },
        result: "L",
      },
      {
        gameId: "g2",
        opponentId: "jisu",
        my: { score: 220, handicap: 12 },
        their: { score: 200, handicap: 12 },
        result: "W",
      },
    ]);
  });

  it("핸디 덕분에 이기는 경우와 무승부", () => {
    // g1: 바다 168+20=188 vs 하늘 179+16=195 → 패 / g2: 하늘 150+16=166 vs 바다 190+20=210 → 하늘 패
    expect(headToHead(games, "bada").get("haneul")).toEqual({ wins: 1, losses: 1, draws: 0 });

    const draw: GameRecord[] = [
      {
        gameId: "g3",
        teams: [
          { teamNo: 1, handicap: 0, members: [{ memberId: "a", score: 180, handicap: 20, groupNo: 1 }] },
          { teamNo: 2, handicap: 0, members: [{ memberId: "b", score: 200, handicap: 0, groupNo: 1 }] },
        ],
      },
    ];
    expect(headToHead(draw, "a").get("b")).toEqual({ wins: 0, losses: 0, draws: 1 });
  });

  it("다른 묶음 사람과는 비교하지 않는다", () => {
    expect(headToHead(games, "minsu").has("haneul")).toBe(false);
    expect(headToHead(games, "minsu").has("bada")).toBe(false);
  });
});
